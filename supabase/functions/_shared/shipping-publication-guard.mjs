/**
 * Server-owned safety boundary. No approvals are inferred from titles, client
 * payloads or metafields. The production approval registry is intentionally empty.
 * B is product-wide: ordinary siblings must be separate products.
 */
const B_TAGS = new Set(["ogqashippingbapproved", "ogshippingbapproved"]);
export const APPROVED_B_VARIANTS = Object.freeze([]);

export function assertHomogeneousB(product, approvals = APPROVED_B_VARIANTS) {
  if (!product || !Array.isArray(product.tags)) throw new Error("SHIPPING_CLASSIFICATION_REQUIRED: stato prodotto non verificato");
  if (!product.tags.some(tag => B_TAGS.has(String(tag).toLowerCase()))) return;
  const variants = product.variants?.nodes;
  if (!variants?.length || product.variants?.pageInfo?.hasNextPage !== false) {
    throw new Error("SHIPPING_CLASSIFICATION_REQUIRED: elenco varianti B incompleto");
  }
  for (const variant of variants) {
    if (!approvals.some(a => a.productId === product.id && a.variantId === variant.id &&
      a.sku === variant.sku && ["bulb", "succulent"].includes(a.class) && a.approvedBy && a.reference)) {
      throw new Error("SHIPPING_B_NOT_APPROVED: approvare tutte le varianti; separare le varianti A in prodotti distinti");
    }
  }
}

export const SHIPPING_GUARD_QUERY = `query ShippingPublicationGuard($id: ID!) {
  node(id: $id) {
    ... on Product { id tags variants(first: 250) { nodes { id sku } pageInfo { hasNextPage } } }
    ... on ProductVariant { product { id tags variants(first: 250) { nodes { id sku } pageInfo { hasNextPage } } } }
  }
}`;

export async function guardCatalogMutation(query, variables, read) {
  // Remove comments so a mutation cannot be hidden behind a query comment.
  const source = query.replace(/#[^\n]*/g, "");
  if (!/\bmutation\b/.test(source)) return;
  if (!/\b(product\w*|publishablePublish|tagsAdd|tagsRemove|collection\w*)\s*\(/.test(source)) return;
  // Assigning a logistics tag, or changing collection conditions, requires a
  // separate server-owned approval operation; arbitrary payloads cannot do it.
  if (/og(?:qa)?shippingbapproved/i.test(JSON.stringify(variables) + source) ||
      /\bcollection\w*\s*\(/.test(source)) {
    throw new Error("SHIPPING_B_ASSIGNMENT_BLOCKED: assegnazione B/collezioni richiede approvazione controllata");
  }
  const ids = new Set();
  function collect(value) {
    if (typeof value === "string" && /^gid:\/\/shopify\/(Product|ProductVariant)\/\d+$/.test(value)) ids.add(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object") Object.values(value).forEach(collect);
  }
  collect(variables);
  // Inline mutations cannot supply a verified target through this boundary.
  if (/gid:\/\/shopify\/(Product|ProductVariant)\//.test(source)) {
    throw new Error("SHIPPING_CLASSIFICATION_REQUIRED: usare ID prodotto come variabile");
  }
  if (!ids.size) {
    // Only a new product, with no B assignment, can safely default to A.
    if (/\bproductCreate\s*\(/.test(source) && !/\b(productSet|productUpdate|publishablePublish|tagsAdd|tagsRemove|productVariants\w*)\s*\(/.test(source)) return;
    throw new Error("SHIPPING_CLASSIFICATION_REQUIRED: destinazione catalogo non verificabile");
  }
  for (const id of ids) {
    const data = await read(SHIPPING_GUARD_QUERY, { id });
    const product = data?.node?.product ?? data?.node;
    assertHomogeneousB(product);
    if (product.tags.some(tag => B_TAGS.has(String(tag).toLowerCase())) &&
        /\b(product\w*|tagsAdd|tagsRemove)\s*\(/.test(source)) {
      throw new Error("SHIPPING_B_VARIANTS_LOCKED: declassificare il prodotto prima di modificarlo; nessuna separazione automatica");
    }
  }
}

export async function guardCatalogRest(path, method, body, read) {
  path = path.replace(/^\/+/, "").split("?")[0];
  if (["GET", "HEAD"].includes(method.toUpperCase()) || !/^(products|variants|collects|custom_collections|smart_collections)(\/|\.)/.test(path)) return;
  if (path === "products.json" && method.toUpperCase() === "POST") {
    return guardCatalogMutation("mutation { productCreate(product: $product) { product { id } } }", { product: body?.product }, read);
  }
  // Legacy REST writes cannot prove variant approvals or safely edit B tags.
  // Keep reads and non-catalog operations available, but fail before any write.
  throw new Error("SHIPPING_LEGACY_CATALOG_WRITE_BLOCKED: usare il percorso GraphQL con classificazione verificata");
}
