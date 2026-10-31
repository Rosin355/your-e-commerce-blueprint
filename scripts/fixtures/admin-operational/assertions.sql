\set ON_ERROR_STOP on
INSERT INTO auth.users VALUES('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002'),('00000000-0000-4000-8000-000000000003');
INSERT INTO public.user_roles VALUES('00000000-0000-4000-8000-000000000001','admin'),('00000000-0000-4000-8000-000000000002','editor'),('00000000-0000-4000-8000-000000000003','user');
INSERT INTO public.product_field_definitions(key,label,editable,visible) VALUES('title','Nome',true,true);
SET ROLE service_role;
DO $$
DECLARE a uuid:='00000000-0000-4000-8000-000000000002'; adm uuid:='00000000-0000-4000-8000-000000000001'; k uuid:='10000000-0000-4000-8000-000000000001'; op jsonb; replay jsonb; payload jsonb:='{"sku":"TEST-LOCAL","variants":[{"sku":"TEST-LOCAL"}],"categoryIds":[]}'::jsonb; blocked boolean;
BEGIN
 op:=public.admin_save_new_draft(a,k,repeat('a',64),payload,'[{"key":"title","text":"Simulazione locale"}]');
 replay:=public.admin_save_new_draft(a,k,repeat('a',64),payload,'[{"key":"title","text":"Simulazione locale"}]');
 ASSERT op->>'productId'=replay->>'productId' AND (replay->>'replayed')::boolean,'Replay identity failed';
 ASSERT (SELECT count(*) FROM public.products)=1,'Duplicate product';
 blocked:=false; BEGIN PERFORM public.admin_save_new_draft(a,k,repeat('b',64),payload,'[]'); EXCEPTION WHEN OTHERS THEN blocked:=true; END; ASSERT blocked,'Changed payload accepted';
 blocked:=false; BEGIN PERFORM public.admin_save_new_draft(a,gen_random_uuid(),repeat('a',64),payload,'[]'); EXCEPTION WHEN unique_violation THEN blocked:=true; END; ASSERT blocked,'Duplicate SKU accepted';
 blocked:=false; BEGIN PERFORM public.admin_save_new_draft('00000000-0000-4000-8000-000000000003',gen_random_uuid(),repeat('a',64),payload,'[]'); EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END; ASSERT blocked,'User wrote draft';
 blocked:=false; BEGIN PERFORM public.admin_claim_draft(a,(op->>'operationId')::uuid); EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END; ASSERT blocked,'Editor sent Shopify draft';
 ASSERT public.admin_claim_draft(adm,(op->>'operationId')::uuid),'First claim failed';
 ASSERT NOT public.admin_claim_draft(adm,(op->>'operationId')::uuid),'Second claim accepted';
 blocked:=false; BEGIN PERFORM public.admin_complete_draft(adm,(op->>'operationId')::uuid,'gid://shopify/Product/1','[]'); EXCEPTION WHEN OTHERS THEN blocked:=true; END; ASSERT blocked,'Incomplete mapping accepted';
 PERFORM public.admin_complete_draft(adm,(op->>'operationId')::uuid,'gid://shopify/Product/1','[{"sku":"TEST-LOCAL","productGid":"gid://shopify/Product/1","variantGid":"gid://shopify/ProductVariant/2"}]');
 PERFORM public.admin_complete_draft(adm,(op->>'operationId')::uuid,'gid://shopify/Product/1','[{"sku":"TEST-LOCAL","productGid":"gid://shopify/Product/1","variantGid":"gid://shopify/ProductVariant/2"}]');
 ASSERT (SELECT count(*) FROM public.admin_product_shopify_links)=1,'Duplicate mapping';
 ASSERT (SELECT count(*) FROM public.admin_operation_events)=3,'Missing audit events';
 RAISE NOTICE 'PASS: manual save, SKU uniqueness, role checks, replay, claim once, recovery, mapping and audit';
END $$;
RESET ROLE;
SET ROLE authenticated;
DO $$ DECLARE blocked boolean:=false; BEGIN
 BEGIN PERFORM * FROM public.admin_product_operations; EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END; ASSERT blocked,'Authenticated read journal';
 ASSERT NOT has_function_privilege(current_user,'public.admin_claim_draft(uuid,uuid)','execute'),'Authenticated RPC privilege';
 ASSERT NOT has_function_privilege(current_user,'public.admin_finish_categories(uuid,uuid,uuid[])','execute'),'Authenticated category RPC privilege';
 ASSERT NOT has_table_privilege(current_user,'public.admin_category_operations','select'),'Authenticated category journal exposed';
 RAISE NOTICE 'PASS: authenticated direct table/RPC denied';
END $$;
RESET ROLE;
SET ROLE anon;
DO $$ BEGIN ASSERT NOT has_table_privilege(current_user,'public.admin_product_shopify_links','select'),'Anon link exposed'; RAISE NOTICE 'PASS: anon denied'; END $$;
RESET ROLE;
SET ROLE service_role;
INSERT INTO public.product_categories(id,stable_key,display_name,slug) VALUES('20000000-0000-4000-8000-000000000001','qa-category','Categoria simulata','qa-category');
INSERT INTO public.product_categories(id,stable_key,display_name,slug) VALUES('20000000-0000-4000-8000-000000000002','qa-category-2','Categoria due','qa-category-2');
DO $$ DECLARE opid uuid; pid uuid; blocked boolean:=false; BEGIN
 SELECT id INTO pid FROM public.products WHERE sku='TEST-LOCAL';
 INSERT INTO public.admin_category_operations(actor,request_key,product_id,payload_hash,payload)
 VALUES('00000000-0000-4000-8000-000000000001',gen_random_uuid(),pid,repeat('c',64),'{"categoryIds":["20000000-0000-4000-8000-000000000001"]}') RETURNING id INTO opid;
 BEGIN INSERT INTO public.admin_category_operations(actor,request_key,product_id,payload_hash,payload) VALUES('00000000-0000-4000-8000-000000000001',gen_random_uuid(),pid,repeat('c',64),'{}'); EXCEPTION WHEN unique_violation THEN blocked:=true; END;
 ASSERT blocked,'Parallel category operation allowed';
 blocked:=false;
 BEGIN PERFORM public.admin_finish_categories('00000000-0000-4000-8000-000000000002',opid,ARRAY['20000000-0000-4000-8000-000000000001'::uuid]); EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
 ASSERT blocked,'Editor approved categories';
 PERFORM public.admin_finish_categories('00000000-0000-4000-8000-000000000001',opid,ARRAY['20000000-0000-4000-8000-000000000001'::uuid]);
 ASSERT (SELECT state FROM public.admin_category_operations WHERE id=opid)='VERIFIED','Category state not verified';
 ASSERT (SELECT count(*) FROM public.product_category_assignments WHERE product_id=pid AND status='approved')=1,'Internal category approval missing';
 ASSERT (SELECT count(*) FROM public.product_category_assignments WHERE product_id=pid AND status='approved' AND is_primary)=1,'Primary category missing';
 INSERT INTO public.admin_category_operations(actor,request_key,product_id,payload_hash,payload)
 VALUES('00000000-0000-4000-8000-000000000001',gen_random_uuid(),pid,repeat('d',64),'{"categoryIds":["20000000-0000-4000-8000-000000000002"]}') RETURNING id INTO opid;
 PERFORM public.admin_finish_categories('00000000-0000-4000-8000-000000000001',opid,ARRAY['20000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000002'::uuid]);
 ASSERT (SELECT count(*) FROM public.product_category_assignments WHERE product_id=pid AND status='approved' AND is_primary)=1,'Primary lost on category replacement';
 ASSERT (SELECT category_id FROM public.product_category_assignments WHERE product_id=pid AND status='approved' AND is_primary)='20000000-0000-4000-8000-000000000002'::uuid,'Wrong primary after replacement';
 RAISE NOTICE 'PASS: category concurrency guard, role and verified assignment';
END $$;
RESET ROLE;
