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
  csvPath: process.env.WOO_CSV_PATH || "",
  shopifyShop: process.env.SHOPIFY_ADMIN_SHOP || "",
  shopifyApiVersion: process.env.SHOPIFY_ADMIN_API_VERSION || "2025-07",
  shopifyToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "",
  limit: Number(process.env.SYNC_LIMIT || 0), // 0 = no limit
};

function assertConfig() {
  if (!config.csvPath) throw new Error("WOO_CSV_PATH mancante (sync/.env)");
  if (!fs.existsSync(config.csvPath)) throw new Error(`CSV non trovato: ${config.csvPath}`);
  if (!config.shopifyShop) throw new Error("SHOPIFY_ADMIN_SHOP mancante (sync/.env)");
  if (!config.shopifyToken && !isDryRun) {
    throw new Error("SHOPIFY_ADMIN_ACCESS_TOKEN mancante (necessario fuori da dry-run)");
  }
}

function log(level, message, meta) {
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`;
  if (meta) console.log(line, meta);
  else console.log(line);
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

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch === "\r") {
      continue;
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}

function parseWooCsvFile(csvPath) {
  const raw = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsv(raw);
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const item = {};
    for (let i = 0; i < headers.length; i += 1) item[headers[i]] = (r[i] || "").trim();
    return item;
  });
}

function toBool(v) {
  const s = String(v || "").toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

function toTags(csvValue) {
  return String(csvValue || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .join(", ");
}

function toImages(csvValue, title) {
  return String(csvValue || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((url) => ({ originalSource: url, alt: title }));
}

function mapCsvRowToProduct(row) {
  const type = String(row.Type || "").toLowerCase();
  if (!["simple", "variable"].includes(type)) return null;
  if (!toBool(row.Published || "1")) return null;

  const title = row.Name || `Prodotto ${row.ID || ""}`.trim();
  if (!title) return null;

  const price = row["Regular price"] || row["Sale price"] || "0";
  const descriptionHtml = row.Description || row["Short description"] || "";
  const sku = row.SKU || "";
  const handle = sanitizeHandle(row.Slug, title);
  const categories = toTags(row.Categories);
  const tags = toTags(row.Tags);
  const mergedTags = [categories, tags, "woo-import", "legacy-onlinegarden-products"]
    .filter(Boolean)
    .join(", ");

  return {
    sourceId: row.ID || "",
    sourceKey: sku || handle,
    productInput: {
      title,
      handle,
      descriptionHtml,
      tags: mergedTags,
      productType: type,
      status: "ACTIVE",
    },
    variantInput: {
      sku: sku || `woo-csv-${row.ID || handle}`,
      price: String(price || "0"),
      taxable: (row["Tax status"] || "taxable") !== "none",
      inventoryPolicy: (row["In stock?"] || "1") === "1" ? "CONTINUE" : "DENY",
    },
    mediaInputs: toImages(row.Images, title),
    rawSummary: {
      id: row.ID,
      type,
      title,
      sku,
      price,
      categories,
      imageCount: toImages(row.Images, title).length,
    },
  };
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
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join(", "));
  return json.data;
}

const FIND_PRODUCT_QUERY = `
  query FindProductByHandle($query: String!) {
    products(first: 1, query: $query) {
      edges { node { id handle title } }
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

async function upsertShopify(mapped) {
  const existing = await findShopifyProductByHandle(mapped.productInput.handle);
  if (!existing) {
    const createdData = await shopifyGraphQL(CREATE_PRODUCT_MUTATION, { product: mapped.productInput });
    const errors = createdData.productCreate.userErrors;
    if (errors.length) throw new Error(`productCreate: ${errors.map((e) => e.message).join(", ")}`);
    const created = createdData.productCreate.product;
    await shopifyGraphQL(CREATE_VARIANT_BULK_MUTATION, {
      productId: created.id,
      variants: [mapped.variantInput],
    }).catch((err) => log("warn", `Variant create skipped (${mapped.productInput.handle})`, { error: err.message }));
    return "created";
  }

  const updatedData = await shopifyGraphQL(UPDATE_PRODUCT_MUTATION, {
    product: { id: existing.id, ...mapped.productInput },
  });
  const errors = updatedData.productUpdate.userErrors;
  if (errors.length) throw new Error(`productUpdate: ${errors.map((e) => e.message).join(", ")}`);
  return "updated";
}

async function run() {
  assertConfig();
  const rows = parseWooCsvFile(config.csvPath);
  log("info", `CSV rows loaded: ${rows.length}`);

  let processed = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    if (config.limit > 0 && processed >= config.limit) break;
    const mapped = mapCsvRowToProduct(row);
    if (!mapped) {
      skipped += 1;
      continue;
    }
    processed += 1;

    try {
      if (isDryRun) {
        log("info", `DRY RUN ${mapped.productInput.handle}`, mapped.rawSummary);
        continue;
      }

      const action = await upsertShopify(mapped);
      if (action === "created") created += 1;
      if (action === "updated") updated += 1;
    } catch (error) {
      failed += 1;
      log("error", `Failed ${mapped.productInput.handle}`, {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  log("info", "CSV sync finished", { processed, created, updated, skipped, failed, dryRun: isDryRun });
}

run().catch((error) => {
  log("error", "Fatal CSV sync error", {
    message: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
