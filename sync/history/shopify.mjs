import { isDeepStrictEqual } from 'node:util';
import { requireFact, cents, MigrationStop } from '../lib/historical-order.mjs';
import { sha256, buildCustomerReport } from '../lib/customer-preflight.mjs';

export const SHOP = 'ecom-blueprint-gen-6ud1s.myshopify.com';
export const VERSION = '2026-10';
export const OPTIONS = Object.freeze({
  inventoryBehaviour: 'BYPASS',
  sendReceipt: false,
  sendFulfillmentReceipt: false,
});
export const queries = {
  context: `query {
    orderHistory:metafieldDefinitions(first:2,ownerType:ORDER,namespace:"onlinegarden_migration",key:"woo_history") { nodes { access { storefront customerAccount } } }
    customerLink:metafieldDefinitions(first:2,ownerType:CUSTOMER,namespace:"onlinegarden_migration",key:"woo_customer_id") { nodes { access { storefront customerAccount } } }
    shop { myshopifyDomain currencyCode } currentAppInstallation { accessScopes { handle } } }`,
  count: `query { customersCount(limit:null) { count precision } }`,
  customers: `query Customers($after:String) { customers(first:100, after:$after) {
    nodes { id defaultEmailAddress { emailAddress } defaultPhoneNumber { phoneNumber }
      legacy:metafield(namespace:"onlinegarden_migration",key:"woo_customer_id") { value } }
    pageInfo { endCursor hasNextPage } } }`,
  createCustomer: `mutation Customer($input:CustomerInput!) { customerCreate(input:$input) { customer { id } userErrors { field } } }`,
  createOrder: `mutation HistoricalOrder($order:OrderCreateOrderInput!, $options:OrderCreateOptionsInput!) {
    orderCreate(order:$order,options:$options) { order { id } userErrors { field } } }`,
  findOrder: `query FindOrder($query:String!) { orders(first:2, query:$query) { nodes { id sourceIdentifier } pageInfo { hasNextPage } } }`,
  order: `query VerifyOrder($id:ID!) { order(id:$id) {
    id name note discountCodes sourceIdentifier processedAt tags customer { id } displayFinancialStatus displayFulfillmentStatus
    totalPriceSet { shopMoney { amount currencyCode } } totalTaxSet { shopMoney { amount } }
    totalDiscountsSet { shopMoney { amount } } totalShippingPriceSet { shopMoney { amount } }
    legacy:metafield(namespace:"onlinegarden_migration",key:"woo_history") { value }
    shippingLines(first:100) { nodes { title originalPriceSet { shopMoney { amount } } taxLines { title rate priceSet { shopMoney { amount } } } } pageInfo { hasNextPage } }
    lineItems(first:100) { nodes { title sku quantity taxLines { title rate priceSet { shopMoney { amount } } } customAttributes { key value } originalUnitPriceSet { shopMoney { amount } } } pageInfo { hasNextPage } }
  } }`,
};

export async function graphql(query, variables = {}) {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  requireFact(token, 'OFFLINE_ADMIN_TOKEN_REQUIRED');
  const readOnly = query.trimStart().startsWith('query');
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://' + SHOP + '/admin/api/' + VERSION + '/graphql.json', {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query, variables }),
    });
    const body = res.ok ? await res.json() : null;
    const throttled = res.status === 429 || body?.errors?.some((e) => e.extensions?.code === 'THROTTLED');
    if (readOnly && throttled && attempt < 4) {
      const delay = Number(res.headers.get('retry-after')) || 2 ** (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, Math.min(30, delay) * 1000));
      continue;
    }
    requireFact(res.ok && res.headers.get('x-shopify-api-version') === VERSION, 'ADMIN_TRANSPORT_OR_VERSION');
    requireFact(body?.data && !body.errors?.length, 'ADMIN_QUERY_REJECTED');
    return body.data;
  }
}
export async function checkContext(writing) {
  const { shop, currentAppInstallation, orderHistory, customerLink } = await graphql(queries.context);
  for (const definitions of [orderHistory, customerLink]) {
    requireFact(
      definitions.nodes.every((d) => d.access.storefront === 'NONE' && d.access.customerAccount === 'NONE'),
      'PUBLIC_METAFIELD_DEFINITION',
    );
  }
  requireFact(shop.myshopifyDomain === SHOP && shop.currencyCode === 'EUR', 'WRONG_STORE_OR_CURRENCY');
  const scopes = new Set(currentAppInstallation.accessScopes.map((s) => s.handle));
  requireFact(
    scopes.has('read_all_orders') &&
      ['customers', 'orders'].every((s) =>
        writing ? scopes.has('write_' + s) : scopes.has('read_' + s) || scopes.has('write_' + s),
      ),
    'INSUFFICIENT_SCOPE',
  );
}
export async function snapshot(sourceCsv, ordersCsv) {
  const count = async () => {
    const { customersCount: c } = await graphql(queries.count);
    requireFact(c?.precision === 'EXACT', 'SNAPSHOT_COUNT_INEXACT');
    return c.count;
  };
  const startedAt = new Date().toISOString(),
    countBefore = await count(),
    rows = [],
    pages = [],
    cursors = new Set();
  let after = null;
  do {
    const { customers: c } = await graphql(queries.customers, { after });
    rows.push(...c.nodes);
    pages.push({ rowCount: c.nodes.length, hasNextPage: c.pageInfo.hasNextPage });
    if (!c.pageInfo.hasNextPage) break;
    after = c.pageInfo.endCursor;
    requireFact(after && !cursors.has(after), 'SNAPSHOT_CURSOR');
    cursors.add(after);
  } while (true);
  const columns = [
    ['Email', 'Phone'],
    ...rows.map((r) => [r.defaultEmailAddress?.emailAddress ?? '', r.defaultPhoneNumber?.phoneNumber ?? '']),
  ];
  const csv =
    columns.map((row) => row.map((s) => '"' + s.replaceAll('"', '""') + '"').join(',')).join('\r\n') + '\r\n';
  const countAfter = await count();
  const snapshotMetadata = {
    schemaVersion: 2,
    complete: true,
    exportedAt: new Date().toISOString(),
    rowCount: rows.length,
    sha256: sha256(csv),
    shopDomain: SHOP,
    coverage: {
      scope: 'all-customers',
      filtersApplied: false,
      startedAt,
      countBefore,
      countAfter,
      countPrecision: 'EXACT',
      uniqueCustomerIds: new Set(rows.map((r) => r.id)).size,
      cursorChainVerified: true,
      pages,
    },
  };
  const classifications = new Map();
  const report = buildCustomerReport(
    { sourceCsv, ordersCsv, snapshotCsv: csv, snapshotMetadata, expectedShop: SHOP, emailOnly: true },
    (id, result) => classifications.set(id, result),
  );
  requireFact(
    report.shopifySnapshot.verified &&
      report.blockers.every((b) => b === 'SOURCE_QUARANTINE_REQUIRES_REVIEW'),
    'PREFLIGHT_GLOBAL_BLOCK',
  );
  return { rows, classifications, report };
}
export async function lookupOrder(id, name) {
  // Search both durable markers. Fail closed when the API returns an unexpected match.
  const escapedName = name.replace(/[\\"]/g, (c) => '\\' + c);
  const q =
    'tag:woo-order-' + id + ' OR source_identifier:"woocommerce:' + id + '" OR name:"' + escapedName + '"';
  const { orders } = await graphql(queries.findOrder, { query: q });
  requireFact(!orders.pageInfo.hasNextPage && orders.nodes.length <= 1, 'ORDER_REMOTE_COLLISION');
  const [order] = orders.nodes;
  requireFact(!order || order.sourceIdentifier === 'woocommerce:' + id, 'ORDER_SOURCE_CONFLICT');
  return order?.id;
}
export function created(result, key) {
  requireFact(!result.userErrors.length && result[key]?.id, 'MUTATION_NOT_CONFIRMED');
  return result[key].id;
}
export async function verifyOrder(gid, expected, source) {
  const { order } = await graphql(queries.order, { id: gid });
  const same =
    order &&
    order.sourceIdentifier === expected.sourceIdentifier &&
    order.customer?.id === expected.customer.toAssociate.id &&
    order.name === expected.name &&
    (order.note ?? '') === (expected.note ?? '') &&
    isDeepStrictEqual(
      order.discountCodes,
      source.coupon_lines.map((c) => c.code),
    ) &&
    Date.parse(order.processedAt) === Date.parse(expected.processedAt) &&
    expected.tags.every((tag) => order.tags.includes(tag)) &&
    order.displayFinancialStatus === expected.financialStatus &&
    order.displayFulfillmentStatus === (expected.fulfillmentStatus ?? 'UNFULFILLED') &&
    order.totalPriceSet.shopMoney.currencyCode === 'EUR' &&
    cents(order.totalPriceSet.shopMoney.amount) === cents(source.total) &&
    cents(order.totalTaxSet.shopMoney.amount) === cents(source.total_tax) &&
    cents(order.totalShippingPriceSet.shopMoney.amount) ===
      cents(source.shipping_total) + (source.prices_include_tax ? cents(source.shipping_tax) : 0n) &&
    cents(order.totalDiscountsSet.shopMoney.amount) ===
      cents(source.discount_total) + (source.prices_include_tax ? cents(source.discount_tax) : 0n);
  requireFact(
    same &&
      !order.lineItems.pageInfo.hasNextPage &&
      order.lineItems.nodes.length === expected.lineItems.length,
    'ORDER_READBACK_MISMATCH',
  );
  const taxKeys = (taxes) =>
    taxes
      .map((t) => JSON.stringify([t.title, Number(t.rate), String(cents(t.priceSet.shopMoney.amount))]))
      .sort();
  const shippingKey = (line, price) =>
    JSON.stringify([line.title, String(cents(price.shopMoney.amount)), taxKeys(line.taxLines)]);
  requireFact(
    !order.shippingLines.pageInfo.hasNextPage &&
      isDeepStrictEqual(
        order.shippingLines.nodes.map((line) => shippingKey(line, line.originalPriceSet)).sort(),
        expected.shippingLines.map((line) => shippingKey(line, line.priceSet)).sort(),
      ),
    'ORDER_SHIPPING_READBACK_MISMATCH',
  );
  const actual = JSON.parse(order.legacy?.value ?? 'null'),
    historical = JSON.parse(expected.metafields[0].value);
  requireFact(isDeepStrictEqual(actual, historical), 'ORDER_METADATA_MISMATCH');
  const remaining = new Map(expected.lineItems.map((line) => [line.properties[0].value, line]));
  for (const line of order.lineItems.nodes) {
    const id = line.customAttributes.find((a) => a.key === '_woo_line_id')?.value;
    const match = remaining.get(id);
    requireFact(
      match &&
        match.title === line.title &&
        isDeepStrictEqual(taxKeys(match.taxLines), taxKeys(line.taxLines)) &&
        (match.sku || '') === (line.sku || '') &&
        match.quantity === line.quantity &&
        cents(match.priceSet.shopMoney.amount) === cents(line.originalUnitPriceSet.shopMoney.amount),
      'ORDER_LINE_READBACK_MISMATCH',
    );
    remaining.delete(id);
  }
  if (remaining.size) throw new MigrationStop('ORDER_LINE_READBACK_MISMATCH');
}
