// Offline only: generate reviewable SQL. This program never connects to a database.
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'docs/release/ADMIN-V2-ACTIVATION-MANIFEST.json'), 'utf8'));
const original = readFileSync(resolve(root, manifest.migration.path), 'utf8');
const hash = createHash('sha256').update(original).digest('hex');
if (hash !== manifest.migration.sha256 || hash !== 'ce63ea211dd7b5f08e222f7b462afc5719a276782a80bca52c1b69abd29cf328') throw Error('Migration checksum mismatch');
if (!readFileSync(resolve(root, 'supabase/config.toml'), 'utf8').includes('project_id = "iekwvvihjwghosqdxrdi"')) throw Error('Target configuration mismatch');
const out = process.argv[2];
if (!out || process.argv.length !== 3) throw Error('Usage: node scripts/prepare-admin-v2-activation.mjs OUTPUT_DIRECTORY (generates only; no live execution)');
const tables = manifest.migration.tables;
const signatures = [
  'admin_save_new_draft(uuid,uuid,text,jsonb,jsonb)', 'admin_claim_draft(uuid,uuid)',
  'admin_complete_draft(uuid,uuid,text,jsonb)', 'admin_finish_categories(uuid,uuid,uuid[])',
];
const sqlArray = values => 'ARRAY[' + values.map(v => "'" + v.replaceAll("'", "''") + "'").join(',') + ']';
const tableArray = sqlArray(tables);
const functionArray = sqlArray(signatures);
const preflight = `-- READ ONLY. Project identity also requires the Lovable/config connection chain.
BEGIN READ ONLY;
SELECT current_database() AS database_name, current_setting('server_version') AS server_version;
SELECT name, to_regclass('public.' || name) IS NULL AS absent FROM unnest(${tableArray}) AS name;
SELECT signature, to_regprocedure('public.' || signature) IS NULL AS absent FROM unnest(${functionArray}) AS signature;
SELECT NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261031184521') AS history_absent;
SELECT name, to_regclass('public.' || name) IS NOT NULL AS prerequisite_present
FROM unnest(ARRAY['products','product_current_values','product_field_definitions','product_categories','product_category_assignments','user_roles']) AS name;
COMMIT;
`;
const checks = `DO $post$
DECLARE n text; r record; privilege text; client_role text;
BEGIN
 FOREACH n IN ARRAY ${tableArray} LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.'||n) AND relkind='r' AND relrowsecurity) THEN RAISE EXCEPTION 'Missing table or RLS: %',n; END IF;
  FOREACH client_role IN ARRAY ARRAY['anon','authenticated'] LOOP
   FOREACH privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
    IF has_table_privilege(client_role,'public.'||n,privilege) THEN RAISE EXCEPTION 'Unexpected client table privilege: % % %',n,client_role,privilege; END IF;
   END LOOP;
   FOREACH privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','REFERENCES'] LOOP
    IF has_any_column_privilege(client_role,'public.'||n,privilege) THEN RAISE EXCEPTION 'Unexpected column privilege: %',n; END IF;
   END LOOP;
  END LOOP;
  IF EXISTS(SELECT 1 FROM pg_class c, LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a WHERE c.oid=to_regclass('public.'||n) AND a.grantee=0) THEN RAISE EXCEPTION 'Unexpected PUBLIC table grant'; END IF;
  IF EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=to_regclass('public.'||n)) THEN RAISE EXCEPTION 'Unexpected policy on service-only table'; END IF;
  IF NOT has_table_privilege('service_role','public.'||n,'SELECT') OR NOT has_table_privilege('service_role','public.'||n,'INSERT') THEN RAISE EXCEPTION 'Missing service grant'; END IF;
  IF n<>'admin_operation_events' AND NOT has_table_privilege('service_role','public.'||n,'UPDATE') THEN RAISE EXCEPTION 'Missing service UPDATE grant'; END IF;
  -- Existing provider default grants may be broader for service_role; never alter global defaults here.
 END LOOP;
 FOREACH n IN ARRAY ${functionArray} LOOP
  SELECT * INTO r FROM pg_proc WHERE oid=to_regprocedure('public.'||n);
  IF NOT FOUND OR r.prosecdef OR NOT ('search_path=""'=ANY(coalesce(r.proconfig,ARRAY[]::text[]))) THEN RAISE EXCEPTION 'RPC invoker/search_path mismatch: %',n; END IF;
  IF has_function_privilege('anon',r.oid,'EXECUTE') OR has_function_privilege('authenticated',r.oid,'EXECUTE') OR NOT has_function_privilege('service_role',r.oid,'EXECUTE') OR EXISTS(SELECT 1 FROM aclexplode(coalesce(r.proacl,acldefault('f',r.proowner))) WHERE grantee=0 AND privilege_type='EXECUTE') THEN RAISE EXCEPTION 'RPC EXECUTE mismatch: %',n; END IF;
 END LOOP;
END $post$;
`;
const emptyCheck = `DO $empty$
DECLARE n text; occupied boolean;
BEGIN
 FOREACH n IN ARRAY ${tableArray} LOOP
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I)',n) INTO occupied;
  IF occupied THEN RAISE EXCEPTION 'Rollback/activation stopped: table % contains data',n; END IF;
 END LOOP;
END $empty$;
`;
const gate = `-- Requires a NEW explicit owner approval: target, original checksum and recovery plan.
-- psql variables og_approval, og_target and og_recovery are change-record references, never credentials.
-- Verify the actual provider connection/target OUTSIDE SQL; current_database() alone cannot prove it.
\\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
SELECT set_config('og.approval', :'og_approval', true), set_config('og.target', :'og_target', true), set_config('og.recovery', :'og_recovery', true);
DO $gate$
BEGIN
 IF current_setting('og.target')<>'iekwvvihjwghosqdxrdi' OR length(trim(current_setting('og.approval')))<3 OR length(trim(current_setting('og.recovery')))<3 THEN RAISE EXCEPTION 'Explicit change approval/recovery reference missing'; END IF;
 IF current_database()<>'postgres' OR current_setting('server_version_num')::integer/10000<>17 THEN RAISE EXCEPTION 'Database/version mismatch'; END IF;
END $gate$;
SELECT pg_advisory_xact_lock(hashtextextended('og-admin-v2-20261031184521',0));
`;
const collisionCheck = `DO $pre$
DECLARE n text;
BEGIN
 IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261031184521') THEN RAISE EXCEPTION 'Migration already registered: inspect, do not reapply'; END IF;
 FOREACH n IN ARRAY ${tableArray} LOOP
  IF to_regclass('public.'||n) IS NOT NULL THEN RAISE EXCEPTION 'Table collision: %',n; END IF;
 END LOOP;
 FOREACH n IN ARRAY ${functionArray} LOOP
  IF EXISTS(SELECT 1 FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=split_part(n,'(',1)) THEN RAISE EXCEPTION 'RPC collision: %',n; END IF;
 END LOOP;
END $pre$;
`;
const migration = gate + collisionCheck + '\n-- Original SQL, byte-for-byte; SHA-256 ' + hash + '\n' + original + '\n' + checks + emptyCheck + `INSERT INTO supabase_migrations.schema_migrations(version,name,statements)
VALUES('20261031184521','admin_operational_drafts',ARRAY[$original_admin_v2$${original}$original_admin_v2$]);
COMMIT;
`;
const historyCheck = `DO $history$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261031184521' AND name='admin_operational_drafts' AND statements=ARRAY[$original_admin_v2$${original}$original_admin_v2$]) THEN RAISE EXCEPTION 'History differs from this package; stop and inspect'; END IF;
END $history$;
`;
const rollback = gate + historyCheck + tables.map(t => `LOCK TABLE public.${t} IN ACCESS EXCLUSIVE MODE;`).join('\n') + '\n' + emptyCheck + [...signatures].reverse().map(f => `DROP FUNCTION public.${f} RESTRICT;`).join('\n') + '\n' + [...tables].reverse().map(t => `DROP TABLE public.${t} RESTRICT;`).join('\n') + "\nDELETE FROM supabase_migrations.schema_migrations WHERE version='20261031184521';\nCOMMIT;\n";
mkdirSync(resolve(out), { recursive: true, mode: 0o700 });
for (const [name, content] of Object.entries({ 'preflight.sql': preflight, 'migration.sql': migration, 'postflight.sql': 'BEGIN READ ONLY;\n' + checks + historyCheck + "SELECT version,name FROM supabase_migrations.schema_migrations WHERE version='20261031184521';\nCOMMIT;\n", 'rollback-empty.sql': rollback })) {
  writeFileSync(resolve(out, name), content, { mode: 0o600, flag: 'wx' });
}
console.log(JSON.stringify({ generatedOnly: true, target: manifest.target.configuredSupabase, migrationSha256: hash, output: resolve(out) }));
