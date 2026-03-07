import path from "node:path";
import process from "node:process";
import { createAiProductEnricher } from "./lib/ai-product-enricher.mjs";
import { loadCsv, loadEnvFile, nowIso, writeCsv, writeJson } from "./lib/csv-utils.mjs";
import {
  boolToCsv,
  extractWooFields,
  gramsFromKg,
  mapPublishedAndStatus,
  mergeTags,
  pick,
  sanitizeHandle,
} from "./lib/product-normalizers.mjs";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
loadEnvFile(path.join(__dirname, ".env"));

const args = new Set(process.argv.slice(2));
const isDryRun = args.has("--dry-run");

const cfg = {
  wooFile: process.env.WOO_PRODUCTS_CSV_PATH || "",
  templateFile: process.env.SHOPIFY_TEMPLATE_CSV_PATH || "",
  outputFile: process.env.SHOPIFY_OUTPUT_CSV_PATH || "sync/out/shopify-products-draft-import.csv",
  limit: Number(process.env.WOO_PRODUCTS_LIMIT || 0),
  allowZeroPrice: String(process.env.ALLOW_ZERO_PRICE || "false").toLowerCase() === "true",
  allowMissingSku: String(process.env.ALLOW_MISSING_SKU || "true").toLowerCase() === "true",
  defaultVendor: process.env.DEFAULT_VENDOR || "Online Garden",
};

function log(level, message, meta) {
  const line = `[${nowIso()}] ${level.toUpperCase()} ${message}`;
  if (meta) console.log(line, meta);
  else console.log(line);
}

function emptyRow(headers) {
  const row = {};
  for (const h of headers) row[h] = "";
  return row;
}

function splitValidUrls(value) {
  return String(value || "")
    .split(/[|,]/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
}

function buildAiPayload(product) {
  return {
    source: "woocommerce_csv",
    language: "it",
    brand: "Online Garden",
    title: product.title,
    shortDescription: product.shortDescription,
    descriptionHtml: product.descriptionHtml,
    categories: product.categories ? [product.categories] : [],
    tags: product.tags ? product.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    sku: product.sku,
    images: product.images,
    attributes: {
      exposure: product.exposure,
      soil: product.soil,
      watering: product.watering,
      petSafe: product.petSafe,
      heightCm: product.heightCm,
    },
  };
}

async function runPool(items, worker, concurrency) {
  const out = new Array(items.length);
  let idx = 0;
  async function loop() {
    while (idx < items.length) {
      const current = idx;
      idx += 1;
      out[current] = await worker(items[current], current);
    }
  }
  const runners = Array.from({ length: Math.max(1, concurrency) }, () => loop());
  await Promise.all(runners);
  return out;
}

function resolvePrice(source) {
  if (source.salePrice) return { price: source.salePrice, compareAtPrice: source.regularPrice || "" };
  return { price: source.regularPrice || "", compareAtPrice: "" };
}

function validateOutputRow(row, errors, rowNumber) {
  const allowedStatus = new Set(["Active", "Draft", "Archived", ""]);
  if (!allowedStatus.has(row.Status)) {
    errors.push({ code: "INVALID_STATUS", message: `Status non valido ${row.Status}`, row: rowNumber, sku: row.SKU, handle: row["URL handle"] });
  }
  if (row["Product image URL"] && !/^https?:\/\//i.test(row["Product image URL"])) {
    errors.push({ code: "INVALID_IMAGE_URL", message: "Product image URL non valida", row: rowNumber, sku: row.SKU, handle: row["URL handle"] });
  }
}

async function main() {
  if (!cfg.wooFile) throw new Error("WOO_PRODUCTS_CSV_PATH mancante");
  if (!cfg.templateFile) throw new Error("SHOPIFY_TEMPLATE_CSV_PATH mancante");

  const startedAt = nowIso();
  const woo = loadCsv(cfg.wooFile);
  const template = loadCsv(cfg.templateFile);
  const headers = template.headers;
  if (headers.length !== 57) throw new Error(`Template Shopify non valido: attese 57 colonne, trovate ${headers.length}`);

  const warnings = [];
  const errors = [];
  const outputRows = [];

  const byType = { variable: [], variation: [], simple: [], other: [] };
  for (const raw of woo.rows) {
    const normalized = extractWooFields(raw);
    if (normalized.type === "variable") byType.variable.push(normalized);
    else if (normalized.type === "variation") byType.variation.push(normalized);
    else if (normalized.type === "simple") byType.simple.push(normalized);
    else byType.other.push(normalized);
  }

  const parentCandidates = [...byType.variable, ...byType.simple, ...byType.other];
  const parents = cfg.limit > 0 ? parentCandidates.slice(0, cfg.limit) : parentCandidates;

  const variationsByParentSku = new Map();
  for (const v of byType.variation) {
    if (!v.parentSku) {
      warnings.push({ code: "VARIATION_PARENT_MISSING", message: "Variation senza parent SKU", row: "", sku: v.sku, handle: "" });
      continue;
    }
    if (!variationsByParentSku.has(v.parentSku)) variationsByParentSku.set(v.parentSku, []);
    variationsByParentSku.get(v.parentSku).push(v);
  }

  const handleSet = new Set();
  const enricher = createAiProductEnricher(process.env);
  const aiResults = await runPool(
    parents,
    async (parent) => {
      const payload = buildAiPayload(parent);
      return enricher.enrich(payload);
    },
    enricher.config.concurrency,
  );

  let aiEnrichedCount = 0;
  let fallbackCount = 0;
  let createdRows = 0;
  let skippedRows = 0;
  const skuSeen = new Map();

  for (let i = 0; i < parents.length; i += 1) {
    const parent = parents[i];
    const ai = aiResults[i];
    if (ai.usedFallback) fallbackCount += 1;
    else aiEnrichedCount += 1;
    if (ai.warning) warnings.push({ code: "AI_FALLBACK", message: ai.warning, row: "", sku: parent.sku, handle: "" });

    const title = ai.enriched.title || parent.title;
    const handle = sanitizeHandle(parent.handle, title || parent.sku, handleSet);
    const variants = parent.type === "variable" ? variationsByParentSku.get(parent.sku) || [] : [];
    const variantRows = variants.length ? variants : [parent];

    for (let variantIndex = 0; variantIndex < variantRows.length; variantIndex += 1) {
      const variant = variantRows[variantIndex];
      const row = variantIndex === 0 ? emptyRow(headers) : emptyRow(headers);

      const { publishedOnOnlineStore, status } = mapPublishedAndStatus(parent);
      const forcedPublished = "FALSE";
      const forcedStatus = "Draft";

      row.Title = variantIndex === 0 ? title : "";
      row["URL handle"] = handle;
      row.Description = variantIndex === 0 ? ai.enriched.descriptionHtml || parent.descriptionHtml || parent.shortDescription || "" : "";
      row.Vendor = variantIndex === 0 ? (parent.brand || cfg.defaultVendor) : "";
      row["Product category"] = "";
      row.Type = variantIndex === 0 ? (ai.enriched.productType || parent.type || "") : "";
      row.Tags = variantIndex === 0 ? mergeTags({ categories: parent.categories, tags: [parent.tags, ...(ai.enriched.tags || [])].join(",") }) : "";
      row["Published on online store"] = variantIndex === 0 ? forcedPublished || publishedOnOnlineStore : "";
      row.Status = variantIndex === 0 ? forcedStatus || status : "";

      row.SKU = variant.sku || "";
      row.Barcode = variant.barcode || parent.barcode || "";
      row["Option1 name"] = variantIndex === 0 ? (parent.option1Name || "Title") : "";
      row["Option1 value"] = variant.option1Value || parent.option1Value || "Default Title";
      row["Option1 Linked To"] = "";
      row["Option2 name"] = variantIndex === 0 ? (parent.option2Name || "") : "";
      row["Option2 value"] = variant.option2Value || parent.option2Value || "";
      row["Option2 Linked To"] = "";
      row["Option3 name"] = variantIndex === 0 ? (parent.option3Name || "") : "";
      row["Option3 value"] = variant.option3Value || parent.option3Value || "";
      row["Option3 Linked To"] = "";

      const prices = resolvePrice(variant);
      row.Price = prices.price;
      row["Compare-at price"] = prices.compareAtPrice;
      row["Cost per item"] = "";
      row["Charge tax"] = parent.taxStatus === "none" ? "FALSE" : "TRUE";
      row["Tax code"] = "";
      row["Unit price total measure"] = "";
      row["Unit price total measure unit"] = "";
      row["Unit price base measure"] = "";
      row["Unit price base measure unit"] = "";
      row["Inventory tracker"] = "shopify";
      row["Inventory quantity"] = String(variant.stock || 0);
      row["Continue selling when out of stock"] = parent.backorders === "TRUE" ? "TRUE" : "FALSE";
      row["Weight value (grams)"] = gramsFromKg(variant.weightKg || parent.weightKg);
      row["Weight unit for display"] = "kg";
      row["Requires shipping"] = parent.type.includes("gift_card") || parent.type.includes("virtual") ? "FALSE" : "TRUE";
      row["Fulfillment service"] = "manual";

      const variantImages = variant.images?.length ? variant.images : parent.images;
      row["Product image URL"] = variantIndex === 0 ? (variantImages?.[0] || "") : "";
      row["Image position"] = variantIndex === 0 && row["Product image URL"] ? "1" : "";
      row["Image alt text"] = variantIndex === 0 ? (ai.enriched.imageAltText || title) : "";
      row["Variant image URL"] = variantIndex > 0 ? (variantImages?.[0] || "") : "";
      row["Gift card"] = parent.type.includes("gift_card") ? "TRUE" : "FALSE";
      row["SEO title"] = variantIndex === 0 ? ai.enriched.seoTitle : "";
      row["SEO description"] = variantIndex === 0 ? ai.enriched.seoDescription : "";
      row["Color (product.metafields.shopify.color-pattern)"] = "";
      row["Google Shopping / Google product category"] = variantIndex === 0 ? ai.enriched.googleProductCategory : "";
      row["Google Shopping / Gender"] = "";
      row["Google Shopping / Age group"] = "";
      row["Google Shopping / Manufacturer part number (MPN)"] = "";
      row["Google Shopping / Ad group name"] = "";
      row["Google Shopping / Ads labels"] = "";
      row["Google Shopping / Condition"] = "";
      row["Google Shopping / Custom product"] = "";
      row["Google Shopping / Custom label 0"] = variantIndex === 0 ? ai.enriched.customLabels["0"] : "";
      row["Google Shopping / Custom label 1"] = variantIndex === 0 ? ai.enriched.customLabels["1"] : "";
      row["Google Shopping / Custom label 2"] = variantIndex === 0 ? ai.enriched.customLabels["2"] : "";
      row["Google Shopping / Custom label 3"] = variantIndex === 0 ? ai.enriched.customLabels["3"] : "";
      row["Google Shopping / Custom label 4"] = variantIndex === 0 ? ai.enriched.customLabels["4"] : "";

      if (!cfg.allowMissingSku && !row.SKU) {
        warnings.push({ code: "SKU_MISSING", message: "SKU mancante, prodotto saltato", row: "", sku: "", handle });
        skippedRows += 1;
        continue;
      }

      if (!cfg.allowZeroPrice && !row.Price) {
        warnings.push({ code: "PRICE_MISSING", message: "Prezzo mancante, prodotto saltato", row: "", sku: row.SKU, handle });
        skippedRows += 1;
        continue;
      }

      if (row.SKU) skuSeen.set(row.SKU, (skuSeen.get(row.SKU) || 0) + 1);
      outputRows.push(row);
      createdRows += 1;
    }

    const parentImages = splitValidUrls(parent.images?.join(",") || "");
    for (let imageIndex = 1; imageIndex < parentImages.length; imageIndex += 1) {
      const imageRow = emptyRow(headers);
      imageRow["URL handle"] = handle;
      imageRow["Product image URL"] = parentImages[imageIndex];
      imageRow["Image position"] = String(imageIndex + 1);
      imageRow["Image alt text"] = ai.enriched.imageAltText || title;
      outputRows.push(imageRow);
      createdRows += 1;
    }
  }

  for (const [sku, count] of skuSeen.entries()) {
    if (count > 1) warnings.push({ code: "SKU_DUPLICATE", message: `SKU duplicato (${count})`, row: "", sku, handle: "" });
  }

  for (let idx = 0; idx < outputRows.length; idx += 1) validateOutputRow(outputRows[idx], errors, idx + 2);

  const warningsPath = cfg.outputFile.replace(/\.csv$/i, ".warnings.csv");
  const errorsPath = cfg.outputFile.replace(/\.csv$/i, ".errors.csv");
  const reportPath = cfg.outputFile.replace(/\.csv$/i, ".report.json");
  const report = {
    inputFile: cfg.wooFile,
    templateFile: cfg.templateFile,
    outputFile: cfg.outputFile,
    processedRows: parents.length,
    createdRows,
    skippedRows,
    warningCount: warnings.length,
    errorCount: errors.length,
    aiEnrichedCount,
    fallbackCount,
    startedAt,
    finishedAt: nowIso(),
  };

  if (isDryRun) {
    log("info", "Dry-run completato (nessun file scritto)", report);
    return;
  }

  writeCsv(cfg.outputFile, headers, outputRows);
  writeCsv(warningsPath, ["code", "message", "row", "sku", "handle"], warnings);
  writeCsv(errorsPath, ["code", "message", "row", "sku", "handle"], errors);
  writeJson(reportPath, report);
  log("info", "Pipeline completata", report);
}

main().catch((error) => {
  log("error", "Errore pipeline draft CSV", { message: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
