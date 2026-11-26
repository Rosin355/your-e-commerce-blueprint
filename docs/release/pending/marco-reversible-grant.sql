-- Eseguire solo con GO nominativo dopo aver acquisito la riga originale.
-- Parametri psql: staff_id, grant_key, direction. Ogni transazione riguarda una chiave.
BEGIN;
SELECT set_config('onlinegarden.release_actor', :'staff_id', true),
       set_config('onlinegarden.release_key', :'grant_key', true),
       set_config('onlinegarden.release_direction', :'direction', true);
DO $scope$
DECLARE
  actor_id uuid := current_setting('onlinegarden.release_actor')::uuid;
  item text := current_setting('onlinegarden.release_key');
  direction text := current_setting('onlinegarden.release_direction');
  keys text[];
BEGIN
  IF direction NOT IN ('apply','restore') OR item NOT IN ('product_unpublish','product_archive')
    THEN RAISE EXCEPTION 'Operazione o grant reversibile non valido'; END IF;
  SELECT c.field_keys INTO STRICT keys FROM public.admin_catalog_capabilities c
    WHERE c.user_id=actor_id AND c.enabled AND 'sync'=ANY(c.capabilities)
      AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=c.user_id AND r.role::text='editor')
      AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=c.user_id AND r.role::text IN ('admin','tech_admin'))
    FOR UPDATE;
  IF direction='apply' AND NOT (item=ANY(keys)) THEN
    UPDATE public.admin_catalog_capabilities SET field_keys=array_append(keys,item) WHERE user_id=actor_id;
  ELSIF direction='restore' AND item=ANY(keys) THEN
    UPDATE public.admin_catalog_capabilities SET field_keys=array_remove(keys,item) WHERE user_id=actor_id;
  END IF;
END $scope$;
COMMIT;
