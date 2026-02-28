import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex < 0) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, ".env"));

const args = new Set(process.argv.slice(2));
const isDryRun = args.has("--dry-run");

const config = {
  oldSiteBaseUrl: process.env.OLD_SITE_BASE_URL || "https://www.onlinegarden.it",
  wooApiBase: process.env.WOOCOMMERCE_API_BASE || "",
  wooConsumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY || "",
  wooConsumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET || "",
  shopifyShop: process.env.SHOPIFY_ADMIN_SHOP || "",
  shopifyApiVersion: process.env.SHOPIFY_ADMIN_API_VERSION || "2025-07",
  shopifyToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "",
  pageSize: Number(process.env.SYNC_PAGE_SIZE || 50),
  maxPages: Number(process.env.SYNC_MAX_PAGES || 0), // 0 = all pages
};

function assertConfig() {
  if (!config.wooApiBase) {
    throw new Error("WOOCOMMERCE_API_BASE mancante (sync/.env)");
  }
  if (!config.shopifyShop) {
    throw new Error("SHOPIFY_ADMIN_SHOP mancante (sync/.env)");
  }
  if (!config.shopifyToken && !isDryRun) {
    throw new Error("SHOPIFY_ADMIN_ACCESS_TOKEN mancante (necessario fuori da dry-run)");
  }
}

function log(level, message, meta) {
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`;
  if (meta) {
    console.log(line, meta);
    return;
  }
  console.log(line);
}

function sanitizeHandle(input, fallback) {
  const base = (input || fallback || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `product-${Date.now()}`;
}

function stripHtml(html = "") {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function toMetafields(wooProduct) {
  // Placeholder: adatta in base agli attributi reali (acqua, luce, altezza, ecc.)
  return [];
}

function mapWooProductToShopifyInput(wooProduct) {
  const title = wooProduct.name?.trim() || `Prodotto ${wooProduct.id}`;
  const handle = sanitizeHandle(wooProduct.slug, title);
  const descriptionHtml = wooProduct.description || wooProduct.short_description || "";
  const sku = wooProduct.sku || "";
  const images = Array.isArray(wooProduct.images)
    ? wooProduct.images.map((img) => ({ originalSource: img.src, alt: img.alt || title }))
    : [];

  const variantPrice = String(wooProduct.price ?? wooProduct.regular_price ?? "0");
  const variantSku = sku || `woo-${wooProduct.id}`;
  const inventoryPolicy = wooProduct.stock_status === "instock" ? "CONTINUE" : "DENY";

  const tags = [];
  if (Array.isArray(wooProduct.categories)) {
    for (const cat of wooProduct.categories) {
      if (cat?.name) tags.push(cat.name);
    }
  }

  return {
    sourceKey: sku || handle,
    sourceId: String(wooProduct.id),
    productInput: {
      title,
      handle,
      descriptionHtml,
      tags: tags.join(", "),
      productType: wooProduct.type || "woo-import",
      status: "ACTIVE",
      metafields: toMetafields(wooProduct),
    },
    variantInput: {
      price: variantPrice,
      sku: variantSku,
      inventoryPolicy,
      taxable: true,
    },
    mediaInputs: images,
    rawSummary: {
      name: title,
      sku,
      price: variantPrice,
      categories: tags,
      imageCount: images.length,
      stockStatus: wooProduct.stock_status,
    },
    sourceDescription: stripHtml(descriptionHtml).slice(0, 180),
  };
}

async function fetchWooProductsPage(page) {
  const url = new URL(`${config.wooApiBase.replace(/\/$/, "")}/products`);
  url.searchParams.set("per_page", String(config.pageSize));
  url.searchParams.set("page", String(page));
  url.searchParams.set("status", "publish");

  const auth = Buffer.from(`${config.wooConsumerKey}:${config.wooConsumerSecret}`).toString("base64");
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`WooCommerce API HTTP ${res.status} (page ${page})`);
  }

  const data = await res.json();
  const totalPages = Number(res.headers.get("x-wp-totalpages") || "1");
  return { data, totalPages };
}

async function shopifyGraphQL(query, variables) {
  const url = `https://${config.shopifyShop}/admin/api/${config.shopifyApiVersion}/graphql.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": config.shopifyToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`Shopify Admin API HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`Shopify GraphQL error: ${json.errors.map((e) => e.message).join(", ")}`);
  }
  return json.data;
}

const FIND_PRODUCT_QUERY = `
  query FindProductByHandle($query: String!) {
    products(first: 1, query: $query) {
      edges {
        node {
          id
          handle
          title
          variants(first: 20) {
            edges { node { id sku } }
          }
        }
      }
    }
  }
`;

const CREATE_PRODUCT_MUTATION = `
  mutation ProductCreate($product: ProductCreateInput!) {
    productCreate(product: $product) {
      product { id handle title }
      userErrors { field message }
    }
  }
`;

const UPDATE_PRODUCT_MUTATION = `
  mutation ProductUpdate($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { id handle title }
      userErrors { field message }
    }
  }
`;

const CREATE_VARIANT_BULK_MUTATION = `
  mutation ProductVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkCreate(productId: $productId, variants: $variants) {
      productVariants { id sku }
      userErrors { field message }
    }
  }
`;

async function findShopifyProductByHandle(handle) {
  const data = await shopifyGraphQL(FIND_PRODUCT_QUERY, { query: `handle:${handle}` });
  return data.products.edges[0]?.node || null;
}

async function upsertShopifyProduct(mapped) {
  const existing = await findShopifyProductByHandle(mapped.productInput.handle);
  if (!existing) {
    const createData = await shopifyGraphQL(CREATE_PRODUCT_MUTATION, {
      product: mapped.productInput,
    });
    const errors = createData.productCreate.userErrors;
    if (errors.length) {
      throw new Error(`productCreate: ${errors.map((e) => e.message).join(", ")}`);
    }
    const created = createData.productCreate.product;
    log("info", `Created product ${created.handle}`, { id: created.id });

    // Create first variant explicitly if needed (new product can have default variant).
    await shopifyGraphQL(CREATE_VARIANT_BULK_MUTATION, {
      productId: created.id,
      variants: [mapped.variantInput],
    }).catch((err) => {
      log("warn", `Variant create skipped/failed for ${created.handle}`, { error: err.message });
    });

    return { action: "created", productId: created.id };
  }

  const updateData = await shopifyGraphQL(UPDATE_PRODUCT_MUTATION, {
    product: {
      id: existing.id,
      ...mapped.productInput,
    },
  });
  const errors = updateData.productUpdate.userErrors;
  if (errors.length) {
    throw new Error(`productUpdate: ${errors.map((e) => e.message).join(", ")}`);
  }
  log("info", `Updated product ${mapped.productInput.handle}`, { id: existing.id });
  return { action: "updated", productId: existing.id };
}

async function run() {
  assertConfig();

  let page = 1;
  let totalPages = 1;
  let processed = 0;
  let created = 0;
  let updated = 0;
  let failed = 0;

  log("info", `Starting product sync${isDryRun ? " (dry-run)" : ""}`);

  while (page <= totalPages) {
    if (config.maxPages > 0 && page > config.maxPages) break;

    const result = await fetchWooProductsPage(page);
    totalPages = result.totalPages;
    log("info", `Fetched WooCommerce page ${page}/${totalPages}`, { count: result.data.length });

    for (const wooProduct of result.data) {
      processed += 1;
      try {
        const mapped = mapWooProductToShopifyInput(wooProduct);

        if (isDryRun) {
          log("info", `DRY RUN ${mapped.productInput.handle}`, mapped.rawSummary);
          continue;
        }

        const syncResult = await upsertShopifyProduct(mapped);
        if (syncResult.action === "created") created += 1;
        if (syncResult.action === "updated") updated += 1;
      } catch (error) {
        failed += 1;
        log("error", `Failed product ${wooProduct?.id ?? "unknown"}`, {
          message: error instanceof Error ? error.message : String(error),
          name: wooProduct?.name,
          sku: wooProduct?.sku,
        });
      }
    }

    page += 1;
  }

  log("info", "Sync finished", { processed, created, updated, failed, dryRun: isDryRun });
}

run().catch((error) => {
  log("error", "Fatal sync error", { message: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
