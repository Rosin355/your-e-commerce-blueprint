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
if (process.env.CI === 'true') {
  const generated = spawnSync(process.execPath,['scripts/prepare-admin-catalog-delivery.mjs','/tmp/og-delivery-ci-package'],{encoding:'utf8'});
  if (generated.status !== 0) throw Error(generated.stderr);
  const post = readFileSync('/tmp/og-delivery-ci-package/postconditions.sql','utf8').split('SELECT version,name')[0];
  run(post);
}
console.log('PASS: atomic additive package, ACL/RLS, actor/capability denial, one-use claim and exact editor draft permissions. Local synthetic data only; no managed restore claimed.');
