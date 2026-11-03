#!/usr/bin/env node
// Reproducible offline semantics proof. No network, install, credentials, or live writes.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { intuitiveBlueprint, emulateIntuitive, emulateNativeMaximum, SYNTHETIC_ADDRESSES } from './engine-proof.mjs';

if (process.argv.length > 2) throw new Error('OFFLINE_PROOF_ONLY');
const blueprint = intuitiveBlueprint(['__SKU_BULB__', '__SKU_SUCCULENT__']);
const line = (sku, amount, quantity = 1) => ({ sku, requiresShipping: true, quantity, discountedLineTotalCents: amount });
const cases = [
  ['bulbi 15', [line('__SKU_BULB__', 1500, 5)], 'B', 590, 690],
  ['bulbi + grasse 60', [line('__SKU_BULB__', 2000), line('__SKU_SUCCULENT__', 4000)], 'B', 790, 890],
  ['bulbi + arbusti 45', [line('__SKU_BULB__', 1500), line('__SKU_SHRUB__', 3000)], 'A', 1190, 1250],
  ['bulbi 150 + ordinario 10', [line('__SKU_BULB__', 15000), line('__SKU_SHRUB__', 1000)], 'A', 1750, 1750],
  ['bulbi + prodotto sconosciuto', [line('__SKU_BULB__', 1500), line('__SKU_NEW__', 3000)], 'A', 1190, 1250],
];
const results = cases.flatMap(([label, lines, table, standard, special]) => ['standard', 'special'].map(area => {
  const result = emulateIntuitive(blueprint, { lines, address: SYNTHETIC_ADDRESSES[area] });
  assert.equal(result.table, table); assert.equal(result.priceCents, area === 'standard' ? standard : special);
  return { label, result, passed: true };
}));
const report = {
  proofType: 'OFFLINE_DOCUMENTED_SEMANTICS_NOT_INSTALLED_APP_EXECUTION',
  results, liveCheckoutCasesExecuted: 0, installations: 0, purchases: 0, shopifyMutations: 0,
  nativeCounterexamples: {
    broadOrdinaryRateSuppressesReduced: { actualCents: emulateNativeMaximum(['A', 'B'], 1500, 'standard'), requiredCents: 590 },
    missingOrdinaryCollectionMembershipUndercharges: { actualCents: emulateNativeMaximum(['B', 'unmapped'], 4500, 'standard'), requiredCents: 1190 },
  },
  releaseStatus: 'BLOCKED_PENDING_OWNER_DECISION_AND_DEVELOPMENT_CHECKOUT_PROOF',
  runtimeStillRequired: ['Grow CCS entitlement', 'market-driven shipping compatibility and correct app rate placement',
    'native subtotal/discount fetching equivalence', 'single whole-cart delivery group', 'approved geographic and classification mappings'],
};
const output = new URL('../docs/shipping-evidence/2026-11-03/engine-selection/', import.meta.url);
await writeFile(new URL('intuitive-blueprint.fixture.json', output), JSON.stringify(blueprint, null, 2) + '\n');
await writeFile(new URL('offline-proof.json', output), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
