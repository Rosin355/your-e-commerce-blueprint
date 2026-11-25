-- psql -X -v ON_ERROR_STOP=1 -v staff_id=<UUID verificato privatamente> -v direction=apply|restore -f ...
-- Prerequisito: snapshot privato della riga di Marco con tags assente.
-- grant_key accetta tags, product_gallery o product_formats. Una sola scelta per transazione.
\if :{?grant_key}
\else
\set grant_key tags
\endif
BEGIN;
SELECT set_config('onlinegarden.release_key', :'grant_key', true),
       set_config('onlinegarden.release_actor', :'staff_id', true),
       set_config('onlinegarden.release_direction', :'direction', true);
DO $scope$
DECLARE
  actor_id uuid := current_setting('onlinegarden.release_actor')::uuid;
  action text := current_setting('onlinegarden.release_direction');
  item text := current_setting('onlinegarden.release_key');
  keys text[];
BEGIN
  IF action NOT IN ('apply','restore') THEN RAISE EXCEPTION 'Direzione non valida'; END IF;
  IF item NOT IN ('tags','product_gallery','product_formats') THEN RAISE EXCEPTION 'Abilitazione non valida'; END IF;
  SELECT c.field_keys INTO STRICT keys FROM public.admin_catalog_capabilities c
    WHERE c.user_id=actor_id AND c.enabled AND c.capabilities @> ARRAY['edit','sync']
      AND (item='tags' OR (CASE item WHEN 'product_gallery' THEN 'images' ELSE 'prices' END)=ANY(c.capabilities))
      AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=c.user_id AND r.role::text='editor')
      AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=c.user_id AND r.role::text IN ('admin','tech_admin'))
      AND (SELECT count(*) FROM public.admin_draft_ai_field_opt_ins o WHERE o.actor=c.user_id AND o.field_key IN ('seo_title','seo_description','tags'))=3
    FOR UPDATE;
  IF action='apply' AND NOT (item=ANY(keys)) THEN
    UPDATE public.admin_catalog_capabilities SET field_keys=array_append(keys,item) WHERE user_id=actor_id;
  ELSIF action='restore' AND item=ANY(keys) THEN
    UPDATE public.admin_catalog_capabilities SET field_keys=array_remove(keys,item) WHERE user_id=actor_id;
  END IF;
END $scope$;
COMMIT;
