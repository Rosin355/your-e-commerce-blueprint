INSERT INTO auth.users(id) VALUES('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
INSERT INTO public.user_roles VALUES('00000000-0000-4000-8000-000000000001','editor'),('00000000-0000-4000-8000-000000000002','editor');
INSERT INTO public.product_field_definitions(key,label,editable,visible) VALUES('title','Nome',true,true);
DO $$ DECLARE t text; f text; r text; BEGIN
 FOREACH t IN ARRAY ARRAY['admin_product_operations','admin_product_shopify_links','admin_operation_events','admin_category_operations','admin_catalog_capabilities','admin_catalog_approvals','admin_catalog_media'] LOOP
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.'||t)),'RLS absent';
  ASSERT NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=to_regclass('public.'||t)),'Unexpected client policy';
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
   ASSERT NOT has_table_privilege(r,'public.'||t,'SELECT,INSERT,UPDATE,DELETE'),'Client table privilege';
  END LOOP;
 END LOOP;
 FOREACH f IN ARRAY ARRAY['admin_claim_catalog_approval(uuid,uuid,text)','admin_claim_draft(uuid,uuid)','admin_complete_draft(uuid,uuid,text,jsonb)','admin_finish_categories(uuid,uuid,uuid[])','admin_complete_product_field_sync(uuid,uuid,text,integer,text,text,boolean,jsonb,text,text)'] LOOP
  ASSERT NOT has_function_privilege('anon','public.'||f,'EXECUTE') AND NOT has_function_privilege('authenticated','public.'||f,'EXECUTE'),'Client RPC exposed';
  ASSERT has_function_privilege('service_role','public.'||f,'EXECUTE'),'Service RPC absent';
 END LOOP;
END $$;
SET ROLE service_role;
DO $$ DECLARE a uuid:='00000000-0000-4000-8000-000000000001'; other_actor uuid:='00000000-0000-4000-8000-000000000002'; approval uuid; saved jsonb; denied boolean:=false; BEGIN
 INSERT INTO public.admin_catalog_capabilities(user_id,enabled,capabilities,field_keys,approved_reference) VALUES(a,true,ARRAY['edit','drafts'],ARRAY['title'],'SYNTHETIC-FIXTURE');
 INSERT INTO public.admin_catalog_approvals(actor,action,target,request_key,payload_hash,command,target_snapshot,expires_at)
 VALUES(a,'update_field','fixture-product',gen_random_uuid(),repeat('a',64),'{}','{}',now()+interval '10 minutes') RETURNING id INTO approval;
 BEGIN PERFORM public.admin_claim_catalog_approval(approval,other_actor,repeat('a',64)); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 ASSERT denied,'Other editor without capability claimed';
 denied:=false; BEGIN PERFORM public.admin_claim_catalog_approval(approval,a,repeat('b',64)); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END; ASSERT denied,'Changed hash claimed';
 ASSERT public.admin_claim_catalog_approval(approval,a,repeat('a',64)),'Authorized claim refused';
 ASSERT NOT public.admin_claim_catalog_approval(approval,a,repeat('a',64)),'Second claim accepted';
 UPDATE public.admin_catalog_approvals SET state='COMPLETE' WHERE id=approval;
 saved:=public.admin_save_new_draft(a,gen_random_uuid(),repeat('c',64),'{"sku":"DELIVERY-FIXTURE","variants":[{"sku":"DELIVERY-FIXTURE"}],"categoryIds":[]}', '[{"key":"title","text":"Fixture"}]');
 -- A second draft colliding on an existing variant must roll back the entire family.
 BEGIN
   PERFORM public.admin_save_new_draft(a,gen_random_uuid(),repeat('d',64),
     '{"sku":"MARCO-COLLISION","variants":[{"sku":"MARCO-COLLISION-1"},{"sku":"delivery-fixture"}],"categoryIds":[]}', '[]');
   RAISE EXCEPTION 'Expected normalized SKU collision';
 EXCEPTION WHEN unique_violation THEN
   ASSERT NOT EXISTS(SELECT 1 FROM public.products WHERE sku_norm IN ('marco-collision','marco-collision-1'));
 END;
 -- The ordinary wizard persists collection GIDs with the operation, alongside prices.
 DECLARE test_payload jsonb := '{"sku":"TEST-OG-AI-001","title":"TEST - Lavanda","description":"<p>Descrizione sintetica.</p>","currency":"EUR","variants":[{"sku":"TEST-OG-AI-001","option":"Formato unico","price":"10.00"}],"collectionIds":["gid://shopify/Collection/123"],"categoryIds":[]}';
         test_saved jsonb; replay jsonb; test_key uuid := gen_random_uuid();
 BEGIN
   test_saved := public.admin_save_new_draft(a,test_key,repeat('e',64),test_payload,'[{"key":"title","text":"TEST - Lavanda"}]');
   replay := public.admin_save_new_draft(a,test_key,repeat('e',64),test_payload,'[{"key":"title","text":"TEST - Lavanda"}]');
   ASSERT replay->>'operationId'=test_saved->>'operationId' AND (replay->>'replayed')::boolean;
   ASSERT EXISTS(SELECT 1 FROM public.admin_product_operations WHERE id=(test_saved->>'operationId')::uuid AND state='LOCAL_DRAFT'
     AND payload=test_payload AND payload#>>'{variants,0,price}'='10.00' AND payload#>>'{collectionIds,0}'='gid://shopify/Collection/123');
   ASSERT NOT EXISTS(SELECT 1 FROM public.product_current_values WHERE product_id=(test_saved->>'productId')::uuid AND field_key IN ('price','category_effective'));
   ASSERT NOT EXISTS(SELECT 1 FROM public.admin_product_shopify_links WHERE product_id=(test_saved->>'productId')::uuid);
 END;
 denied:=false; BEGIN PERFORM public.admin_claim_draft(other_actor,(saved->>'operationId')::uuid); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END; ASSERT denied,'Ungrant editor sent draft';
 ASSERT public.admin_claim_draft(a,(saved->>'operationId')::uuid),'Exact catalog editor unable to send';
 UPDATE public.admin_catalog_approvals SET state='REVIEW_REQUIRED' WHERE id=approval;
 INSERT INTO public.admin_catalog_approvals(actor,action,target,request_key,payload_hash,command,target_snapshot,expires_at)
 VALUES(a,'recover_shopify_draft','recovery:fixture-product',gen_random_uuid(),repeat('d',64),'{}','{}',now()+interval '10 minutes') RETURNING id INTO approval;
 ASSERT public.admin_claim_catalog_approval(approval,a,repeat('d',64)),'Recovery blocked by uncertain creation';
 UPDATE public.admin_catalog_capabilities SET enabled=false WHERE user_id=a;
 denied:=false; BEGIN PERFORM public.admin_claim_catalog_approval(approval,a,repeat('a',64)); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END; ASSERT denied,'Revoked capability accepted';
END $$;
RESET ROLE;
