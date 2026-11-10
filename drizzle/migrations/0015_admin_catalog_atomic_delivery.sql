-- Target chain must be independently verified: Lovable 95cad199-55fd-4870-9d5c-a2653edf88f5 -> iekwvvihjwghosqdxrdi.
SELECT pg_advisory_xact_lock(hashtextextended('og-admin-catalog-delivery-20261110',0));
DO $pre$
DECLARE t text;
BEGIN
 IF current_database()<>'postgres' OR current_setting('server_version_num')::integer/10000<>17 THEN RAISE EXCEPTION 'Wrong database/server'; END IF;
 IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version IN('20261031184521','20261110135043')) THEN RAISE EXCEPTION 'History collision: inspect, do not reapply'; END IF;
 FOREACH t IN ARRAY ARRAY['admin_product_operations','admin_product_shopify_links','admin_operation_events','admin_category_operations','admin_catalog_capabilities','admin_catalog_approvals','admin_catalog_media'] LOOP IF to_regclass('public.'||t) IS NOT NULL THEN RAISE EXCEPTION 'Table collision: %',t; END IF; END LOOP;
 FOREACH t IN ARRAY ARRAY['admin_save_new_draft','admin_claim_draft','admin_complete_draft','admin_finish_categories','admin_claim_catalog_approval'] LOOP IF EXISTS(SELECT 1 FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=t) THEN RAISE EXCEPTION 'RPC collision: %',t; END IF; END LOOP;
 FOREACH t IN ARRAY ARRAY['products','product_current_values','product_field_definitions','product_categories','product_category_assignments','user_roles','product_admin_command_log'] LOOP IF to_regclass('public.'||t) IS NULL THEN RAISE EXCEPTION 'Missing dependency: %',t; END IF; END LOOP;
 IF md5(pg_get_functiondef('public.admin_complete_product_field_sync(uuid,uuid,text,integer,text,text,boolean,jsonb,text,text)'::regprocedure))<>'31ed209facb8c8f31b1778460f85b7b3' THEN RAISE EXCEPTION 'Prior sync RPC drift; inspect before replacing'; END IF;
 IF to_regprocedure('public.admin_complete_product_field_sync(uuid,uuid,text,integer,text,text,boolean,jsonb,text,text)') IS NULL THEN RAISE EXCEPTION 'Missing prior sync RPC'; END IF;
END $pre$;

-- Original bytes below; SHA-256 ce63ea211dd7b5f08e222f7b462afc5719a276782a80bca52c1b69abd29cf328
-- NOT APPLIED LIVE. Operation journal, not an independent product catalogue.
CREATE TABLE public.admin_product_operations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor uuid NOT NULL REFERENCES auth.users(id),
 request_key uuid NOT NULL, payload jsonb NOT NULL, payload_hash text NOT NULL,
 product_id uuid NOT NULL REFERENCES public.products(id),
 state text NOT NULL DEFAULT 'LOCAL_DRAFT' CHECK(state IN ('LOCAL_DRAFT','IN_FLIGHT','NEEDS_RECONCILIATION','VERIFIED_DRAFT')),
 shopify_product_gid text UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(actor,request_key), CHECK(jsonb_typeof(payload)='object')
);
CREATE TABLE public.admin_product_shopify_links (
 product_id uuid PRIMARY KEY REFERENCES public.products(id),
 shopify_product_gid text NOT NULL CHECK(shopify_product_gid ~ '^gid://shopify/Product/[0-9]+$'),
 shopify_variant_gid text UNIQUE CHECK(shopify_variant_gid ~ '^gid://shopify/ProductVariant/[0-9]+$'),
 operation_id uuid NOT NULL REFERENCES public.admin_product_operations(id), verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.admin_operation_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation_id uuid NOT NULL REFERENCES public.admin_product_operations(id),
 actor uuid NOT NULL REFERENCES auth.users(id), state text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_product_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_product_shopify_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_operation_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_product_operations, public.admin_product_shopify_links, public.admin_operation_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.admin_product_operations, public.admin_product_shopify_links TO service_role;
GRANT SELECT, INSERT ON public.admin_operation_events TO service_role;

CREATE FUNCTION public.admin_save_new_draft(p_actor uuid, p_key uuid, p_hash text, p_payload jsonb, p_fields jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE op public.admin_product_operations%ROWTYPE; pid uuid; vid uuid; v jsonb; f jsonb; n integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND role::text IN ('admin','tech_admin','editor')) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text||p_key::text,0));
 SELECT * INTO op FROM public.admin_product_operations WHERE actor=p_actor AND request_key=p_key;
 IF FOUND THEN
  IF op.payload_hash<>p_hash OR op.payload<>p_payload THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
  RETURN jsonb_build_object('operationId',op.id,'productId',op.product_id,'state',op.state,'replayed',true);
 END IF;
 IF p_hash IS NULL OR length(p_hash)<>64 OR jsonb_typeof(p_payload->'variants')<>'array' OR jsonb_array_length(p_payload->'variants') NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'INVALID_DRAFT'; END IF;
 n:=jsonb_array_length(p_payload->'variants');
 INSERT INTO public.products(sku,entity_type,legacy_source) VALUES(p_payload->>'sku',CASE WHEN n=1 THEN 'simple' ELSE 'variable' END,'manuale') RETURNING id INTO pid;
 FOR v IN SELECT value FROM jsonb_array_elements(p_payload->'variants') LOOP
  IF n=1 THEN vid:=pid;
  ELSE INSERT INTO public.products(sku,entity_type,parent_product_id,legacy_source) VALUES(v->>'sku','variation',pid,'manuale') RETURNING id INTO vid; END IF;
 END LOOP;
 -- Only registry-validated editorial values supplied by the server; no inventory/publication fields.
 FOR f IN SELECT value FROM jsonb_array_elements(p_fields) LOOP
  IF NOT EXISTS(SELECT 1 FROM public.product_field_definitions WHERE key=f->>'key' AND visible AND editable AND field_group NOT IN ('inventory','system','shopify_state','other_imported')) THEN RAISE EXCEPTION 'INVALID_FIELD'; END IF;
  INSERT INTO public.product_current_values(product_id,sku,entity_type,field_key,value_text,value_number,value_json,origin,value_origin,review_status,publish_blocked,protected_on_reimport,updated_by)
  VALUES(pid,p_payload->>'sku','product',f->>'key',f->>'text',NULLIF(f->>'number','')::numeric,f->'json','manual','manual','approved',true,true,p_actor);
 END LOOP;
 INSERT INTO public.product_category_assignments(product_id,category_id,origin,status,proposed_by)
 SELECT pid,c.id,'manual_override','proposed',p_actor FROM public.product_categories c
 WHERE c.id IN (SELECT value::uuid FROM jsonb_array_elements_text(p_payload->'categoryIds')) AND c.is_active;
 IF (SELECT count(*) FROM public.product_category_assignments WHERE product_id=pid) <> jsonb_array_length(p_payload->'categoryIds') THEN RAISE EXCEPTION 'INVALID_CATEGORY'; END IF;
 INSERT INTO public.admin_product_operations(actor,request_key,payload_hash,payload,product_id) VALUES(p_actor,p_key,p_hash,p_payload,pid) RETURNING * INTO op;
 INSERT INTO public.admin_operation_events(operation_id,actor,state) VALUES(op.id,p_actor,'LOCAL_DRAFT');
 RETURN jsonb_build_object('operationId',op.id,'productId',pid,'state',op.state,'replayed',false);
END $$;

-- Compare-and-swap BEFORE any external mutation. IN_FLIGHT is never reset to LOCAL_DRAFT.
CREATE FUNCTION public.admin_claim_draft(p_actor uuid,p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE claimed uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND role::text IN ('admin','tech_admin')) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 UPDATE public.admin_product_operations SET state='IN_FLIGHT',updated_at=now() WHERE id=p_id AND state='LOCAL_DRAFT' RETURNING id INTO claimed;
 IF claimed IS NULL THEN RETURN false; END IF;
 INSERT INTO public.admin_operation_events(operation_id,actor,state) VALUES(p_id,p_actor,'IN_FLIGHT');
 RETURN true;
END $$;

CREATE FUNCTION public.admin_complete_draft(p_actor uuid,p_id uuid,p_gid text,p_links jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE op public.admin_product_operations%ROWTYPE; v jsonb; pid uuid; total integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND role::text IN ('admin','tech_admin')) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 SELECT * INTO op FROM public.admin_product_operations WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR op.state NOT IN ('IN_FLIGHT','NEEDS_RECONCILIATION','VERIFIED_DRAFT') THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
 IF op.state='VERIFIED_DRAFT' THEN
  IF op.shopify_product_gid<>p_gid THEN RAISE EXCEPTION 'MAPPING_CONFLICT'; END IF;
  RETURN jsonb_build_object('state',op.state,'productId',op.product_id);
 END IF;
 total:=jsonb_array_length(op.payload->'variants');
 IF p_gid IS NULL OR p_links IS NULL OR jsonb_typeof(p_links)<>'array' OR jsonb_array_length(p_links)<>total OR (SELECT count(DISTINCT value->>'sku') FROM jsonb_array_elements(p_links))<>total THEN RAISE EXCEPTION 'INCOMPLETE_MAPPING'; END IF;
 FOR v IN SELECT value FROM jsonb_array_elements(p_links) LOOP
  IF v->>'productGid'<>p_gid OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(op.payload->'variants') x WHERE x->>'sku'=v->>'sku') THEN RAISE EXCEPTION 'MAPPING_CONFLICT'; END IF;
  SELECT id INTO pid FROM public.products WHERE sku=v->>'sku' AND (id=op.product_id OR parent_product_id=op.product_id);
  IF pid IS NULL THEN RAISE EXCEPTION 'MAPPING_CONFLICT'; END IF;
  INSERT INTO public.admin_product_shopify_links(product_id,shopify_product_gid,shopify_variant_gid,operation_id) VALUES(pid,p_gid,v->>'variantGid',p_id);
 END LOOP;
 IF total>1 THEN INSERT INTO public.admin_product_shopify_links(product_id,shopify_product_gid,operation_id) VALUES(op.product_id,p_gid,p_id); END IF;
 UPDATE public.admin_product_operations SET state='VERIFIED_DRAFT',shopify_product_gid=p_gid,updated_at=now() WHERE id=p_id;
 INSERT INTO public.admin_operation_events(operation_id,actor,state) VALUES(p_id,p_actor,'VERIFIED_DRAFT');
 RETURN jsonb_build_object('state','VERIFIED_DRAFT','productId',op.product_id);
END $$;
REVOKE ALL ON FUNCTION public.admin_save_new_draft(uuid,uuid,text,jsonb,jsonb), public.admin_claim_draft(uuid,uuid),public.admin_complete_draft(uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_new_draft(uuid,uuid,text,jsonb,jsonb), public.admin_claim_draft(uuid,uuid),public.admin_complete_draft(uuid,uuid,text,jsonb) TO service_role;

CREATE TABLE public.admin_category_operations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor uuid NOT NULL REFERENCES auth.users(id),request_key uuid NOT NULL,
 product_id uuid NOT NULL REFERENCES public.products(id),payload_hash text NOT NULL,payload jsonb NOT NULL,
 state text NOT NULL DEFAULT 'IN_FLIGHT' CHECK(state IN ('IN_FLIGHT','VERIFIED','NEEDS_RECONCILIATION')),
 created_at timestamptz NOT NULL DEFAULT now(),verified_at timestamptz, UNIQUE(actor,request_key)
);
CREATE UNIQUE INDEX admin_category_one_pending ON public.admin_category_operations(product_id) WHERE state IN ('IN_FLIGHT','NEEDS_RECONCILIATION');
ALTER TABLE public.admin_category_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_category_operations FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.admin_category_operations TO service_role;
CREATE FUNCTION public.admin_finish_categories(p_actor uuid,p_id uuid,p_allowed uuid[])
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE op public.admin_category_operations%ROWTYPE; cid uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND role::text IN ('admin','tech_admin')) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 SELECT * INTO op FROM public.admin_category_operations WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR op.state<>'IN_FLIGHT' THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(op.payload->'categoryIds') x WHERE NOT x::uuid=ANY(p_allowed)) THEN RAISE EXCEPTION 'INVALID_CATEGORY'; END IF;
 UPDATE public.product_category_assignments SET status='rejected',is_primary=false,approved_by=NULL,approved_at=NULL
 WHERE product_id=op.product_id AND category_id=ANY(p_allowed) AND NOT category_id IN (SELECT value::uuid FROM jsonb_array_elements_text(op.payload->'categoryIds'));
 FOR cid IN SELECT value::uuid FROM jsonb_array_elements_text(op.payload->'categoryIds') LOOP
  INSERT INTO public.product_category_assignments(product_id,category_id,status,origin,proposed_by,approved_by,approved_at)
  VALUES(op.product_id,cid,'approved','manual_override',p_actor,p_actor,now())
  ON CONFLICT(product_id,category_id) DO UPDATE SET status='approved',origin='manual_override',approved_by=p_actor,approved_at=now();
 END LOOP;
 -- If the former primary was removed, retain a deterministic primary among the approved selection.
 IF jsonb_array_length(op.payload->'categoryIds')>0 AND NOT EXISTS(
  SELECT 1 FROM public.product_category_assignments
  WHERE product_id=op.product_id AND status='approved' AND is_primary
 ) THEN
  UPDATE public.product_category_assignments SET is_primary=true
  WHERE product_id=op.product_id AND category_id=(op.payload->'categoryIds'->>0)::uuid;
 END IF;
 UPDATE public.admin_category_operations SET state='VERIFIED',verified_at=now() WHERE id=p_id;
END $$;
REVOKE ALL ON FUNCTION public.admin_finish_categories(uuid,uuid,uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_finish_categories(uuid,uuid,uuid[]) TO service_role;

-- Minimal delivery delta; SHA-256 793fdc18a9c34e8575af3f9d74daac5ce0d04e666efccdaf733a3af202ba5d7c
-- Additive delivery delta; service-only grants and one-use approval journal. No client policy.
CREATE TABLE public.admin_catalog_capabilities (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id), enabled boolean NOT NULL DEFAULT false,
 capabilities text[] NOT NULL DEFAULT '{}',field_keys text[] NOT NULL DEFAULT '{}',
 approved_reference text NOT NULL CHECK(length(trim(approved_reference))>3),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(capabilities <@ ARRAY['edit','sync','drafts','images','categories','prices','publish']::text[])
);
CREATE TABLE public.admin_catalog_approvals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor uuid NOT NULL REFERENCES auth.users(id),
 action text NOT NULL,target text NOT NULL,request_key uuid NOT NULL,
 payload_hash text NOT NULL CHECK(payload_hash ~ '^[0-9a-f]{64}$'),command jsonb NOT NULL,target_snapshot jsonb NOT NULL,
 expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),finished_at timestamptz,
 state text NOT NULL DEFAULT 'PENDING' CHECK(state IN('PENDING','IN_FLIGHT','COMPLETE','REVIEW_REQUIRED')),
 result jsonb,UNIQUE(actor,request_key),CHECK(expires_at>created_at AND expires_at<=created_at+interval '15 minutes'),
 CHECK(action IN('update_field','confirm_legacy_value','reject_legacy_value','sync_field','save_new_product','create_shopify_draft','recover_shopify_draft','apply_categories','set_catalog_collections','set_catalog_prices','publish_catalog_product')),
 CHECK(jsonb_typeof(command)='object' AND jsonb_typeof(target_snapshot)='object')
);
CREATE UNIQUE INDEX admin_catalog_one_inflight ON public.admin_catalog_approvals(target) WHERE state IN('IN_FLIGHT','REVIEW_REQUIRED') AND action<>'recover_shopify_draft';
CREATE TABLE public.admin_catalog_media (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor uuid NOT NULL REFERENCES auth.users(id),request_key uuid NOT NULL,
 content_hash text NOT NULL CHECK(content_hash ~ '^[0-9a-f]{64}$'),alt text NOT NULL,
 state text NOT NULL DEFAULT 'UPLOADING' CHECK(state IN('UPLOADING','PROCESSING','READY','REVIEW_REQUIRED')),
 shopify_file_gid text,cdn_url text,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(actor,request_key)
);
ALTER TABLE public.admin_catalog_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_catalog_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_catalog_media ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_catalog_capabilities,public.admin_catalog_approvals,public.admin_catalog_media FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.admin_catalog_capabilities,public.admin_catalog_approvals,public.admin_catalog_media TO service_role;
CREATE FUNCTION public.admin_claim_catalog_approval(p_id uuid,p_actor uuid,p_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE claimed uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.admin_catalog_capabilities c JOIN public.user_roles r ON r.user_id=c.user_id
 JOIN public.admin_catalog_approvals a ON a.id=p_id AND a.actor=p_actor AND a.payload_hash=p_hash
 WHERE c.user_id=p_actor AND c.enabled AND r.role::text='editor'
 AND (CASE a.action WHEN 'update_field' THEN 'edit' WHEN 'confirm_legacy_value' THEN 'edit' WHEN 'reject_legacy_value' THEN 'edit' WHEN 'sync_field' THEN 'sync' WHEN 'set_catalog_prices' THEN 'prices' WHEN 'publish_catalog_product' THEN 'publish' WHEN 'apply_categories' THEN 'categories' WHEN 'set_catalog_collections' THEN 'categories' ELSE 'drafts' END)=ANY(c.capabilities)
 AND (a.command->>'fieldKey' IS NULL OR a.command->>'fieldKey'=ANY(c.field_keys))) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 UPDATE public.admin_catalog_approvals SET state='IN_FLIGHT'
 WHERE id=p_id AND actor=p_actor AND payload_hash=p_hash AND expires_at>now() AND (state='PENDING' OR (state='REVIEW_REQUIRED' AND action='recover_shopify_draft')) RETURNING id INTO claimed;
 RETURN claimed IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.admin_claim_catalog_approval(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_claim_catalog_approval(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_claim_draft(p_actor uuid,p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE claimed uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND role::text IN ('admin','tech_admin')) AND NOT EXISTS(SELECT 1 FROM public.admin_catalog_capabilities c JOIN public.user_roles r ON r.user_id=c.user_id WHERE c.user_id=p_actor AND c.enabled AND r.role::text='editor' AND 'drafts'=ANY(c.capabilities)) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 UPDATE public.admin_product_operations SET state='IN_FLIGHT',updated_at=now() WHERE id=p_id AND state='LOCAL_DRAFT' RETURNING id INTO claimed;
 IF claimed IS NULL THEN RETURN false; END IF;
 INSERT INTO public.admin_operation_events(operation_id,actor,state) VALUES(p_id,p_actor,'IN_FLIGHT');
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.admin_complete_draft(p_actor uuid,p_id uuid,p_gid text,p_links jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE op public.admin_product_operations%ROWTYPE; v jsonb; pid uuid; total integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND role::text IN ('admin','tech_admin')) AND NOT EXISTS(SELECT 1 FROM public.admin_catalog_capabilities c JOIN public.user_roles r ON r.user_id=c.user_id WHERE c.user_id=p_actor AND c.enabled AND r.role::text='editor' AND 'drafts'=ANY(c.capabilities)) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 SELECT * INTO op FROM public.admin_product_operations WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR op.state NOT IN ('IN_FLIGHT','NEEDS_RECONCILIATION','VERIFIED_DRAFT') THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
 IF op.state='VERIFIED_DRAFT' THEN
  IF op.shopify_product_gid<>p_gid THEN RAISE EXCEPTION 'MAPPING_CONFLICT'; END IF;
  RETURN jsonb_build_object('state',op.state,'productId',op.product_id);
 END IF;
 total:=jsonb_array_length(op.payload->'variants');
 IF p_gid IS NULL OR p_links IS NULL OR jsonb_typeof(p_links)<>'array' OR jsonb_array_length(p_links)<>total OR (SELECT count(DISTINCT value->>'sku') FROM jsonb_array_elements(p_links))<>total THEN RAISE EXCEPTION 'INCOMPLETE_MAPPING'; END IF;
 FOR v IN SELECT value FROM jsonb_array_elements(p_links) LOOP
  IF v->>'productGid'<>p_gid OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(op.payload->'variants') x WHERE x->>'sku'=v->>'sku') THEN RAISE EXCEPTION 'MAPPING_CONFLICT'; END IF;
  SELECT id INTO pid FROM public.products WHERE sku=v->>'sku' AND (id=op.product_id OR parent_product_id=op.product_id);
  IF pid IS NULL THEN RAISE EXCEPTION 'MAPPING_CONFLICT'; END IF;
  INSERT INTO public.admin_product_shopify_links(product_id,shopify_product_gid,shopify_variant_gid,operation_id) VALUES(pid,p_gid,v->>'variantGid',p_id);
 END LOOP;
 IF total>1 THEN INSERT INTO public.admin_product_shopify_links(product_id,shopify_product_gid,operation_id) VALUES(op.product_id,p_gid,p_id); END IF;
 UPDATE public.admin_product_operations SET state='VERIFIED_DRAFT',shopify_product_gid=p_gid,updated_at=now() WHERE id=p_id;
 INSERT INTO public.admin_operation_events(operation_id,actor,state) VALUES(p_id,p_actor,'VERIFIED_DRAFT');
 RETURN jsonb_build_object('state','VERIFIED_DRAFT','productId',op.product_id);
END $$;

CREATE OR REPLACE FUNCTION public.admin_finish_categories(p_actor uuid,p_id uuid,p_allowed uuid[])
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE op public.admin_category_operations%ROWTYPE; cid uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND role::text IN ('admin','tech_admin')) AND NOT EXISTS(SELECT 1 FROM public.admin_catalog_capabilities c JOIN public.user_roles r ON r.user_id=c.user_id WHERE c.user_id=p_actor AND c.enabled AND r.role::text='editor' AND 'categories'=ANY(c.capabilities)) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 SELECT * INTO op FROM public.admin_category_operations WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR op.state<>'IN_FLIGHT' THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(op.payload->'categoryIds') x WHERE NOT x::uuid=ANY(p_allowed)) THEN RAISE EXCEPTION 'INVALID_CATEGORY'; END IF;
 UPDATE public.product_category_assignments SET status='rejected',is_primary=false,approved_by=NULL,approved_at=NULL
 WHERE product_id=op.product_id AND category_id=ANY(p_allowed) AND NOT category_id IN (SELECT value::uuid FROM jsonb_array_elements_text(op.payload->'categoryIds'));
 FOR cid IN SELECT value::uuid FROM jsonb_array_elements_text(op.payload->'categoryIds') LOOP
  INSERT INTO public.product_category_assignments(product_id,category_id,status,origin,proposed_by,approved_by,approved_at)
  VALUES(op.product_id,cid,'approved','manual_override',p_actor,p_actor,now())
  ON CONFLICT(product_id,category_id) DO UPDATE SET status='approved',origin='manual_override',approved_by=p_actor,approved_at=now();
 END LOOP;
 -- If the former primary was removed, retain a deterministic primary among the approved selection.
 IF jsonb_array_length(op.payload->'categoryIds')>0 AND NOT EXISTS(
  SELECT 1 FROM public.product_category_assignments
  WHERE product_id=op.product_id AND status='approved' AND is_primary
 ) THEN
  UPDATE public.product_category_assignments SET is_primary=true
  WHERE product_id=op.product_id AND category_id=(op.payload->'categoryIds'->>0)::uuid;
 END IF;
 UPDATE public.admin_category_operations SET state='VERIFIED',verified_at=now() WHERE id=p_id;
END $$;

-- Existing service-only synchronization RPC: exact catalog grant, no client EXECUTE added.
CREATE OR REPLACE FUNCTION public.admin_complete_product_field_sync(
  p_actor uuid,
  p_product_id uuid,
  p_field_key text,
  p_expected_version integer,
  p_idempotency_key text,
  p_payload_hash text,
  p_success boolean,
  p_verified_value jsonb DEFAULT NULL,
  p_error_code text DEFAULT NULL,
  p_error_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_existing public.product_admin_command_log%ROWTYPE;
  v_cur public.product_current_values%ROWTYPE;
  v_def public.product_field_definitions%ROWTYPE;
  v_result jsonb;
  v_change_type text;
BEGIN
  IF p_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'UNAUTHENTICATED');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = p_actor AND role::text IN ('admin','tech_admin')
  ) AND NOT EXISTS(SELECT 1 FROM public.admin_catalog_capabilities c JOIN public.user_roles r ON r.user_id=c.user_id WHERE c.user_id=p_actor AND c.enabled AND r.role::text='editor' AND 'sync'=ANY(c.capabilities) AND p_field_key=ANY(c.field_keys)) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'VALIDATION_ERROR');
  END IF;

  SELECT * INTO v_existing
    FROM public.product_admin_command_log
   WHERE actor = p_actor AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.payload_hash IS DISTINCT FROM p_payload_hash THEN
      RETURN jsonb_build_object('ok', false, 'code', 'IDEMPOTENCY_CONFLICT');
    END IF;
    RETURN v_existing.result_json || jsonb_build_object('replayed', true);
  END IF;

  SELECT * INTO v_def
    FROM public.product_field_definitions
   WHERE key = p_field_key;
  IF NOT FOUND OR NOT v_def.publishable
     OR COALESCE(v_def.shopify_mapping, '{}'::jsonb) = '{}'::jsonb THEN
    RETURN jsonb_build_object('ok', false, 'code', 'BLOCK_SYNC');
  END IF;

  SELECT * INTO v_cur
    FROM public.product_current_values
   WHERE product_id = p_product_id AND field_key = p_field_key
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;
  IF v_cur.version <> p_expected_version THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'VERSION_CONFLICT',
      'currentVersion', v_cur.version
    );
  END IF;
  IF v_cur.review_status <> 'approved' OR v_cur.publish_blocked THEN
    RETURN jsonb_build_object('ok', false, 'code', 'BLOCK_SYNC');
  END IF;
  IF NOT p_success AND p_error_code NOT IN (
    'BLOCK_SYNC','STATE_DRIFT','SYNC_VERIFY_FAILED','SHOPIFY_WRITE_FAILED'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'VALIDATION_ERROR');
  END IF;

  v_change_type := CASE WHEN p_success THEN 'publish' ELSE 'publish_failed' END;

  UPDATE public.product_current_values
     SET publish_state = CASE WHEN p_success THEN 'published' ELSE 'failed' END,
         published_at = CASE WHEN p_success THEN now() ELSE published_at END,
         shopify_verified_value = CASE
           WHEN p_success THEN p_verified_value
           ELSE shopify_verified_value
         END,
         shopify_verified_at = CASE
           WHEN p_success THEN now()
           ELSE shopify_verified_at
         END,
         shopify_sync_error_code = CASE WHEN p_success THEN NULL ELSE p_error_code END,
         shopify_sync_error_message = CASE
           WHEN p_success THEN NULL
           ELSE left(COALESCE(p_error_message, 'Sincronizzazione non riuscita'), 500)
         END,
         updated_by = p_actor,
         updated_at = now()
   WHERE id = v_cur.id;

  INSERT INTO public.product_field_history (
    sku, entity_type, field_key, previous_value, new_value, change_type,
    actor, product_id, previous_origin, new_origin,
    previous_review_status, new_review_status,
    previous_version, new_version, request_key
  ) VALUES (
    v_cur.sku, v_cur.entity_type, v_cur.field_key,
    COALESCE(v_cur.value_json, to_jsonb(v_cur.value_text), to_jsonb(v_cur.value_number)),
    COALESCE(v_cur.value_json, to_jsonb(v_cur.value_text), to_jsonb(v_cur.value_number)),
    v_change_type, p_actor, v_cur.product_id,
    v_cur.value_origin, v_cur.value_origin,
    v_cur.review_status, v_cur.review_status,
    v_cur.version, v_cur.version, p_idempotency_key
  );

  v_result := jsonb_build_object(
    'ok', p_success,
    'code', CASE WHEN p_success THEN 'SYNCED' ELSE p_error_code END,
    'productId', p_product_id,
    'fieldKey', p_field_key,
    'version', v_cur.version,
    'syncState', CASE WHEN p_success THEN 'SYNCED' ELSE 'SYNC_ERROR' END
  );

  INSERT INTO public.product_admin_command_log (
    actor, idempotency_key, action, payload_hash, product_id, field_key, result_json
  ) VALUES (
    p_actor, p_idempotency_key, 'sync_field', p_payload_hash,
    p_product_id, p_field_key, v_result
  );
  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_existing
      FROM public.product_admin_command_log
     WHERE actor = p_actor AND idempotency_key = p_idempotency_key;
    IF FOUND AND v_existing.payload_hash = p_payload_hash THEN
      RETURN v_existing.result_json || jsonb_build_object('replayed', true);
    END IF;
    RETURN jsonb_build_object('ok', false, 'code', 'IDEMPOTENCY_CONFLICT');
END;
$function$;

-- Reassert service-only execution after replacing bodies; never expose actor parameters to clients.
REVOKE ALL ON FUNCTION public.admin_claim_draft(uuid,uuid), public.admin_complete_draft(uuid,uuid,text,jsonb), public.admin_finish_categories(uuid,uuid,uuid[]), public.admin_complete_product_field_sync(uuid,uuid,text,integer,text,text,boolean,jsonb,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_claim_draft(uuid,uuid), public.admin_complete_draft(uuid,uuid,text,jsonb), public.admin_finish_categories(uuid,uuid,uuid[]), public.admin_complete_product_field_sync(uuid,uuid,text,integer,text,text,boolean,jsonb,text,text) TO service_role;

-- Provider defaults can grant broader service privileges: normalize only the new journals.
REVOKE ALL ON public.admin_product_operations,public.admin_product_shopify_links,public.admin_operation_events,public.admin_category_operations,public.admin_catalog_capabilities,public.admin_catalog_approvals,public.admin_catalog_media FROM service_role;
GRANT SELECT,INSERT,UPDATE ON public.admin_product_operations,public.admin_product_shopify_links,public.admin_category_operations,public.admin_catalog_capabilities,public.admin_catalog_approvals,public.admin_catalog_media TO service_role;
GRANT SELECT,INSERT ON public.admin_operation_events TO service_role;

DO $post$
DECLARE t text; f text; r text;
BEGIN
 FOREACH t IN ARRAY ARRAY['admin_product_operations','admin_product_shopify_links','admin_operation_events','admin_category_operations','admin_catalog_capabilities','admin_catalog_approvals','admin_catalog_media'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.'||t) AND relkind='r' AND relrowsecurity) OR EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=to_regclass('public.'||t)) THEN RAISE EXCEPTION 'RLS/policy mismatch: %',t; END IF;
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF has_table_privilege(r,'public.'||t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') THEN RAISE EXCEPTION 'Client privilege: % %',r,t; END IF;
  END LOOP;
  IF NOT has_table_privilege('service_role','public.'||t,'SELECT') THEN RAISE EXCEPTION 'Service SELECT absent: %',t; END IF;
  IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t) THEN RAISE EXCEPTION 'Unexpected policy: %',t; END IF;
 END LOOP;
 FOREACH f IN ARRAY ARRAY['admin_save_new_draft(uuid,uuid,text,jsonb,jsonb)','admin_claim_draft(uuid,uuid)','admin_complete_draft(uuid,uuid,text,jsonb)','admin_finish_categories(uuid,uuid,uuid[])','admin_claim_catalog_approval(uuid,uuid,text)','admin_complete_product_field_sync(uuid,uuid,text,integer,text,text,boolean,jsonb,text,text)'] LOOP
  IF NOT has_function_privilege('service_role','public.'||f,'EXECUTE') OR has_function_privilege('anon','public.'||f,'EXECUTE') OR has_function_privilege('authenticated','public.'||f,'EXECUTE') THEN RAISE EXCEPTION 'RPC ACL mismatch: %',f; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.'||f) AND proconfig @> ARRAY['search_path=""']) THEN RAISE EXCEPTION 'Unsafe search_path: %',f; END IF;
 END LOOP;
END $post$;
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES
('20261031184521','admin_operational_drafts',ARRAY[$og_original$-- NOT APPLIED LIVE. Operation journal, not an independent product catalogue.
CREATE TABLE public.admin_product_operations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor uuid NOT NULL REFERENCES auth.users(id),
 request_key uuid NOT NULL, payload jsonb NOT NULL, payload_hash text NOT NULL,
 product_id uuid NOT NULL REFERENCES public.products(id),
 state text NOT NULL DEFAULT 'LOCAL_DRAFT' CHECK(state IN ('LOCAL_DRAFT','IN_FLIGHT','NEEDS_RECONCILIATION','VERIFIED_DRAFT')),
 shopify_product_gid text UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(actor,request_key), CHECK(jsonb_typeof(payload)='object')
);
CREATE TABLE public.admin_product_shopify_links (
 product_id uuid PRIMARY KEY REFERENCES public.products(id),
 shopify_product_gid text NOT NULL CHECK(shopify_product_gid ~ '^gid://shopify/Product/[0-9]+$'),
 shopify_variant_gid text UNIQUE CHECK(shopify_variant_gid ~ '^gid://shopify/ProductVariant/[0-9]+$'),
 operation_id uuid NOT NULL REFERENCES public.admin_product_operations(id), verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.admin_operation_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation_id uuid NOT NULL REFERENCES public.admin_product_operations(id),
 actor uuid NOT NULL REFERENCES auth.users(id), state text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_product_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_product_shopify_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_operation_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_product_operations, public.admin_product_shopify_links, public.admin_operation_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.admin_product_operations, public.admin_product_shopify_links TO service_role;
GRANT SELECT, INSERT ON public.admin_operation_events TO service_role;

CREATE FUNCTION public.admin_save_new_draft(p_actor uuid, p_key uuid, p_hash text, p_payload jsonb, p_fields jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE op public.admin_product_operations%ROWTYPE; pid uuid; vid uuid; v jsonb; f jsonb; n integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND role::text IN ('admin','tech_admin','editor')) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text||p_key::text,0));
 SELECT * INTO op FROM public.admin_product_operations WHERE actor=p_actor AND request_key=p_key;
 IF FOUND THEN
  IF op.payload_hash<>p_hash OR op.payload<>p_payload THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
  RETURN jsonb_build_object('operationId',op.id,'productId',op.product_id,'state',op.state,'replayed',true);
 END IF;
 IF p_hash IS NULL OR length(p_hash)<>64 OR jsonb_typeof(p_payload->'variants')<>'array' OR jsonb_array_length(p_payload->'variants') NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'INVALID_DRAFT'; END IF;
 n:=jsonb_array_length(p_payload->'variants');
 INSERT INTO public.products(sku,entity_type,legacy_source) VALUES(p_payload->>'sku',CASE WHEN n=1 THEN 'simple' ELSE 'variable' END,'manuale') RETURNING id INTO pid;
 FOR v IN SELECT value FROM jsonb_array_elements(p_payload->'variants') LOOP
  IF n=1 THEN vid:=pid;
  ELSE INSERT INTO public.products(sku,entity_type,parent_product_id,legacy_source) VALUES(v->>'sku','variation',pid,'manuale') RETURNING id INTO vid; END IF;
 END LOOP;
 -- Only registry-validated editorial values supplied by the server; no inventory/publication fields.
 FOR f IN SELECT value FROM jsonb_array_elements(p_fields) LOOP
  IF NOT EXISTS(SELECT 1 FROM public.product_field_definitions WHERE key=f->>'key' AND visible AND editable AND field_group NOT IN ('inventory','system','shopify_state','other_imported')) THEN RAISE EXCEPTION 'INVALID_FIELD'; END IF;
  INSERT INTO public.product_current_values(product_id,sku,entity_type,field_key,value_text,value_number,value_json,origin,value_origin,review_status,publish_blocked,protected_on_reimport,updated_by)
  VALUES(pid,p_payload->>'sku','product',f->>'key',f->>'text',NULLIF(f->>'number','')::numeric,f->'json','manual','manual','approved',true,true,p_actor);
 END LOOP;
 INSERT INTO public.product_category_assignments(product_id,category_id,origin,status,proposed_by)
 SELECT pid,c.id,'manual_override','proposed',p_actor FROM public.product_categories c
 WHERE c.id IN (SELECT value::uuid FROM jsonb_array_elements_text(p_payload->'categoryIds')) AND c.is_active;
 IF (SELECT count(*) FROM public.product_category_assignments WHERE product_id=pid) <> jsonb_array_length(p_payload->'categoryIds') THEN RAISE EXCEPTION 'INVALID_CATEGORY'; END IF;
 INSERT INTO public.admin_product_operations(actor,request_key,payload_hash,payload,product_id) VALUES(p_actor,p_key,p_hash,p_payload,pid) RETURNING * INTO op;
 INSERT INTO public.admin_operation_events(operation_id,actor,state) VALUES(op.id,p_actor,'LOCAL_DRAFT');
 RETURN jsonb_build_object('operationId',op.id,'productId',pid,'state',op.state,'replayed',false);
END $$;

-- Compare-and-swap BEFORE any external mutation. IN_FLIGHT is never reset to LOCAL_DRAFT.
CREATE FUNCTION public.admin_claim_draft(p_actor uuid,p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE claimed uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND role::text IN ('admin','tech_admin')) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 UPDATE public.admin_product_operations SET state='IN_FLIGHT',updated_at=now() WHERE id=p_id AND state='LOCAL_DRAFT' RETURNING id INTO claimed;
 IF claimed IS NULL THEN RETURN false; END IF;
 INSERT INTO public.admin_operation_events(operation_id,actor,state) VALUES(p_id,p_actor,'IN_FLIGHT');
 RETURN true;
END $$;

CREATE FUNCTION public.admin_complete_draft(p_actor uuid,p_id uuid,p_gid text,p_links jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE op public.admin_product_operations%ROWTYPE; v jsonb; pid uuid; total integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND role::text IN ('admin','tech_admin')) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 SELECT * INTO op FROM public.admin_product_operations WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR op.state NOT IN ('IN_FLIGHT','NEEDS_RECONCILIATION','VERIFIED_DRAFT') THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
 IF op.state='VERIFIED_DRAFT' THEN
  IF op.shopify_product_gid<>p_gid THEN RAISE EXCEPTION 'MAPPING_CONFLICT'; END IF;
  RETURN jsonb_build_object('state',op.state,'productId',op.product_id);
 END IF;
 total:=jsonb_array_length(op.payload->'variants');
 IF p_gid IS NULL OR p_links IS NULL OR jsonb_typeof(p_links)<>'array' OR jsonb_array_length(p_links)<>total OR (SELECT count(DISTINCT value->>'sku') FROM jsonb_array_elements(p_links))<>total THEN RAISE EXCEPTION 'INCOMPLETE_MAPPING'; END IF;
 FOR v IN SELECT value FROM jsonb_array_elements(p_links) LOOP
  IF v->>'productGid'<>p_gid OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(op.payload->'variants') x WHERE x->>'sku'=v->>'sku') THEN RAISE EXCEPTION 'MAPPING_CONFLICT'; END IF;
  SELECT id INTO pid FROM public.products WHERE sku=v->>'sku' AND (id=op.product_id OR parent_product_id=op.product_id);
  IF pid IS NULL THEN RAISE EXCEPTION 'MAPPING_CONFLICT'; END IF;
  INSERT INTO public.admin_product_shopify_links(product_id,shopify_product_gid,shopify_variant_gid,operation_id) VALUES(pid,p_gid,v->>'variantGid',p_id);
 END LOOP;
 IF total>1 THEN INSERT INTO public.admin_product_shopify_links(product_id,shopify_product_gid,operation_id) VALUES(op.product_id,p_gid,p_id); END IF;
 UPDATE public.admin_product_operations SET state='VERIFIED_DRAFT',shopify_product_gid=p_gid,updated_at=now() WHERE id=p_id;
 INSERT INTO public.admin_operation_events(operation_id,actor,state) VALUES(p_id,p_actor,'VERIFIED_DRAFT');
 RETURN jsonb_build_object('state','VERIFIED_DRAFT','productId',op.product_id);
END $$;
REVOKE ALL ON FUNCTION public.admin_save_new_draft(uuid,uuid,text,jsonb,jsonb), public.admin_claim_draft(uuid,uuid),public.admin_complete_draft(uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_new_draft(uuid,uuid,text,jsonb,jsonb), public.admin_claim_draft(uuid,uuid),public.admin_complete_draft(uuid,uuid,text,jsonb) TO service_role;

CREATE TABLE public.admin_category_operations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor uuid NOT NULL REFERENCES auth.users(id),request_key uuid NOT NULL,
 product_id uuid NOT NULL REFERENCES public.products(id),payload_hash text NOT NULL,payload jsonb NOT NULL,
 state text NOT NULL DEFAULT 'IN_FLIGHT' CHECK(state IN ('IN_FLIGHT','VERIFIED','NEEDS_RECONCILIATION')),
 created_at timestamptz NOT NULL DEFAULT now(),verified_at timestamptz, UNIQUE(actor,request_key)
);
CREATE UNIQUE INDEX admin_category_one_pending ON public.admin_category_operations(product_id) WHERE state IN ('IN_FLIGHT','NEEDS_RECONCILIATION');
ALTER TABLE public.admin_category_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_category_operations FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.admin_category_operations TO service_role;
CREATE FUNCTION public.admin_finish_categories(p_actor uuid,p_id uuid,p_allowed uuid[])
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE op public.admin_category_operations%ROWTYPE; cid uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND role::text IN ('admin','tech_admin')) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 SELECT * INTO op FROM public.admin_category_operations WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR op.state<>'IN_FLIGHT' THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(op.payload->'categoryIds') x WHERE NOT x::uuid=ANY(p_allowed)) THEN RAISE EXCEPTION 'INVALID_CATEGORY'; END IF;
 UPDATE public.product_category_assignments SET status='rejected',is_primary=false,approved_by=NULL,approved_at=NULL
 WHERE product_id=op.product_id AND category_id=ANY(p_allowed) AND NOT category_id IN (SELECT value::uuid FROM jsonb_array_elements_text(op.payload->'categoryIds'));
 FOR cid IN SELECT value::uuid FROM jsonb_array_elements_text(op.payload->'categoryIds') LOOP
  INSERT INTO public.product_category_assignments(product_id,category_id,status,origin,proposed_by,approved_by,approved_at)
  VALUES(op.product_id,cid,'approved','manual_override',p_actor,p_actor,now())
  ON CONFLICT(product_id,category_id) DO UPDATE SET status='approved',origin='manual_override',approved_by=p_actor,approved_at=now();
 END LOOP;
 -- If the former primary was removed, retain a deterministic primary among the approved selection.
 IF jsonb_array_length(op.payload->'categoryIds')>0 AND NOT EXISTS(
  SELECT 1 FROM public.product_category_assignments
  WHERE product_id=op.product_id AND status='approved' AND is_primary
 ) THEN
  UPDATE public.product_category_assignments SET is_primary=true
  WHERE product_id=op.product_id AND category_id=(op.payload->'categoryIds'->>0)::uuid;
 END IF;
 UPDATE public.admin_category_operations SET state='VERIFIED',verified_at=now() WHERE id=p_id;
END $$;
REVOKE ALL ON FUNCTION public.admin_finish_categories(uuid,uuid,uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_finish_categories(uuid,uuid,uuid[]) TO service_role;
$og_original$]),
('20261110135043','admin_catalog_client_delivery',ARRAY[$og_delta$-- Additive delivery delta; service-only grants and one-use approval journal. No client policy.
CREATE TABLE public.admin_catalog_capabilities (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id), enabled boolean NOT NULL DEFAULT false,
 capabilities text[] NOT NULL DEFAULT '{}',field_keys text[] NOT NULL DEFAULT '{}',
 approved_reference text NOT NULL CHECK(length(trim(approved_reference))>3),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(capabilities <@ ARRAY['edit','sync','drafts','images','categories','prices','publish']::text[])
);
CREATE TABLE public.admin_catalog_approvals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor uuid NOT NULL REFERENCES auth.users(id),
 action text NOT NULL,target text NOT NULL,request_key uuid NOT NULL,
 payload_hash text NOT NULL CHECK(payload_hash ~ '^[0-9a-f]{64}$'),command jsonb NOT NULL,target_snapshot jsonb NOT NULL,
 expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),finished_at timestamptz,
 state text NOT NULL DEFAULT 'PENDING' CHECK(state IN('PENDING','IN_FLIGHT','COMPLETE','REVIEW_REQUIRED')),
 result jsonb,UNIQUE(actor,request_key),CHECK(expires_at>created_at AND expires_at<=created_at+interval '15 minutes'),
 CHECK(action IN('update_field','confirm_legacy_value','reject_legacy_value','sync_field','save_new_product','create_shopify_draft','recover_shopify_draft','apply_categories','set_catalog_collections','set_catalog_prices','publish_catalog_product')),
 CHECK(jsonb_typeof(command)='object' AND jsonb_typeof(target_snapshot)='object')
);
CREATE UNIQUE INDEX admin_catalog_one_inflight ON public.admin_catalog_approvals(target) WHERE state IN('IN_FLIGHT','REVIEW_REQUIRED') AND action<>'recover_shopify_draft';
CREATE TABLE public.admin_catalog_media (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor uuid NOT NULL REFERENCES auth.users(id),request_key uuid NOT NULL,
 content_hash text NOT NULL CHECK(content_hash ~ '^[0-9a-f]{64}$'),alt text NOT NULL,
 state text NOT NULL DEFAULT 'UPLOADING' CHECK(state IN('UPLOADING','PROCESSING','READY','REVIEW_REQUIRED')),
 shopify_file_gid text,cdn_url text,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(actor,request_key)
);
ALTER TABLE public.admin_catalog_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_catalog_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_catalog_media ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_catalog_capabilities,public.admin_catalog_approvals,public.admin_catalog_media FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.admin_catalog_capabilities,public.admin_catalog_approvals,public.admin_catalog_media TO service_role;
CREATE FUNCTION public.admin_claim_catalog_approval(p_id uuid,p_actor uuid,p_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE claimed uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.admin_catalog_capabilities c JOIN public.user_roles r ON r.user_id=c.user_id
 JOIN public.admin_catalog_approvals a ON a.id=p_id AND a.actor=p_actor AND a.payload_hash=p_hash
 WHERE c.user_id=p_actor AND c.enabled AND r.role::text='editor'
 AND (CASE a.action WHEN 'update_field' THEN 'edit' WHEN 'confirm_legacy_value' THEN 'edit' WHEN 'reject_legacy_value' THEN 'edit' WHEN 'sync_field' THEN 'sync' WHEN 'set_catalog_prices' THEN 'prices' WHEN 'publish_catalog_product' THEN 'publish' WHEN 'apply_categories' THEN 'categories' WHEN 'set_catalog_collections' THEN 'categories' ELSE 'drafts' END)=ANY(c.capabilities)
 AND (a.command->>'fieldKey' IS NULL OR a.command->>'fieldKey'=ANY(c.field_keys))) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 UPDATE public.admin_catalog_approvals SET state='IN_FLIGHT'
 WHERE id=p_id AND actor=p_actor AND payload_hash=p_hash AND expires_at>now() AND (state='PENDING' OR (state='REVIEW_REQUIRED' AND action='recover_shopify_draft')) RETURNING id INTO claimed;
 RETURN claimed IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.admin_claim_catalog_approval(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_claim_catalog_approval(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_claim_draft(p_actor uuid,p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE claimed uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND role::text IN ('admin','tech_admin')) AND NOT EXISTS(SELECT 1 FROM public.admin_catalog_capabilities c JOIN public.user_roles r ON r.user_id=c.user_id WHERE c.user_id=p_actor AND c.enabled AND r.role::text='editor' AND 'drafts'=ANY(c.capabilities)) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 UPDATE public.admin_product_operations SET state='IN_FLIGHT',updated_at=now() WHERE id=p_id AND state='LOCAL_DRAFT' RETURNING id INTO claimed;
 IF claimed IS NULL THEN RETURN false; END IF;
 INSERT INTO public.admin_operation_events(operation_id,actor,state) VALUES(p_id,p_actor,'IN_FLIGHT');
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.admin_complete_draft(p_actor uuid,p_id uuid,p_gid text,p_links jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE op public.admin_product_operations%ROWTYPE; v jsonb; pid uuid; total integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND role::text IN ('admin','tech_admin')) AND NOT EXISTS(SELECT 1 FROM public.admin_catalog_capabilities c JOIN public.user_roles r ON r.user_id=c.user_id WHERE c.user_id=p_actor AND c.enabled AND r.role::text='editor' AND 'drafts'=ANY(c.capabilities)) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 SELECT * INTO op FROM public.admin_product_operations WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR op.state NOT IN ('IN_FLIGHT','NEEDS_RECONCILIATION','VERIFIED_DRAFT') THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
 IF op.state='VERIFIED_DRAFT' THEN
  IF op.shopify_product_gid<>p_gid THEN RAISE EXCEPTION 'MAPPING_CONFLICT'; END IF;
  RETURN jsonb_build_object('state',op.state,'productId',op.product_id);
 END IF;
 total:=jsonb_array_length(op.payload->'variants');
 IF p_gid IS NULL OR p_links IS NULL OR jsonb_typeof(p_links)<>'array' OR jsonb_array_length(p_links)<>total OR (SELECT count(DISTINCT value->>'sku') FROM jsonb_array_elements(p_links))<>total THEN RAISE EXCEPTION 'INCOMPLETE_MAPPING'; END IF;
 FOR v IN SELECT value FROM jsonb_array_elements(p_links) LOOP
  IF v->>'productGid'<>p_gid OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(op.payload->'variants') x WHERE x->>'sku'=v->>'sku') THEN RAISE EXCEPTION 'MAPPING_CONFLICT'; END IF;
  SELECT id INTO pid FROM public.products WHERE sku=v->>'sku' AND (id=op.product_id OR parent_product_id=op.product_id);
  IF pid IS NULL THEN RAISE EXCEPTION 'MAPPING_CONFLICT'; END IF;
  INSERT INTO public.admin_product_shopify_links(product_id,shopify_product_gid,shopify_variant_gid,operation_id) VALUES(pid,p_gid,v->>'variantGid',p_id);
 END LOOP;
 IF total>1 THEN INSERT INTO public.admin_product_shopify_links(product_id,shopify_product_gid,operation_id) VALUES(op.product_id,p_gid,p_id); END IF;
 UPDATE public.admin_product_operations SET state='VERIFIED_DRAFT',shopify_product_gid=p_gid,updated_at=now() WHERE id=p_id;
 INSERT INTO public.admin_operation_events(operation_id,actor,state) VALUES(p_id,p_actor,'VERIFIED_DRAFT');
 RETURN jsonb_build_object('state','VERIFIED_DRAFT','productId',op.product_id);
END $$;

CREATE OR REPLACE FUNCTION public.admin_finish_categories(p_actor uuid,p_id uuid,p_allowed uuid[])
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE op public.admin_category_operations%ROWTYPE; cid uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND role::text IN ('admin','tech_admin')) AND NOT EXISTS(SELECT 1 FROM public.admin_catalog_capabilities c JOIN public.user_roles r ON r.user_id=c.user_id WHERE c.user_id=p_actor AND c.enabled AND r.role::text='editor' AND 'categories'=ANY(c.capabilities)) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 SELECT * INTO op FROM public.admin_category_operations WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR op.state<>'IN_FLIGHT' THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(op.payload->'categoryIds') x WHERE NOT x::uuid=ANY(p_allowed)) THEN RAISE EXCEPTION 'INVALID_CATEGORY'; END IF;
 UPDATE public.product_category_assignments SET status='rejected',is_primary=false,approved_by=NULL,approved_at=NULL
 WHERE product_id=op.product_id AND category_id=ANY(p_allowed) AND NOT category_id IN (SELECT value::uuid FROM jsonb_array_elements_text(op.payload->'categoryIds'));
 FOR cid IN SELECT value::uuid FROM jsonb_array_elements_text(op.payload->'categoryIds') LOOP
  INSERT INTO public.product_category_assignments(product_id,category_id,status,origin,proposed_by,approved_by,approved_at)
  VALUES(op.product_id,cid,'approved','manual_override',p_actor,p_actor,now())
  ON CONFLICT(product_id,category_id) DO UPDATE SET status='approved',origin='manual_override',approved_by=p_actor,approved_at=now();
 END LOOP;
 -- If the former primary was removed, retain a deterministic primary among the approved selection.
 IF jsonb_array_length(op.payload->'categoryIds')>0 AND NOT EXISTS(
  SELECT 1 FROM public.product_category_assignments
  WHERE product_id=op.product_id AND status='approved' AND is_primary
 ) THEN
  UPDATE public.product_category_assignments SET is_primary=true
  WHERE product_id=op.product_id AND category_id=(op.payload->'categoryIds'->>0)::uuid;
 END IF;
 UPDATE public.admin_category_operations SET state='VERIFIED',verified_at=now() WHERE id=p_id;
END $$;

-- Existing service-only synchronization RPC: exact catalog grant, no client EXECUTE added.
CREATE OR REPLACE FUNCTION public.admin_complete_product_field_sync(
  p_actor uuid,
  p_product_id uuid,
  p_field_key text,
  p_expected_version integer,
  p_idempotency_key text,
  p_payload_hash text,
  p_success boolean,
  p_verified_value jsonb DEFAULT NULL,
  p_error_code text DEFAULT NULL,
  p_error_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_existing public.product_admin_command_log%ROWTYPE;
  v_cur public.product_current_values%ROWTYPE;
  v_def public.product_field_definitions%ROWTYPE;
  v_result jsonb;
  v_change_type text;
BEGIN
  IF p_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'UNAUTHENTICATED');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = p_actor AND role::text IN ('admin','tech_admin')
  ) AND NOT EXISTS(SELECT 1 FROM public.admin_catalog_capabilities c JOIN public.user_roles r ON r.user_id=c.user_id WHERE c.user_id=p_actor AND c.enabled AND r.role::text='editor' AND 'sync'=ANY(c.capabilities) AND p_field_key=ANY(c.field_keys)) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'VALIDATION_ERROR');
  END IF;

  SELECT * INTO v_existing
    FROM public.product_admin_command_log
   WHERE actor = p_actor AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.payload_hash IS DISTINCT FROM p_payload_hash THEN
      RETURN jsonb_build_object('ok', false, 'code', 'IDEMPOTENCY_CONFLICT');
    END IF;
    RETURN v_existing.result_json || jsonb_build_object('replayed', true);
  END IF;

  SELECT * INTO v_def
    FROM public.product_field_definitions
   WHERE key = p_field_key;
  IF NOT FOUND OR NOT v_def.publishable
     OR COALESCE(v_def.shopify_mapping, '{}'::jsonb) = '{}'::jsonb THEN
    RETURN jsonb_build_object('ok', false, 'code', 'BLOCK_SYNC');
  END IF;

  SELECT * INTO v_cur
    FROM public.product_current_values
   WHERE product_id = p_product_id AND field_key = p_field_key
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;
  IF v_cur.version <> p_expected_version THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'VERSION_CONFLICT',
      'currentVersion', v_cur.version
    );
  END IF;
  IF v_cur.review_status <> 'approved' OR v_cur.publish_blocked THEN
    RETURN jsonb_build_object('ok', false, 'code', 'BLOCK_SYNC');
  END IF;
  IF NOT p_success AND p_error_code NOT IN (
    'BLOCK_SYNC','STATE_DRIFT','SYNC_VERIFY_FAILED','SHOPIFY_WRITE_FAILED'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'VALIDATION_ERROR');
  END IF;

  v_change_type := CASE WHEN p_success THEN 'publish' ELSE 'publish_failed' END;

  UPDATE public.product_current_values
     SET publish_state = CASE WHEN p_success THEN 'published' ELSE 'failed' END,
         published_at = CASE WHEN p_success THEN now() ELSE published_at END,
         shopify_verified_value = CASE
           WHEN p_success THEN p_verified_value
           ELSE shopify_verified_value
         END,
         shopify_verified_at = CASE
           WHEN p_success THEN now()
           ELSE shopify_verified_at
         END,
         shopify_sync_error_code = CASE WHEN p_success THEN NULL ELSE p_error_code END,
         shopify_sync_error_message = CASE
           WHEN p_success THEN NULL
           ELSE left(COALESCE(p_error_message, 'Sincronizzazione non riuscita'), 500)
         END,
         updated_by = p_actor,
         updated_at = now()
   WHERE id = v_cur.id;

  INSERT INTO public.product_field_history (
    sku, entity_type, field_key, previous_value, new_value, change_type,
    actor, product_id, previous_origin, new_origin,
    previous_review_status, new_review_status,
    previous_version, new_version, request_key
  ) VALUES (
    v_cur.sku, v_cur.entity_type, v_cur.field_key,
    COALESCE(v_cur.value_json, to_jsonb(v_cur.value_text), to_jsonb(v_cur.value_number)),
    COALESCE(v_cur.value_json, to_jsonb(v_cur.value_text), to_jsonb(v_cur.value_number)),
    v_change_type, p_actor, v_cur.product_id,
    v_cur.value_origin, v_cur.value_origin,
    v_cur.review_status, v_cur.review_status,
    v_cur.version, v_cur.version, p_idempotency_key
  );

  v_result := jsonb_build_object(
    'ok', p_success,
    'code', CASE WHEN p_success THEN 'SYNCED' ELSE p_error_code END,
    'productId', p_product_id,
    'fieldKey', p_field_key,
    'version', v_cur.version,
    'syncState', CASE WHEN p_success THEN 'SYNCED' ELSE 'SYNC_ERROR' END
  );

  INSERT INTO public.product_admin_command_log (
    actor, idempotency_key, action, payload_hash, product_id, field_key, result_json
  ) VALUES (
    p_actor, p_idempotency_key, 'sync_field', p_payload_hash,
    p_product_id, p_field_key, v_result
  );
  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_existing
      FROM public.product_admin_command_log
     WHERE actor = p_actor AND idempotency_key = p_idempotency_key;
    IF FOUND AND v_existing.payload_hash = p_payload_hash THEN
      RETURN v_existing.result_json || jsonb_build_object('replayed', true);
    END IF;
    RETURN jsonb_build_object('ok', false, 'code', 'IDEMPOTENCY_CONFLICT');
END;
$function$;

-- Reassert service-only execution after replacing bodies; never expose actor parameters to clients.
REVOKE ALL ON FUNCTION public.admin_claim_draft(uuid,uuid), public.admin_complete_draft(uuid,uuid,text,jsonb), public.admin_finish_categories(uuid,uuid,uuid[]), public.admin_complete_product_field_sync(uuid,uuid,text,integer,text,text,boolean,jsonb,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_claim_draft(uuid,uuid), public.admin_complete_draft(uuid,uuid,text,jsonb), public.admin_finish_categories(uuid,uuid,uuid[]), public.admin_complete_product_field_sync(uuid,uuid,text,integer,text,text,boolean,jsonb,text,text) TO service_role;

-- Provider defaults can grant broader service privileges: normalize only the new journals.
REVOKE ALL ON public.admin_product_operations,public.admin_product_shopify_links,public.admin_operation_events,public.admin_category_operations,public.admin_catalog_capabilities,public.admin_catalog_approvals,public.admin_catalog_media FROM service_role;
GRANT SELECT,INSERT,UPDATE ON public.admin_product_operations,public.admin_product_shopify_links,public.admin_category_operations,public.admin_catalog_capabilities,public.admin_catalog_approvals,public.admin_catalog_media TO service_role;
GRANT SELECT,INSERT ON public.admin_operation_events TO service_role;
$og_delta$]);