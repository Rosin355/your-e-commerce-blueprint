-- New internal drafts only. Transaction and replay protection belong to the Drizzle migrator.
CREATE TABLE public.admin_draft_ai_field_opt_ins (
  actor uuid NOT NULL REFERENCES auth.users(id),
  field_key text NOT NULL REFERENCES public.product_field_definitions(key)
    CHECK (field_key IN ('seo_title','seo_description','tags')),
  approved_reference text NOT NULL CHECK (length(trim(approved_reference)) > 3),
  granted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (actor, field_key)
);
ALTER TABLE public.admin_draft_ai_field_opt_ins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_draft_ai_field_opt_ins FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.admin_draft_ai_field_opt_ins TO service_role;

CREATE TABLE public.admin_draft_ai_request_scopes (
  actor uuid NOT NULL, request_key uuid NOT NULL, fields text[] NOT NULL,
  PRIMARY KEY (actor, request_key),
  FOREIGN KEY (actor, request_key) REFERENCES public.admin_confirmed_ai_requests(actor,request_key)
);
ALTER TABLE public.admin_draft_ai_request_scopes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_draft_ai_request_scopes FROM PUBLIC, anon, authenticated, service_role;
GRANT INSERT ON public.admin_draft_ai_request_scopes TO service_role;

CREATE FUNCTION public.reserve_new_draft_editorial_v1(p_actor uuid, p_request_key uuid, p_context_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_fields text[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_catalog_capabilities c WHERE c.user_id=p_actor AND c.enabled
    AND ARRAY['edit','ai','drafts']::text[] <@ c.capabilities) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501';
  END IF;
  -- The original reservation checks Editor, the description grant and registry,
  -- duplicate request keys and the shared, serialized five-per-minute budget.
  IF NOT public.reserve_confirmed_ai_request(p_actor,p_request_key,'description',p_context_hash,'suggest_confirmed_field') THEN
    RETURN jsonb_build_object('reserved',false);
  END IF;
  SELECT COALESCE(array_agg(d.key ORDER BY d.key),ARRAY[]::text[]) INTO v_fields
    FROM public.admin_draft_ai_field_opt_ins o
    JOIN public.admin_catalog_capabilities c ON c.user_id=o.actor
    JOIN public.product_field_definitions d ON d.key=o.field_key
    WHERE o.actor=p_actor AND c.enabled AND ARRAY['edit','ai','drafts']::text[] <@ c.capabilities
      AND ((d.key IN ('seo_title','seo_description') AND d.ai_allowed AND d.key=ANY(c.field_keys))
        OR (d.key='tags' AND d.data_type IN ('json','array') AND d.shopify_mapping @> '{"type":"core","field":"tags"}'::jsonb))
      AND d.visible AND d.editable AND NOT d.manual_only AND d.applies_to IN ('product','both')
      AND d.field_group NOT IN ('inventory','shopify_state','system','other_imported');
  INSERT INTO public.admin_draft_ai_request_scopes(actor,request_key,fields) VALUES(p_actor,p_request_key,v_fields);
  RETURN jsonb_build_object('reserved',true,'fields',v_fields);
END $$;
REVOKE ALL ON FUNCTION public.reserve_new_draft_editorial_v1(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_new_draft_editorial_v1(uuid,uuid,text) TO service_role;

-- Include roles reachable via SET ROLE, including NOINHERIT membership.
DO $acl$
DECLARE principal record;
BEGIN
  FOR principal IN
    SELECT client.rolname AS client_name, reachable.oid, reachable.rolsuper, reachable.rolcreaterole
    FROM pg_roles client JOIN pg_roles reachable ON
      pg_has_role(client.oid,reachable.oid,'SET') OR pg_has_role(client.oid,reachable.oid,'USAGE')
    WHERE client.rolname IN ('service_role','anon','authenticated')
  LOOP
    IF principal.rolsuper OR principal.rolcreaterole OR
      has_table_privilege(principal.oid,'public.admin_draft_ai_field_opt_ins','INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES') OR
      has_table_privilege(principal.oid,'public.admin_draft_ai_request_scopes','UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES') OR
      (principal.client_name <> 'service_role' AND (
        has_table_privilege(principal.oid,'public.admin_draft_ai_field_opt_ins','SELECT') OR
        has_table_privilege(principal.oid,'public.admin_draft_ai_request_scopes','SELECT,INSERT') OR
        has_function_privilege(principal.oid,'public.reserve_new_draft_editorial_v1(uuid,uuid,text)','EXECUTE')))
    THEN RAISE EXCEPTION 'Invalid effective permissions for new draft AI'; END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) privilege
    WHERE c.oid IN ('public.admin_draft_ai_field_opt_ins'::regclass,'public.admin_draft_ai_request_scopes'::regclass)
    AND privilege.privilege_type='MAINTAIN' AND CASE WHEN privilege.grantee=0 THEN true ELSE EXISTS
      (SELECT 1 FROM pg_roles r WHERE r.rolname IN ('service_role','anon','authenticated')
       AND (pg_has_role(r.oid,privilege.grantee,'SET') OR pg_has_role(r.oid,privilege.grantee,'USAGE'))) END)
  THEN RAISE EXCEPTION 'Unexpected maintenance permission on draft AI tables'; END IF;
END $acl$;
