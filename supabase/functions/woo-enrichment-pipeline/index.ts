import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash-preview";

// ─── CSV Parser (port from sync/lib/csv-utils.mjs) ───

function stripBom(input: string): string {
  return input.replace(/^\uFEFF/, "");
}

function parseCsvText(csvText: string): string[][] {
  const text = stripBom(csvText);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch !== "\r") { field += ch; }
  }
  row.push(field);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}

function csvToObjects(csvText: string): Record<string, string>[] {
  const rows = parseCsvText(csvText);
  if (rows.length <= 1) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map((csvRow, idx) => {
    const obj: Record<string, string> = { __rowNumber: String(idx + 2) };
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = String(csvRow[i] ?? "");
    }
    return obj;
  });
}

// ─── Helpers (port from sync/lib/product-normalizers.mjs) ───

function safeString(v: unknown): string { return String(v ?? "").trim(); }
function normalizeWhitespace(v: unknown): string { return safeString(v).replace(/\s+/g, " ").trim(); }

function pick(row: Record<string, string>, names: string[]): string {
  for (const n of names) {
    const v = row?.[n];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function splitMultiValueField(v: string): string[] {
  return String(v || "").split(/[|,]/).map(s => s.trim()).filter(Boolean);
}

function parseImages(v: string): string[] {
  return splitMultiValueField(v).filter(u => /^https?:\/\//i.test(u));
}

function toBoolean(v: string, fb = false): boolean {
  const s = String(v || "").toLowerCase().trim();
  if (!s) return fb;
  return ["1", "true", "yes", "si", "sì"].includes(s);
}

function normalizePrice(v: string): string {
  const s = String(v || "").trim();
  if (!s) return "";
  const c = s.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = Number(c);
  return Number.isNaN(n) ? "" : n.toFixed(2);
}

function toInteger(v: unknown, fb = 0): number {
  if (v === undefined || v === null || String(v).trim() === "") return fb;
  const p = parseInt(String(v).replace(/[^\d-]/g, ""), 10);
  return Number.isNaN(p) ? fb : p;
}

function slugifyHandle(v: string): string {
  const s = safeString(v).toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || "product";
}

function kgToGrams(v: string): string {
  const s = safeString(v);
  if (!s) return "";
  const n = Number(s.replace(",", "."));
  return Number.isNaN(n) ? "" : String(Math.round(n * 1000));
}

function pickBestDescription(full: string, short: string): string {
  const f = safeString(full);
  const sh = safeString(short);
  if (f) return f;
  if (sh) return `<p>${sh}</p>`;
  return "";
}

function stripHtml(text: string): string {
  return safeString(text).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function clamp(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trim() + "…";
}

// ─── Normalize WooCommerce Row ───

interface NormalizedProduct {
  sourceRowNumber: number;
  sourceType: string;
  title: string;
  handleCandidate: string;
  handle?: string;
  descriptionHtml: string;
  shortDescription: string;
  sku: string;
  barcode: string;
  vendor: string;
  categories: string[];
  tags: string[];
  images: string[];
  price: string;
  compareAtPrice: string;
  inventoryQuantity: number;
  continueSelling: string;
  weightGrams: string;
  requiresShipping: boolean;
  taxCode: string;
  chargeTax: boolean;
  attributes: Record<string, string>;
}

function normalizeWooRow(raw: Record<string, string>, defaultVendor: string): NormalizedProduct {
  const sourceType = pick(raw, ["Tipo", "Type"]).toLowerCase();
  const title = normalizeWhitespace(pick(raw, ["Nome", "Name", "Title"]));
  const shortDescription = safeString(pick(raw, ["Breve descrizione", "Short description"]));
  const descriptionHtml = pickBestDescription(pick(raw, ["Descrizione", "Description"]), shortDescription);
  const regularPrice = normalizePrice(pick(raw, ["Prezzo di listino", "Regular price"]));
  const salePrice = normalizePrice(pick(raw, ["Prezzo in offerta", "Sale price"]));
  const price = salePrice || regularPrice;
  const compareAtPrice = salePrice && regularPrice ? regularPrice : "";
  const stockStatus = pick(raw, ["In stock?", "In stock"]);
  const backorders = pick(raw, ["Abilita gli ordini arretrati?", "Backorders allowed?"]);
  const continueSelling = toBoolean(backorders, false) ? "continue" : "deny";

  return {
    sourceRowNumber: Number(raw.__rowNumber || 0),
    sourceType,
    title,
    handleCandidate: slugifyHandle(pick(raw, ["Slug", "Permalink", "URL handle", "Nome", "Name"]) || title),
    descriptionHtml,
    shortDescription,
    sku: safeString(pick(raw, ["SKU"])),
    barcode: safeString(pick(raw, ["GTIN, UPC, EAN, o ISBN", "GTIN, UPC, EAN, or ISBN", "EAN"])),
    vendor: safeString(pick(raw, ["Marchi", "Brand", "Vendor"])) || defaultVendor,
    categories: splitMultiValueField(pick(raw, ["Categorie", "Categories"])),
    tags: splitMultiValueField(pick(raw, ["Tag", "Tags"])),
    images: parseImages(pick(raw, ["Immagini", "Immagine", "Images", "Image"])),
    price,
    compareAtPrice,
    inventoryQuantity: toInteger(pick(raw, ["Magazzino", "Stock", "Quantità in magazzino"])),
    continueSelling,
    weightGrams: kgToGrams(pick(raw, ["Peso (kg)", "Weight (kg)"])),
    requiresShipping: !sourceType.includes("virtual") && !sourceType.includes("gift_card"),
    taxCode: "",
    chargeTax: pick(raw, ["Stato delle imposte", "Tax status"]).toLowerCase() !== "none",
    attributes: {
      option1Name: pick(raw, ["Nome dell'attributo 1", "Attribute 1 name"]),
      option1Value: pick(raw, ["Valore dell'attributo 1", "Attribute 1 value(s)"]),
      option2Name: pick(raw, ["Nome dell'attributo 2", "Attribute 2 name"]),
      option2Value: pick(raw, ["Valore dell'attributo 2", "Attribute 2 value(s)"]),
      option3Name: pick(raw, ["Nome dell'attributo 3", "Attribute 3 name"]),
      option3Value: pick(raw, ["Valore dell'attributo 3", "Attribute 3 value(s)"]),
      parentReference: pick(raw, ["Genitore", "Parent"]),
    },
  };
}

// ─── AI Enrichment via Lovable AI ───

interface AiResult {
  title: string;
  descriptionHtml: string;
  seoTitle: string;
  seoDescription: string;
  imageAltText: string;
  tags: string[];
  productType: string;
  googleProductCategory: string;
}

async function enrichWithAI(product: NormalizedProduct): Promise<{ result: AiResult | null; warning: string | null }> {
  if (!LOVABLE_API_KEY) {
    return { result: null, warning: "LOVABLE_API_KEY non configurata" };
  }

  try {
    const prompt = `Sei un content editor per e-commerce di piante in Italia. Analizza questo prodotto e genera contenuti ottimizzati SEO.
Prodotto: "${product.title}"
Categoria: ${product.categories.join(", ") || "n/a"}
Descrizione attuale: ${stripHtml(product.descriptionHtml).slice(0, 500)}
Tags: ${product.tags.join(", ") || "n/a"}
SKU: ${product.sku || "n/a"}

Genera i contenuti in italiano.`;

    const response = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: "Sei un copywriter SEO italiano per e-commerce piante. Rispondi usando la funzione fornita." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "enrich_product",
            description: "Return enriched product content for Shopify",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Titolo ottimizzato" },
                descriptionHtml: { type: "string", description: "Descrizione HTML ricca (300-600 parole)" },
                seoTitle: { type: "string", description: "Meta title SEO (max 60 chars)" },
                seoDescription: { type: "string", description: "Meta description SEO (max 155 chars)" },
                imageAltText: { type: "string", description: "Alt text per immagine principale" },
                tags: { type: "array", items: { type: "string" }, description: "Tag suggeriti" },
                productType: { type: "string", description: "Tipo prodotto Shopify" },
                googleProductCategory: { type: "string", description: "Google Product Category" },
              },
              required: ["title", "descriptionHtml", "seoTitle", "seoDescription", "imageAltText", "tags", "productType"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "enrich_product" } },
      }),
    });

    if (response.status === 429) {
      return { result: null, warning: "Rate limit AI raggiunto" };
    }
    if (response.status === 402) {
      return { result: null, warning: "Crediti AI esauriti" };
    }
    if (!response.ok) {
      const t = await response.text();
      return { result: null, warning: `AI error ${response.status}: ${t.slice(0, 200)}` };
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return { result: null, warning: "AI response senza tool call" };
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return {
      result: {
        title: safeString(parsed.title || product.title),
        descriptionHtml: safeString(parsed.descriptionHtml || product.descriptionHtml),
        seoTitle: clamp(safeString(parsed.seoTitle || product.title), 60),
        seoDescription: clamp(safeString(parsed.seoDescription || ""), 155),
        imageAltText: safeString(parsed.imageAltText || product.title),
        tags: Array.isArray(parsed.tags) ? parsed.tags.map(safeString).filter(Boolean) : [],
        productType: safeString(parsed.productType || ""),
        googleProductCategory: safeString(parsed.googleProductCategory || ""),
      },
      warning: null,
    };
  } catch (e) {
    return { result: null, warning: e instanceof Error ? e.message : String(e) };
  }
}

function mockEnrichment(product: NormalizedProduct): AiResult {
  const base = stripHtml(product.shortDescription || product.descriptionHtml || product.title);
  return {
    title: product.title,
    descriptionHtml: product.descriptionHtml || `<p>${base || product.title}</p>`,
    seoTitle: clamp(product.title, 60),
    seoDescription: clamp(base, 155),
    imageAltText: product.title,
    tags: ["ai-enriched"],
    productType: product.categories[0] || "",
    googleProductCategory: "",
  };
}

// ─── Shopify CSV Builder ───

const SHOPIFY_HEADERS = [
  "Title", "URL handle", "Description", "Vendor", "Product category", "Type", "Tags",
  "Published on online store", "Status", "SKU", "Barcode",
  "Option1 name", "Option1 value", "Option1 Linked To",
  "Option2 name", "Option2 value", "Option2 Linked To",
  "Option3 name", "Option3 value", "Option3 Linked To",
  "Price", "Compare-at price", "Cost per item",
  "Charge tax", "Tax code",
  "Unit price total measure", "Unit price total measure unit",
  "Unit price base measure", "Unit price base measure unit",
  "Inventory tracker", "Inventory quantity", "Continue selling when out of stock",
  "Weight value (grams)", "Weight unit for display",
  "Requires shipping", "Fulfillment service",
  "Product image URL", "Image position", "Image alt text", "Variant image URL",
  "Gift card", "SEO title", "SEO description",
  "Color (product.metafields.shopify.color-pattern)",
  "Google Shopping / Google product category",
  "Google Shopping / Gender", "Google Shopping / Age group",
  "Google Shopping / Manufacturer part number (MPN)",
  "Google Shopping / Ad group name", "Google Shopping / Ads labels",
  "Google Shopping / Condition", "Google Shopping / Custom product",
  "Google Shopping / Custom label 0", "Google Shopping / Custom label 1",
  "Google Shopping / Custom label 2", "Google Shopping / Custom label 3",
  "Google Shopping / Custom label 4",
];

function mergeTags(tags: string[], categories: string[], aiTags: string[]): string {
  const out = new Set<string>();
  for (const v of [...tags, ...categories, ...aiTags]) {
    const c = normalizeWhitespace(v);
    if (c) out.add(c);
  }
  out.add("woo-import");
  return [...out].join(", ");
}

function buildShopifyRow(product: NormalizedProduct, ai: AiResult | null): Record<string, string> {
  const description = pickBestDescription(ai?.descriptionHtml || product.descriptionHtml, product.shortDescription);
  return {
    Title: safeString(ai?.title || product.title),
    "URL handle": safeString(product.handle || product.handleCandidate),
    Description: description,
    Vendor: safeString(product.vendor),
    "Product category": "",
    Type: safeString(ai?.productType || product.categories[0] || ""),
    Tags: mergeTags(product.tags, product.categories, ai?.tags || []),
    "Published on online store": "false",
    Status: "draft",
    SKU: safeString(product.sku),
    Barcode: safeString(product.barcode),
    "Option1 name": safeString(product.attributes.option1Name || "Title"),
    "Option1 value": safeString(product.attributes.option1Value || "Default Title"),
    "Option1 Linked To": "",
    "Option2 name": safeString(product.attributes.option2Name),
    "Option2 value": safeString(product.attributes.option2Value),
    "Option2 Linked To": "",
    "Option3 name": safeString(product.attributes.option3Name),
    "Option3 value": safeString(product.attributes.option3Value),
    "Option3 Linked To": "",
    Price: product.price,
    "Compare-at price": product.compareAtPrice,
    "Cost per item": "",
    "Charge tax": product.chargeTax ? "true" : "false",
    "Tax code": "",
    "Unit price total measure": "",
    "Unit price total measure unit": "",
    "Unit price base measure": "",
    "Unit price base measure unit": "",
    "Inventory tracker": "shopify",
    "Inventory quantity": String(product.inventoryQuantity),
    "Continue selling when out of stock": product.continueSelling,
    "Weight value (grams)": product.weightGrams,
    "Weight unit for display": product.weightGrams ? "g" : "",
    "Requires shipping": product.requiresShipping ? "true" : "false",
    "Fulfillment service": "manual",
    "Product image URL": product.images[0] || "",
    "Image position": product.images.length ? "1" : "",
    "Image alt text": safeString(ai?.imageAltText || product.title),
    "Variant image URL": "",
    "Gift card": product.sourceType.includes("gift_card") ? "true" : "false",
    "SEO title": safeString(ai?.seoTitle || product.title),
    "SEO description": safeString(ai?.seoDescription || ""),
    "Color (product.metafields.shopify.color-pattern)": "",
    "Google Shopping / Google product category": safeString(ai?.googleProductCategory || ""),
    "Google Shopping / Gender": "",
    "Google Shopping / Age group": "",
    "Google Shopping / Manufacturer part number (MPN)": "",
    "Google Shopping / Ad group name": "",
    "Google Shopping / Ads labels": "",
    "Google Shopping / Condition": "",
    "Google Shopping / Custom product": "",
    "Google Shopping / Custom label 0": "",
    "Google Shopping / Custom label 1": "",
    "Google Shopping / Custom label 2": "",
    "Google Shopping / Custom label 3": "",
    "Google Shopping / Custom label 4": "",
  };
}

function buildAdditionalImageRows(baseRow: Record<string, string>, images: string[], altText: string): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < images.length; i++) {
    const emptyRow: Record<string, string> = {};
    for (const k of SHOPIFY_HEADERS) emptyRow[k] = "";
    emptyRow["URL handle"] = baseRow["URL handle"];
    emptyRow["Product image URL"] = images[i];
    emptyRow["Image position"] = String(i + 1);
    emptyRow["Image alt text"] = altText;
    rows.push(emptyRow);
  }
  return rows;
}

function toCsvCell(v: string): string {
  if (v.includes('"') || v.includes(",") || v.includes("\n")) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function rowsToCsvString(rows: Record<string, string>[]): string {
  const lines: string[] = [SHOPIFY_HEADERS.map(toCsvCell).join(",")];
  for (const row of rows) {
    lines.push(SHOPIFY_HEADERS.map(h => toCsvCell(row[h] ?? "")).join(","));
  }
  return lines.join("\n") + "\n";
}

// ─── Validation ───

interface PipelineWarning { rowNumber: number; sku: string; title: string; code: string; message: string; }
type PipelineError = PipelineWarning;

function validateRow(row: Record<string, string>, errors: PipelineError[], rowNumber: number, sku: string, title: string) {
  for (const h of SHOPIFY_HEADERS) {
    if (row[h] === undefined || row[h] === null) row[h] = "";
  }
  const isPrimary = Boolean(row.Title || row.SKU || row.Price);
  if (isPrimary) {
    if (row.Status !== "draft") errors.push({ rowNumber, sku, title, code: "INVALID_STATUS", message: "Status deve essere 'draft'" });
    if (row["Published on online store"] !== "false") errors.push({ rowNumber, sku, title, code: "INVALID_PUBLISHED_FLAG", message: "Published deve essere 'false'" });
  }
  if (row["Product image URL"] && !/^https?:\/\//i.test(row["Product image URL"])) {
    errors.push({ rowNumber, sku, title, code: "INVALID_IMAGE_URL", message: "Product image URL non valida" });
  }
}

// ─── Main Pipeline ───

async function runPipeline(csvText: string, options: { dryRun: boolean; limit?: number; defaultVendor?: string; useAi?: boolean }) {
  const startedAt = new Date().toISOString();
  const defaultVendor = options.defaultVendor || "Online Garden";
  const useAi = options.useAi !== false;
  const rows = csvToObjects(csvText);
  if (!rows.length) throw new Error("CSV vuoto o non valido");

  const selected = options.limit && options.limit > 0 ? rows.slice(0, options.limit) : rows;
  const normalized = selected.map(r => normalizeWooRow(r, defaultVendor));

  // Separate parents and variations
  const parents: NormalizedProduct[] = [];
  const variations: NormalizedProduct[] = [];
  const warnings: PipelineWarning[] = [];
  const errors: PipelineError[] = [];

  for (const p of normalized) {
    if (!p.sourceType || p.sourceType === "simple" || p.sourceType === "variable") {
      parents.push(p);
    } else if (p.sourceType === "variation") {
      variations.push(p);
    } else {
      warnings.push({ rowNumber: p.sourceRowNumber, sku: p.sku, title: p.title, code: "UNSUPPORTED_TYPE", message: `Tipo: ${p.sourceType}` });
    }
  }

  // Group variations by parent
  const variationsByParent = new Map<string, NormalizedProduct[]>();
  for (const v of variations) {
    const ref = v.attributes.parentReference;
    if (!ref) { warnings.push({ rowNumber: v.sourceRowNumber, sku: v.sku, title: v.title, code: "ORPHAN_VARIATION", message: "Senza parent" }); continue; }
    if (!variationsByParent.has(ref)) variationsByParent.set(ref, []);
    variationsByParent.get(ref)!.push(v);
  }

  // AI enrichment with concurrency limit
  let aiEnrichedCount = 0;
  let fallbackCount = 0;
  const aiResults: (AiResult | null)[] = [];

  for (const parent of parents) {
    if (useAi) {
      const { result, warning } = await enrichWithAI(parent);
      if (result) {
        aiResults.push(result);
        aiEnrichedCount++;
      } else {
        aiResults.push(mockEnrichment(parent));
        fallbackCount++;
        if (warning) warnings.push({ rowNumber: parent.sourceRowNumber, sku: parent.sku, title: parent.title, code: "AI_FALLBACK", message: warning });
      }
    } else {
      aiResults.push(mockEnrichment(parent));
    }
  }

  // Build output rows
  const outputRows: Record<string, string>[] = [];
  const usedHandles = new Set<string>();
  let processedRows = 0;
  let createdRows = 0;
  let skippedRows = 0;

  function ensureUniqueHandle(base: string): string {
    if (!usedHandles.has(base)) { usedHandles.add(base); return base; }
    let idx = 2;
    while (usedHandles.has(`${base}-${idx}`)) idx++;
    const h = `${base}-${idx}`;
    usedHandles.add(h);
    return h;
  }

  for (let i = 0; i < parents.length; i++) {
    const parent = parents[i];
    processedRows++;
    if (!parent.title) {
      skippedRows++;
      warnings.push({ rowNumber: parent.sourceRowNumber, sku: parent.sku, title: parent.title, code: "MISSING_TITLE", message: "Titolo mancante" });
      continue;
    }

    const ai = aiResults[i];
    parent.handle = ensureUniqueHandle(slugifyHandle(parent.handleCandidate || parent.title));

    let purchasableVariants = [parent];
    if (parent.sourceType === "variable") {
      const linked = variationsByParent.get(parent.sku);
      if (!linked || linked.length === 0) {
        skippedRows++;
        warnings.push({ rowNumber: parent.sourceRowNumber, sku: parent.sku, title: parent.title, code: "NO_VARIATIONS", message: "Variable senza varianti" });
        continue;
      }
      purchasableVariants = linked;
    }

    for (const variant of purchasableVariants) {
      const merged: NormalizedProduct = {
        ...parent,
        sku: variant.sku || parent.sku,
        barcode: variant.barcode || parent.barcode,
        price: normalizePrice(variant.price || parent.price),
        compareAtPrice: normalizePrice(variant.compareAtPrice || parent.compareAtPrice),
        inventoryQuantity: variant.inventoryQuantity ?? parent.inventoryQuantity,
        continueSelling: variant.continueSelling || parent.continueSelling,
        weightGrams: variant.weightGrams || parent.weightGrams,
        requiresShipping: variant.requiresShipping ?? parent.requiresShipping,
        attributes: { ...parent.attributes, ...variant.attributes },
      };

      if (!merged.price) {
        skippedRows++;
        warnings.push({ rowNumber: variant.sourceRowNumber, sku: merged.sku, title: parent.title, code: "MISSING_PRICE", message: "Prezzo mancante" });
        continue;
      }

      const shopifyRow = buildShopifyRow(merged, ai);
      validateRow(shopifyRow, errors, variant.sourceRowNumber, merged.sku, parent.title);
      outputRows.push(shopifyRow);
      createdRows++;

      const imageRows = buildAdditionalImageRows(shopifyRow, merged.images, safeString(ai?.imageAltText || merged.title));
      for (const ir of imageRows) {
        validateRow(ir, errors, variant.sourceRowNumber, merged.sku, parent.title);
        outputRows.push(ir);
        createdRows++;
      }
    }
  }

  const report = {
    processedRows,
    createdRows,
    skippedRows,
    warningCount: warnings.length,
    errorCount: errors.length,
    aiEnrichedCount,
    fallbackCount,
    dryRun: options.dryRun,
    startedAt,
    finishedAt: new Date().toISOString(),
    totalSourceRows: rows.length,
  };

  return { report, outputRows, warnings, errors };
}

// ─── Serve ───

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let csvText: string;
    let dryRun = false;
    let limit: number | undefined;
    let defaultVendor = "Online Garden";
    let useAi = true;
    let originalFileName = "upload.csv";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      if (!file || !(file instanceof File)) {
        return new Response(JSON.stringify({ success: false, error: "File CSV mancante" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Validate MIME type
      if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
        return new Response(JSON.stringify({ success: false, error: "Solo file CSV accettati" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Size limit: 10MB
      if (file.size > 10 * 1024 * 1024) {
        return new Response(JSON.stringify({ success: false, error: "File troppo grande (max 10MB)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      csvText = await file.text();
      // Sanitize filename
      originalFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
      dryRun = formData.get("dryRun") === "true";
      limit = formData.get("limit") ? Number(formData.get("limit")) : undefined;
      if (formData.get("defaultVendor")) defaultVendor = String(formData.get("defaultVendor"));
      useAi = formData.get("useAi") !== "false";
    } else {
      const body = await req.json();
      csvText = body.csvText;
      dryRun = body.dryRun === true;
      limit = body.limit;
      defaultVendor = body.defaultVendor || "Online Garden";
      useAi = body.useAi !== false;
      if (body.fileName) originalFileName = body.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
    }

    if (!csvText) {
      return new Response(JSON.stringify({ success: false, error: "CSV vuoto" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Pipeline] Start: file=${originalFileName}, dryRun=${dryRun}, useAi=${useAi}`);
    const startTime = Date.now();

    const { report, outputRows, warnings, errors } = await runPipeline(csvText, { dryRun, limit, defaultVendor, useAi });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Pipeline] Done in ${elapsed}s: created=${report.createdRows}, skipped=${report.skippedRows}, warnings=${report.warningCount}, errors=${report.errorCount}, ai=${report.aiEnrichedCount}, fallback=${report.fallbackCount}`);

    if (dryRun) {
      return new Response(JSON.stringify({
        success: true,
        report,
        warnings: warnings.slice(0, 100),
        errors: errors.slice(0, 100),
        sampleRows: outputRows.slice(0, 5),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload results to storage
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const baseName = originalFileName.replace(/\.csv$/i, "");
    const prefix = `pipeline/${timestamp}_${baseName}`;

    const shopifyCsv = rowsToCsvString(outputRows);
    const warningsCsvHeader = "rowNumber,sku,title,code,message\n";
    const warningsCsvBody = warnings.map(w => `${w.rowNumber},"${w.sku}","${w.title}","${w.code}","${w.message}"`).join("\n");
    const errorsCsvHeader = "rowNumber,sku,title,code,message\n";
    const errorsCsvBody = errors.map(e => `${e.rowNumber},"${e.sku}","${e.title}","${e.code}","${e.message}"`).join("\n");

    const uploads = await Promise.all([
      supabase.storage.from("csv-pipeline").upload(`${prefix}/shopify-draft.csv`, new Blob([shopifyCsv], { type: "text/csv" }), { contentType: "text/csv" }),
      supabase.storage.from("csv-pipeline").upload(`${prefix}/warnings.csv`, new Blob([warningsCsvHeader + warningsCsvBody], { type: "text/csv" }), { contentType: "text/csv" }),
      supabase.storage.from("csv-pipeline").upload(`${prefix}/errors.csv`, new Blob([errorsCsvHeader + errorsCsvBody], { type: "text/csv" }), { contentType: "text/csv" }),
      supabase.storage.from("csv-pipeline").upload(`${prefix}/report.json`, new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }), { contentType: "application/json" }),
    ]);

    const uploadErrors = uploads.filter(u => u.error);
    if (uploadErrors.length) {
      console.error("Upload errors:", uploadErrors.map(u => u.error?.message));
    }

    // Generate signed URLs (valid 1 hour)
    const [draftUrl, warningsUrl, errorsUrl, reportUrl] = await Promise.all([
      supabase.storage.from("csv-pipeline").createSignedUrl(`${prefix}/shopify-draft.csv`, 3600),
      supabase.storage.from("csv-pipeline").createSignedUrl(`${prefix}/warnings.csv`, 3600),
      supabase.storage.from("csv-pipeline").createSignedUrl(`${prefix}/errors.csv`, 3600),
      supabase.storage.from("csv-pipeline").createSignedUrl(`${prefix}/report.json`, 3600),
    ]);

    return new Response(JSON.stringify({
      success: true,
      report,
      files: {
        shopifyCsv: draftUrl.data?.signedUrl || null,
        warnings: warningsUrl.data?.signedUrl || null,
        errors: errorsUrl.data?.signedUrl || null,
        report: reportUrl.data?.signedUrl || null,
      },
      warnings: warnings.slice(0, 50),
      errors: errors.slice(0, 50),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[Pipeline] Error:", error);
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
