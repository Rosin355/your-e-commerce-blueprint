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

  const keyFeaturesJson = JSON.stringify(content.key_benefits ?? []);
  const specialBulletsJson = JSON.stringify(content.characteristics ?? []);
  const faqTitle = (content.faq?.length ?? 0) > 0 ? "Domande frequenti" : "";
  const difficulty = deriveGrownDifficulty(content);

  return {
    // Directly filled from AI output
    care_info: briefCare,
    come_prendersene_cura: fullCare,
    conosci_meglio_la_tua_pianta: (content.characteristics ?? []).join("\n"),
    key_features: keyFeaturesJson,
    special_bullets: specialBulletsJson,
    short_intro: content.short_description ?? "",
    promo_text: content.short_description ?? "",
    titolo_sezione_faq: faqTitle,
    // Derived / inferred
    difficolta_di_coltivazione: difficulty,
    origini_e_habitat: "",
    // From user input (factual — AI cannot reliably invent these)
    nome_botanico: input.nome_botanico ?? "",
    nome_comune: input.nome_comune ?? input.title,
    // Cultivation periods are factual; left empty for manual completion
    periodo_di_fioritura: "",
    periodo_di_messa_a_dimora: "",
    periodo_di_raccolta: "",
    periodo_ottimale_di_potatura: "",
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

// ── CSV export helper ───────────────────────────────────────────────────────

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
