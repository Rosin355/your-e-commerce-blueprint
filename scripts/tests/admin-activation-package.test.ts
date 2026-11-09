import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('activation generator emits only offline SQL with original migration and transactional recovery guards', () => {
  const dir = mkdtempSync(join(tmpdir(), 'og-activation-package-'));
  try {
    const result = spawnSync(process.execPath, ['scripts/prepare-admin-v2-activation.mjs', dir], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).generatedOnly, true);
    const original = readFileSync('docs/release/pending/20261031184521_admin_operational_drafts.sql', 'utf8');
    const migration = readFileSync(join(dir, 'migration.sql'), 'utf8');
    const rollback = readFileSync(join(dir, 'rollback-empty.sql'), 'utf8');
    const preflight = readFileSync(join(dir, 'preflight.sql'), 'utf8');
    const postflight = readFileSync(join(dir, 'postflight.sql'), 'utf8');
    assert.ok(migration.includes(original));
    assert.ok(migration.indexOf('BEGIN;') < migration.indexOf(original));
    assert.ok(migration.indexOf('END $post$') < migration.indexOf('INSERT INTO supabase_migrations'));
    assert.ok(migration.indexOf('INSERT INTO supabase_migrations') < migration.indexOf('COMMIT;'));
    assert.match(migration, /ON_ERROR_STOP on/);
    assert.match(migration, /og_approval/); assert.match(migration, /og_recovery/);
    assert.match(migration, /Table collision/); assert.match(migration, /RPC collision/);
    assert.match(preflight, /BEGIN READ ONLY/); assert.match(postflight, /BEGIN READ ONLY/);
    assert.doesNotMatch((preflight + postflight).replace(/\$original_admin_v2\$[\s\S]*?\$original_admin_v2\$/g, "'sql-as-data'"), /\b(?:INSERT INTO|UPDATE public|DELETE FROM|DROP TABLE)\b/i);
    assert.match(rollback, /ACCESS EXCLUSIVE MODE/);
    assert.ok(rollback.indexOf('END $empty$') < rollback.indexOf('DROP FUNCTION'));
    assert.ok(rollback.indexOf('DROP TABLE') < rollback.indexOf('DELETE FROM supabase_migrations'));
    assert.equal((rollback.match(/DROP TABLE public\./g) ?? []).length, 4);
    assert.equal((rollback.match(/DROP FUNCTION public\./g) ?? []).length, 4);
    assert.doesNotMatch(rollback, /CASCADE/);
    assert.match(rollback, /History differs/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
