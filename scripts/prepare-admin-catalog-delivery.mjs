// Offline artifact generator. No credentials, cloud connections or automatic application.
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const originalPath = 'docs/release/pending/20261031184521_admin_operational_drafts.sql';
const deltaPath = 'docs/release/pending/20261110135043_admin_catalog_client_delivery.sql';
const original = readFileSync(originalPath,'utf8'), delta = readFileSync(deltaPath,'utf8');
const sha256 = s => createHash('sha256').update(s).digest('hex');
if (sha256(original) !== 'ce63ea211dd7b5f08e222f7b462afc5719a276782a80bca52c1b69abd29cf328') throw Error('Original checksum mismatch');
if (!readFileSync('supabase/config.toml','utf8').includes('project_id = "iekwvvihjwghosqdxrdi"')) throw Error('Wrong project config');
if (process.argv.length !== 3) throw Error('Usage: node scripts/prepare-admin-catalog-delivery.mjs OUTPUT_DIRECTORY');
const tables = ['admin_product_operations','admin_product_shopify_links','admin_operation_events','admin_category_operations','admin_catalog_capabilities','admin_catalog_approvals','admin_catalog_media'];
const functions = ['admin_save_new_draft(uuid,uuid,text,jsonb,jsonb)','admin_claim_draft(uuid,uuid)','admin_complete_draft(uuid,uuid,text,jsonb)','admin_finish_categories(uuid,uuid,uuid[])','admin_claim_catalog_approval(uuid,uuid,text)'];
const array = xs => 'ARRAY['+xs.map(x=>"'"+x+"'").join(',')+']';
const post = `DO $post$
DECLARE t text; f text; r text;
BEGIN
 FOREACH t IN ARRAY ${array(tables)} LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.'||t) AND relkind='r' AND relrowsecurity) OR EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=to_regclass('public.'||t)) THEN RAISE EXCEPTION 'RLS/policy mismatch: %',t; END IF;
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF has_table_privilege(r,'public.'||t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') THEN RAISE EXCEPTION 'Client privilege: % %',r,t; END IF;
  END LOOP;
  IF NOT has_table_privilege('service_role','public.'||t,'SELECT') THEN RAISE EXCEPTION 'Service SELECT absent: %',t; END IF;
  IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t) THEN RAISE EXCEPTION 'Unexpected policy: %',t; END IF;
 END LOOP;
 FOREACH f IN ARRAY ${array([...functions,'admin_complete_product_field_sync(uuid,uuid,text,integer,text,text,boolean,jsonb,text,text)'])} LOOP
  IF NOT has_function_privilege('service_role','public.'||f,'EXECUTE') OR has_function_privilege('anon','public.'||f,'EXECUTE') OR has_function_privilege('authenticated','public.'||f,'EXECUTE') THEN RAISE EXCEPTION 'RPC ACL mismatch: %',f; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.'||f) AND proconfig @> ARRAY['search_path=""']) THEN RAISE EXCEPTION 'Unsafe search_path: %',f; END IF;
 END LOOP;
END $post$;
`;
const pre = `-- Target chain must be independently verified: Lovable 95cad199-55fd-4870-9d5c-a2653edf88f5 -> iekwvvihjwghosqdxrdi.
BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('og-admin-catalog-delivery-20261110',0));
DO $pre$
DECLARE t text;
BEGIN
 IF current_database()<>'postgres' OR current_setting('server_version_num')::integer/10000<>17 THEN RAISE EXCEPTION 'Wrong database/server'; END IF;
 IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version IN('20261031184521','20261110135043')) THEN RAISE EXCEPTION 'History collision: inspect, do not reapply'; END IF;
 FOREACH t IN ARRAY ${array(tables)} LOOP IF to_regclass('public.'||t) IS NOT NULL THEN RAISE EXCEPTION 'Table collision: %',t; END IF; END LOOP;
 FOREACH t IN ARRAY ${array(functions.map(f=>f.split('(')[0]))} LOOP IF EXISTS(SELECT 1 FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=t) THEN RAISE EXCEPTION 'RPC collision: %',t; END IF; END LOOP;
 FOREACH t IN ARRAY ARRAY['products','product_current_values','product_field_definitions','product_categories','product_category_assignments','user_roles','product_admin_command_log'] LOOP IF to_regclass('public.'||t) IS NULL THEN RAISE EXCEPTION 'Missing dependency: %',t; END IF; END LOOP;
 IF md5(pg_get_functiondef('public.admin_complete_product_field_sync(uuid,uuid,text,integer,text,text,boolean,jsonb,text,text)'::regprocedure))<>'31ed209facb8c8f31b1778460f85b7b3' THEN RAISE EXCEPTION 'Prior sync RPC drift; inspect before replacing'; END IF;
 IF to_regprocedure('public.admin_complete_product_field_sync(uuid,uuid,text,integer,text,text,boolean,jsonb,text,text)') IS NULL THEN RAISE EXCEPTION 'Missing prior sync RPC'; END IF;
END $pre$;
`;
const history = `INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES
('20261031184521','admin_operational_drafts',ARRAY[$og_original$${original}$og_original$]),
('20261110135043','admin_catalog_client_delivery',ARRAY[$og_delta$${delta}$og_delta$]);
`;
const packageSql = pre+'\n-- Original bytes below; SHA-256 '+sha256(original)+'\n'+original+'\n-- Minimal delivery delta; SHA-256 '+sha256(delta)+'\n'+delta+'\n'+post+history+'COMMIT;\n';
const out = resolve(process.argv[2]); mkdirSync(out,{recursive:true,mode:0o700});
writeFileSync(resolve(out,'atomic-delivery.sql'),packageSql,{mode:0o600,flag:'wx'});
writeFileSync(resolve(out,'postconditions.sql'),post+"SELECT version,name FROM supabase_migrations.schema_migrations WHERE version IN('20261031184521','20261110135043');\n",{mode:0o600,flag:'wx'});
writeFileSync(resolve(out,'checksums.json'),JSON.stringify({target:'iekwvvihjwghosqdxrdi',original:sha256(original),delta:sha256(delta),atomicPackage:sha256(packageSql)},null,2)+'\n',{mode:0o600,flag:'wx'});
console.log(JSON.stringify({generatedOnly:true,target:'iekwvvihjwghosqdxrdi',original:sha256(original),delta:sha256(delta),output:out}));
