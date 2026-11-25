-- psql -X -v ON_ERROR_STOP=1 -v direction=apply|restore -f ...
-- Eseguire solo sul progetto verificato, dopo snapshot e GO registro/RPC.
BEGIN;
SELECT set_config('onlinegarden.release_direction', :'direction', true);
DO $release$
DECLARE
  target regprocedure := 'public.admin_update_product_field(uuid,text,uuid,text,jsonb,integer,text,text,text)'::regprocedure;
  original_hash constant text := '2621cc0ee78a99e6dc55bd0602dc4ac3';
  marker constant text := 'v_client_create_allowed := v_def.key = ANY (v_client_creatable_missing_keys);';
  replacement constant text := 'v_client_create_allowed := v_def.key = ANY (v_client_creatable_missing_keys) OR
      (v_def.key = ''tags'' AND EXISTS (
        SELECT 1 FROM public.admin_catalog_capabilities c JOIN public.user_roles r ON r.user_id = c.user_id
        WHERE c.user_id = p_actor AND c.enabled AND r.role::text = ''editor''
          AND ''edit'' = ANY(c.capabilities) AND ''tags'' = ANY(c.field_keys)));';
  mapping constant jsonb := '{"type":"metafield","namespace":"custom","key":"short_intro"}';
  current_mapping jsonb;
  current_body text;
  definition text;
  direction text := current_setting('onlinegarden.release_direction');
BEGIN
  IF direction NOT IN ('apply','restore') THEN RAISE EXCEPTION 'Direzione non valida'; END IF;
  SELECT shopify_mapping INTO STRICT current_mapping FROM public.product_field_definitions
    WHERE key='short_description' AND editor_type='textarea' AND editable AND publishable FOR UPDATE;
  IF current_mapping IS NULL OR current_mapping NOT IN ('{}'::jsonb,mapping) THEN RAISE EXCEPTION 'Mapping inatteso'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.product_field_definitions WHERE key='short_intro' AND shopify_mapping=mapping)
    THEN RAISE EXCEPTION 'Metafield storico non riconosciuto'; END IF;
  SELECT prosrc,pg_get_functiondef(oid) INTO STRICT current_body,definition FROM pg_proc WHERE oid=target;
  IF md5(current_body)=original_hash AND strpos(current_body,marker)>0 THEN
    IF direction='apply' THEN EXECUTE replace(definition,marker,replacement); END IF;
  ELSIF strpos(current_body,replacement)>0 AND md5(replace(current_body,replacement,marker))=original_hash THEN
    IF direction='restore' THEN EXECUTE replace(definition,replacement,marker); END IF;
  ELSE RAISE EXCEPTION 'Revisione RPC diversa dallo snapshot'; END IF;
  UPDATE public.product_field_definitions SET shopify_mapping=CASE WHEN direction='apply' THEN mapping ELSE '{}'::jsonb END
    WHERE key='short_description' AND shopify_mapping IS DISTINCT FROM CASE WHEN direction='apply' THEN mapping ELSE '{}'::jsonb END;
END $release$;
COMMIT;
