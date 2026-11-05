import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { assessSendcloud } from '../../shipping/sendcloud.mjs';
import { quoteForQA, resolveArea } from '../../shipping/rules.mjs';
import { releaseReadiness } from '../../shipping/plan.mjs';

const audit = JSON.parse(readFileSync(new URL('../../docs/shipping-evidence/2026-11-03/sendcloud-followup-audit.json', import.meta.url), 'utf8'));
const input = { shop: audit.shop.data.shop, applications: audit.applications.data.appInstallations,
  carrierServices: audit.carrierServices.data.carrierServices };

test('Sendcloud installata non prova connessione account o prezzo checkout attivo', () => {
  const result = assessSendcloud(input);
  assert.equal(result.installed, true);
  assert.equal(result.accountConnectionVerified, false);
  assert.equal(result.registeredCarrierServiceCount, 0);
  assert.equal(result.dynamicCheckoutInstalled, false);
  assert.equal(result.shippingRulesSetCustomerCheckoutPrice, false);
  assert.ok(result.blockers.includes('SENDCLOUD_ACCOUNT_CONNECTION_UNVERIFIED'));
  assert.ok(result.blockers.includes('CHECKOUT_MECHANISM_UNRESOLVED'));
});

test('Grow impedisce di dichiarare disponibile il percorso documentato Sendcloud Dynamic Checkout', () => {
  const result = assessSendcloud({ ...input, accountConnectionVerified: true, checkoutMechanism: 'sendcloud_dynamic_checkout' });
  assert.equal(result.documentedDynamicCheckoutEligibleOnShopifyPlan, false);
  assert.ok(result.blockers.includes('SENDCLOUD_DYNAMIC_CHECKOUT_REQUIRES_SHOPIFY_PLUS'));
  assert.equal(result.status, 'BLOCKED');
});

test('Plus e installazione eventuali non certificano carrelli misti o configurazione geografica', () => {
  const result = assessSendcloud({ ...input, shop: { ...input.shop, plan: { publicDisplayName: 'Plus', shopifyPlus: true } },
    applications: { ...input.applications, nodes: [...input.applications.nodes,
      { app: { title: 'Sendcloud Dynamic Checkout', handle: 'fixture-sendcloud-checkout' } }] },
    accountConnectionVerified: true, checkoutMechanism: 'sendcloud_dynamic_checkout' });
  assert.equal(result.documentedDynamicCheckoutEligibleOnShopifyPlan, true);
  assert.equal(result.dynamicCheckoutInstalled, true);
  assert.ok(result.blockers.includes('SENDCLOUD_DYNAMIC_CHECKOUT_CONFIGURATION_AND_MIXED_CARTS_UNVERIFIED'));
  assert.equal(result.status, 'BLOCKED');
});

test('audit incompleto o store diverso non diventano evidenza valida', () => {
  assert.throws(() => assessSendcloud({ ...input, shop: { ...input.shop, myshopifyDomain: 'different.myshopify.com' } }), /WRONG_SHIPPING_STORE/);
  assert.throws(() => assessSendcloud({ ...input, applications: { ...input.applications, pageInfo: { hasNextPage: true } } }), /INCOMPLETE_SENDCLOUD_AUDIT/);
});

test('Sicilia/Sardegna sono candidate configurabili, senza effetto tariffario prima dell’approvazione', () => {
  const geography = JSON.parse(readFileSync(new URL('../../shipping/geography.pending.json', import.meta.url), 'utf8'));
  assert.deepEqual(geography.candidateRegions.map(row => row.name), ['Sicilia', 'Sardegna']);
  for (const region of geography.candidateRegions) {
    assert.equal(region.status, 'candidate_not_approved');
    assert.throws(() => resolveArea({ countryCode: 'IT', postalCode: '00001', region: region.name }, geography), /GEOGRAPHY_UNAPPROVED/);
  }
  assert.deepEqual(geography.specialDestinations, []);
});

test('il vecchio gate app pubblica non può sostituire verifica Sendcloud e meccanismo checkout', () => {
  const result = releaseReadiness({ publicAppVerified: true });
  assert.ok(result.blockers.includes('sendcloudIntegrationVerified'));
  assert.ok(result.blockers.includes('checkoutMechanismVerified'));
});

test('tariffa cliente indipendente dal costo del corriere e piattaforma fissa senza nuovi servizi', () => {
  const policy = JSON.parse(readFileSync(new URL('../../shipping/platform-policy.json', import.meta.url), 'utf8'));
  assert.equal(policy.logisticsPlatform, 'sendcloud');
  assert.equal(policy.additionalSubscriptionsAuthorized, false);
  assert.equal(policy.externalServicesAuthorized, false);
  assert.equal(policy.native18RateTemplateSelectedForDeployment, false);
  assert.equal(assessSendcloud(input).carrierSelectionRequiredForTariffEngineDesign, false);
  const geography = { status: 'approved', coverageComplete: true, source: 'synthetic test fixture', approvedBy: 'QA', approvedAt: '2026-11-03', specialDestinations: [] };
  const quote = quoteForQA({ lines: [{ logisticsClass: 'bulb', classificationApproved: true, quantity: 5, requiresShipping: true }],
    destination: { countryCode: 'IT', postalCode: '00001' }, geography, shopifyRateSubtotalCents: 1500, currencyCode: 'EUR', deliveryGroupCount: 1 });
  assert.equal(quote.priceCents, 590);
  assert.equal(quote.table, 'B');
});
