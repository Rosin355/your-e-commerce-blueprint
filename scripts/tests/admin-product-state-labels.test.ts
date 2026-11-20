import test from 'node:test';
import assert from 'node:assert/strict';
import { productStates, siteState } from '../../src/adminv2/lib/labels.ts';
import type { ProductSummary } from '../../src/adminv2/lib/adminApi.ts';

test('missing sync history never asserts that an existing Shopify product is unpublished', () => {
  const product = { contentStatus: 'completo', reviewPendingCount: 0, categoryEffective: 'Bulbi', shopifyStatus: 'Mai sincronizzato' } as ProductSummary;
  assert.ok(productStates(product).includes('Sincronizzazione non verificata'));
  assert.ok(!productStates(product).includes('Non pubblicato'));
  assert.ok(productStates({ ...product, shopifyStatus: 'In attesa' }).includes('Sincronizzazione in attesa'));
  assert.ok(productStates({ ...product, shopifyStatus: 'Sincronizzato' }).includes('Aggiornato'));
  assert.ok(productStates({ ...product, shopifyStatus: 'Errore' }).includes('Errore'));
});

test('stato sul sito richiede prove sul canale e distingue la disponibilità', () => {
  assert.match(siteState({ available: false }, 'LOCAL_DRAFT', false), /interna non inviata/);
  assert.match(siteState({ available: false }, 'VERIFIED_DRAFT', true), /da verificare/);
  assert.match(siteState({ available: false }, 'IN_FLIGHT', false), /da verificare/);
  assert.match(siteState({ available: true, publicationStatus: 'DRAFT' }), /Bozza Shopify verificata/);
  assert.match(siteState({ available: true, publicationStatus: 'ACTIVE', siteAvailability: true }), /da verificare/);
  assert.match(siteState({ available: true, publicationStatus: 'UNLISTED', siteVisible: true, siteAvailability: true }), /tramite link.*disponibile/);
  assert.match(siteState({ available: true, publicationStatus: 'ACTIVE', siteVisible: false }), /Non visibile/);
  assert.match(siteState({ available: true, publicationStatus: 'ACTIVE' }), /da verificare/);
  assert.match(siteState({ available: true, publicationStatus: 'ACTIVE', siteVisible: true, siteAvailability: true }), /Pubblicato.*disponibile/);
  assert.match(siteState({ available: true, publicationStatus: 'ACTIVE', siteVisible: true, siteAvailability: false }), /Pubblicato.*non acquistabile/);
});
