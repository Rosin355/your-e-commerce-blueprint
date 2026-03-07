import path from "node:path";
import process from "node:process";
import { loadCsv, loadEnvFile, nowIso } from "./lib/csv-utils.mjs";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
loadEnvFile(path.join(__dirname, ".env"));

const args = new Set(process.argv.slice(2));
const isDryRun = args.has("--dry-run");

const cfg = {
  csvFile: process.env.REVIEWED_SHOPIFY_CSV_PATH || process.env.SHOPIFY_OUTPUT_CSV_PATH || "sync/out/shopify-products-draft-import.csv",
  shop: process.env.SHOPIFY_ADMIN_SHOP || "",
  apiVersion: process.env.SHOPIFY_ADMIN_API_VERSION || "2025-10",
  token: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "",
  publishOnCreate: String(process.env.SHOPIFY_PUBLISH_ON_CREATE || "false").toLowerCase() === "true",
  delayMs: Number(process.env.SHOPIFY_PUSH_DELAY_MS || 300),
  limit: Number(process.env.SHOPIFY_PUSH_LIMIT || 0),
};

function log(level, message, meta) {
  const line = `[${nowIso()}] ${level.toUpperCase()} ${message}`;
  if (meta) console.log(line, meta);
  else console.log(line);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function graphql(query, variables) {
  const res = await fetch(`https://${cfg.shop}/admin/api/${cfg.apiVersion}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": cfg.token },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Shopify HTTP ${res.status}`);
  const data = await res.json();
  if (data.errors?.length) throw new Error(data.errors.map((e) => e.message).join(", "));
  return data.data;
}

const FIND_BY_SKU = `
  query FindBySku($query: String!) {
    productVariants(first: 1, query: $query) {
      edges { node { sku product { id handle } } }
    }
  }
`;

const FIND_BY_HANDLE = `
  query FindByHandle($query: String!) {
    products(first: 1, query: $query) {
      edges { node { id handle } }
    }
  }
`;

const CREATE_PRODUCT = `
  mutation CreateProduct($product: ProductCreateInput!) {
    productCreate(product: $product) {
      product { id handle }
      userErrors { field message }
    }
  }
`;

const UPDATE_PRODUCT = `
  mutation UpdateProduct($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { id handle }
      userErrors { field message }
    }
  }
`;

async function findExistingProductId(primarySku, handle) {
  if (primarySku) {
    const bySku = await graphql(FIND_BY_SKU, { query: `sku:${primarySku}` });
    const id = bySku?.productVariants?.edges?.[0]?.node?.product?.id;
    if (id) return id;
  }
  const byHandle = await graphql(FIND_BY_HANDLE, { query: `handle:${handle}` });
  return byHandle?.products?.edges?.[0]?.node?.id || null;
}

function groupByHandle(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const handle = String(row["URL handle"] || "").trim();
    if (!handle) continue;
    if (!grouped.has(handle)) grouped.set(handle, []);
    grouped.get(handle).push(row);
  }
  return grouped;
}

function firstNonEmpty(rows, key) {
  for (const row of rows) {
    const value = String(row[key] || "").trim();
    if (value) return value;
  }
  return "";
}

async function main() {
  if (!cfg.csvFile) throw new Error("CSV input mancante");
  if (!cfg.shop || !cfg.token) throw new Error("SHOPIFY_ADMIN_SHOP / SHOPIFY_ADMIN_ACCESS_TOKEN mancanti");

  const csv = loadCsv(cfg.csvFile);
  const grouped = groupByHandle(csv.rows);
  const handles = Array.from(grouped.keys());
  const selectedHandles = cfg.limit > 0 ? handles.slice(0, cfg.limit) : handles;

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const handle of selectedHandles) {
    const rows = grouped.get(handle) || [];
    const title = firstNonEmpty(rows, "Title");
    const primarySku = firstNonEmpty(rows, "SKU");
    const description = firstNonEmpty(rows, "Description");
    const seoTitle = firstNonEmpty(rows, "SEO title");
    const seoDescription = firstNonEmpty(rows, "SEO description");
    const tags = firstNonEmpty(rows, "Tags");
    const vendor = firstNonEmpty(rows, "Vendor");
    const type = firstNonEmpty(rows, "Type");
    const status = cfg.publishOnCreate ? "ACTIVE" : "DRAFT";

    if (!title && !primarySku) {
      skipped += 1;
      log("warn", "Riga gruppo saltata: titolo/SKU assenti", { handle });
      continue;
    }

    try {
      const existingId = await findExistingProductId(primarySku, handle);
      if (isDryRun) {
        log("info", `[DRY-RUN] ${existingId ? "update" : "create"} prodotto`, { handle, sku: primarySku, status });
        if (existingId) updated += 1;
        else created += 1;
      } else if (existingId) {
        const data = await graphql(UPDATE_PRODUCT, {
          product: {
            id: existingId,
            title: title || undefined,
            handle,
            descriptionHtml: description || undefined,
            tags: tags || undefined,
            vendor: vendor || undefined,
            productType: type || undefined,
            seo: seoTitle || seoDescription ? { title: seoTitle || null, description: seoDescription || null } : undefined,
            status,
          },
        });
        const userErrors = data?.productUpdate?.userErrors || [];
        if (userErrors.length) throw new Error(userErrors.map((e) => e.message).join(", "));
        updated += 1;
      } else {
        const data = await graphql(CREATE_PRODUCT, {
          product: {
            title: title || handle,
            handle,
            descriptionHtml: description || undefined,
            tags: tags || undefined,
            vendor: vendor || undefined,
            productType: type || undefined,
            seo: seoTitle || seoDescription ? { title: seoTitle || null, description: seoDescription || null } : undefined,
            status,
          },
        });
        const userErrors = data?.productCreate?.userErrors || [];
        if (userErrors.length) throw new Error(userErrors.map((e) => e.message).join(", "));
        created += 1;
      }
    } catch (error) {
      errors += 1;
      log("error", "Errore push prodotto", {
        handle,
        sku: primarySku,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    await sleep(cfg.delayMs);
  }

  log("info", "Push drafts completato", { dryRun: isDryRun, created, updated, skipped, errors, total: selectedHandles.length });
}

main().catch((error) => {
  log("error", "Errore fatale push drafts", { message: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
