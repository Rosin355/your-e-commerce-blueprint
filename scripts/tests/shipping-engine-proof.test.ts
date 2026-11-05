import assert from 'node:assert/strict';
import test from 'node:test';
import { emulateIntuitive, emulateNativeMaximum, intuitiveBlueprint, SYNTHETIC_ADDRESSES } from '../../shipping/engine-proof.mjs';
import { rateFor } from '../../shipping/rules.mjs';
import { prepareCurrentShippingPlan } from '../../shipping/plan.mjs';

const blueprint = intuitiveBlueprint(['__SKU_BULB__', '__SKU_SUCCULENT__']);
const line = (sku: string, total: number, quantity = 1) => ({ sku, quantity, requiresShipping: true, discountedLineTotalCents: total });
const cases = [
  ['bulbi', [line('__SKU_BULB__', 1500, 5)], 'B', 590, 690],
  ['grasse', [line('__SKU_SUCCULENT__', 6000)], 'B', 790, 890],
  ['bulbi+grasse', [line('__SKU_BULB__', 2000), line('__SKU_SUCCULENT__', 4000)], 'B', 790, 890],
  ['arbusto', [line('__SKU_SHRUB__', 4500)], 'A', 1190, 1250],
  ['misto 45', [line('__SKU_BULB__', 1500), line('__SKU_SHRUB__', 3000)], 'A', 1190, 1250],
  ['misto 160, ordinario piccolo', [line('__SKU_BULB__', 15000), line('__SKU_SHRUB__', 1000)], 'A', 1750, 1750],
  ['sconosciuto', [line('__SKU_BULB__', 2000), line('__SKU_NEW__', 2500)], 'A', 1190, 1250],
  ['SKU assente', [line('__SKU_BULB__', 2000), line('', 2500)], 'A', 1190, 1250],
] as const;
for (const [label, lines, table, standard, special] of cases) for (const area of ['standard', 'special'] as const) {
  test(`POC ${label} ${area}: un solo scenario ${table} sull’intero carrello`, () => {
    const result = emulateIntuitive(blueprint, { lines, address: SYNTHETIC_ADDRESSES[area] });
    assert.equal(result.table, table);
    assert.equal(result.priceCents, area === 'standard' ? standard : special);
    assert.equal(result.rateCount, 1);
    assert.equal(result.checkoutExecuted, false);
  });
}

test('ALL sulle righe differisce da ALL sulle condizioni; una sola riga sconosciuta disabilita B', () => {
  const mixed = [line('__SKU_BULB__', 1500), line('__SKU_NEW__', 3000)];
  assert.equal(mixed.some(row => blueprint.reducedSkus.includes(row.sku)), true);
  assert.equal(mixed.every(row => blueprint.reducedSkus.includes(row.sku)), false);
  assert.equal(emulateIntuitive(blueprint, { lines: mixed, address: SYNTHETIC_ADDRESSES.standard }).table, 'A');
});

test('filtri prodotto predefiniti darebbero 8,90 anziché 17,50 su misto 160: blueprint li disabilita', () => {
  const result = emulateIntuitive(blueprint, { lines: [line('__SKU_BULB__', 15000), line('__SKU_SHRUB__', 1000)], address: SYNTHETIC_ADDRESSES.standard });
  assert.equal(result.subtotalCents, 16000);
  assert.equal(result.priceCents, 1750);
  assert.equal(rateFor('A', 'standard', 1000).priceCents, 890);
  const unsafe = structuredClone(blueprint);
  unsafe.requiredSettings.matchProductFiltersToConditions = true;
  assert.throws(() => emulateIntuitive(unsafe, { lines: [line('__SKU_BULB__', 1500)], address: SYNTHETIC_ADDRESSES.standard }), /UNSAFE_RATE_CONFIGURATION/);
});

test('soglie esatte e sconti già attribuiti alle righe, entrambe le geografie', () => {
  const boundaries = [[1899,890,960,590,690],[1900,1190,1250,590,690],[4999,1190,1250,590,690],
    [5000,1190,1250,790,890],[7999,1190,1250,790,890],[8000,1250,1490,790,890],
    [14999,1250,1490,790,890],[15000,1750,1750,890,950],[24999,1750,1750,890,950],
    [25000,3600,3600,890,950],[49999,3600,3600,890,950],[50000,5400,5400,890,950],
    [0,890,960,590,690],[1000000,5400,5400,890,950]];
  for (const [amount, aStandard, aSpecial, bStandard, bSpecial] of boundaries) for (const area of ['standard', 'special'] as const) {
    assert.equal(emulateIntuitive(blueprint, { lines: [line('__SKU_SHRUB__', amount)], address: SYNTHETIC_ADDRESSES[area] }).priceCents, area === 'standard' ? aStandard : aSpecial);
    assert.equal(emulateIntuitive(blueprint, { lines: [line('__SKU_BULB__', amount)], address: SYNTHETIC_ADDRESSES[area] }).priceCents, area === 'standard' ? bStandard : bSpecial);
  }
});

test('stesso CAP simbolico distingue località, senza introdurre CAP operativi', () => {
  const lines = [line('__SKU_BULB__', 1500)];
  assert.equal(emulateIntuitive(blueprint, { lines, address: SYNTHETIC_ADDRESSES.sharedSpecial }).priceCents, 690);
  assert.equal(emulateIntuitive(blueprint, { lines, address: SYNTHETIC_ADDRESSES.sharedStandard }).priceCents, 590);
  assert.throws(() => emulateIntuitive(blueprint, { lines, address: { country: 'IT', postalToken: '__QA_SHARED__' } }), /LOCALITY_REQUIRED/);
  assert.throws(() => emulateIntuitive(blueprint, { lines, address: { country: 'IT', postalToken: 'not-a-fixture' } }), /SYNTHETIC_DESTINATION_ONLY/);
});

test('nessun risultato se si rischiano più sottocarrelli o blend automatici', () => {
  const fixture = { lines: [line('__SKU_BULB__', 1500)], address: SYNTHETIC_ADDRESSES.standard };
  assert.throws(() => emulateIntuitive(blueprint, { ...fixture, deliveryGroupCount: 2 }), /WHOLE_CART_NOT_PROVEN/);
  for (const key of ['rateBlending','cartSplitting','customCostBlending','freeShippingThreshold','rounding']) {
    const unsafe = structuredClone(blueprint); unsafe.requiredSettings[key] = true;
    assert.throws(() => emulateIntuitive(unsafe, fixture), /UNSAFE_RATE_CONFIGURATION/);
  }
});

test('massimo nativo risolve il misto solo con partizione completa; default A su tutti rompe B', () => {
  assert.equal(emulateNativeMaximum(['A', 'B'], 16000, 'standard'), 1750);
  assert.equal(emulateNativeMaximum(['B'], 1500, 'standard'), 590);
  assert.equal(emulateNativeMaximum(['A', 'B'], 1500, 'standard'), 890);
  // An unclassified extra item has no native collection rate: B would remain, which is forbidden.
  assert.equal(emulateNativeMaximum(['B', 'unmapped'], 4500, 'standard'), 590);
  assert.throws(() => emulateNativeMaximum(['unmapped'], 4500, 'standard'), /UNCLASSIFIED_NATIVE_COLLECTION/);
});

test('Market-driven shipping attivo sopprime il vecchio payload merchant DeliveryProfile', () => {
  const result = prepareCurrentShippingPlan({ historicalSnapshot: true }, { marketDrivenShipping: true });
  assert.equal(result.configurationReadPath, 'Market.delivery.shipping');
  assert.equal(result.proposedVariables, null);
  assert.equal(result.rollback, null);
  assert.throws(() => prepareCurrentShippingPlan({}, {}), /SHIPPING_MODEL_NOT_VERIFIED/);
});
