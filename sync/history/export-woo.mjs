// Authorized legacy WooCommerce REST v3 GETs only. All files remain in the private directory.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { privateDirectory, privatePath } from './import.mjs';
import { validateCensus, legacyId, requireFact, MigrationStop } from '../lib/historical-order.mjs';
import { parseCustomerCsv } from '../lib/customer-preflight.mjs';

const fields =
  'id,number,customer_id,date_created_gmt,date_modified_gmt,date_paid_gmt,date_completed_gmt,status,currency,prices_include_tax,discount_total,discount_tax,shipping_total,shipping_tax,cart_tax,total,total_tax,payment_method,payment_method_title,billing,shipping,customer_note,line_items,shipping_lines,coupon_lines,tax_lines,fee_lines,refunds';
const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => Object.hasOwn(obj, k)).map((k) => [k, obj[k]]));

export async function exportWoo(folder) {
  process.umask(0o077);
  const dir = privateDirectory(folder);
  const counts = parseCustomerCsv(fs.readFileSync(privatePath(dir, 'id-orders.csv'), 'utf8'), 'orders');
  const buyers = new Set(counts.filter((r) => Number(r.orders) > 0).map((r) => r.id));
  const base = new URL(process.env.WOOCOMMERCE_API_BASE);
  requireFact(
    base.protocol === 'https:' &&
      !base.search &&
      !base.hash &&
      !base.username &&
      !base.password &&
      /^\/wp-json\/wc\/v3\/?$/.test(base.pathname),
    'AUTHORIZED_WOO_V3_HTTPS_REQUIRED',
  );
  const key = process.env.WOOCOMMERCE_CONSUMER_KEY,
    secret = process.env.WOOCOMMERCE_CONSUMER_SECRET;
  requireFact(key && secret, 'READ_ONLY_WOO_CREDENTIALS_REQUIRED');
  const headers = { Authorization: 'Basic ' + Buffer.from(key + ':' + secret).toString('base64') };
  async function get(endpoint, params) {
    const url = new URL(base.href.replace(/\/$/, '') + '/' + endpoint);
    url.search = new URLSearchParams(params);
    const res = await fetch(url, { headers, redirect: 'error', signal: AbortSignal.timeout(30000) });
    requireFact(res.ok, 'WOO_READ_FAILED');
    return { headers: res.headers, rows: await res.json() };
  }
  async function scan(selectedFields) {
    const rows = [],
      seen = new Set();
    let pages, total;
    for (let page = 1; ; page++) {
      const res = await get('orders', {
        status: 'any',
        orderby: 'id',
        order: 'asc',
        per_page: '100',
        page: String(page),
        _fields: selectedFields,
      });
      const pageHeader = res.headers.get('x-wp-totalpages'),
        countHeader = res.headers.get('x-wp-total');
      requireFact(
        /^\d+$/.test(pageHeader) && /^\d+$/.test(countHeader) && Array.isArray(res.rows),
        'WOO_PAGINATION_REQUIRED',
      );
      pages ??= Number(pageHeader);
      total ??= Number(countHeader);
      requireFact(pages === Number(pageHeader) && total === Number(countHeader), 'WOO_SOURCE_CHANGED');
      for (const row of res.rows) {
        const id = legacyId(row.id);
        requireFact(!seen.has(id) && row.date_modified_gmt, 'WOO_SOURCE_CHANGED');
        seen.add(id);
        if (buyers.has(String(row.customer_id))) rows.push(pick(row, selectedFields.split(',')));
      }
      if (page >= pages) break;
    }
    requireFact(seen.size === total, 'WOO_SCAN_INCOMPLETE');
    return { rows, total };
  }
  const first = await scan(fields);
  validateCensus(first.rows, counts);
  for (const order of first.rows) {
    // Never retain arbitrary plugin metadata (can contain payment/session credentials).
    for (const field of ['billing', 'shipping'])
      order[field] = pick(order[field] ?? {}, [
        'first_name',
        'last_name',
        'company',
        'address_1',
        'address_2',
        'city',
        'state',
        'postcode',
        'country',
        'email',
        'phone',
      ]);
    order.refunds = order.refunds.map((refund) => pick(refund, ['id', 'reason', 'total']));
    order.line_items = order.line_items.map((line) =>
      pick(line, [
        'id',
        'name',
        'product_id',
        'variation_id',
        'sku',
        'quantity',
        'subtotal',
        'subtotal_tax',
        'total',
        'total_tax',
        'taxes',
      ]),
    );
    order.shipping_lines = order.shipping_lines.map((line) =>
      pick(line, ['id', 'method_title', 'method_id', 'total', 'total_tax', 'taxes']),
    );
    order.coupon_lines = order.coupon_lines.map((line) =>
      pick(line, ['id', 'code', 'discount', 'discount_tax']),
    );
    order.tax_lines = order.tax_lines.map((line) =>
      pick(line, [
        'id',
        'rate_code',
        'rate_id',
        'label',
        'compound',
        'tax_total',
        'shipping_tax_total',
        'rate_percent',
      ]),
    );
    order.fee_lines = order.fee_lines.map((line) =>
      pick(line, ['id', 'name', 'tax_class', 'tax_status', 'total', 'total_tax', 'taxes']),
    );
    for (const line of [...order.line_items, ...order.shipping_lines, ...order.fee_lines]) {
      if (Array.isArray(line.taxes)) line.taxes = line.taxes.map((t) => pick(t, ['id', 'total', 'subtotal']));
    }
    for (const refund of order.refunds) {
      const { rows: r } = await get('orders/' + legacyId(order.id) + '/refunds/' + legacyId(refund.id), {
        _fields: 'id,date_created_gmt,amount,reason,line_items',
      });
      requireFact(String(r.id) === String(refund.id), 'WOO_REFUND_DETAIL_MISMATCH');
      refund.detail = {
        ...pick(r, ['id', 'date_created_gmt', 'amount', 'reason']),
        line_items: r.line_items?.map((line) =>
          pick(line, ['id', 'name', 'product_id', 'variation_id', 'quantity', 'total', 'total_tax', 'taxes']),
        ),
      };
    }
    order.order_notes = [];
    const noteIds = new Set();
    for (let page = 1; ; page++) {
      const { rows: notes, headers: noteHeaders } = await get('orders/' + legacyId(order.id) + '/notes', {
        _fields: 'id,date_created_gmt,customer_note,note',
        per_page: '100',
        page: String(page),
      });
      const totalPages = noteHeaders.get('x-wp-totalpages');
      requireFact(
        Array.isArray(notes) && (totalPages !== null || notes.length < 100),
        'WOO_NOTES_COVERAGE_UNKNOWN',
      );
      for (const note of notes) {
        const id = legacyId(note.id);
        requireFact(!noteIds.has(id), 'WOO_NOTES_DUPLICATED');
        noteIds.add(id);
        order.order_notes.push(pick(note, ['id', 'date_created_gmt', 'customer_note', 'note']));
      }
      if (!totalPages || page >= Number(totalPages)) break;
    }
  }
  const last = await scan('id,customer_id,date_modified_gmt');
  const signature = (rows) => JSON.stringify(rows.map((r) => [r.id, r.customer_id, r.date_modified_gmt]));
  requireFact(
    first.total === last.total && signature(first.rows) === signature(last.rows),
    'WOO_SOURCE_CHANGED',
  );
  // Publish via hard link only after completing the census and flushing the staged file.
  const dest = path.join(dir, 'orders.json'),
    tmp = fs.mkdtempSync(path.join(dir, '.export-'));
  const staging = path.join(tmp, 'orders.json');
  try {
    fs.writeFileSync(staging, JSON.stringify(first.rows), { flag: 'wx', mode: 0o600, flush: true });
    fs.linkSync(staging, dest);
  } finally {
    if (fs.existsSync(staging)) fs.unlinkSync(staging);
    fs.rmdirSync(tmp);
  }
  console.log(JSON.stringify({ exported: first.rows.length, outOfCohort: first.total - first.rows.length }));
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url)
  exportWoo(process.argv[2]).catch((error) => {
    console.error(
      JSON.stringify({
        status: 'BLOCKED',
        reason: error instanceof MigrationStop ? error.message : 'PRIVATE_EXPORT_UNAVAILABLE',
      }),
    );
    process.exitCode = 2;
  });
