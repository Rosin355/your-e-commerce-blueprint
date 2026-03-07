import path from "node:path";
import process from "node:process";
import { enrichProductContent } from "./lib/ai-product-enricher.mjs";
import { loadEnvFile, nowIso, readCsvFile, readCsvHeaders, writeCsvFile, writeJsonFile } from "./lib/csv-utils.mjs";
import { normalizeWooProduct } from "./lib/product-normalizers.mjs";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
loadEnvFile(path.join(__dirname, ".env"));

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  const dryRun = args.has("--dry-run");
  let limit;
  for (const arg of argv.slice(2)) {
    if (arg.startsWith("--limit=")) {
      const n = Number(arg.split("=")[1]);
      if (!Number.isNaN(n) && n > 0) limit = n;
    }
  }
  return { dryRun, limit };
}

function toBooleanEnv(value, defaultValue) {
  const raw = String(value ?? "").toLowerCase().trim();
  if (!raw) return defaultValue;
  if (["1", "true", "yes", "si", "sì"].includes(raw)) return true;
  if (["0", "false", "no"].includes(raw)) return false;
  return defaultValue;
}

function toNumberEnv(value, defaultValue) {
  const num = Number(value);
  return Number.isNaN(num) ? defaultValue : num;
}

function safeString(value) {
  return String(value ?? "");
}

function normalizeWhitespace(value) {
  return safeString(value).replace(/\s+/g, " ").trim();
}

function stripHtmlUnsafeJunk(value) {
  const html = safeString(value).replace(/\u0000/g, "");
  return html.replace(/<script[\s\S]*?<\/script>/gi, "");
}

function slugifyHandle(value) {
  const base = normalizeWhitespace(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "product";
}

function ensureUniqueHandle(base, usedHandles) {
  if (!usedHandles.has(base)) {
    usedHandles.add(base);
    return base;
  }
  let index = 2;
  while (usedHandles.has(`${base}-${index}`)) index += 1;
  const handle = `${base}-${index}`;
  usedHandles.add(handle);
  return handle;
}

function splitMultiValueField(value) {
  return safeString(value)
    .split(/[|,]/)
    .map((v) => normalizeWhitespace(v))
    .filter(Boolean);
}

function parseImages(value) {
  return splitMultiValueField(value).filter((url) => /^https?:\/\//i.test(url));
}

function parseTags(value) {
  return splitMultiValueField(value);
}

function parseCategories(value) {
  return splitMultiValueField(value);
}

function kgToGrams(value) {
  const raw = normalizeWhitespace(value);
  if (!raw) return "";
  const kg = Number(raw.replace(",", "."));
  if (Number.isNaN(kg)) return "";
  return String(Math.round(kg * 1000));
}

function normalizePrice(value) {
  const raw = normalizeWhitespace(value);
  if (!raw) return "";
  const clean = raw.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const num = Number(clean);
  if (Number.isNaN(num)) return "";
  return num.toFixed(2);
}

function normalizeInventoryPolicy(stockStatus, backorders) {
  const backordersEnabled = toBooleanEnv(backorders, false);
  if (backordersEnabled) return "continue";
  return "deny";
}

function pickBestDescription(fullHtml, shortHtml) {
  const full = stripHtmlUnsafeJunk(fullHtml).trim();
  const short = normalizeWhitespace(shortHtml);
  if (full) return full;
  if (short) return `<p>${short}</p>`;
  return "";
}

function buildAiInput(normalizedProduct) {
  return {
    source: "woocommerce_csv",
    language: "it",
    brand: normalizedProduct.vendor,
    title: normalizedProduct.title,
    shortDescription: normalizedProduct.shortDescription,
    descriptionHtml: normalizedProduct.descriptionHtml,
    categories: normalizedProduct.categories || [],
    tags: normalizedProduct.tags || [],
    sku: normalizedProduct.sku,
    images: normalizedProduct.images || [],
    attributes: normalizedProduct.attributes || {},
  };
}

function mergeTags(sourceTags, sourceCategories, aiTags) {
  const out = new Set();
  for (const value of [...(sourceTags || []), ...(sourceCategories || []), ...(aiTags || [])]) {
    const clean = normalizeWhitespace(value);
    if (clean) out.add(clean);
  }
  out.add("woo-import");
  out.add("legacy-onlinegarden-products");
  return [...out].join(", ");
}

function buildBaseShopifyRow(product, aiResult) {
  const price = normalizePrice(product.price);
  const compareAt = normalizePrice(product.compareAtPrice);
  const description = pickBestDescription(
    aiResult?.descriptionHtml || product.descriptionHtml,
    product.shortDescription,
  );

  const row = {
    Title: safeString(aiResult?.title || product.title),
    "URL handle": safeString(product.handle),
    Description: description,
    Vendor: safeString(product.vendor),
    "Product category": "",
    Type: safeString(aiResult?.productType || product.categories?.[0] || product.sourceType || ""),
    Tags: mergeTags(product.tags, product.categories, aiResult?.tags),
    "Published on online store": "false",
    Status: "draft",
    SKU: safeString(product.sku),
    Barcode: safeString(product.barcode),
    "Option1 name": safeString(product.attributes?.option1Name || "Title"),
    "Option1 value": safeString(product.attributes?.option1Value || "Default Title"),
    "Option1 Linked To": "",
    "Option2 name": safeString(product.attributes?.option2Name || ""),
    "Option2 value": safeString(product.attributes?.option2Value || ""),
    "Option2 Linked To": "",
    "Option3 name": safeString(product.attributes?.option3Name || ""),
    "Option3 value": safeString(product.attributes?.option3Value || ""),
    "Option3 Linked To": "",
    Price: price,
    "Compare-at price": compareAt,
    "Cost per item": "",
    "Charge tax": product.chargeTax ? "true" : "false",
    "Tax code": safeString(product.taxCode || ""),
    "Unit price total measure": "",
    "Unit price total measure unit": "",
    "Unit price base measure": "",
    "Unit price base measure unit": "",
    "Inventory tracker": "shopify",
    "Inventory quantity": String(product.inventoryQuantity ?? 0),
    "Continue selling when out of stock": safeString(product.continueSelling || "deny"),
    "Weight value (grams)": safeString(product.weightGrams ?? ""),
    "Weight unit for display": product.weightGrams ? "g" : "",
    "Requires shipping": product.requiresShipping ? "true" : "false",
    "Fulfillment service": "manual",
    "Product image URL": safeString(product.images?.[0] || ""),
    "Image position": product.images?.length ? "1" : "",
    "Image alt text": safeString(aiResult?.imageAltText || product.title),
    "Variant image URL": "",
    "Gift card": product.sourceType.includes("gift_card") ? "true" : "false",
    "SEO title": safeString(aiResult?.seoTitle || product.title),
    "SEO description": safeString(aiResult?.seoDescription || ""),
    "Color (product.metafields.shopify.color-pattern)": "",
    "Google Shopping / Google product category": safeString(aiResult?.googleProductCategory || ""),
    "Google Shopping / Gender": "",
    "Google Shopping / Age group": "",
    "Google Shopping / Manufacturer part number (MPN)": "",
    "Google Shopping / Ad group name": "",
    "Google Shopping / Ads labels": "",
    "Google Shopping / Condition": "",
    "Google Shopping / Custom product": "",
    "Google Shopping / Custom label 0": safeString(aiResult?.customLabels?.["0"] || ""),
    "Google Shopping / Custom label 1": safeString(aiResult?.customLabels?.["1"] || ""),
    "Google Shopping / Custom label 2": safeString(aiResult?.customLabels?.["2"] || ""),
    "Google Shopping / Custom label 3": safeString(aiResult?.customLabels?.["3"] || ""),
    "Google Shopping / Custom label 4": safeString(aiResult?.customLabels?.["4"] || ""),
  };
  return row;
}

function buildAdditionalImageRows(baseRow, imageUrls, altText) {
  const rows = [];
  for (let i = 1; i < imageUrls.length; i += 1) {
    rows.push({
      ...Object.fromEntries(Object.keys(baseRow).map((k) => [k, ""])),
      "URL handle": baseRow["URL handle"],
      "Product image URL": imageUrls[i],
      "Image position": String(i + 1),
      "Image alt text": altText,
    });
  }
  return rows;
}

function writeWarningsCsv(filePath, warnings) {
  writeCsvFile(filePath, warnings, ["rowNumber", "sku", "title", "code", "message"]);
}

function writeErrorsCsv(filePath, errors) {
  writeCsvFile(filePath, errors, ["rowNumber", "sku", "title", "code", "message"]);
}

function writeReportJson(filePath, report) {
  writeJsonFile(filePath, report);
}

function createWarning(rowNumber, sku, title, code, message) {
  return { rowNumber, sku: safeString(sku), title: safeString(title), code, message };
}

function createError(rowNumber, sku, title, code, message) {
  return { rowNumber, sku: safeString(sku), title: safeString(title), code, message };
}

function log(level, message, meta = undefined) {
  const line = `[${nowIso()}] ${level.toUpperCase()} ${message}`;
  if (meta) console.log(line, meta);
  else console.log(line);
}

function normalizeFromWooRaw(raw, defaultVendor) {
  const normalized = normalizeWooProduct(raw, { defaultVendor });
  normalized.images = parseImages(normalized.images?.join?.("|") || normalized.raw?.Immagini || normalized.raw?.Immagine || "");
  normalized.tags = parseTags(normalized.tags?.join?.(",") || normalized.raw?.Tag || normalized.raw?.Tags || "");
  normalized.categories = parseCategories(normalized.categories?.join?.(",") || normalized.raw?.Categorie || normalized.raw?.Categories || "");
  normalized.descriptionHtml = pickBestDescription(normalized.descriptionHtml, normalized.shortDescription);
  normalized.price = normalizePrice(normalized.price);
  normalized.compareAtPrice = normalizePrice(normalized.compareAtPrice);
  normalized.weightGrams = normalized.weightGrams || kgToGrams(normalized.raw?.["Peso (kg)"]);
  normalized.continueSelling = normalizeInventoryPolicy(normalized.raw?.["In stock?"], normalized.raw?.["Abilita gli ordini arretrati?"]);
  normalized.inventoryQuantity = toNumberEnv(normalized.inventoryQuantity, 0);
  normalized.vendor = normalizeWhitespace(normalized.vendor) || defaultVendor;
  normalized.title = normalizeWhitespace(normalized.title);
  normalized.shortDescription = normalizeWhitespace(normalized.shortDescription);
  normalized.handleCandidate = slugifyHandle(normalized.handleCandidate || normalized.raw?.Slug || normalized.title || normalized.sku);
  return normalized;
}

async function processWithConcurrency(items, concurrency, handler) {
  const results = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await handler(items[current], current);
    }
  }
  const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  const startedAt = nowIso();
  const { dryRun, limit: cliLimit } = parseArgs(process.argv);

  const envLimit = toNumberEnv(process.env.WOO_PRODUCTS_LIMIT, 0);
  const limit = cliLimit || envLimit;
  const allowZeroPrice = toBooleanEnv(process.env.ALLOW_ZERO_PRICE, false);
  const allowMissingSku = toBooleanEnv(process.env.ALLOW_MISSING_SKU, true);
  const defaultVendor = process.env.DEFAULT_VENDOR || "Online Garden";
  const aiMode = process.env.AI_ENRICH_MODE || "mock";
  const aiConcurrency = Math.max(1, toNumberEnv(process.env.AI_ENRICH_CONCURRENCY, 2));

  const inputFile = process.env.WOO_PRODUCTS_CSV_PATH || "";
  const templateFile = process.env.SHOPIFY_TEMPLATE_CSV_PATH || "";
  const outputFile = process.env.SHOPIFY_OUTPUT_CSV_PATH || "sync/out/shopify-products-draft-import.csv";
  if (!inputFile) throw new Error("WOO_PRODUCTS_CSV_PATH mancante");
  if (!templateFile) throw new Error("SHOPIFY_TEMPLATE_CSV_PATH mancante");

  const headers = readCsvHeaders(templateFile);
  if (!headers.length) throw new Error("Template CSV vuoto o non valido");

  const sourceRows = readCsvFile(inputFile);
  const selectedSourceRows = limit > 0 ? sourceRows.slice(0, limit) : sourceRows;

  const warnings = [];
  const errors = [];
  const outputRows = [];
  const usedHandles = new Set();
  const seenSku = new Set();

  let processedRows = 0;
  let createdRows = 0;
  let skippedRows = 0;
  let aiEnrichedCount = 0;
  let fallbackCount = 0;

  const normalizedAll = selectedSourceRows.map((row) => normalizeFromWooRaw(row, defaultVendor));

  const parents = [];
  const parentByRef = new Map();
  const variations = [];
  for (const p of normalizedAll) {
    if (!p.sourceType || p.sourceType === "simple") {
      parents.push(p);
      if (p.sku) parentByRef.set(p.sku, p);
      continue;
    }
    if (p.sourceType === "variable") {
      parents.push(p);
      if (p.sku) parentByRef.set(p.sku, p);
      continue;
    }
    if (p.sourceType === "variation") {
      variations.push(p);
      continue;
    }
    warnings.push(createWarning(p.sourceRowNumber, p.sku, p.title, "UNSUPPORTED_TYPE", `Tipo supportato parzialmente: ${p.sourceType}`));
  }

  const variationsByParent = new Map();
  for (const variation of variations) {
    const parentRef = safeString(variation.attributes?.parentReference);
    if (!parentRef) {
      warnings.push(createWarning(variation.sourceRowNumber, variation.sku, variation.title, "ORPHAN_VARIATION", "Variation senza parent"));
      continue;
    }
    if (!variationsByParent.has(parentRef)) variationsByParent.set(parentRef, []);
    variationsByParent.get(parentRef).push(variation);
  }

  const aiInputs = parents.map((p) => buildAiInput(p));
  const aiResults = await processWithConcurrency(aiInputs, aiConcurrency, async (aiInput) => {
    try {
      const enriched = await enrichProductContent(aiInput, {
        mode: aiMode,
        endpoint: process.env.AI_ENRICH_ENDPOINT,
        apiKey: process.env.AI_ENRICH_API_KEY,
        timeoutMs: toNumberEnv(process.env.AI_ENRICH_TIMEOUT_MS, 30000),
      });
      aiEnrichedCount += 1;
      return { enriched, warning: null };
    } catch (error) {
      fallbackCount += 1;
      return { enriched: null, warning: error instanceof Error ? error.message : String(error) };
    }
  });

  for (let i = 0; i < parents.length; i += 1) {
    const parent = parents[i];
    processedRows += 1;
    if (!parent.title) {
      skippedRows += 1;
      warnings.push(createWarning(parent.sourceRowNumber, parent.sku, parent.title, "MISSING_TITLE", "Titolo mancante"));
      continue;
    }

    const aiResult = aiResults[i]?.enriched;
    if (!aiResult || aiResults[i]?.warning) {
      fallbackCount += aiResult ? 0 : 1;
      if (aiResults[i]?.warning) {
        warnings.push(createWarning(parent.sourceRowNumber, parent.sku, parent.title, "AI_FALLBACK", aiResults[i].warning));
      }
    }

    const handle = ensureUniqueHandle(slugifyHandle(parent.handleCandidate || parent.title), usedHandles);
    parent.handle = handle;

    let purchasableVariants = [parent];
    if (parent.sourceType === "variable") {
      const linked = variationsByParent.get(parent.sku || "");
      if (!linked || linked.length === 0) {
        skippedRows += 1;
        warnings.push(
          createWarning(
            parent.sourceRowNumber,
            parent.sku,
            parent.title,
            "VARIABLE_WITHOUT_VARIATIONS",
            "Prodotto variable senza varianti ricostruibili",
          ),
        );
        continue;
      }
      purchasableVariants = linked;
    }

    for (const variant of purchasableVariants) {
      const rowForVariant = {
        ...parent,
        sku: variant.sku || parent.sku,
        barcode: variant.barcode || parent.barcode,
        price: normalizePrice(variant.price || parent.price),
        compareAtPrice: normalizePrice(variant.compareAtPrice || parent.compareAtPrice),
        inventoryQuantity: variant.inventoryQuantity ?? parent.inventoryQuantity ?? 0,
        continueSelling: variant.continueSelling || parent.continueSelling,
        weightGrams: variant.weightGrams || parent.weightGrams,
        requiresShipping: variant.requiresShipping ?? parent.requiresShipping,
        attributes: {
          ...(parent.attributes || {}),
          ...(variant.attributes || {}),
        },
      };

      if (!rowForVariant.price && !allowZeroPrice) {
        skippedRows += 1;
        warnings.push(createWarning(variant.sourceRowNumber, rowForVariant.sku, parent.title, "MISSING_PRICE", "Prezzo mancante"));
        continue;
      }
      if (!rowForVariant.sku && !allowMissingSku) {
        skippedRows += 1;
        warnings.push(createWarning(variant.sourceRowNumber, rowForVariant.sku, parent.title, "MISSING_SKU", "SKU mancante"));
        continue;
      }
      if (rowForVariant.sku && seenSku.has(rowForVariant.sku)) {
        warnings.push(createWarning(variant.sourceRowNumber, rowForVariant.sku, parent.title, "DUPLICATE_SKU", "SKU duplicato"));
      }
      if (rowForVariant.sku) seenSku.add(rowForVariant.sku);

      const baseRow = buildBaseShopifyRow(rowForVariant, aiResult || {});
      validateRow(baseRow, headers, errors, variant.sourceRowNumber, rowForVariant.sku, parent.title);
      outputRows.push(baseRow);
      createdRows += 1;

      const imageRows = buildAdditionalImageRows(
        baseRow,
        parseImages((rowForVariant.images || []).join(",")),
        safeString((aiResult || {}).imageAltText || rowForVariant.title),
      );
      for (const imageRow of imageRows) {
        validateRow(imageRow, headers, errors, variant.sourceRowNumber, rowForVariant.sku, parent.title);
        outputRows.push(imageRow);
        createdRows += 1;
      }
    }
  }

  const warningsFile = outputFile.replace(/\.csv$/i, ".warnings.csv");
  const errorsFile = outputFile.replace(/\.csv$/i, ".errors.csv");
  const reportFile = outputFile.replace(/\.csv$/i, ".report.json");
  const report = {
    inputFile,
    templateFile,
    outputFile,
    processedRows,
    createdRows,
    skippedRows,
    warningCount: warnings.length,
    errorCount: errors.length,
    aiEnrichedCount,
    fallbackCount,
    dryRun,
    startedAt,
    finishedAt: nowIso(),
  };

  if (dryRun) {
    log("info", "Dry-run completato (nessun file scritto)", report);
    return;
  }

  writeCsvFile(outputFile, outputRows, headers);
  writeWarningsCsv(warningsFile, warnings);
  writeErrorsCsv(errorsFile, errors);
  writeReportJson(reportFile, report);
  log("info", "CSV draft Shopify generato", report);
}

function validateRow(row, templateHeaders, errors, rowNumber, sku, title) {
  for (const h of templateHeaders) {
    if (!(h in row)) row[h] = "";
    if (row[h] === undefined || row[h] === null) row[h] = "";
  }
  const isPrimaryProductRow = Boolean(safeString(row.Title) || safeString(row.SKU) || safeString(row.Price));
  if (isPrimaryProductRow) {
    if (safeString(row.Status) !== "draft") {
      errors.push(createError(rowNumber, sku, title, "INVALID_STATUS", "Status deve essere 'draft'"));
    }
    if (safeString(row["Published on online store"]) !== "false") {
      errors.push(
        createError(
          rowNumber,
          sku,
          title,
          "INVALID_PUBLISHED_FLAG",
          "Published on online store deve essere 'false'",
        ),
      );
    }
  }
  if (row["Product image URL"] && !/^https?:\/\//i.test(safeString(row["Product image URL"]))) {
    errors.push(createError(rowNumber, sku, title, "INVALID_IMAGE_URL", "Product image URL non valida"));
  }
}

main().catch((error) => {
  log("error", "Errore pipeline", { message: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
