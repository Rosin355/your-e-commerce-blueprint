import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';

for (const extra of [[], ['--email-only'], ['--input', '/nonexistent/x.csv']]) {
  test(`customer tool output has no email addresses (${extra.join(' ') || 'synthetic'})`, () => {
    const args = extra[0] === '--input' ? extra : ['--synthetic', ...extra];
    const r = spawnSync(process.execPath, ['sync/customers-sync-shopify.mjs', ...args], { encoding: 'utf8' });
    assert.doesNotMatch(r.stdout + r.stderr, /[^\s"@]+@[^\s"@]+\.[a-z]{2,}/i);
  });
}
