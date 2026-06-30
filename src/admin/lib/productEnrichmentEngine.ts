import { supabase } from "@/integrations/supabase/client";
import type { ShopifyAdminProduct } from "../types/aiWriter";
import type { GeneratedContent } from "../hooks/useNewProductAI";
import {
  ALL_METAFIELD_KEYS,
  CSV_COLUMN_TO_KEY,
  METAFIELD_LABELS,
  type EnrichedMetafields,
  type EnrichedProductDraft,
  type EssentialProductInput,
  type ProductFieldCompleteness,
  type ProductFieldStatus,
  type ShopifyMetafieldKey,
} from "../types/productEnrichment";

// A value shorter than this is flagged as "weak"
const WEAK_THRESHOLD = 40;

// ── Completeness evaluation ─────────────────────────────────────────────────

type ProductWithMeta = ShopifyAdminProduct & {
  /** Keyed by ShopifyMetafieldKey — present when the proxy returns metafields */
  metafields?: Partial<Record<ShopifyMetafieldKey, string>>;
};

function makeFieldStatus(
  key: string,
  label: string,
  rawValue: unknown,
  category: ProductFieldStatus["category"],
): ProductFieldStatus {
  const value = rawValue != null ? String(rawValue).trim() : "";
  const present = value.length > 0;
  return { key, label, present, is_weak: present && value.length < WEAK_THRESHOLD, value, category };
}

export function evaluateProductCompleteness(product: ProductWithMeta): ProductFieldCompleteness {
  const metafieldsAvailable = Boolean(product.metafields);

  const coreFields: ProductFieldStatus[] = [
    makeFieldStatus("title", "Titolo", product.title, "core"),
    makeFieldStatus("body_html", "Descrizione HTML", product.body_html, "core"),
    makeFieldStatus("tags", "Tag", product.tags, "core"),
  ];

  const seoFields: ProductFieldStatus[] = [
    makeFieldStatus("seo_title", "SEO Title", product.metafields_global_title_tag, "seo"),
    makeFieldStatus("seo_description", "SEO Description", product.metafields_global_description_tag, "seo"),
  ];

  const metafieldStatuses: ProductFieldStatus[] = ALL_METAFIELD_KEYS.map((key) =>
    makeFieldStatus(key, METAFIELD_LABELS[key], product.metafields?.[key] ?? "", "metafield"),
  );

  const all = [...coreFields, ...seoFields, ...metafieldStatuses];
  const presentCount = all.filter((f) => f.present).length;
  const weakCount = all.filter((f) => f.is_weak).length;
  const missing = all.filter((f) => !f.present);

  return {
    handle: product.handle,
    title: product.title,
    total_fields: all.length,
    present_count: presentCount,
    missing_count: missing.length,
    weak_count: weakCount,
    completeness_score: Math.round((presentCount / all.length) * 100),
    fields: all,
    missing_metafield_keys: missing
      .filter((f) => f.category === "metafield")
      .map((f) => f.key as ShopifyMetafieldKey),
    metafields_available: metafieldsAvailable,
  };
}

/**
 * Like evaluateProductCompleteness, but merges the AI-generated draft into the
 * source product before evaluating, so the score reflects how much the draft
 * has filled in. Source values win when present (we don't overwrite real data).
 */
export function evaluateCompletenessWithDraft(
  product: ShopifyAdminProduct,
  draft: EnrichedProductDraft | null,
): ProductFieldCompleteness {
  if (!draft) return evaluateProductCompleteness(product);
  const merged: ProductWithMeta = {
    ...product,
    body_html: product.body_html?.trim() ? product.body_html : draft.body_html,
    metafields_global_title_tag: product.metafields_global_title_tag?.trim()
      ? product.metafields_global_title_tag
      : draft.seo_title,
    metafields_global_description_tag: product.metafields_global_description_tag?.trim()
      ? product.metafields_global_description_tag
      : draft.seo_description,
    metafields: {
      ...(draft.metafields as Partial<Record<ShopifyMetafieldKey, string>>),
      ...((product as ProductWithMeta).metafields ?? {}),
    },
  };
  return evaluateProductCompleteness(merged);
}

// ── Parses a Shopify CSV row (Record<string,string>) into metafield map ─────

export function parseMetafieldsFromCsvRow(
  row: Record<string, string>,
): Partial<Record<ShopifyMetafieldKey, string>> {
  const result: Partial<Record<ShopifyMetafieldKey, string>> = {};
  for (const [csvCol, key] of Object.entries(CSV_COLUMN_TO_KEY)) {
    const val = row[csvCol];
    if (val != null && val.trim().length > 0) result[key] = val.trim();
  }
  return result;
}

// ── AI output → Shopify CSV metafield mapping ───────────────────────────────

export function mapAiOutputToMetafields(
  content: GeneratedContent,
  input: EssentialProductInput,
): EnrichedMetafields {
  // Build the care guide text
  const careLines: string[] = [];
  if (content.care_guide?.light)       careLines.push(`Luce: ${content.care_guide.light}`);
  if (content.care_guide?.watering)    careLines.push(`Irrigazione: ${content.care_guide.watering}`);
  if (content.care_guide?.soil)        careLines.push(`Terreno: ${content.care_guide.soil}`);
  if (content.care_guide?.temperature) careLines.push(`Temperatura: ${content.care_guide.temperature}`);
  if (content.care_guide?.notes)       careLines.push(content.care_guide.notes);

  const fullCare = careLines.join("\n");
  const briefCare = careLines.slice(0, 2).join(" • ");

  const keyFeatures = (content.key_benefits ?? []).filter(Boolean);
  const characteristics = (content.characteristics ?? []).filter(Boolean);

  // attributi_prodotto: oggetti {key,value} per essere parsato dalla PDP.
  // Se l'AI non fornisce `attributes`, deriviamo dalle characteristics tipo "Chiave: valore".
  const aiAttrs = Array.isArray((content as any).attributes) ? (content as any).attributes : [];
  const derivedAttrs = aiAttrs.length > 0
    ? aiAttrs
        .filter((a: any) => a && typeof a === "object" && a.key && a.value)
        .map((a: any) => ({ key: String(a.key).trim(), value: String(a.value).trim() }))
    : characteristics
        .map((c) => {
          const m = c.match(/^([^:]{2,40}):\s*(.+)$/);
          return m ? { key: m[1].trim(), value: m[2].trim() } : null;
        })
        .filter((x): x is { key: string; value: string } => !!x);
  const attributesJson = JSON.stringify(derivedAttrs);

  const faqArr = Array.isArray(content.faq) ? content.faq : [];
  const faqTitle = faqArr.length > 0 ? "Domande frequenti" : "";
  // faq_prodotto: serializzato come JSON array di {question, answer} (atteso da Shopify type=json
  // e dal parser della PDP `parseFaqItems`). Tolleriamo sia {q,a} che {question,answer} dall'AI.
  const faqObjects = faqArr
    .map((f: any) => {
      const q = String(f?.question ?? f?.q ?? "").trim();
      const a = String(f?.answer ?? f?.a ?? "").trim();
      return q && a ? { question: q, answer: a } : null;
    })
    .filter((x): x is { question: string; answer: string } => !!x);
  const faqJson = faqObjects.length > 0 ? JSON.stringify(faqObjects) : "";
  const longDescription = (content.optimized_description ?? "").trim();
  const difficulty = deriveGrownDifficulty(content);

  const ai = content as any;

  return {
    // Liste salvate come testo multilinea (compatibile con parseMultilineMetafield della PDP)
    care_info: briefCare,
    come_prendersene_cura: fullCare,
    conosci_meglio_la_tua_pianta: characteristics.join("\n"),
    key_features: keyFeatures.join("\n"),
    special_bullets: characteristics.join("\n"),
    attributi_prodotto: attributesJson,
    short_intro: content.short_description ?? "",
    promo_text: content.short_description ?? "",
    titolo_sezione_faq: faqTitle,
    faq_prodotto: faqJson,
    long_description: longDescription,
    difficolta_di_coltivazione: difficulty,
    origini_e_habitat: typeof ai.origins_habitat === "string" ? ai.origins_habitat.trim() : "",
    // Nome botanico: input dell'utente vince, altrimenti suggerimento AI
    nome_botanico: (input.nome_botanico && input.nome_botanico.trim())
      ? input.nome_botanico.trim()
      : (typeof ai.botanical_name === "string" ? ai.botanical_name.trim() : ""),
    nome_comune: input.nome_comune ?? input.title,
    // Periodi: compilati da AI (best-effort, il cliente revisiona a mano se sbagliati)
    periodo_di_fioritura: typeof ai.flowering_period === "string" ? ai.flowering_period.trim() : "",
    periodo_di_messa_a_dimora: typeof ai.planting_period === "string" ? ai.planting_period.trim() : "",
    periodo_di_raccolta: typeof ai.harvest_period === "string" ? ai.harvest_period.trim() : "",
    periodo_ottimale_di_potatura: typeof ai.pruning_period === "string" ? ai.pruning_period.trim() : "",
  };
}

function deriveGrownDifficulty(content: GeneratedContent): string {
  // Heuristic: infer from care guide keywords
  const careText = [
    content.care_guide?.watering,
    content.care_guide?.soil,
    content.care_guide?.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/facil|semplic|resistente|robust/i.test(careText)) return "Facile";
  if (/moderata|intermedia|richiede attenzione/i.test(careText)) return "Intermedia";
  if (/espert|attent|cura costante|difficil/i.test(careText)) return "Avanzata";
  return "Intermedia";
}

// ── Main generation call ────────────────────────────────────────────────────

export async function generateEnrichedDraft(
  input: EssentialProductInput,
): Promise<EnrichedProductDraft> {
  const contextDescription = [
    input.nome_botanico && `Nome botanico: ${input.nome_botanico}`,
    input.nome_comune && `Nome comune: ${input.nome_comune}`,
    input.cultivation_notes,
  ]
    .filter(Boolean)
    .join(". ");

  const { data, error } = await supabase.functions.invoke("create-product-ai", {
    body: {
      action: "generate_content",
      data: {
        title: input.title,
        description: contextDescription || input.title,
        category: input.product_category,
        price: parseFloat(input.variant_price ?? "0") || 0,
        tags: (input.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
        seedStyle: input.seed_style,
        generateImage: false,
      },
    },
  });

  if (error) throw new Error(error.message ?? "Errore chiamata AI");
  if (data?.error) throw new Error(data.error);

  const content: GeneratedContent = data.seoData;
  const metafields = mapAiOutputToMetafields(content, input);

  return {
    input_handle: input.handle,
    input_title: input.title,
    body_html: content.optimized_description ?? "",
    seo_title: content.seo_title ?? "",
    seo_description: content.seo_description ?? "",
    metafields,
    seed_style: input.seed_style,
    generated_at: new Date().toISOString(),
  };
}

/** Rebuilds an EnrichedProductDraft from a DB row that stored the full draft in ai_enrichment_json. */
export function rebuildDraftFromDbRow(row: {
  sku: string;
  handle: string | null;
  ai_enrichment_json: Record<string, unknown> | null;
  ai_enriched_at: string | null;
  ai_seed_style: string | null;
  seo_title: string | null;
  seo_description: string | null;
  optimized_description: string | null;
}): EnrichedProductDraft | null {
  const j = row.ai_enrichment_json as Partial<EnrichedProductDraft> | null;
  if (!j || typeof j !== "object") return null;

  // ── Legacy-aware metafield recovery ───────────────────────────────────────
  // ~2679 rows in DB still store the AI output in the LEGACY GeneratedContent
  // shape (h1_title, care_guide, key_benefits, faq, ...) without the new
  // `metafields` map. Rebuild metafields on-the-fly so the publish flow can
  // push them to Shopify without rigenerating AI. Non-destructive: nothing is
  // written back to DB here.
  const rawMf = (j as any).metafields;
  const hasModernMf = rawMf && typeof rawMf === "object" && Object.values(rawMf).some((v) => typeof v === "string" && v.trim().length > 0);
  const looksLegacy = !hasModernMf && (
    typeof (j as any).h1_title === "string" ||
    Array.isArray((j as any).key_benefits) ||
    Array.isArray((j as any).faq) ||
    typeof (j as any).care_guide === "object"
  );
  const metafields: EnrichedProductDraft["metafields"] = looksLegacy
    ? (mapAiOutputToMetafields(j as unknown as GeneratedContent, {
        handle: row.handle ?? "",
        title: (j as any).h1_title || (j as any).input_title || "",
        product_category: "",
        type: "",
        tags: "",
        seed_style: row.ai_seed_style ?? "",
      }) as EnrichedProductDraft["metafields"])
    : ((rawMf as EnrichedProductDraft["metafields"]) || ({} as EnrichedProductDraft["metafields"]));

  return {
    input_handle: (j.input_handle as string) || row.handle || "",
    input_title: (j.input_title as string) || (j as any).h1_title || "",
    body_html: (j.body_html as string) || (j as any).optimized_description || row.optimized_description || "",
    seo_title: (j.seo_title as string) || row.seo_title || "",
    seo_description: (j.seo_description as string) || row.seo_description || "",
    metafields,
    seed_style: (j.seed_style as string) || row.ai_seed_style || "",
    generated_at: (j.generated_at as string) || row.ai_enriched_at || new Date().toISOString(),
  };
}


function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Builds a minimal Shopify-compatible CSV snippet for the generated draft */
export function buildCsvSnippet(draft: EnrichedProductDraft): string {
  const metafieldCols = ALL_METAFIELD_KEYS.map((k) => `product.metafields.custom.${k}`);

  const headers = [
    "Handle",
    "Title",
    "Body (HTML)",
    "SEO Title",
    "SEO Description",
    ...metafieldCols,
  ];

  const values = [
    draft.input_handle,
    draft.input_title,
    draft.body_html,
    draft.seo_title,
    draft.seo_description,
    ...ALL_METAFIELD_KEYS.map((k) => draft.metafields[k] ?? ""),
  ];

  return [
    headers.map(escapeCsvCell).join(","),
    values.map(escapeCsvCell).join(","),
  ].join("\n");
}

export function downloadCsvSnippet(draft: EnrichedProductDraft): void {
  const csv = buildCsvSnippet(draft);
  triggerDownload(csv, `arricchimento-${draft.input_handle || "prodotto"}.csv`);
}

/** Builds a multi-row Shopify-compatible CSV for a batch of drafts */
export function buildBatchCsvSnippet(drafts: EnrichedProductDraft[]): string {
  const metafieldCols = ALL_METAFIELD_KEYS.map((k) => `product.metafields.custom.${k}`);
  const headers = ["Handle", "Title", "Body (HTML)", "SEO Title", "SEO Description", ...metafieldCols];

  const rows = drafts.map((draft) =>
    [
      draft.input_handle,
      draft.input_title,
      draft.body_html,
      draft.seo_title,
      draft.seo_description,
      ...ALL_METAFIELD_KEYS.map((k) => draft.metafields[k] ?? ""),
    ].map(escapeCsvCell).join(","),
  );

  return [headers.map(escapeCsvCell).join(","), ...rows].join("\n");
}

export function downloadBatchCsvSnippet(drafts: EnrichedProductDraft[]): void {
  const csv = buildBatchCsvSnippet(drafts);
  const ts = new Date().toISOString().slice(0, 10);
  triggerDownload(csv, `arricchimento-catalogo-${ts}.csv`);
}

function triggerDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Shopify CSV merge ───────────────────────────────────────────────────────

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else { inQuotes = false; }
      } else { cell += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (ch === "\r") { /* skip */ }
      else cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.length > 0));
}

export interface MergeReport {
  totalRows: number;
  productRows: number;
  matchedHandles: number;
  unmatchedDrafts: string[];
  csv: string;
}

/**
 * Merges enrichment drafts into a full Shopify product export CSV.
 * Preserves all original columns/rows (variants, images, options) and only
 * overwrites enrichment-related columns on the FIRST row of each Handle group.
 * Adds metafield columns if missing from the source export.
 */
export function mergeDraftsIntoShopifyCsv(
  shopifyCsvText: string,
  drafts: EnrichedProductDraft[],
): MergeReport {
  const rows = parseCsv(shopifyCsvText);
  if (rows.length === 0) throw new Error("CSV Shopify vuoto o non valido");

  const headers = rows[0].slice();
  const dataRows = rows.slice(1);

  const handleIdx = headers.findIndex((h) => h.trim().toLowerCase() === "handle");
  if (handleIdx === -1) throw new Error('Il CSV Shopify deve contenere una colonna "Handle"');

  const ensureCol = (name: string): number => {
    let idx = headers.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
    if (idx === -1) { headers.push(name); idx = headers.length - 1; }
    return idx;
  };

  const bodyIdx = ensureCol("Body (HTML)");
  const seoTitleIdx = ensureCol("SEO Title");
  const seoDescIdx = ensureCol("SEO Description");
  const titleIdx = headers.findIndex((h) => h.trim().toLowerCase() === "title");
  const metafieldIdx: Record<string, number> = {};
  for (const key of ALL_METAFIELD_KEYS) {
    metafieldIdx[key] = ensureCol(`product.metafields.custom.${key}`);
  }

  const colCount = headers.length;
  const normRows = dataRows.map((r) => {
    const out = r.slice();
    while (out.length < colCount) out.push("");
    return out;
  });

  const draftMap = new Map<string, EnrichedProductDraft>();
  for (const d of drafts) {
    if (d.input_handle) draftMap.set(d.input_handle.trim().toLowerCase(), d);
  }

  const matchedHandles = new Set<string>();
  const seenHandles = new Set<string>();

  for (const r of normRows) {
    const handle = (r[handleIdx] || "").trim().toLowerCase();
    if (!handle) continue;
    const isFirstRow = !seenHandles.has(handle);
    seenHandles.add(handle);
    if (!isFirstRow) continue;

    const draft = draftMap.get(handle);
    if (!draft) continue;
    matchedHandles.add(handle);

    if (draft.body_html) r[bodyIdx] = draft.body_html;
    if (draft.seo_title) r[seoTitleIdx] = draft.seo_title;
    if (draft.seo_description) r[seoDescIdx] = draft.seo_description;
    if (titleIdx !== -1 && draft.input_title && !r[titleIdx]) r[titleIdx] = draft.input_title;
    for (const key of ALL_METAFIELD_KEYS) {
      const v = draft.metafields[key];
      if (v) r[metafieldIdx[key]] = v;
    }
  }

  const unmatched: string[] = [];
  for (const h of draftMap.keys()) if (!matchedHandles.has(h)) unmatched.push(h);

  const csv = [headers, ...normRows]
    .map((r) => r.map((c) => escapeCsvCell(c ?? "")).join(","))
    .join("\n");

  return {
    totalRows: normRows.length,
    productRows: seenHandles.size,
    matchedHandles: matchedHandles.size,
    unmatchedDrafts: unmatched,
    csv,
  };
}

export function downloadMergedShopifyCsv(report: MergeReport): void {
  const ts = new Date().toISOString().slice(0, 10);
  triggerDownload(report.csv, `shopify-merged-enrichment-${ts}.csv`);
}
