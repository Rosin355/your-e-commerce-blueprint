INSERT INTO public.product_field_definitions(key,label,editor_type,data_type,editable,visible,ai_allowed,manual_only,applies_to,field_group)
 VALUES('description','Descrizione','richtext','text',true,true,true,false,'product','main');
INSERT INTO public.products(id,sku,entity_type,is_active) VALUES
 ('20000000-0000-4000-8000-000000000001','SYNTHETIC-A','simple',true),
 ('20000000-0000-4000-8000-000000000002','SYNTHETIC-B','simple',true);
DO $$ DECLARE a uuid:='00000000-0000-4000-8000-000000000001'; b uuid:='00000000-0000-4000-8000-000000000002'; r jsonb; n integer; denied boolean; BEGIN
 ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid='public.admin_confirmed_ai_requests'::regclass);
 ASSERT NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='public.admin_confirmed_ai_requests'::regclass);
 ASSERT NOT has_table_privilege('authenticated','public.admin_confirmed_ai_requests','SELECT,INSERT,UPDATE,DELETE');
 ASSERT NOT has_function_privilege('anon','public.reserve_confirmed_ai_request(uuid,uuid,text,text,text)','EXECUTE');
 ASSERT NOT has_function_privilege('authenticated','public.admin_update_product_field(uuid,text,uuid,text,jsonb,integer,text,text,text)','EXECUTE');
 ASSERT NOT EXISTS(SELECT 1 FROM public.admin_catalog_capabilities WHERE 'ai'=ANY(capabilities));
 -- Fixture grants only; migration itself made no changes to accounts.
 UPDATE public.admin_catalog_capabilities SET enabled=true,capabilities=ARRAY['edit','ai'],field_keys=ARRAY['description'] WHERE user_id=a;
 BEGIN UPDATE public.admin_catalog_capabilities SET capabilities=ARRAY['edit','arbitrary'] WHERE user_id=a; RAISE EXCEPTION 'unknown capability accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
SET ROLE service_role;
DO $$ DECLARE a uuid:='00000000-0000-4000-8000-000000000001'; b uuid:='00000000-0000-4000-8000-000000000002'; r jsonb; BEGIN
 BEGIN PERFORM public.reserve_confirmed_ai_request(b,gen_random_uuid(),'description',repeat('a',64),'suggest_confirmed_field');RAISE EXCEPTION 'unauthorized actor accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.reserve_confirmed_ai_request(a,gen_random_uuid(),'title',repeat('a',64),'suggest_confirmed_field');RAISE EXCEPTION 'unauthorized field accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.reserve_confirmed_ai_request(a,gen_random_uuid(),'description',repeat('a',64),'publish');RAISE EXCEPTION 'unauthorized action accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 ASSERT public.reserve_confirmed_ai_request(a,'30000000-0000-4000-8000-000000000001','description',repeat('a',64),'suggest_confirmed_field');
 ASSERT NOT public.reserve_confirmed_ai_request(a,'30000000-0000-4000-8000-000000000001','description',repeat('a',64),'suggest_confirmed_field');
 ASSERT NOT EXISTS(SELECT 1 FROM public.product_current_values WHERE field_key='description'); -- Reads/reservations did not initialize.
 r:=public.admin_update_product_field(a,'update_field','20000000-0000-4000-8000-000000000001','description','""'::jsonb,0,'bad-first-value',repeat('a',64),NULL);ASSERT r->>'ok'='false';
 r:=public.admin_update_product_field(a,'update_field','20000000-0000-4000-8000-000000000001','description','"Bozza iniziale"'::jsonb,0,'first-value-key',repeat('b',64),NULL);ASSERT r->>'ok'='true', r::text;ASSERT (r->>'version')::int=1;
 r:=public.admin_update_product_field(a,'update_field','20000000-0000-4000-8000-000000000001','description','"Bozza iniziale"'::jsonb,0,'first-value-key',repeat('b',64),NULL);ASSERT r->>'replayed'='true';
 r:=public.admin_update_product_field(a,'update_field','20000000-0000-4000-8000-000000000001','description','"Sovrascrittura"'::jsonb,0,'stale-first-value',repeat('c',64),NULL);ASSERT r->>'code'='VERSION_CONFLICT';
 ASSERT (SELECT value_text FROM public.product_current_values WHERE product_id='20000000-0000-4000-8000-000000000001' AND field_key='description')='Bozza iniziale';
 BEGIN PERFORM public.admin_update_product_field(a,'update_field','20000000-0000-4000-8000-000000000001','description','"Rollback"'::jsonb,1,'rollback-value-key',repeat('d',64),NULL);RAISE EXCEPTION 'synthetic rollback';EXCEPTION WHEN raise_exception THEN NULL;END;
 ASSERT (SELECT value_text FROM public.product_current_values WHERE product_id='20000000-0000-4000-8000-000000000001' AND field_key='description')='Bozza iniziale';
END $$;
RESET ROLE;

SET ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.reserve_confirmed_ai_request('00000000-0000-4000-8000-000000000001',gen_random_uuid(),'description',repeat('a',64),'suggest_confirmed_field');RAISE EXCEPTION 'client RPC exposed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM count(*) FROM public.admin_confirmed_ai_requests;RAISE EXCEPTION 'client journal exposed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
RESET ROLE;

INSERT INTO public.product_field_definitions(key,label,editor_type,data_type,editable,visible,ai_allowed,manual_only,applies_to,field_group)
 SELECT k,k,'multiselect','json',true,true,true,false,'product','main' FROM unnest(ARRAY['key_benefits','key_features','special_bullets']) k;
SET ROLE service_role;
DO $$ DECLARE k text;r jsonb; BEGIN
 FOREACH k IN ARRAY ARRAY['key_benefits','key_features','special_bullets'] LOOP
  r:=public.admin_update_product_field('00000000-0000-4000-8000-000000000001','update_field','20000000-0000-4000-8000-000000000001',k,'[]'::jsonb,0,'empty-'||k,repeat('e',64),NULL);ASSERT r->>'code'='VALIDATION_ERROR';
  r:=public.admin_update_product_field('00000000-0000-4000-8000-000000000001','update_field','20000000-0000-4000-8000-000000000001',k,'["Primo","Secondo"]'::jsonb,0,'list-'||k,repeat('f',64),NULL);ASSERT r->>'ok'='true',r::text;
 END LOOP;
END $$;
RESET ROLE;
