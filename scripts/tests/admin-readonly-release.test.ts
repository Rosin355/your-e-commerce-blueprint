import test from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_READ_ONLY_RELEASE, readOnlyField, readOnlyRequest } from '../../src/adminv2/lib/readOnlyRelease.ts';
import type { AdminField } from '../../src/adminv2/lib/adminApi.ts';

test('read-only release rejects mutations and unavailable operations before transport', () => {
  assert.equal(ADMIN_READ_ONLY_RELEASE, true);
  for (const action of ['update_field', 'sync_field', 'save_new_product', 'recover_shopify_draft', 'apply_categories', 'catalog_categories', 'get_product_operations', 'unknown']) {
    assert.throws(() => readOnlyRequest({ action }), /sola lettura/);
  }
  const context = { action: 'get_admin_context' };
  assert.equal(readOnlyRequest(context), context);
  assert.deepEqual(readOnlyRequest({ action: 'list_products', sku: 'QA', cursor: 'previous', pageSize: 25, category: 'Rose', needsClassification: true }), { action: 'list_products', sku: 'QA', cursor: 'previous', pageSize: 25 });
  const field = { editable: true, value: 'Originale', capabilities: { canUpdate: true, canConfirmLegacy: true, canRejectLegacy: true, canSuggestAi: true } } as AdminField;
  const result = readOnlyField(field);
  assert.equal(result.value, 'Originale');
  assert.equal(result.editable, false);
  for (const key of ['canUpdate', 'canConfirmLegacy', 'canRejectLegacy', 'canSuggestAi'] as const) assert.equal(result.capabilities[key], false);
  assert.equal(field.capabilities.canUpdate, true);
});
