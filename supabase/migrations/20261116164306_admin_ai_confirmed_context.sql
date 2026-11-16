-- Additive schema only: no account/capability row is inserted or updated.
ALTER TABLE public.admin_catalog_capabilities
 DROP CONSTRAINT admin_catalog_capabilities_capabilities_check,
 ADD CONSTRAINT admin_catalog_capabilities_capabilities_check
 CHECK(capabilities <@ ARRAY['edit','sync','drafts','images','categories','prices','publish','ai']::text[]);

CREATE TABLE public.admin_confirmed_ai_requests (
 actor uuid NOT NULL REFERENCES auth.users(id), request_key uuid NOT NULL,
 field_key text NOT NULL REFERENCES public.product_field_definitions(key),
 context_hash text NOT NULL CHECK(context_hash ~ '^[0-9a-f]{64}$'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(actor,request_key)
);
ALTER TABLE public.admin_confirmed_ai_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_confirmed_ai_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.admin_confirmed_ai_requests TO service_role;
CREATE INDEX admin_confirmed_ai_actor_time ON public.admin_confirmed_ai_requests(actor,created_at);
CREATE FUNCTION public.reserve_confirmed_ai_request(p_actor uuid,p_request_key uuid,p_field_key text,p_context_hash text,p_action text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF p_action IS DISTINCT FROM 'suggest_confirmed_field' OR p_actor IS NULL OR p_request_key IS NULL OR p_context_hash IS NULL OR p_context_hash !~ '^[0-9a-f]{64}$' OR NOT EXISTS (
  SELECT 1 FROM public.admin_catalog_capabilities c JOIN public.user_roles r ON r.user_id=c.user_id
  JOIN public.product_field_definitions d ON d.key=p_field_key
  WHERE c.user_id=p_actor AND c.enabled AND r.role::text='editor'
  AND ARRAY['ai','edit']::text[] <@ c.capabilities AND p_field_key=ANY(c.field_keys)
  AND d.visible AND d.editable AND d.ai_allowed AND NOT d.manual_only
  AND d.field_group NOT IN ('inventory','shopify_state','system','other_imported')
  AND p_field_key IN ('description','optimized_description','short_description','key_benefits','key_features','special_bullets')
 ) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text,317));
 IF EXISTS(SELECT 1 FROM public.admin_confirmed_ai_requests WHERE actor=p_actor AND request_key=p_request_key) THEN RETURN false; END IF;
 IF (SELECT count(*) FROM public.admin_confirmed_ai_requests WHERE actor=p_actor AND created_at>clock_timestamp()-interval '1 minute')>=5 THEN RETURN false; END IF;
 INSERT INTO public.admin_confirmed_ai_requests(actor,request_key,field_key,context_hash) VALUES(p_actor,p_request_key,p_field_key,p_context_hash);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.reserve_confirmed_ai_request(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_confirmed_ai_request(uuid,uuid,text,text,text) TO service_role;
