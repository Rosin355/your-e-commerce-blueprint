import { createHash } from 'node:crypto';
import { CLASSES, centsToMoney, nativeRateSpecs } from './rules.mjs';

export function fingerprint(value) {
  const canonical = input => Array.isArray(input) ? input.map(canonical) : input && typeof input === 'object'
    ? Object.fromEntries(Object.keys(input).sort().map(key => [key, canonical(input[key])])) : input;
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

export function profileSnapshotFingerprint(snapshot) {
  const comparable = structuredClone(snapshot);
  // Live connector exposes this newer field; portable 2026-01 audit does not.
  for (const profile of comparable.data.deliveryProfiles.nodes) delete profile.coversAllItems;
  return fingerprint(comparable);
}

function complete(connection, label) {
  if (!Array.isArray(connection?.nodes) || connection.pageInfo?.hasNextPage !== false) throw new Error(`INCOMPLETE_${label}`);
}

export function reviewCatalog(pages) {
  if (!pages.length || pages.at(-1)?.products?.pageInfo?.hasNextPage !== false) throw new Error('INCOMPLETE_CATALOG');
  const seenProducts = new Set();
  const seenVariants = new Set();
  return pages.flatMap(page => page.products.nodes.flatMap(product => {
    if (seenProducts.has(product.id)) throw new Error('DUPLICATE_PRODUCT');
    seenProducts.add(product.id);
    for (const field of ['collections', 'shipping', 'logistics', 'variants']) complete(product[field], field.toUpperCase());
    const handles = product.collections.nodes.map(collection => collection.handle);
    const bulb = handles.some(handle => handle === 'bulbi' || handle.startsWith('bulbi-'));
    const succulent = handles.includes('piante-da-interno-piante-grasse-e-succulente');
    const shrub = handles.some(handle => /(?:^|-)arbusti(?:-|$)/.test(handle));
    const standard = handles.some(handle => /^(piante-|alberi|conifere|rose|agrumi|aromatiche|rampicanti|sempreverdi|erbacee|piccoli-frutti)/.test(handle));
    const conflict = Number(bulb) + Number(succulent) + Number(shrub) > 1;
    const suggestedClass = conflict ? 'unknown' : bulb ? 'bulb' : succulent ? 'succulent' : shrub ? 'shrub' : standard ? 'standard' : 'unknown';
    return product.variants.nodes.map(variant => {
      if (seenVariants.has(variant.id)) throw new Error('DUPLICATE_VARIANT');
      seenVariants.add(variant.id);
      complete(variant.shipping, 'VARIANT_SHIPPING');
      complete(variant.logistics, 'VARIANT_LOGISTICS');
      const logisticsFields = [...product.shipping.nodes, ...product.logistics.nodes, ...(product.customClass ? [product.customClass] : []), ...variant.shipping.nodes, ...variant.logistics.nodes];
      return {
        productId: product.id, variantId: variant.id, sku: variant.sku, productTitle: product.title,
        variantTitle: variant.title, status: product.status, productType: product.productType,
        category: product.category, tags: product.tags, collections: handles,
        weight: variant.inventoryItem.measurement.weight, requiresShipping: variant.inventoryItem.requiresShipping,
        observedLogisticsFields: logisticsFields, suggestedClass,
        suggestionSource: conflict ? 'conflicting_collections' : 'existing_collection_membership_only',
        approvedClass: null, approvedBy: null, approvalReference: null,
        effectiveClassUntilApproval: 'unknown', effectiveTableUntilApproval: 'A',
        updatedAtObserved: product.updatedAt,
      };
    });
  }));
}

export function classificationWrites(review) {
  const approved = review.filter(row => row.approvedClass !== null);
  return approved.map(row => {
    if (!CLASSES.includes(row.approvedClass) || !row.approvedBy || !row.approvalReference) throw new Error('CLASSIFICATION_APPROVAL_REQUIRED');
    // New merchant-owned key for approved logistics integrations. Existing keys are never replaced.
    if (row.observedLogisticsFields.some(field => field.namespace === 'logistics' && field.key === 'shipping_class')) throw new Error('EXISTING_CLASSIFICATION_REQUIRES_SEPARATE_DIFF');
    return { ownerId: row.variantId, namespace: 'logistics', key: 'shipping_class',
      type: 'single_line_text_field', value: row.approvedClass, compareDigest: null };
  });
}

export function applyClassificationApprovals(review, document) {
  if (!Array.isArray(document?.approvals)) throw new Error('INVALID_APPROVALS_DOCUMENT');
  const byVariant = new Map(review.map(row => [row.variantId, row]));
  const seen = new Set();
  const result = review.map(row => ({ ...row }));
  const output = new Map(result.map(row => [row.variantId, row]));
  for (const approval of document.approvals) {
    if (document.status !== 'approved' || !byVariant.has(approval.variantId) || seen.has(approval.variantId) ||
        !CLASSES.includes(approval.logisticsClass) || !approval.approvedBy || !approval.approvalReference) throw new Error('INVALID_CLASSIFICATION_APPROVAL');
    seen.add(approval.variantId);
    const row = output.get(approval.variantId);
    Object.assign(row, { approvedClass: approval.logisticsClass, approvedBy: approval.approvedBy,
      approvalReference: approval.approvalReference, effectiveClassUntilApproval: approval.logisticsClass,
      effectiveTableUntilApproval: ['bulb', 'succulent'].includes(approval.logisticsClass) ? 'B' : 'A' });
  }
  return result;
}

/** Adapter contract for apps supporting SKU conditions but not variant metafields. */
export function reducedSkuAllowlist(review) {
  const counts = new Map();
  for (const row of review) counts.set(row.sku, (counts.get(row.sku) || 0) + 1);
  const reduced = review.filter(row => ['bulb', 'succulent'].includes(row.approvedClass));
  for (const row of reduced) if (!row.sku || counts.get(row.sku) !== 1 || !row.approvedBy || !row.approvalReference) throw new Error('SKU_ALLOWLIST_UNSAFE');
  return reduced.map(row => ({ variantId: row.variantId, sku: row.sku })).sort((a, b) => a.sku.localeCompare(b.sku));
}

export function buildProfilePlan(snapshot) {
  const profiles = snapshot.data.deliveryProfiles;
  complete(profiles, 'PROFILES');
  if (profiles.nodes.length !== 1 || profiles.nodes[0].default !== true) throw new Error('PROFILE_BASELINE_CHANGED');
  const profile = profiles.nodes[0];
  const matches = [];
  for (const group of profile.profileLocationGroups) {
    complete(group.locationGroup.locations, 'LOCATIONS');
    complete(group.locationGroupZones, 'ZONES');
    for (const zone of group.locationGroupZones.nodes) {
      complete(zone.methodDefinitions, 'METHODS');
      if (zone.zone.countries.some(country => country.code.countryCode === 'IT')) matches.push({ group, zone });
    }
  }
  if (matches.length !== 1) throw new Error('ITALY_ZONE_AMBIGUOUS');
  const { group, zone } = matches[0];
  if (group.locationGroup.locations.nodes.length !== 1 || zone.zone.countries.length !== 1) throw new Error('SHIPPING_TOPOLOGY_UNVERIFIED');
  const legacy = zone.methodDefinitions.nodes;
  if (legacy.length !== 2 || legacy.some(method => method.name.startsWith('OG-'))) throw new Error('PROFILE_BASELINE_CHANGED');
  const specs = nativeRateSpecs();
  const methods = specs.map(spec => ({
    name: spec.code, description: spec.displayName, active: true,
    rateDefinition: { price: { amount: centsToMoney(spec.priceCents), currencyCode: 'EUR' } },
    priceConditionsToCreate: [
      { operator: 'GREATER_THAN_OR_EQUAL_TO', criteria: { amount: centsToMoney(spec.minCents), currencyCode: 'EUR' } },
      ...(spec.maxCents === null ? [] : [{ operator: 'LESS_THAN_OR_EQUAL_TO', criteria: { amount: centsToMoney(spec.maxCents), currencyCode: 'EUR' } }]),
    ],
  }));
  return {
    status: 'CONDITIONAL_REFERENCE_TEMPLATE_NOT_SELECTED_FOR_DEPLOYMENT',
    expectedProfileId: profile.id, expectedVersion: profile.version,
    expectedSnapshotSha256: profileSnapshotFingerprint(snapshot),
    comparisonExcludes: ['DeliveryProfile.coversAllItems; variant/profile membership is audited separately'],
    specs,
    proposedVariables: { id: profile.id, profile: { locationGroupsToUpdate: [{ id: group.locationGroup.id,
      zonesToUpdate: [{ id: zone.zone.id, methodDefinitionsToCreate: methods,
        methodDefinitionsToUpdate: legacy.map(method => ({ id: method.id, active: false })) }],
    }] } },
    rollback: {
      restoreLegacy: legacy.map(method => ({ id: method.id, active: method.active })),
      deactivateCreatedMethods: 'Resolve exactly the 18 IDs returned by the authorized mutation; never delete by name alone.',
      restoreSnapshotSha256: fingerprint(snapshot),
    },
    preconditions: ['Fresh snapshot matches this fingerprint and profile version.',
      'A checkout mechanism compatible with the actual Shopify plan is selected, verified and approved. Sendcloud remains the logistics platform.',
      'Approved complete geography, native discount basis verified, exactly one delivery group.',
      'Single explicit live authorization for the full operational diff.'],
  };
}

export const REQUIRED_GATES = Object.freeze(['geographyApproved', 'classificationApproved', 'sendcloudIntegrationVerified', 'checkoutMechanismVerified',
  'deliveryCustomizationsAudited', 'discountBasisVerified', 'singleDeliveryGroupVerified',
  'stagingCheckoutMatrixPassed', 'freshBackupVerified', 'operationalDiffApproved']);

export function releaseReadiness(gates) {
  const blockers = REQUIRED_GATES.filter(key => gates?.[key] !== true);
  return { status: blockers.length ? 'BLOCKED' : 'AWAITING_CONTROLLED_RELEASE', blockers,
    liveSynchronized: false, checkoutCertified: false };
}
