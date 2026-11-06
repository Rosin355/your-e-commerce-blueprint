import test from 'node:test';
import assert from 'node:assert/strict';
import { productStates } from '../../src/adminv2/lib/labels.ts';
import type { ProductSummary } from '../../src/adminv2/lib/adminApi.ts';

test('missing sync history never asserts that an existing Shopify product is unpublished', () => {
  const product = { contentStatus: 'completo', reviewPendingCount: 0, categoryEffective: 'Bulbi', shopifyStatus: 'Mai sincronizzato' } as ProductSummary;
  assert.ok(productStates(product).includes('Sincronizzazione non verificata'));
  assert.ok(!productStates(product).includes('Non pubblicato'));
  assert.ok(productStates({ ...product, shopifyStatus: 'In attesa' }).includes('Sincronizzazione in attesa'));
  assert.ok(productStates({ ...product, shopifyStatus: 'Sincronizzato' }).includes('Aggiornato'));
  assert.ok(productStates({ ...product, shopifyStatus: 'Errore' }).includes('Errore'));
});
