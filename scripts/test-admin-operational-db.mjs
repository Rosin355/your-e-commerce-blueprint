import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
const socket = process.env.OG_TEST_PG_SOCKET;
const port = process.env.OG_TEST_PG_PORT;
const database = process.env.OG_TEST_PG_DATABASE;
if (!socket?.startsWith('/private/tmp') && !socket?.startsWith('/tmp')) {
  throw Error('Only isolated temporary Unix sockets are allowed');
}
if (!/^og_admin_test_[a-z0-9_]+$/.test(database ?? '') || !/^\d+$/.test(port ?? '')) {
  throw Error('Explicit isolated test database and port required');
}
const psql = process.env.OG_TEST_PSQL ?? 'psql';
const args = ['-h', socket, '-p', port, '-d', database, '-v', 'ON_ERROR_STOP=1'];
const files = ['scripts/fixtures/admin-operational/bootstrap.sql'];
for (
  const prefix of [
    '20260817090243',
    '20260817092126',
    '20260817092153',
    '20260817092305',
    '20260817103437',
  ]
) {
  files.push(
    ...readdirSync('supabase/migrations').filter((f) => f.startsWith(prefix)).map((f) =>
      'supabase/migrations/' + f
    ),
  );
}
files.push('docs/release/pending/20261031184521_admin_operational_drafts.sql');
files.push('scripts/fixtures/admin-operational/assertions.sql');
for (const file of files) {
  const r = spawnSync(psql, [...args, '-f', file], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
console.log(
  'PASS: local PostgreSQL operational migration and assertions; auth bootstrap is simulated, not Supabase live',
);
