// WooCommerce REST v3 amounts are decimal strings. Online Garden settles in EUR.
export class MigrationStop extends Error {}
export function requireFact(value, reason) {
  if (!value) throw new MigrationStop(reason);
}
export function legacyId(value) {
  requireFact(
    (typeof value === 'string' || Number.isSafeInteger(value)) && /^[1-9]\d*$/.test(String(value)),
    'LEGACY_ID_INVALID',
  );
  return String(value);
}
export function cents(value) {
  requireFact(
    typeof value === 'string' && /^\d+(?:\.\d{1,2}0*)?$/.test(value),
    'AMOUNT_MISSING_OR_PRECISION',
  );
  const [integer, fraction = ''] = value.split('.');
  return BigInt(integer) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
}
const euros = (value) => value / 100n + '.' + (value % 100n).toString().padStart(2, '0');
const bag = (value) => ({ shopMoney: { amount: euros(value), currencyCode: 'EUR' } });
const sum = (values) => values.reduce((a, b) => a + b, 0n);
function gmt(value) {
  requireFact(
    typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ?$/.test(value),
    'TIMESTAMP_GMT_REQUIRED',
  );
  const iso = value.replace(/Z$/, '') + 'Z';
  const ms = Date.parse(iso);
  requireFact(
    Number.isFinite(ms) && new Date(ms).toISOString().replace('.000Z', 'Z') === iso && ms <= Date.now(),
    'TIMESTAMP_INVALID',
  );
  return iso;
}

export function validateCensus(orders, counts) {
  requireFact(Array.isArray(orders) && orders.length === 953, 'EXPECTED_953_ORDERS');
  const observed = new Map(),
    ids = new Set();
  for (const order of orders) {
    const id = legacyId(order.id),
      owner = legacyId(order.customer_id);
    requireFact(!ids.has(id), 'DUPLICATE_ORDER_ID');
    ids.add(id);
    observed.set(owner, (observed.get(owner) ?? 0) + 1);
  }
  requireFact(
    counts.length === 5453 && new Set(counts.map((row) => row.id)).size === counts.length,
    'COUNTER_CENSUS_INVALID',
  );
  for (const row of counts) {
    requireFact(
      /^\d+$/.test(row.orders) && (observed.get(row.id) ?? 0) === Number(row.orders),
      'ORDERS_PER_CUSTOMER_MISMATCH',
    );
    observed.delete(row.id);
  }
  requireFact(!observed.size, 'UNKNOWN_ORDER_OWNER');
}

function historicalAddress(source) {
  const fields = [
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
  ];
  return Object.fromEntries(
    fields.filter((k) => typeof source?.[k] === 'string' && source[k]).map((k) => [k, source[k]]),
  );
}

export function buildHistoricalOrder(o, decision, customerGid) {
  const id = legacyId(o.id);
  requireFact(
    customerGid === null || /^gid:\/\/shopify\/Customer\/[1-9]\d*$/.test(customerGid),
    'CUSTOMER_GID_REQUIRED',
  );
  requireFact(o.currency === 'EUR', 'NON_EUR_REQUIRES_CURRENCY_REVIEW');
  requireFact(typeof o.prices_include_tax === 'boolean', 'TAX_BASIS_REQUIRED');
  requireFact(
    ['line_items', 'shipping_lines', 'coupon_lines', 'fee_lines', 'refunds', 'tax_lines'].every((k) =>
      Array.isArray(o[k]),
    ),
    'INCOMPLETE_ORDER_DETAIL',
  );
  requireFact(
    o.line_items.length > 0 && o.line_items.length <= 100 && o.shipping_lines.length <= 100,
    'ORDER_LINES_LIMIT',
  );
  requireFact(!o.refunds.length && o.status !== 'refunded', 'REFUND_REQUIRES_SEPARATE_HISTORICAL_MAPPING');
  requireFact(
    !['cancelled', 'failed', 'trash'].includes(o.status),
    'CANCELLATION_REQUIRES_HISTORICAL_MAPPING',
  );
  requireFact(!o.fee_lines.length, 'FEE_LINES_REQUIRE_MAPPING');
  requireFact(
    typeof o.number === 'string' && o.number.trim() && typeof o.status === 'string' && o.status.trim(),
    'ORDER_HEADER_REQUIRED',
  );
  requireFact(
    decision?.evidence &&
      ['PAID', 'PENDING'].includes(decision.financialStatus) &&
      ['FULFILLED', 'UNFULFILLED'].includes(decision.fulfillmentStatus),
    'PAYMENT_OR_FULFILLMENT_EVIDENCE_REQUIRED',
  );
  if (decision.financialStatus === 'PENDING') requireFact(!o.date_paid_gmt, 'PAID_DATE_CONFLICT');
  const processedAt = gmt(o.date_created_gmt);
  const rates = new Map();
  for (const tax of o.tax_lines) {
    const key = legacyId(tax.rate_id);
    requireFact(
      !rates.has(key) &&
        tax.label &&
        tax.rate_percent != null &&
        /^\d+(?:\.\d+)?$/.test(String(tax.rate_percent)) &&
        Number(tax.rate_percent) <= 100,
      'HISTORICAL_TAX_RATE_REQUIRED',
    );
    rates.set(key, {
      title: tax.label,
      rate: String(Number(tax.rate_percent) / 100),
      items: 0n,
      shipping: 0n,
      source: tax,
    });
  }
  function taxes(line, type) {
    requireFact(Array.isArray(line.taxes), 'LINE_TAX_DETAIL_REQUIRED');
    const lines = [],
      seen = new Set();
    for (const part of line.taxes) {
      const key = legacyId(part.id),
        rate = rates.get(key);
      requireFact(rate && !seen.has(key), 'LINE_TAX_RATE_MISMATCH');
      seen.add(key);
      const amount = cents(part.total);
      rate[type] += amount;
      lines.push({ title: rate.title, rate: rate.rate, priceSet: bag(amount) });
    }
    requireFact(
      sum(lines.map((t) => cents(t.priceSet.shopMoney.amount))) === cents(line.total_tax),
      'LINE_TAX_TOTAL_MISMATCH',
    );
    return lines;
  }
  const lineIds = new Set();
  const items = o.line_items.map((line) => {
    const lineId = legacyId(line.id);
    requireFact(
      !lineIds.has(lineId) && line.name && Number.isSafeInteger(line.quantity) && line.quantity > 0,
      'INVALID_LINE',
    );
    lineIds.add(lineId);
    const original = cents(line.subtotal),
      net = cents(line.total);
    requireFact(original >= net, 'NEGATIVE_LINE_DISCOUNT');
    const gross = original + (o.prices_include_tax ? cents(line.subtotal_tax) : 0n);
    const q = BigInt(line.quantity);
    requireFact(gross % q === 0n, 'UNIT_PRICE_REQUIRES_ROUNDING');
    const taxLines = taxes(line, 'items');
    return {
      title: line.name,
      sku: line.sku || undefined,
      quantity: line.quantity,
      priceSet: bag(gross / q),
      requiresShipping: false,
      taxable: taxLines.length > 0,
      taxLines,
      properties: [{ name: '_woo_line_id', value: lineId }],
    };
  });
  const shippingLines = o.shipping_lines.map((line) => {
    requireFact(typeof line.method_title === 'string' && line.method_title.trim(), 'SHIPPING_TITLE_REQUIRED');
    return {
      title: line.method_title,
      code: line.method_id || undefined,
      taxLines: taxes(line, 'shipping'),
      priceSet: bag(cents(line.total) + (o.prices_include_tax ? cents(line.total_tax) : 0n)),
    };
  });
  const shipping = sum(o.shipping_lines.map((line) => cents(line.total)));
  const itemTax = sum(o.line_items.map((line) => cents(line.total_tax)));
  const shippingTax = sum(o.shipping_lines.map((line) => cents(line.total_tax)));
  for (const rate of rates.values())
    requireFact(
      rate.items === cents(rate.source.tax_total) && rate.shipping === cents(rate.source.shipping_tax_total),
      'TAX_RATE_TOTAL_MISMATCH',
    );
  requireFact(
    shipping === cents(o.shipping_total) &&
      shippingTax === cents(o.shipping_tax) &&
      itemTax === cents(o.cart_tax) &&
      itemTax + shippingTax === cents(o.total_tax),
    'ORDER_COMPONENT_MISMATCH',
  );
  const net = sum(o.line_items.map((line) => cents(line.total)));
  requireFact(net + shipping + itemTax + shippingTax === cents(o.total), 'ORDER_TOTAL_MISMATCH');
  const discount = sum(o.line_items.map((line) => cents(line.subtotal))) - net;
  const discountTax = sum(o.line_items.map((line) => cents(line.subtotal_tax))) - itemTax;
  requireFact(
    discount === cents(o.discount_total) && discountTax === cents(o.discount_tax),
    'DISCOUNT_TOTAL_MISMATCH',
  );
  let discountCode;
  if (discount || o.coupon_lines.length) {
    const [coupon] = o.coupon_lines;
    requireFact(
      o.coupon_lines.length === 1 &&
        coupon.code &&
        cents(coupon.discount) === discount &&
        cents(coupon.discount_tax) === discountTax,
      'DISCOUNT_REQUIRES_HISTORICAL_MAPPING',
    );
    // Shopify distributes one order-level coupon across merchandise. Avoid reallocating a historical line discount.
    requireFact(items.length === 1, 'MULTILINE_DISCOUNT_ALLOCATION_REQUIRES_MAPPING');
    discountCode = {
      itemFixedDiscountCode: {
        code: coupon.code,
        amountSet: bag(discount + (o.prices_include_tax ? discountTax : 0n)),
      },
    };
  }
  const history = {
    status: o.status,
    customer_id: legacyId(o.customer_id),
    number: o.number,
    date_paid_gmt: o.date_paid_gmt ? gmt(o.date_paid_gmt) : undefined,
    date_completed_gmt: o.date_completed_gmt ? gmt(o.date_completed_gmt) : undefined,
    billing: historicalAddress(o.billing),
    shipping: historicalAddress(o.shipping),
    lines: o.line_items.map((line) => ({
      id: line.id,
      product_id: line.product_id,
      variation_id: line.variation_id,
      sku: line.sku,
      subtotal: line.subtotal,
      subtotal_tax: line.subtotal_tax,
      total: line.total,
      total_tax: line.total_tax,
    })),
    payment_method: o.payment_method_title || undefined,
    notes: Array.isArray(decision.approvedNotes) ? decision.approvedNotes : undefined,
  };
  if (history.notes)
    requireFact(
      history.notes.every(
        (note) => typeof note === 'string' && note.trim() && o.order_notes?.some((n) => n.note === note),
      ),
      'UNSOURCED_NOTE',
    );
  // orderCreate can replace a customer's default address. Preserve order-time addresses as merchant-only order data.
  return {
    sourceIdentifier: 'woocommerce:' + id,
    name: 'WC-' + o.number,
    processedAt,
    tags: ['woocommerce-history', 'woo-order-' + id],
    currency: 'EUR',
    taxesIncluded: o.prices_include_tax,
    customer: customerGid ? { toAssociate: { id: customerGid } } : undefined,
    financialStatus: decision.financialStatus,
    fulfillmentStatus: decision.fulfillmentStatus === 'FULFILLED' ? 'FULFILLED' : undefined,
    lineItems: items,
    shippingLines,
    discountCode,
    note: o.customer_note || undefined,
    metafields: [
      {
        namespace: 'onlinegarden_migration',
        key: 'woo_history',
        type: 'json',
        value: JSON.stringify(history),
      },
    ],
  };
}
