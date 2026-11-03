/** Reference rules for QA and configuration generation. Never imported by the storefront. */
export const RATE_TABLES = Object.freeze({
  A: Object.freeze([
    [0, 1899, 890, 960], [1900, 7999, 1190, 1250],
    [8000, 14999, 1250, 1490], [15000, 24999, 1750, 1750],
    [25000, 49999, 3600, 3600], [50000, null, 5400, 5400],
  ].map(Object.freeze)),
  B: Object.freeze([
    [0, 4999, 590, 690], [5000, 14999, 790, 890],
    [15000, null, 890, 950],
  ].map(Object.freeze)),
});
export const CLASSES = Object.freeze(['bulb', 'succulent', 'shrub', 'standard', 'heavy', 'bulky', 'unknown']);
export const REDUCED_CLASSES = Object.freeze(['bulb', 'succulent']);

function cents(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('INVALID_CENTS');
  return value;
}

export function moneyToCents(value) {
  if (typeof value !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('INVALID_MONEY');
  const [whole, decimal = ''] = value.split('.');
  const result = BigInt(whole) * 100n + BigInt(decimal.padEnd(2, '0'));
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('INVALID_MONEY');
  return Number(result);
}

export function centsToMoney(value) {
  cents(value);
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}`;
}

export function classifyCart(lines) {
  if (!Array.isArray(lines) || !lines.length) throw new Error('EMPTY_CART');
  for (const line of lines) {
    if (!line || !Number.isSafeInteger(line.quantity) || line.quantity < 1) throw new Error('INVALID_QUANTITY');
    if (typeof line.requiresShipping !== 'boolean') throw new Error('UNKNOWN_SHIPPING_REQUIREMENT');
    if (line.shippingBlocked === true) throw new Error('NON_SHIPPABLE_PRODUCT');
  }
  const physical = lines.filter(line => line.requiresShipping);
  if (!physical.length) return { table: null, status: 'shipping_not_required' };
  // Mixed digital/physical behavior and its shipping subtotal need explicit business validation.
  if (physical.length !== lines.length) throw new Error('MIXED_DIGITAL_POLICY_UNAPPROVED');
  const table = physical.every(line => REDUCED_CLASSES.includes(line.logisticsClass) && line.classificationApproved === true) ? 'B' : 'A';
  return { table, status: 'classified' };
}

/** No built-in CAPs or regional shortcuts: only a separately approved, complete policy. */
export function resolveArea(destination, policy) {
  if (destination?.countryCode !== 'IT') throw new Error('OUTSIDE_ITALY');
  if (typeof destination.postalCode !== 'string' || !/^\d{5}$/.test(destination.postalCode.trim())) throw new Error('INVALID_POSTAL_CODE');
  if (policy?.status !== 'approved' || policy.coverageComplete !== true ||
      !policy.source || !policy.approvedBy || !policy.approvedAt || !Array.isArray(policy.specialDestinations)) {
    throw new Error('GEOGRAPHY_UNAPPROVED');
  }
  const postalCode = destination.postalCode.trim();
  let special = false;
  for (const row of policy.specialDestinations) {
    if (!row || !/^\d{5}$/.test(row.postalCode) || !row.source || !['special', 'blocked'].includes(row.area)) throw new Error('INVALID_GEOGRAPHY_ROW');
    if (row.postalCode !== postalCode) continue;
    // Some CAPs span multiple localities: do not silently match the entire CAP.
    if (row.locality && !destination.locality) throw new Error('LOCALITY_REQUIRED');
    if (row.locality && row.locality.trim().toLocaleLowerCase('it') !== destination.locality.trim().toLocaleLowerCase('it')) continue;
    if (row.area === 'blocked') throw new Error('DESTINATION_NOT_SERVICEABLE');
    special = true;
  }
  return special ? 'special' : 'standard';
}

export function rateFor(table, area, shopifyRateSubtotalCents) {
  cents(shopifyRateSubtotalCents);
  if (!Object.hasOwn(RATE_TABLES, table) || !['standard', 'special'].includes(area)) throw new Error('INVALID_RATE_CONTEXT');
  const tierIndex = RATE_TABLES[table].findIndex(([min, max]) => shopifyRateSubtotalCents >= min && (max === null || shopifyRateSubtotalCents <= max));
  const tier = RATE_TABLES[table][tierIndex];
  return { table, area, tierIndex, priceCents: tier[area === 'standard' ? 2 : 3], currencyCode: 'EUR' };
}

/** Subtotal must come from the verified Shopify shipping basis, never browser prices. */
export function quoteForQA({ lines, destination, geography, shopifyRateSubtotalCents, currencyCode, deliveryGroupCount }) {
  if (currencyCode !== 'EUR') throw new Error('UNSUPPORTED_CURRENCY');
  const cart = classifyCart(lines);
  if (cart.table === null) return cart;
  if (deliveryGroupCount !== 1) throw new Error('MULTIPLE_DELIVERY_GROUPS_UNVERIFIED');
  return rateFor(cart.table, resolveArea(destination, geography), shopifyRateSubtotalCents);
}

export function nativeRateSpecs() {
  return Object.entries(RATE_TABLES).flatMap(([table, tiers]) => tiers.flatMap(([min, max, standard, special], tierIndex) =>
    [['standard', standard], ['special', special]].map(([area, priceCents]) => ({
      code: `OG-${table}-${area === 'standard' ? 'IT' : 'SPECIAL'}-${tierIndex + 1}`,
      table, area, tierIndex, minCents: min, maxCents: max, priceCents,
      displayName: area === 'standard' ? 'Spedizione standard' : 'Spedizione isole e zone disagiate',
    })),
  ));
}

/** Executable acceptance contract for a public app; this is NOT a deployed Shopify Function. */
export function selectOptionsForQA({ options, lines, area, deliveryGroupCount, countryCode }) {
  if (countryCode !== 'IT') return options; // Never affect existing EU/international options.
  if (deliveryGroupCount !== 1) throw new Error('MULTIPLE_DELIVERY_GROUPS_UNVERIFIED');
  if (!['standard', 'special'].includes(area)) throw new Error('GEOGRAPHY_UNAPPROVED');
  const { table } = classifyCart(lines);
  if (!table) return [];
  const specs = nativeRateSpecs().filter(spec => spec.table === table && spec.area === area);
  const selected = options.filter(option => specs.some(spec => spec.code === option.code));
  if (selected.length !== 1) throw new Error('NATIVE_RATE_CARDINALITY_MISMATCH');
  const spec = specs.find(row => row.code === selected[0].code);
  if (selected[0].priceCents !== spec.priceCents) throw new Error('NATIVE_RATE_PRICE_MISMATCH');
  return [{ ...selected[0], displayName: spec.displayName }];
}
