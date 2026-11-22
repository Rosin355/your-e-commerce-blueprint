import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildHistoricalOrder, validateCensus } from '../lib/historical-order.mjs';
import { run, identity, approvalDigest } from '../history/import.mjs';
import { openJournal } from '../history/journal.mjs';
import { SHOP, VERSION, queries, OPTIONS } from '../history/shopify.mjs';
import { parseCustomerCsv } from '../lib/customer-preflight.mjs';
import { syntheticEmailOnlyScenario } from './customer-fixtures.mjs';

const decision = { financialStatus: 'PAID', fulfillmentStatus: 'FULFILLED', evidence: 'synthetic source' };
const customer = 'gid://shopify/Customer/500';
test('senza archivio transazionale si ferma offline con il motivo specifico', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'og-no-archive-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const network = t.mock.method(globalThis, 'fetch', () => assert.fail('Unexpected network'));
  await assert.rejects(run('prepare', dir), /BLOCKED_SOURCE_UNAVAILABLE/);
  assert.deepEqual(fs.readdirSync(dir), []);
  assert.equal(network.mock.callCount(), 0);
});
const line = {
  id: 7,
  name: 'Fixture',
  sku: 'FIXTURE',
  quantity: 2,
  subtotal: '20.00',
  subtotal_tax: '2.00',
  total: '18.00',
  total_tax: '1.80',
  taxes: [{ id: 4, total: '1.80' }],
};
function fixture() {
  return {
    id: 1,
    number: 'S-1',
    customer_id: 1,
    date_created_gmt: '2022-09-02T13:10:00',
    date_paid_gmt: '2022-09-02T13:15:00',
    currency: 'EUR',
    prices_include_tax: false,
    status: 'completed',
    line_items: [structuredClone(line)],
    coupon_lines: [{ code: 'SYNTH', discount: '2.00', discount_tax: '0.20' }],
    shipping_lines: [
      {
        method_title: 'Storica',
        method_id: 'local',
        total: '3.00',
        total_tax: '0.30',
        taxes: [{ id: 4, total: '0.30' }],
      },
    ],
    discount_total: '2.00',
    discount_tax: '0.20',
    shipping_total: '3.00',
    cart_tax: '1.80',
    shipping_tax: '0.30',
    total_tax: '2.10',
    total: '23.10',
    fee_lines: [],
    refunds: [],
    tax_lines: [
      { rate_id: 4, label: 'Test', rate_percent: 10, tax_total: '1.80', shipping_tax_total: '0.30' },
    ],
  };
}
test('conserva data UTC, centesimi, sconto, IVA e indirizzo storico senza effetti operativi', () => {
  const o = fixture();
  o.billing = { city: 'Fixture', unrelated_secret: 'omit' };
  for (const included of [false, true]) {
    o.prices_include_tax = included;
    const p = buildHistoricalOrder(o, decision, customer);
    assert.equal(p.lineItems[0].priceSet.shopMoney.amount, included ? '11.00' : '10.00');
    assert.equal(p.discountCode.itemFixedDiscountCode.amountSet.shopMoney.amount, included ? '2.20' : '2.00');
    assert.equal(p.processedAt, '2022-09-02T13:10:00Z');
    assert.equal(p.customer.toAssociate.id, customer);
    assert.equal(p.lineItems[0].requiresShipping, false);
    assert.deepEqual(JSON.parse(p.metafields[0].value).billing, { city: 'Fixture' });
    for (const k of [
      'transactions',
      'fulfillment',
      'billingAddress',
      'shippingAddress',
      'buyerAcceptsMarketing',
    ])
      assert.equal(Object.hasOwn(p, k), false);
    assert.deepEqual(OPTIONS, {
      inventoryBehaviour: 'BYPASS',
      sendReceipt: false,
      sendFulfillmentReceipt: false,
    });
  }
});
test('blocca differenze di un centesimo, stati sconosciuti, rimborsi e duplicati', () => {
  const o = fixture();
  assert.throws(
    () => buildHistoricalOrder({ ...o, total: '23.09' }, decision, customer),
    /ORDER_TOTAL_MISMATCH/,
  );
  assert.throws(() => buildHistoricalOrder({ ...o, refunds: [{ id: 4 }] }, decision, customer), /REFUND/);
  assert.throws(() => buildHistoricalOrder(o, {}, customer), /EVIDENCE/);
  assert.throws(() => validateCensus(Array(953).fill(o), []), /DUPLICATE_ORDER_ID/);
});
test('email da sola, quarantena e ruoli staff non possono autorizzare associazioni', () => {
  const o = { customer_id: 1, billing: { email: 'a@example.invalid', phone: '0020000000' } },
    src = { roles: 'customer', email: o.billing.email, billing_phone: o.billing.phone },
    rev = { action: 'existing', shopifyId: customer, evidence: 'fixture', reviewer: 'fixture' };
  const live = [{ id: customer, defaultEmailAddress: { emailAddress: src.email } }];
  assert.throws(() => identity(src, rev, o, live, 'existing'), /EXISTING_IDENTITY_EVIDENCE/);
  assert.throws(() => identity({ ...src, billing_phone: '' }, rev, o, live, 'existing'), /CORROBORATION/);
  assert.throws(() => identity(src, rev, o, live, undefined), /QUARANTINED/);
  assert.throws(() => identity({ ...src, roles: 'author' }, rev, o, live, 'existing'), /ROLE/);
});
test('journal conserva intenti incerti e impedisce prenotazioni concorrenti', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'og-synthetic-journal-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const filename = path.join(dir, 'test.sqlite'),
    a = openJournal(filename),
    b = openJournal(filename);
  try {
    a.reserve('order', '1', 'digest');
    assert.throws(() => b.reserve('order', '1', 'digest'), /INTENT/);
    assert.equal(b.get('order', '1').state, 'pending');
    a.record('order', '1', 'gid://shopify/Order/9', 'verified');
    assert.throws(() => b.record('order', '1', 'gid://shopify/Order/8', 'verified'), /MAPPING_CHANGED/);
  } finally {
    a.close();
    b.close();
  }
});
test('interruzione dopo orderCreate, ripresa e replay senza una seconda creazione', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'og-synthetic-history-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const write = (name, v) => fs.writeFileSync(path.join(dir, name), v, { mode: 0o600 });
  const { sourceCsv, ordersCsv } = syntheticEmailOnlyScenario();
  write('sheet2-minimo.csv', sourceCsv);
  write('id-orders.csv', ordersCsv);
  const accounts = new Map(parseCustomerCsv(sourceCsv, 'accounts').map((r) => [r.id, r])),
    orders = [];
  for (const r of parseCustomerCsv(ordersCsv, 'orders'))
    for (let n = 0; n < Number(r.orders); n++) {
      const id = orders.length + 1,
        a = accounts.get(r.id);
      orders.push({
        ...fixture(),
        id,
        number: String(id),
        customer_id: Number(r.id),
        billing: { email: a.email, phone: a.billing_phone },
      });
    }
  write('orders.json', JSON.stringify(orders));
  await run('prepare', dir);
  const pilot = orders.find((o) => o.customer_id === 2),
    id = String(pilot.id);
  const rev = JSON.parse(fs.readFileSync(path.join(dir, 'review.json')));
  rev.customers['2'] = { action: 'create', evidence: 'synthetic ownership evidence', reviewer: 'test' };
  rev.orders[id] = decision;
  rev.pilotOrderId = id;
  rev.authorization = {
    shop: SHOP,
    archiveSha256: rev.archiveSha256,
    reference: 'test',
    expiresAt: new Date(Date.now() + 600000).toISOString(),
    orderIds: [id],
    checks: Object.fromEntries(
      ['flow', 'messaging', 'logistics', 'invoicing', 'analytics', 'exclusiveWriter'].map((k) => [k, 'test']),
    ),
  };
  rev.authorization.reviewSha256 = approvalDigest(rev);
  write('review.json', JSON.stringify(rev));
  const oldToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = 'synthetic';
  t.after(() => {
    if (oldToken === undefined) delete process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    else process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = oldToken;
  });
  const rows = [];
  let remote,
    mutations = 0,
    customerWrites = 0;
  t.mock.method(globalThis, 'fetch', async (_url, { body }) => {
    const { query, variables: v } = JSON.parse(body);
    let data;
    if (query === queries.context)
      data = {
        orderHistory: { nodes: [] },
        customerLink: { nodes: [] },
        shop: { myshopifyDomain: SHOP, currencyCode: 'EUR' },
        currentAppInstallation: {
          accessScopes: ['read_all_orders', 'write_customers', 'write_orders'].map((handle) => ({ handle })),
        },
      };
    else if (query === queries.count) data = { customersCount: { count: rows.length, precision: 'EXACT' } };
    else if (query === queries.customers)
      data = { customers: { nodes: rows, pageInfo: { hasNextPage: false } } };
    else if (query === queries.createCustomer) {
      customerWrites++;
      rows.push({
        id: customer,
        defaultEmailAddress: { emailAddress: v.input.email },
        legacy: { value: '2' },
      });
      data = { customerCreate: { customer: { id: customer }, userErrors: [] } };
    } else if (query === queries.findOrder)
      data = { orders: { nodes: remote ? [remote] : [], pageInfo: { hasNextPage: false } } };
    else if (query === queries.createOrder) {
      mutations++;
      assert.deepEqual(v.options, OPTIONS);
      const p = v.order;
      remote = {
        id: 'gid://shopify/Order/99',
        sourceIdentifier: p.sourceIdentifier,
        customer: { id: customer },
        name: p.name,
        tags: p.tags,
        discountCodes: ['SYNTH'],
        shippingLines: {
          nodes: p.shippingLines.map((l) => ({
            title: l.title,
            taxLines: l.taxLines,
            originalPriceSet: l.priceSet,
          })),
          pageInfo: { hasNextPage: false },
        },
        processedAt: p.processedAt,
        displayFinancialStatus: p.financialStatus,
        displayFulfillmentStatus: p.fulfillmentStatus,
        legacy: { value: p.metafields[0].value },
        totalPriceSet: { shopMoney: { amount: '23.10', currencyCode: 'EUR' } },
        totalTaxSet: { shopMoney: { amount: '2.10' } },
        totalShippingPriceSet: { shopMoney: { amount: '3.00' } },
        totalDiscountsSet: { shopMoney: { amount: '2.00' } },
        lineItems: {
          nodes: p.lineItems.map((l) => ({
            title: l.title,
            sku: l.sku,
            taxLines: l.taxLines,
            quantity: l.quantity,
            originalUnitPriceSet: l.priceSet,
            customAttributes: l.properties.map((a) => ({ key: a.name, value: a.value })),
          })),
          pageInfo: { hasNextPage: false },
        },
      };
      throw new Error('simulated lost response');
    } else if (query === queries.order) data = { order: remote };
    else assert.fail('Unknown operation');
    return Response.json({ data }, { headers: { 'x-shopify-api-version': VERSION } });
  });
  await assert.rejects(run('batch', dir), /PILOT_ACCEPTANCE/);
  const secondId = String(orders.find(o => String(o.id) !== id).id);
  rev.authorization.orderIds.push(secondId);
  rev.authorization.reviewSha256 = approvalDigest(rev);
  write('review.json', JSON.stringify(rev));
  await assert.rejects(run('pilot', dir), /LIVE_AUTHORIZATION_REQUIRED/);
  rev.authorization.orderIds = [id];
  rev.authorization.reviewSha256 = approvalDigest(rev);
  write('review.json', JSON.stringify(rev));
  await assert.rejects(run('pilot', dir), /simulated lost response/);
  const saved = remote;
  remote = null;
  await assert.rejects(run('pilot', dir), /UNKNOWN_ORDER_OUTCOME/);
  remote = saved;
  await run('pilot', dir);
  await run('pilot', dir);
  assert.equal(mutations, 1);
  assert.equal(customerWrites, 1);
  rev.pilotAcceptance = {
    orderGid: remote.id, archiveSha256: rev.archiveSha256, acceptedAt: '2025-01-01T00:00:00Z',
    stock: 'test', payments: 'test', notifications: 'test', fulfillment: 'test',
    customerVisibility: 'test', otherCustomerDenied: 'test', reporting: 'test',
  };
  write('review.json', JSON.stringify(rev));
  await assert.rejects(run('batch', dir), /SEPARATE_BATCH_AUTHORIZATION/);
  rev.batchAuthorization = { ...rev.authorization, approvedAt: '2025-01-02T00:00:00Z' };
  write('review.json', JSON.stringify(rev));
  await assert.rejects(run('batch', dir), /SEPARATE_BATCH_AUTHORIZATION/);
  rev.batchAuthorization.reference = 'separate-batch-test';
  rev.batchAuthorization.approvedAt = '2024-12-31T00:00:00Z';
  write('review.json', JSON.stringify(rev));
  await assert.rejects(run('batch', dir), /SEPARATE_BATCH_AUTHORIZATION/);
  rev.batchAuthorization.approvedAt = '2025-01-02T00:00:00Z';
  rev.batchAuthorization.reviewSha256 = approvalDigest(rev, 'batch');
  rev.batchAuthorization.orderIds = [id, secondId];
  write('review.json', JSON.stringify(rev));
  await assert.rejects(run('batch', dir), /AUTHORIZATION_REVIEW_CHANGED/);
  rev.batchAuthorization.orderIds = [id];
  write('review.json', JSON.stringify(rev));
  await run('batch', dir);
  assert.equal(mutations, 1);
  assert.equal(customerWrites, 1);
  remote.customer = { id: 'gid://shopify/Customer/999' };
  await assert.rejects(run('pilot', dir), /ORDER_READBACK_MISMATCH/);
});

test('export Woo in sola lettura verifica censimento e scarta campi plugin non autorizzati', async (t) => {
  const { exportWoo } = await import('../history/export-woo.mjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'og-synthetic-export-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const env = {
    WOOCOMMERCE_API_BASE: 'https://synthetic.invalid/wp-json/wc/v3',
    WOOCOMMERCE_CONSUMER_KEY: 'synthetic',
    WOOCOMMERCE_CONSUMER_SECRET: 'synthetic',
  };
  for (const [key, value] of Object.entries(env)) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }
  const { ordersCsv } = syntheticEmailOnlyScenario(),
    all = [];
  fs.writeFileSync(path.join(dir, 'id-orders.csv'), ordersCsv, { mode: 0o600 });
  for (const row of parseCustomerCsv(ordersCsv, 'orders'))
    for (let n = 0; n < Number(row.orders); n++) {
      const id = all.length + 1;
      all.push({
        ...fixture(),
        id,
        customer_id: Number(row.id),
        date_modified_gmt: '2026-01-01T01:00:00',
        meta_data: [{ secret: 'omit' }],
        billing: { city: 'Test', secret: 'omit' },
        shipping: {},
        transaction_id: 'omit',
      });
    }
  t.mock.method(globalThis, 'fetch', async (input, opts) => {
    const u = new URL(input);
    assert.equal(u.hostname, 'synthetic.invalid');
    assert.equal(opts.method ?? 'GET', 'GET');
    assert.equal(opts.redirect, 'error');
    if (u.pathname.endsWith('/notes')) return Response.json([]);
    const pg = Number(u.searchParams.get('page'));
    return Response.json(all.slice((pg - 1) * 100, pg * 100), {
      headers: { 'x-wp-total': String(all.length), 'x-wp-totalpages': '10' },
    });
  });
  await exportWoo(dir);
  const raw = fs.readFileSync(path.join(dir, 'orders.json'), 'utf8');
  assert.equal(JSON.parse(raw).length, 953);
  assert.ok(!raw.includes('omit'));
  assert.equal(fs.statSync(path.join(dir, 'orders.json')).mode & 0o077, 0);
});
