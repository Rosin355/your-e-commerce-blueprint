import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { classifyCart, moneyToCents, nativeRateSpecs, quoteForQA, rateFor, resolveArea, selectOptionsForQA } from '../../shipping/rules.mjs';
import { applyClassificationApprovals, buildProfilePlan, classificationWrites, fingerprint, profileSnapshotFingerprint, reducedSkuAllowlist, releaseReadiness, REQUIRED_GATES, reviewCatalog } from '../../shipping/plan.mjs';

const line = (logisticsClass: unknown, extra = {}) => ({ logisticsClass, quantity: 1, requiresShipping: true, classificationApproved: true, ...extra });
// Synthetic fixture CAPs only; no operational geography is inferred from these tests.
const geography = { status: 'approved', coverageComplete: true, source: 'synthetic QA fixture', approvedBy: 'QA', approvedAt: '2026-11-03',
  specialDestinations: [{ postalCode: '00002', area: 'special', source: 'fixture' },
    { postalCode: '00003', locality: 'Località test', area: 'special', source: 'fixture' },
    { postalCode: '00004', area: 'blocked', source: 'fixture' }] };
const destination = { countryCode: 'IT', postalCode: '00001' };

const boundaries = [
  ['0.00', 890, 960, 590, 690], ['18.99', 890, 960, 590, 690],
  ['19.00', 1190, 1250, 590, 690], ['49.99', 1190, 1250, 590, 690],
  ['50.00', 1190, 1250, 790, 890], ['79.99', 1190, 1250, 790, 890],
  ['80.00', 1250, 1490, 790, 890], ['149.99', 1250, 1490, 790, 890],
  ['150.00', 1750, 1750, 890, 950], ['249.99', 1750, 1750, 890, 950],
  ['250.00', 3600, 3600, 890, 950], ['499.99', 3600, 3600, 890, 950],
  ['500.00', 5400, 5400, 890, 950], ['10000.00', 5400, 5400, 890, 950],
] as const;
const carts = [
  ['solo bulbi', ['bulb'], 'B'], ['solo grasse', ['succulent'], 'B'],
  ['bulbi e grasse', ['bulb', 'succulent'], 'B'], ['solo arbusti', ['shrub'], 'A'],
  ['bulbi e arbusti', ['bulb', 'shrub'], 'A'], ['grasse e arbusti', ['succulent', 'shrub'], 'A'],
  ['tre classi', ['bulb', 'succulent', 'standard'], 'A'], ['pesante e bulbi', ['heavy', 'bulb'], 'A'],
  ['voluminosa', ['bulky'], 'A'], ['sconosciuto e bulbi', ['unknown', 'bulb'], 'A'],
] as const;

for (const [name, classes, table] of carts) for (const [amount, aIT, aSpecial, bIT, bSpecial] of boundaries) {
  for (const [area, expected] of [['standard', table === 'A' ? aIT : bIT], ['special', table === 'A' ? aSpecial : bSpecial]] as const) {
    test(`${name} €${amount} ${area}: tariffa unica ${expected}`, () => {
      const lines = classes.map(value => line(value, { quantity: 3 }));
      const result = quoteForQA({ lines, destination: { ...destination, postalCode: area === 'special' ? '00002' : '00001' },
        geography, shopifyRateSubtotalCents: moneyToCents(amount), currencyCode: 'EUR', deliveryGroupCount: 1 });
      assert.equal(result.table, table);
      assert.equal(result.priceCents, expected);
      // Native Shopify first selects the matching amount range; public app selects table/area only.
      const options = nativeRateSpecs().filter(spec => moneyToCents(amount) >= spec.minCents && (spec.maxCents === null || moneyToCents(amount) <= spec.maxCents));
      const selected = selectOptionsForQA({ options, lines, area, deliveryGroupCount: 1, countryCode: 'IT' });
      assert.equal(selected.length, 1);
      assert.equal(selected[0].priceCents, expected);
    });
  }
}

test('esempi cliente: importo totale intero carrello, nessuna somma A+B', () => {
  for (const [classes, amount, expected] of [
    [['bulb'], '15.00', 590], [['bulb', 'succulent'], '60.00', 790],
    [['bulb', 'shrub'], '45.00', 1190], [['bulb', 'shrub'], '160.00', 1750],
  ] as const) {
    assert.equal(quoteForQA({ lines: classes.map(c => line(c)), destination, geography,
      shopifyRateSubtotalCents: moneyToCents(amount), currencyCode: 'EUR', deliveryGroupCount: 1 }).priceCents, expected);
  }
});

test('sconosciuti, classificazioni non approvate e valori inattesi ricadono in A', () => {
  for (const value of [undefined, null, '', 'B', 'Bulbi', 'prototype', 'heavy']) assert.equal(classifyCart([line(value)]).table, 'A');
  assert.equal(classifyCart([line('bulb', { classificationApproved: false })]).table, 'A');
  assert.equal(classifyCart([line('bulb'), line(undefined)]).table, 'A');
});

test('quantità invalide, carrello vuoto, fisici non spedibili e flag shipping mancanti bloccano', () => {
  assert.throws(() => classifyCart([]), /EMPTY_CART/);
  for (const quantity of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => classifyCart([line('bulb', { quantity })]), /INVALID_QUANTITY/);
  assert.throws(() => classifyCart([line('bulb', { shippingBlocked: true })]), /NON_SHIPPABLE/);
  assert.throws(() => classifyCart([line('bulb', { requiresShipping: undefined })]), /UNKNOWN_SHIPPING/);
});

test('digitale puro non richiede spedizione; misto digitale/fisico richiede decisione esplicita', () => {
  assert.equal(classifyCart([line('unknown', { requiresShipping: false })]).status, 'shipping_not_required');
  assert.throws(() => classifyCart([line('bulb'), line('unknown', { requiresShipping: false })]), /MIXED_DIGITAL_POLICY/);
});

test('la geografia pending non assume Italia standard né inventa CAP', () => {
  const pending = JSON.parse(readFileSync(new URL('../../shipping/geography.pending.json', import.meta.url), 'utf8'));
  assert.equal(pending.specialDestinations.length, 0);
  assert.throws(() => resolveArea(destination, pending), /GEOGRAPHY_UNAPPROVED/);
  assert.throws(() => resolveArea(destination, { ...geography, coverageComplete: false }), /GEOGRAPHY_UNAPPROVED/);
});

test('Sud geografico non determina maggiorazione; solo le eccezioni approvate', () => {
  for (const region of ['Campania', 'Puglia', 'Basilicata', 'Calabria', 'Molise', 'Abruzzo', 'Sicilia', 'Sardegna']) {
    assert.equal(resolveArea({ ...destination, region }, geography), 'standard');
  }
  assert.equal(resolveArea({ ...destination, postalCode: '00002' }, geography), 'special');
  assert.equal(resolveArea({ ...destination, postalCode: ' 00002 ' }, geography), 'special');
});

test('CAP e località condivisi, destinazioni non servite, CAP malformati ed estero', () => {
  assert.throws(() => resolveArea({ ...destination, postalCode: '00003' }, geography), /LOCALITY_REQUIRED/);
  assert.equal(resolveArea({ ...destination, postalCode: '00003', locality: 'LOCALITÀ TEST' }, geography), 'special');
  assert.equal(resolveArea({ ...destination, postalCode: '00003', locality: 'Altro comune' }, geography), 'standard');
  assert.throws(() => resolveArea({ ...destination, postalCode: '00004' }, geography), /NOT_SERVICEABLE/);
  for (const postalCode of [12345, '1234', '123456', 'ABCDE', '', null]) assert.throws(() => resolveArea({ ...destination, postalCode }, geography), /POSTAL_CODE/);
  assert.throws(() => resolveArea({ ...destination, countryCode: 'FR' }, geography), /OUTSIDE_ITALY/);
});

test('nessuna scelta tariffaria con più delivery group, prezzi errati o opzioni ambigue', () => {
  const base = { options: [{ code: 'OG-B-IT-1', priceCents: 590 }], lines: [line('bulb')], area: 'standard', countryCode: 'IT', deliveryGroupCount: 1 };
  assert.throws(() => selectOptionsForQA({ ...base, deliveryGroupCount: 2 }), /MULTIPLE_DELIVERY/);
  assert.throws(() => selectOptionsForQA({ ...base, options: [] }), /CARDINALITY/);
  assert.throws(() => selectOptionsForQA({ ...base, options: [...base.options, ...base.options] }), /CARDINALITY/);
  assert.throws(() => selectOptionsForQA({ ...base, options: [{ code: 'OG-B-IT-1', priceCents: 0 }] }), /PRICE_MISMATCH/);
  assert.equal(selectOptionsForQA({ ...base, countryCode: 'FR' }), base.options);
});

test('importi decimali esatti senza floating point o arrotondamenti arbitrari', () => {
  assert.equal(moneyToCents('0.29'), 29);
  assert.equal(moneyToCents('149.9'), 14990);
  assert.equal(moneyToCents('150'), 15000);
  for (const amount of [149.99, '149.999', '-1.00', '1,00', 'Infinity', '1e2', '9007199254740992']) assert.throws(() => moneyToCents(amount), /INVALID_MONEY/);
  for (const amount of [-1, 1.01, NaN, Infinity]) assert.throws(() => rateFor('A', 'standard', amount), /INVALID_CENTS/);
  assert.throws(() => rateFor('__proto__', 'standard', 100), /INVALID_RATE_CONTEXT/);
});

test('sconti: confronta basi Shopify già determinate, non ricalcola percentuali nel frontend', () => {
  assert.equal(rateFor('B', 'standard', 5000).priceCents, 790);
  assert.equal(rateFor('B', 'standard', 4999).priceCents, 590);
  assert.equal(rateFor('A', 'standard', 15000).priceCents, 1750);
  assert.equal(rateFor('A', 'standard', 14999).priceCents, 1250);
  assert.equal(rateFor('A', 'standard', 0).priceCents, 890);
});

test('copertura continua 0–600 € per ogni centesimo: una fascia, tariffa positiva, A >= B', () => {
  const specs = nativeRateSpecs();
  assert.equal(specs.length, 18);
  for (let amount = 0; amount <= 60000; amount++) for (const area of ['standard', 'special']) {
    for (const table of ['A', 'B']) {
      const matches = specs.filter(row => row.table === table && row.area === area && amount >= row.minCents && (row.maxCents === null || amount <= row.maxCents));
      assert.equal(matches.length, 1);
      assert.ok(matches[0].priceCents > 0);
    }
    assert.ok(rateFor('A', area, amount).priceCents >= rateFor('B', area, amount).priceCents);
  }
});

const evidence = new URL('../../docs/shipping-evidence/2026-11-03/', import.meta.url);
const snapshot = JSON.parse(readFileSync(new URL('profile.json', evidence), 'utf8')).response;
const catalog = JSON.parse(readFileSync(new URL('catalog.json', evidence), 'utf8'));

test('piano operativo: due tariffe Italia disattivate, diciotto previste; UE/internazionale non toccate', () => {
  const before = fingerprint(snapshot);
  const plan = buildProfilePlan(snapshot);
  const zones = plan.proposedVariables.profile.locationGroupsToUpdate.flatMap(group => group.zonesToUpdate);
  assert.equal(zones.length, 1);
  assert.equal(zones[0].id, 'gid://shopify/DeliveryZone/682687136084');
  assert.equal(zones[0].methodDefinitionsToCreate.length, 18);
  assert.equal(zones[0].methodDefinitionsToUpdate.length, 2);
  assert.ok(zones[0].methodDefinitionsToUpdate.every(row => row.active === false));
  assert.equal(fingerprint(snapshot), before);
  const portable = structuredClone(snapshot);
  delete portable.data.deliveryProfiles.nodes[0].coversAllItems;
  assert.equal(profileSnapshotFingerprint(portable), plan.expectedSnapshotSha256);
  portable.data.deliveryProfiles.nodes[0].version += 1;
  assert.notEqual(profileSnapshotFingerprint(portable), plan.expectedSnapshotSha256);
  const incomplete = structuredClone(snapshot);
  incomplete.data.deliveryProfiles.nodes[0].profileLocationGroups[0].locationGroupZones.pageInfo.hasNextPage = true;
  assert.throws(() => buildProfilePlan(incomplete), /INCOMPLETE_ZONES/);
});

test('matrice reale completa per ID variante; suggerimenti non abilitano la B', () => {
  const review = reviewCatalog(catalog.pages);
  assert.equal(review.length, 1392);
  assert.equal(new Set(review.map(row => row.variantId)).size, 1392);
  assert.ok(review.every(row => row.approvedClass === null && row.effectiveTableUntilApproval === 'A'));
  assert.deepEqual(classificationWrites(review), []);
  assert.throws(() => reviewCatalog(catalog.pages.slice(0, -1)), /INCOMPLETE_CATALOG/);
  assert.throws(() => classificationWrites([{ ...review[0], approvedClass: 'bulb' }]), /APPROVAL_REQUIRED/);
  const approved = { ...review[0], approvedClass: 'succulent', approvedBy: 'QA', approvalReference: 'fixture approval' };
  const [write] = classificationWrites([approved]);
  assert.equal(write.ownerId, review[0].variantId);
  assert.equal(write.compareDigest, null);
  assert.throws(() => classificationWrites([{ ...approved, observedLogisticsFields: [{ namespace: 'logistics', key: 'shipping_class' }] }]), /SEPARATE_DIFF/);
});

test('tutti i gate mancanti bloccano; nemmeno gate verdi certificano automaticamente il live', () => {
  assert.equal(releaseReadiness({}).status, 'BLOCKED');
  const gates = Object.fromEntries(REQUIRED_GATES.map(key => [key, true]));
  for (const key of REQUIRED_GATES) assert.ok(releaseReadiness({ ...gates, [key]: false }).blockers.includes(key));
  assert.equal(releaseReadiness(gates).status, 'AWAITING_CONTROLLED_RELEASE');
  assert.equal(releaseReadiness(gates).liveSynchronized, false);
  assert.equal(releaseReadiness(gates).checkoutCertified, false);
});

test('approvazioni separate dai suggerimenti: ID variante certo e allowlist SKU unica', () => {
  const review = reviewCatalog(catalog.pages);
  const approval = { variantId: review[0].variantId, logisticsClass: 'succulent', approvedBy: 'QA', approvalReference: 'fixture' };
  const approved = applyClassificationApprovals(review, { status: 'approved', approvals: [approval] });
  assert.equal(review[0].approvedClass, null);
  assert.equal(classificationWrites(approved).length, 1);
  assert.deepEqual(reducedSkuAllowlist(approved), [{ variantId: review[0].variantId, sku: review[0].sku }]);
  assert.throws(() => applyClassificationApprovals(review, { status: 'pending', approvals: [approval] }), /INVALID_CLASSIFICATION_APPROVAL/);
  assert.throws(() => applyClassificationApprovals(review, { status: 'approved', approvals: [approval, approval] }), /INVALID_CLASSIFICATION_APPROVAL/);
  assert.throws(() => applyClassificationApprovals(review, { status: 'approved', approvals: [{ ...approval, variantId: 'missing' }] }), /INVALID_CLASSIFICATION_APPROVAL/);
  assert.throws(() => reducedSkuAllowlist([{ ...approved[0], sku: '' }]), /SKU_ALLOWLIST_UNSAFE/);
  assert.throws(() => reducedSkuAllowlist([approved[0], { ...review[1], sku: approved[0].sku }]), /SKU_ALLOWLIST_UNSAFE/);
});
