/** Offline emulation of documented configuration semantics; NOT an Intuitive API/client or checkout certification. */
import { RATE_TABLES, centsToMoney, moneyToCents, rateFor } from './rules.mjs';

export function intuitiveBlueprint(approvedSkus) {
  if (!Array.isArray(approvedSkus) || approvedSkus.some(sku => typeof sku !== 'string' || !sku || sku.includes(',')) || new Set(approvedSkus).size !== approvedSkus.length) throw new Error('UNSAFE_SKU_ALLOWLIST');
  return {
    kind: 'DOCUMENTED_MANUAL_CONFIGURATION_BLUEPRINT_NOT_VENDOR_IMPORT',
    selectedForLive: false, publishable: false,
    requiredPlan: 'Shopify Grow with third-party CCS enabled',
    requiredSettings: {
      matchProductFiltersToConditions: false, productFilters: [],
      enableDiscountFetching: true, productCustomShippingCosts: false,
      customCostBlending: false, rateBlending: false, cartSplitting: false,
      freeShippingThreshold: false, handlingFees: false, rounding: false,
      wholeCartDeliveryGroupRequired: true,
    },
    reducedSkus: [...approvedSkus],
    geographicPolicy: 'Approved IT special CAP/locality list; standard is its complement. Regional candidates have no operational effect.',
    scenarios: ['A', 'B'].flatMap(table => ['standard', 'special'].map(area => ({
      id: `OG-${table}-${area}`, conditionMatch: 'All conditions', country: 'IT', area,
      productCondition: { field: 'Product SKU', operator: table === 'B' ? 'Equals' : 'Does not equal',
        values: [...approvedSkus], productMatch: table === 'B' ? 'All products' : 'Any product' },
      productFilters: [], shippingMethod: {
        type: 'Custom shipping rates', rateType: 'Total', perUnit: null,
        ratesTableMode: 'Return the highest applicable rate row',
        rows: RATE_TABLES[table].map(([, max, standard, special]) => ({
          upTo: max === null ? '~' : centsToMoney(max), cost: centsToMoney(area === 'standard' ? standard : special),
        })),
      },
    }))),
  };
}

export const SYNTHETIC_ADDRESSES = Object.freeze({
  standard: { country: 'IT', postalToken: '__QA_STANDARD__' },
  special: { country: 'IT', postalToken: '__QA_SPECIAL__' },
  sharedSpecial: { country: 'IT', postalToken: '__QA_SHARED__', locality: '__QA_REMOTE_LOCALITY__' },
  sharedStandard: { country: 'IT', postalToken: '__QA_SHARED__', locality: '__QA_ORDINARY_LOCALITY__' },
});

function syntheticArea(address) {
  if (address.country !== 'IT') throw new Error('OUTSIDE_PROOF_SCOPE');
  if (address.postalToken === '__QA_STANDARD__') return 'standard';
  if (address.postalToken === '__QA_SPECIAL__') return 'special';
  if (address.postalToken === '__QA_SHARED__') {
    if (address.locality === '__QA_REMOTE_LOCALITY__') return 'special';
    if (address.locality === '__QA_ORDINARY_LOCALITY__') return 'standard';
    throw new Error('LOCALITY_REQUIRED');
  }
  throw new Error('SYNTHETIC_DESTINATION_ONLY');
}

/** Consumes fixture subtotals already after discounts; never accepts browser-defined logistics classes. */
export function emulateIntuitive(blueprint, { lines, address, deliveryGroupCount = 1 }) {
  if (deliveryGroupCount !== 1) throw new Error('WHOLE_CART_NOT_PROVEN');
  const settings = blueprint.requiredSettings;
  if (settings.matchProductFiltersToConditions || settings.productFilters.length || !settings.enableDiscountFetching ||
      settings.productCustomShippingCosts || settings.customCostBlending || settings.rateBlending || settings.cartSplitting ||
      settings.freeShippingThreshold || settings.handlingFees || settings.rounding) throw new Error('UNSAFE_RATE_CONFIGURATION');
  if (!lines.length) throw new Error('EMPTY_CART');
  for (const line of lines) if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0 || line.requiresShipping !== true ||
      !Number.isSafeInteger(line.discountedLineTotalCents) || line.discountedLineTotalCents < 0) throw new Error('INVALID_PHYSICAL_FIXTURE');
  const subtotal = lines.reduce((sum, line) => sum + line.discountedLineTotalCents, 0);
  if (!Number.isSafeInteger(subtotal)) throw new Error('INVALID_SUBTOTAL');
  const area = syntheticArea(address);
  const matches = blueprint.scenarios.filter(scenario => {
    if (scenario.area !== area || scenario.country !== address.country) return false;
    const condition = scenario.productCondition;
    if (!['Equals', 'Does not equal'].includes(condition.operator)) throw new Error('UNKNOWN_PRODUCT_OPERATOR');
    const predicate = line => condition.operator === 'Equals' ? condition.values.includes(line.sku) : !condition.values.includes(line.sku);
    if (condition.productMatch === 'All products') return lines.every(predicate);
    if (condition.productMatch === 'Any product') return lines.some(predicate);
    if (condition.productMatch === 'No products') return !lines.some(predicate);
    throw new Error('UNKNOWN_PRODUCT_QUANTIFIER');
  });
  if (matches.length !== 1) throw new Error('SCENARIOS_NOT_EXCLUSIVE');
  const scenario = matches[0];
  const rows = scenario.shippingMethod.rows;
  const row = rows.find(rate => rate.upTo === '~' || subtotal <= moneyToCents(rate.upTo));
  if (!row) throw new Error('RATE_RANGE_GAP');
  return { scenario: scenario.id, table: scenario.id.split('-')[1], area, rateCount: 1,
    priceCents: moneyToCents(row.cost), subtotalCents: subtotal, checkoutExecuted: false };
}

/** Documented native max rule with supplied collection membership, without any geographic implementation. */
export function emulateNativeMaximum(collectionTables, subtotalCents, area) {
  const tables = [...new Set(collectionTables.filter(table => table === 'A' || table === 'B'))];
  if (!tables.length) throw new Error('UNCLASSIFIED_NATIVE_COLLECTION');
  return Math.max(...tables.map(table => rateFor(table, area, subtotalCents).priceCents));
}
