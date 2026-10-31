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
 UPDATE public.admin_category_operations SET state='VERIFIED',verified_at=now() WHERE id=p_id;
END $$;
REVOKE ALL ON FUNCTION public.admin_finish_categories(uuid,uuid,uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_finish_categories(uuid,uuid,uuid[]) TO service_role;
