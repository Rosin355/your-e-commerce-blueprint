#!/usr/bin/env node
// Offline preparation only. No fetch, credentials, Shopify mutation, or --apply mode.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { applyClassificationApprovals, prepareCurrentShippingPlan, classificationWrites, reducedSkuAllowlist, releaseReadiness, reviewCatalog } from './plan.mjs';
import { CLASSES, rateFor } from './rules.mjs';
import { evidenceJson } from './evidence-json.mjs';
import { assessSendcloud } from './sendcloud.mjs';

const root = new URL('../docs/shipping-evidence/2026-11-03/', import.meta.url);
const read = async path => JSON.parse(await readFile(path, 'utf8'));
if (process.argv.length > 2) throw new Error('OFFLINE_PREPARATION_ONLY_NO_ARGUMENTS');
const catalog = await read(new URL('catalog.json', root));
const profile = await read(new URL('profile.json', root));
const approvals = await read(new URL('./classification.approvals.pending.json', import.meta.url));
const review = applyClassificationApprovals(reviewCatalog(catalog.pages), approvals);
const nativeCapabilities = await read(new URL('engine-selection/native-capabilities.json', root));
const plan = prepareCurrentShippingPlan(profile.response, nativeCapabilities.features.data.shop.features);
const gates = await read(new URL('./release-gates.pending.json', import.meta.url));
const platformPolicy = await read(new URL('./platform-policy.json', import.meta.url));
const audit = await read(new URL('sendcloud-followup-audit.json', root));
const sendcloudAssessment = assessSendcloud({
  shop: audit.shop.data.shop, applications: audit.applications.data.appInstallations,
  carrierServices: audit.carrierServices.data.carrierServices,
  accountConnectionVerified: platformPolicy.sendcloudAccountConnectionVerified,
  checkoutMechanism: platformPolicy.checkoutMechanism,
});
const readiness = releaseReadiness(gates);
readiness.blockers = [...new Set([...readiness.blockers, ...sendcloudAssessment.blockers])];
if (readiness.blockers.length) readiness.status = 'BLOCKED';
const summary = {
  products: catalog.pages.flatMap(page => page.products.nodes).length, variants: review.length,
  statuses: review.reduce((counts, row) => ({ ...counts, [row.status]: (counts[row.status] || 0) + 1 }), {}),
  suggestions: review.reduce((counts, row) => ({ ...counts, [row.suggestedClass]: (counts[row.suggestedClass] || 0) + 1 }), {}),
  approvedVariants: review.filter(row => row.approvedClass !== null).length,
  positiveWeights: review.filter(row => row.weight?.value > 0).length,
  logisticsFieldsPresent: review.filter(row => row.observedLogisticsFields.length > 0).length,
};
const artifacts = {
  'classification-review.json': { status: 'PENDING_CLIENT_VALIDATION', summary, rows: review },
  'release-plan.json': {
    ...readiness, plan, gates, platformPolicy, sendcloudAssessment,
    deploymentCandidate: null,
    classificationDefinition: {
      name: 'Classe logistica spedizioni Online Garden', namespace: 'logistics', key: 'shipping_class',
      type: 'single_line_text_field', ownerType: 'PRODUCTVARIANT',
      description: 'Classe logistica approvata; assenza o valore sconosciuto implica tariffa ordinaria A.',
      validations: [{ name: 'choices', value: JSON.stringify(CLASSES) }],
    },
    classificationWrites: classificationWrites(review),
    reducedSkuAllowlist: reducedSkuAllowlist(review),
    note: 'BLOCKED. Sendcloud remains the logistics platform. Market-driven shipping is active: legacy merchant profile mutation variables are suppressed. Intuitive Shipping is the documented candidate for an isolated development proof, not authorized or installed. No additional subscription or live executor exists.',
  },
  'checkout-matrix.json': {
    status: 'NOT_RUN_IN_NATIVE_CHECKOUT',
    note: 'Expected prices are reference calculations only. Exact totals require staging fixtures or existing eligible prices/discounts; never edit live prices or create live discounts for these tests.',
    dimensions: {
      carts: [
        ['bulbi', ['bulb'], 'B'], ['grasse', ['succulent'], 'B'], ['bulbi_grasse', ['bulb', 'succulent'], 'B'],
        ['arbusti', ['shrub'], 'A'], ['bulbi_arbusti', ['bulb', 'shrub'], 'A'], ['grasse_arbusti', ['succulent', 'shrub'], 'A'],
        ['tre_classi', ['bulb', 'succulent', 'standard'], 'A'], ['pesanti', ['heavy'], 'A'], ['voluminose', ['bulky'], 'A'], ['sconosciuti', ['unknown'], 'A'],
      ],
      destinations: [['Italia standard', 'standard'], ['Sicilia da confermare', 'special'], ['Sardegna da confermare', 'special'],
        ['Isola minore approvata da individuare', 'special'], ['CAP disagiato approvato da acquisire', 'special'], ['Sud continentale ordinario da validare', 'standard']],
      subtotalsCents: [1899, 1900, 4999, 5000, 7999, 8000, 14999, 15000, 24999, 25000, 49999, 50000],
    },
  },
};
const matrix = artifacts['checkout-matrix.json'];
matrix.cases = matrix.dimensions.carts.flatMap(([cart, classes, table]) => matrix.dimensions.destinations.flatMap(([destination, area]) =>
  matrix.dimensions.subtotalsCents.map(amount => ({ cart, classes, quantityScenario: 'repeat_with_1_and_multiple', destination,
    postalCode: null, geographyApproval: 'PENDING', shopifyRateSubtotalCents: amount,
    expectedTable: table, expectedPriceCentsIfDestinationApproved: rateFor(table, area, amount).priceCents,
    nativeCheckoutResult: 'NOT_RUN', checkoutEvidence: null })),
));
for (const [name, data] of Object.entries(artifacts)) await writeFile(new URL(name, root), evidenceJson(data) + '\n');
// Inline inputs make schema validation cover the proposed nested variables as well.
function graphqlLiteral(value, key = '') {
  if (Array.isArray(value)) return '[' + value.map(item => graphqlLiteral(item)).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).map(([field, item]) => field + ':' + graphqlLiteral(item, field)).join(',') + '}';
  if (['currencyCode', 'operator', 'ownerType'].includes(key)) return value;
  return JSON.stringify(value);
}
if (plan.proposedVariables) await writeFile(new URL('profile-target-input.graphql', root),
  'mutation ShippingTargetValidation { deliveryProfileUpdate(id:' + JSON.stringify(plan.proposedVariables.id) + ', profile:' + graphqlLiteral(plan.proposedVariables.profile) + ') { profile { id version } userErrors { field message } } }\n');
await writeFile(new URL('classification-definition-input.graphql', root),
  'mutation ClassificationDefinitionValidation { metafieldDefinitionCreate(definition:' + graphqlLiteral(artifacts['release-plan.json'].classificationDefinition) + ') { createdDefinition { id } userErrors { field message } } }\n');
console.log(JSON.stringify({ output: fileURLToPath(root), summary, readiness, sendcloudAssessment, referenceNativeRates: plan.specs.length }, null, 2));
