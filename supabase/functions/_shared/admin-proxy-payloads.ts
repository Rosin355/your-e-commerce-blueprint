// Allowlists for legacy shopify-admin-proxy create/update payloads.
// Only the fields the Admin import mapper produces are forwarded to Shopify.
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 1000) => (typeof v === "string" ? v.slice(0, max) : undefined);

function pick(src: Obj, keys: string[], max?: number): Obj {
  const out: Obj = {};
  for (const k of keys) { const v = str(src[k], max); if (v !== undefined) out[k] = v; }
  return out;
}

export class PayloadError extends Error {}

export function sanitizeCustomerPayload(data: unknown): Obj {
  if (!isObj(data)) throw new PayloadError("INVALID_CUSTOMER");
  const out = pick(data, ["email", "first_name", "last_name", "phone"], 255);
  if (Array.isArray(data.addresses)) {
    out.addresses = data.addresses.filter(isObj).slice(0, 5)
      .map((a) => pick(a, ["address1", "city", "zip", "country"], 255));
  }
  const c = data.email_marketing_consent;
  if (isObj(c) && c.state === "subscribed" && c.opt_in_level === "single_opt_in") {
    out.email_marketing_consent = pick(c, ["state", "opt_in_level", "consent_updated_at"], 64);
  }
  return out;
}

export function parseCustomerId(id: unknown): string {
  const s = String(id ?? "");
  if (!/^[1-9][0-9]{0,19}$/.test(s)) throw new PayloadError("INVALID_CUSTOMER_ID");
  return s;
}

export function sanitizeProductCreatePayload(data: unknown): Obj {
  if (!isObj(data)) throw new PayloadError("INVALID_PRODUCT");
  const out = pick(data, ["title", "vendor", "product_type", "tags"], 255);
  const body = str(data.body_html, 100_000); if (body !== undefined) out.body_html = body;
  if (Array.isArray(data.variants)) {
    out.variants = data.variants.filter(isObj).slice(0, 100).map((v) => {
      const o = pick(v, ["sku", "price", "compare_at_price"], 64);
      if (typeof v.inventory_quantity === "number" && Number.isInteger(v.inventory_quantity)) o.inventory_quantity = v.inventory_quantity;
      return o;
    });
  }
  if (Array.isArray(data.images)) {
    out.images = data.images.filter(isObj).slice(0, 50)
      .map((i) => str(i.src, 2048)).filter((s): s is string => !!s && /^https:\/\//.test(s)).map((src) => ({ src }));
  }
  return out;
}
