// Isolated fixture only. Never accepts a cloud URL or a production database name.
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
const host = process.env.OG_TEST_PG_SOCKET;
const port = process.env.OG_TEST_PG_PORT;
const database = process.env.OG_TEST_PG_DATABASE;
if ((!host?.startsWith('/private/tmp/') && !(process.env.CI === 'true' && host === '127.0.0.1')) || !/^og_admin_test_[a-z0-9_]+$/.test(database ?? '') || !/^\d+$/.test(port ?? '')) throw Error('Explicit isolated test connection required');
const args = ['-X','-h',host,'-p',port,'-d',database,'-v','ON_ERROR_STOP=1'];
const run = (sql, success = true) => {
  const r = spawnSync('psql',args,{ input:sql,encoding:'utf8' });
  if ((r.status === 0) !== success) throw Error(r.stderr || 'Unexpected SQL result');
  if (success && r.stderr) process.stdout.write(r.stderr);
};
const baseline = ['scripts/fixtures/admin-operational/bootstrap.sql'];
for (const prefix of ['20260817090243','20260817092126','20260817092153','20260817092305','20260817103437','20260817125535','20261006143000']) baseline.push(...readdirSync('supabase/migrations').filter(f=>f.startsWith(prefix)).map(f=>'supabase/migrations/'+f));
for (const file of baseline) run(readFileSync(file,'utf8'));
const ddl = readFileSync('docs/release/pending/20261031184521_admin_operational_drafts.sql','utf8') + '\n' + readFileSync('docs/release/pending/20261110135043_admin_catalog_client_delivery.sql','utf8');
run('BEGIN;\n'+ddl+"\nDO $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_ROLLBACK_CHECK'; END $$;\nCOMMIT;",false);
run("DO $$ BEGIN ASSERT to_regclass('public.admin_product_operations') IS NULL AND to_regclass('public.admin_catalog_capabilities') IS NULL,'DDL did not roll back'; END $$;");
run('BEGIN;\n'+ddl+'\nCOMMIT;');
run(readFileSync('scripts/fixtures/admin-catalog-delivery.sql','utf8'));
// Keep the baseline used by the independent Drizzle suite intact.
const transactionBody = file => readFileSync(file,'utf8').replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'');
const registry = transactionBody('docs/release/pending/marco-editor-registry.sql');
const actions = transactionBody('docs/release/pending/marco-editor-actions.sql');
const tags = transactionBody('docs/release/pending/marco-editor-tags.sql');
const actor = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const setup = [
  'BEGIN;',
  readFileSync('drizzle/migrations/0016_marco_editorial_missing_values.sql','utf8'),
  readFileSync('drizzle/migrations/0020_admin_new_draft_editorial.sql','utf8').split('CREATE TABLE public.admin_draft_ai_request_scopes')[0],
  readFileSync('scripts/fixtures/marco-editor-release.sql','utf8'),
].join('\n');
const releaseChecks = [setup];
for (const direction of ['apply','apply','restore','restore']) {
  releaseChecks.push('\\set direction '+direction, registry, actions, '\\set staff_id '+actor);
  for (const key of ['tags','product_gallery','product_formats']) releaseChecks.push('\\set grant_key '+key,tags);
  const applied = direction === 'apply';
  if (applied) releaseChecks.push(`DO $$ DECLARE op uuid; action_name text; k text; refused boolean;
  BEGIN
    FOREACH action_name IN ARRAY ARRAY['set_catalog_image','rename_catalog_format'] LOOP
      k:=CASE action_name WHEN 'set_catalog_image' THEN 'product_gallery' ELSE 'product_formats' END;
      INSERT INTO public.admin_catalog_approvals(actor,action,target,request_key,payload_hash,command,target_snapshot,expires_at)
      VALUES('${actor}',action_name,gen_random_uuid()::text,gen_random_uuid(),repeat('b',64),'{}','{}',now()+interval '5 minutes') RETURNING id INTO op;
      UPDATE public.admin_catalog_capabilities SET field_keys=array_remove(field_keys,k) WHERE user_id='${actor}';
      refused:=false;
      BEGIN PERFORM public.admin_claim_catalog_approval(op,'${actor}',repeat('b',64)); EXCEPTION WHEN insufficient_privilege THEN refused:=true; END;
      ASSERT refused,'Il solo ruolo e la capability precedente non devono autorizzare la nuova azione';
      UPDATE public.admin_catalog_capabilities SET field_keys=array_append(field_keys,k) WHERE user_id='${actor}';
      ASSERT public.admin_claim_catalog_approval(op,'${actor}',repeat('b',64));
      UPDATE public.admin_catalog_approvals SET state='COMPLETE' WHERE id=op;
    END LOOP;
  END $$;`);
  releaseChecks.push(`DO $$ BEGIN
    ASSERT (SELECT shopify_mapping->>'key' IS NOT DISTINCT FROM ${applied ? "'short_intro'" : 'NULL'} FROM public.product_field_definitions WHERE key='short_description');
    ASSERT (SELECT (field_keys @> ARRAY['tags','product_gallery','product_formats'])=${applied} FROM public.admin_catalog_capabilities WHERE user_id='${actor}');
    ASSERT NOT EXISTS (SELECT 1 FROM public.admin_catalog_capabilities WHERE user_id='${other}' AND 'tags'=ANY(field_keys));
  END $$;`);
}
run([...releaseChecks,'ROLLBACK;'].join('\n'));
const denied = spawnSync('psql',args,{input:[setup,'\\set direction apply','\\set staff_id '+other,tags,'ROLLBACK;'].join('\n'),encoding:'utf8'});
if (denied.status === 0 || !denied.stderr.includes('query returned no rows')) throw Error('Il secondo Editor deve essere rifiutato dal controllo nominale');
console.log('PASS: registro e RPC ripristinati, grant nominale ripetibile e secondo Editor rifiutato.');
if (process.env.CI === 'true') {
  const generated = spawnSync(process.execPath,['scripts/prepare-admin-catalog-delivery.mjs','/tmp/og-delivery-ci-package'],{encoding:'utf8'});
  if (generated.status !== 0) throw Error(generated.stderr);
  const post = readFileSync('/tmp/og-delivery-ci-package/postconditions.sql','utf8').split('SELECT version,name')[0];
  run(post);
}
console.log('PASS: atomic additive package, ACL/RLS, actor/capability denial, one-use claim and exact editor draft permissions. Local synthetic data only; no managed restore claimed.');
