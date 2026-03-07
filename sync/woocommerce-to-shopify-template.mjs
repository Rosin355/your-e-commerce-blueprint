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
  wooCsvPath: process.env.WOO_PRODUCTS_CSV_PATH || "",
  templateCsvPath: process.env.SHOPIFY_TEMPLATE_CSV_PATH || "",
  outputCsvPath: process.env.SHOPIFY_OUTPUT_CSV_PATH || "sync/out/shopify-products-import.csv",
  limit: Number(process.env.WOO_PRODUCTS_LIMIT || 0),
  shopifyShop: process.env.SHOPIFY_ADMIN_SHOP || "",
  shopifyApiVersion: process.env.SHOPIFY_ADMIN_API_VERSION || "2025-07",
  shopifyToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "",
};

const techTags = ["woo-import", "legacy-onlinegarden-products"];

function log(level, message, meta) {
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`;
  if (meta) console.log(line, meta);
  else console.log(line);
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
    if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  row.push(field);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}

function toCsvValue(value) {
  const s = String(value ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(filePath, header, rows) {
  const out = [];
  out.push(header.map(toCsvValue).join(","));
  for (const row of rows) out.push(header.map((h) => toCsvValue(row[h] ?? "")).join(","));
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${out.join("\n")}\n`, "utf8");
}

function loadCsv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const rows = parseCsv(raw);
  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1).map((r) => {
    const out = {};
    for (let i = 0; i < headers.length; i += 1) out[headers[i]] = (r[i] || "").trim();
    return out;
  });
  return { headers, rows: dataRows };
}

function pick(row, names) {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && String(row[name]).trim() !== "") {
      return String(row[name]).trim();
    }
  }
  return "";
}

function toDecimalString(value) {
  if (!value) return "";
  const clean = String(value).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const num = Number(clean);
  if (Number.isNaN(num)) return "";
  return num.toFixed(2);
}

function toInt(value, fallback = 0) {
  if (value === "" || value === null || value === undefined) return fallback;
  const parsed = parseInt(String(value).replace(/[^\d-]/g, ""), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function boolToShopify(value) {
  const s = String(value || "").toLowerCase().trim();
  return ["1", "true", "yes", "si", "sì"].includes(s) ? "TRUE" : "FALSE";
}

function sanitizeHandle(value, fallback) {
  const base = (value || fallback || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `product-${Date.now()}`;
}

function splitImages(value) {
  return String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
}

function mergeTags(...values) {
  const tags = [];
  for (const value of values) {
    const parts = String(value || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    tags.push(...parts);
  }
  tags.push(...techTags);
  return [...new Set(tags)].join(", ");
}

function buildEmptyRow(templateHeaders) {
  const row = {};
  for (const h of templateHeaders) row[h] = "";
  return row;
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
  const data = await res.json();
  if (data.errors?.length) throw new Error(data.errors.map((e) => e.message).join(", "));
  return data.data;
}

const OVERLAY_BY_SKU_QUERY = `
  query OverlayBySku($query: String!) {
    productVariants(first: 1, query: $query) {
      edges {
        node {
          sku
          product {
            id
            handle
            descriptionHtml
            seo { title description }
            media(first: 20) {
              nodes {
                ... on MediaImage {
                  image { altText url }
                }
              }
            }
          }
        }
      }
    }
  }
`;

const OVERLAY_BY_HANDLE_QUERY = `
  query OverlayByHandle($query: String!) {
    products(first: 1, query: $query) {
      edges {
        node {
          id
          handle
          descriptionHtml
          seo { title description }
          media(first: 20) {
            nodes {
              ... on MediaImage {
                image { altText url }
              }
            }
          }
        }
      }
    }
  }
`;

const overlayCache = new Map();

async function fetchShopifyOverlay(sku, handle) {
  const cacheKey = `sku:${sku || ""}|handle:${handle || ""}`;
  if (overlayCache.has(cacheKey)) return overlayCache.get(cacheKey);
  if (!config.shopifyShop || !config.shopifyToken) {
    overlayCache.set(cacheKey, null);
    return null;
  }
  try {
    let product = null;
    if (sku) {
      const data = await shopifyGraphQL(OVERLAY_BY_SKU_QUERY, { query: `sku:${sku}` });
      product = data?.productVariants?.edges?.[0]?.node?.product || null;
    }
    if (!product && handle) {
      const data = await shopifyGraphQL(OVERLAY_BY_HANDLE_QUERY, { query: `handle:${handle}` });
      product = data?.products?.edges?.[0]?.node || null;
    }
    if (!product) {
      overlayCache.set(cacheKey, null);
      return null;
    }
    const imageAltTexts = (product.media?.nodes || [])
      .map((node) => node?.image?.altText || "")
      .filter(Boolean);
    const overlay = {
      description: product.descriptionHtml || "",
      seoTitle: product.seo?.title || "",
      seoDescription: product.seo?.description || "",
      imageAltTexts,
    };
    overlayCache.set(cacheKey, overlay);
    return overlay;
  } catch (error) {
    log("warn", "Overlay AI Shopify non disponibile per prodotto", {
      sku,
      handle,
      error: error instanceof Error ? error.message : String(error),
    });
    overlayCache.set(cacheKey, null);
    return null;
  }
}

function mapStatusAndPublished(wooRow) {
  const published = pick(wooRow, ["Pubblicato", "Published"]);
  if (published === "1") return { publishedOnlineStore: "TRUE", status: "Active" };
  return { publishedOnlineStore: "FALSE", status: "Draft" };
}

function getWooIdentity(wooRow) {
  const title = pick(wooRow, ["Nome", "Name"]);
  const sku = pick(wooRow, ["SKU"]);
  const handle = sanitizeHandle(pick(wooRow, ["Slug", "Permalink"]), title || sku);
  return { title, sku, handle };
}

function getCommonOptionInfo(row, fallbackName = "Title", fallbackValue = "Default Title") {
  const option1Name = pick(row, ["Nome dell'attributo 1", "Attribute 1 name"]) || fallbackName;
  const option1Value = pick(row, ["Valore dell'attributo 1", "Attribute 1 value(s)"]) || fallbackValue;
  const option2Name = pick(row, ["Nome dell'attributo 2", "Attribute 2 name"]);
  const option2Value = pick(row, ["Valore dell'attributo 2", "Attribute 2 value(s)"]);
  const option3Name = pick(row, ["Nome dell'attributo 3", "Attribute 3 name"]);
  const option3Value = pick(row, ["Valore dell'attributo 3", "Attribute 3 value(s)"]);
  return { option1Name, option1Value, option2Name, option2Value, option3Name, option3Value };
}

function fillVariantFields(outRow, sourceRow, fallbackPrice = "") {
  const regularPrice = toDecimalString(pick(sourceRow, ["Prezzo di listino", "Regular price"])) || fallbackPrice;
  const salePrice = toDecimalString(pick(sourceRow, ["Prezzo in offerta", "Sale price"]));
  outRow.Price = salePrice || regularPrice;
  outRow["Compare-at price"] = salePrice && regularPrice ? regularPrice : "";
  outRow["Cost per item"] = "";
  outRow["Charge tax"] = pick(sourceRow, ["Stato delle imposte"]) === "none" ? "FALSE" : "TRUE";
  outRow["Tax code"] = "";
  outRow["Unit price total measure"] = "";
  outRow["Unit price total measure unit"] = "";
  outRow["Unit price base measure"] = "";
  outRow["Unit price base measure unit"] = "";
  outRow["Inventory tracker"] = "shopify";
  outRow["Inventory quantity"] = String(toInt(pick(sourceRow, ["Magazzino", "Stock"]), 0));
  outRow["Continue selling when out of stock"] = boolToShopify(pick(sourceRow, ["Abilita gli ordini arretrati?"]));
  const kg = pick(sourceRow, ["Peso (kg)", "Weight (kg)"]);
  outRow["Weight value (grams)"] = kg ? String(Math.round(Number(kg.replace(",", ".")) * 1000)) : "";
  outRow["Weight unit for display"] = "kg";
  outRow["Requires shipping"] = "TRUE";
  outRow["Fulfillment service"] = "manual";
}

function addIssue(collection, issue) {
  collection.push(issue);
}

async function convertWooToShopifyTemplate() {
  if (!config.wooCsvPath) throw new Error("WOO_PRODUCTS_CSV_PATH mancante");
  if (!config.templateCsvPath) throw new Error("SHOPIFY_TEMPLATE_CSV_PATH mancante");
  if (!fs.existsSync(config.wooCsvPath)) throw new Error(`Woo CSV non trovato: ${config.wooCsvPath}`);
  if (!fs.existsSync(config.templateCsvPath)) throw new Error(`Template CSV non trovato: ${config.templateCsvPath}`);

  const woo = loadCsv(config.wooCsvPath);
  const template = loadCsv(config.templateCsvPath);
  const templateHeaders = template.headers;
  if (!templateHeaders.length) throw new Error("Template Shopify senza header");

  const errors = [];
  const warnings = [];
  const outputRows = [];
  const skuSeen = new Map();

  const byType = { variable: [], variation: [], simple: [], other: [] };
  for (const row of woo.rows) {
    const t = pick(row, ["Tipo", "Type"]).toLowerCase();
    if (t === "variable") byType.variable.push(row);
    else if (t === "variation") byType.variation.push(row);
    else if (t === "simple") byType.simple.push(row);
    else byType.other.push(row);
  }

  const parentBySku = new Map();
  for (const parent of [...byType.variable, ...byType.simple]) {
    const parentSku = pick(parent, ["SKU"]);
    if (parentSku) parentBySku.set(parentSku, parent);
  }

  const variationsByParentSku = new Map();
  for (const variation of byType.variation) {
    const parentSku = pick(variation, ["Genitore", "Parent"]);
    if (!parentSku) {
      addIssue(warnings, { code: "VARIATION_PARENT_MISSING", message: "Variation senza parent SKU", sku: pick(variation, ["SKU"]) });
      continue;
    }
    if (!variationsByParentSku.has(parentSku)) variationsByParentSku.set(parentSku, []);
    variationsByParentSku.get(parentSku).push(variation);
  }

  const allParents = [...byType.variable, ...byType.simple, ...byType.other];
  let processedParents = 0;

  for (const parent of allParents) {
    if (config.limit > 0 && processedParents >= config.limit) break;
    processedParents += 1;

    const tipo = pick(parent, ["Tipo", "Type"]).toLowerCase();
    const { title, sku, handle } = getWooIdentity(parent);
    const { publishedOnlineStore, status } = mapStatusAndPublished(parent);
    const categories = pick(parent, ["Categorie", "Categories"]);
    const tags = pick(parent, ["Tag", "Tags"]);
    const mergedTags = mergeTags(tags, categories);
    const vendor = pick(parent, ["Marchi", "Brand"]) || "Online Garden";
    const productType = tipo || "simple";
    const isGiftCard = tipo.includes("gift_card");
    const baseDescription = pick(parent, ["Descrizione", "Description", "Breve descrizione", "Short description"]);
    const optionInfo = getCommonOptionInfo(parent);
    const parentImages = splitImages(pick(parent, ["Immagine", "Images"]));
    const overlay = await fetchShopifyOverlay(sku, handle);

    const finalDescription = overlay?.description || baseDescription;
    const finalSeoTitle = overlay?.seoTitle || pick(parent, ["Meta: _yoast_wpseo_title"]);
    const finalSeoDescription = overlay?.seoDescription || pick(parent, ["Meta: _yoast_wpseo_metadesc"]);

    const baseRow = buildEmptyRow(templateHeaders);
    baseRow.Title = title;
    baseRow["URL handle"] = handle;
    baseRow.Description = finalDescription;
    baseRow.Vendor = vendor;
    baseRow["Product category"] = "";
    baseRow.Type = productType;
    baseRow.Tags = mergedTags;
    baseRow["Published on online store"] = publishedOnlineStore;
    baseRow.Status = status;
    baseRow["SEO title"] = finalSeoTitle;
    baseRow["SEO description"] = finalSeoDescription;
    baseRow["Gift card"] = isGiftCard ? "TRUE" : "FALSE";
    baseRow["Requires shipping"] = isGiftCard ? "FALSE" : "TRUE";

    const children = tipo === "variable" ? (variationsByParentSku.get(sku) || []) : [];
    const variants = children.length ? children : [parent];

    variants.forEach((variant, variantIndex) => {
      const row = variantIndex === 0 ? { ...baseRow } : buildEmptyRow(templateHeaders);
      row["URL handle"] = handle;
      row.SKU = pick(variant, ["SKU"]) || sku;
      row.Title = variantIndex === 0 ? row.Title : "";
      row.Description = variantIndex === 0 ? row.Description : "";
      row.Vendor = variantIndex === 0 ? row.Vendor : "";
      row.Type = variantIndex === 0 ? row.Type : "";
      row.Tags = variantIndex === 0 ? row.Tags : "";
      row["Published on online store"] = variantIndex === 0 ? row["Published on online store"] : "";
      row.Status = variantIndex === 0 ? row.Status : "";
      row["SEO title"] = variantIndex === 0 ? row["SEO title"] : "";
      row["SEO description"] = variantIndex === 0 ? row["SEO description"] : "";
      row["Gift card"] = variantIndex === 0 ? row["Gift card"] : "";

      const varOptions = getCommonOptionInfo(variant, optionInfo.option1Name || "Title", optionInfo.option1Value || "Default Title");
      row["Option1 name"] = variantIndex === 0 ? (optionInfo.option1Name || varOptions.option1Name) : "";
      row["Option1 value"] = varOptions.option1Value || optionInfo.option1Value || "Default Title";
      row["Option1 Linked To"] = "";
      row["Option2 name"] = variantIndex === 0 ? (optionInfo.option2Name || varOptions.option2Name) : "";
      row["Option2 value"] = varOptions.option2Value || "";
      row["Option2 Linked To"] = "";
      row["Option3 name"] = variantIndex === 0 ? (optionInfo.option3Name || varOptions.option3Name) : "";
      row["Option3 value"] = varOptions.option3Value || "";
      row["Option3 Linked To"] = "";

      fillVariantFields(row, variant, toDecimalString(pick(parent, ["Prezzo di listino", "Regular price"])));
      if (isGiftCard) row["Requires shipping"] = "FALSE";

      const firstImage = splitImages(pick(variant, ["Immagine", "Images"]))[0] || parentImages[0] || "";
      row["Product image URL"] = variantIndex === 0 ? firstImage : "";
      row["Image position"] = variantIndex === 0 && firstImage ? "1" : "";
      row["Image alt text"] = variantIndex === 0 ? (overlay?.imageAltTexts?.[0] || "") : "";
      row["Variant image URL"] = variantIndex > 0 ? firstImage : "";

      if (row.SKU) {
        skuSeen.set(row.SKU, (skuSeen.get(row.SKU) || 0) + 1);
      } else {
        addIssue(warnings, { code: "SKU_MISSING", message: "SKU mancante", handle });
      }

      if (!row.Price) {
        addIssue(warnings, { code: "PRICE_MISSING", message: "Prezzo mancante", sku: row.SKU, handle });
      }

      outputRows.push(row);
    });

    for (let i = 1; i < parentImages.length; i += 1) {
      const imageRow = buildEmptyRow(templateHeaders);
      imageRow["URL handle"] = handle;
      imageRow["Product image URL"] = parentImages[i];
      imageRow["Image position"] = String(i + 1);
      imageRow["Image alt text"] = overlay?.imageAltTexts?.[i] || "";
      outputRows.push(imageRow);
    }
  }

  for (const [sku, count] of skuSeen.entries()) {
    if (count > 1) {
      addIssue(warnings, { code: "SKU_DUPLICATE", message: `SKU duplicato (${count})`, sku });
    }
  }

  const allowedStatus = new Set(["Active", "Draft", "Archived", ""]);
  outputRows.forEach((row, idx) => {
    if (!allowedStatus.has(row.Status)) {
      addIssue(errors, {
        code: "INVALID_STATUS",
        message: `Status non valido: ${row.Status}`,
        row: idx + 2,
        sku: row.SKU,
        handle: row["URL handle"],
      });
    }
    if (row["Product image URL"] && !/^https?:\/\//i.test(row["Product image URL"])) {
      addIssue(errors, {
        code: "INVALID_IMAGE_URL",
        message: `URL immagine non valido: ${row["Product image URL"]}`,
        row: idx + 2,
        sku: row.SKU,
        handle: row["URL handle"],
      });
    }
    if (row.SKU && (!row["URL handle"] || !row["Option1 value"])) {
      addIssue(errors, {
        code: "VARIANT_FIELDS_MISSING",
        message: "Riga variante senza URL handle o Option1 value",
        row: idx + 2,
        sku: row.SKU,
        handle: row["URL handle"],
      });
    }
  });

  if (templateHeaders.length !== 57) {
    addIssue(errors, {
      code: "TEMPLATE_COLUMNS_INVALID",
      message: `Template Shopify atteso 57 colonne, trovate ${templateHeaders.length}`,
    });
  }

  const report = {
    timestamp: new Date().toISOString(),
    dryRun: isDryRun,
    input: {
      wooCsvPath: config.wooCsvPath,
      templateCsvPath: config.templateCsvPath,
      totalWooRows: woo.rows.length,
      processedParents,
    },
    output: {
      outputCsvPath: config.outputCsvPath,
      outputRows: outputRows.length,
    },
    aiOverlay: {
      enabled: Boolean(config.shopifyShop && config.shopifyToken),
      cacheEntries: overlayCache.size,
    },
    warningsCount: warnings.length,
    errorsCount: errors.length,
  };

  if (!isDryRun) {
    writeCsv(config.outputCsvPath, templateHeaders, outputRows);
    const warningsPath = config.outputCsvPath.replace(/\.csv$/i, ".warnings.csv");
    const errorsPath = config.outputCsvPath.replace(/\.csv$/i, ".errors.csv");
    const reportPath = config.outputCsvPath.replace(/\.csv$/i, ".report.json");
    writeCsv(warningsPath, ["code", "message", "row", "sku", "handle"], warnings);
    writeCsv(errorsPath, ["code", "message", "row", "sku", "handle"], errors);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    log("info", "File generati", { output: config.outputCsvPath, warningsPath, errorsPath, reportPath });
  } else {
    log("info", "Dry-run completato (nessun file scritto)", report);
  }

  if (errors.length > 0) {
    log("warn", "Validazione ha trovato errori bloccanti", { errors: errors.length });
  } else {
    log("info", "Validazione bloccante superata", { warnings: warnings.length });
  }
}

convertWooToShopifyTemplate().catch((error) => {
  log("error", "Errore conversione Woo -> Shopify template", {
    message: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
