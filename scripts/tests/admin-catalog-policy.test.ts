import assert from 'node:assert/strict';
import test from 'node:test';
import { approvalValid, catalogAllowed, catalogCommand, validateImage } from '../../supabase/functions/_shared/admin-catalog-policy.ts';
const actor = '10000000-0000-4000-8000-000000000001';
const auth = { userId: actor, roles: ['editor'] as ['editor'], catalogGrant: { enabled: true, capabilities: ['edit'], fieldKeys: ['title', 'inventory'] } };
test('catalog grants require real editor role, exact capability and safe field intersection', () => {
  assert.equal(catalogAllowed(auth, 'edit', 'title'), true);
  for (const context of [{ ...auth, catalogGrant: undefined }, { ...auth, roles: ['admin'] as ['admin'] }, { ...auth, catalogGrant: { ...auth.catalogGrant, enabled: false } }]) assert.equal(catalogAllowed(context, 'edit', 'title'), false);
  assert.equal(catalogAllowed(auth, 'edit', 'inventory'), false);
  assert.equal(catalogAllowed(auth, 'sync', 'title'), false);
});
test('approval binds actor, command hash, action, expiry and state; generic boolean is insufficient', () => {
  const row = { actor, action: 'update_field', payload_hash: 'a'.repeat(64), state: 'PENDING', expires_at: '2026-11-10T12:00:00Z' };
  const now = Date.parse('2026-11-10T11:55:00Z');
  assert.equal(approvalValid(row, actor, row.action, row.payload_hash, now), true);
  for (const changed of [{ actor: 'other' }, { action: 'publish' }, { payload_hash: 'b'.repeat(64) }, { state: 'IN_FLIGHT' }, { state: 'REVIEW_REQUIRED' }, { expires_at: '2026-11-10T11:54:59Z' }]) assert.equal(approvalValid({ ...row, ...changed }, actor, row.action, row.payload_hash, now), false);
  assert.throws(() => catalogCommand({ action: 'update_field', approval: true }));
  const command = catalogCommand({ action: 'update_field', idempotencyKey: actor, productId: actor, value: 'Prova', roles: ['admin'], confirm: true, approvalId: actor });
  assert.equal('roles' in command, false); assert.equal('approvalId' in command, false);
});
test('image validation rejects spoofed MIME, SVG, empty files and decompression-sized PNG', () => {
  for (const bytes of [new Uint8Array(), new TextEncoder().encode('<svg></svg>'), new Uint8Array(5 * 1024 * 1024 + 1)]) assert.throws(() => validateImage(bytes, 'image/png'));
  const png = new Uint8Array(32); png.set([137,80,78,71,13,10,26,10]); const view = new DataView(png.buffer); view.setUint32(16, 100); view.setUint32(20, 100);
  assert.equal(validateImage(png, 'image/png').mime, 'image/png'); assert.throws(() => validateImage(png, 'image/jpeg'));
  view.setUint32(16, 10001); assert.throws(() => validateImage(png, 'image/png'));
});
