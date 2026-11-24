-- Proposta da revisionare. Fuori dai percorsi di migrazione, nessuna abilitazione account.
BEGIN;
CREATE TABLE public.admin_draft_ai_field_opt_ins (
  actor uuid NOT NULL REFERENCES auth.users(id),
  field_key text NOT NULL REFERENCES public.product_field_definitions(key)
    CHECK (field_key IN ('seo_title','seo_description','tags')),
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

CREATE FUNCTION public.reserve_draft_editorial_ai_request(p_actor uuid, p_request_key uuid, p_context_hash text)
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
    JOIN public.admin_catalog_capabilities c ON c.user_id=o.actor AND o.field_key=ANY(c.field_keys)
    JOIN public.product_field_definitions d ON d.key=o.field_key
    WHERE o.actor=p_actor AND c.enabled AND ARRAY['edit','ai','drafts']::text[] <@ c.capabilities
      AND d.visible AND d.editable AND d.ai_allowed AND NOT d.manual_only AND d.applies_to IN ('product','both')
      AND d.field_group NOT IN ('inventory','shopify_state','system','other_imported');
  INSERT INTO public.admin_draft_ai_request_scopes(actor,request_key,fields) VALUES(p_actor,p_request_key,v_fields);
  RETURN jsonb_build_object('reserved',true,'fields',v_fields);
END $$;
REVOKE ALL ON FUNCTION public.reserve_draft_editorial_ai_request(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_draft_editorial_ai_request(uuid,uuid,text) TO service_role;
COMMIT;
