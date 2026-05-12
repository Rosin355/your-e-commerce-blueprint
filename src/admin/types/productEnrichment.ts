// ── Shopify CSV metafield key constants ────────────────────────────────────

export type ShopifyMetafieldKey =
  | "care_info"
  | "come_prendersene_cura"
  | "conosci_meglio_la_tua_pianta"
  | "difficolta_di_coltivazione"
  | "key_features"
  | "nome_botanico"
  | "nome_comune"
  | "origini_e_habitat"
  | "periodo_di_fioritura"
  | "periodo_di_messa_a_dimora"
  | "periodo_di_raccolta"
  | "periodo_ottimale_di_potatura"
  | "promo_text"
  | "short_intro"
  | "special_bullets"
  | "titolo_sezione_faq";

export const ALL_METAFIELD_KEYS: ShopifyMetafieldKey[] = [
  "nome_botanico",
  "nome_comune",
  "short_intro",
  "promo_text",
  "key_features",
  "special_bullets",
  "care_info",
  "come_prendersene_cura",
  "conosci_meglio_la_tua_pianta",
  "difficolta_di_coltivazione",
  "origini_e_habitat",
  "periodo_di_fioritura",
  "periodo_di_messa_a_dimora",
  "periodo_di_raccolta",
  "periodo_ottimale_di_potatura",
  "titolo_sezione_faq",
];

export const METAFIELD_LABELS: Record<ShopifyMetafieldKey, string> = {
  care_info: "Cura (breve)",
  come_prendersene_cura: "Come prendersene cura",
  conosci_meglio_la_tua_pianta: "Conosci la pianta",
  difficolta_di_coltivazione: "Difficoltà di coltivazione",
  key_features: "Caratteristiche chiave",
  nome_botanico: "Nome botanico",
  nome_comune: "Nome comune",
  origini_e_habitat: "Origini e habitat",
  periodo_di_fioritura: "Periodo di fioritura",
  periodo_di_messa_a_dimora: "Periodo di messa a dimora",
  periodo_di_raccolta: "Periodo di raccolta",
  periodo_ottimale_di_potatura: "Periodo di potatura",
  promo_text: "Testo promozionale",
  short_intro: "Introduzione breve",
  special_bullets: "Bullet points speciali",
  titolo_sezione_faq: "Titolo sezione FAQ",
};

// Which fields the AI generates vs which require manual input (factual dates/periods)
export const AI_GENERATED_KEYS = new Set<ShopifyMetafieldKey>([
  "care_info",
  "come_prendersene_cura",
  "conosci_meglio_la_tua_pianta",
  "key_features",
  "promo_text",
  "short_intro",
  "special_bullets",
  "titolo_sezione_faq",
  "difficolta_di_coltivazione",
  "origini_e_habitat",
]);

export const MANUAL_KEYS = new Set<ShopifyMetafieldKey>([
  "nome_botanico",
  "nome_comune",
  "periodo_di_fioritura",
  "periodo_di_messa_a_dimora",
  "periodo_di_raccolta",
  "periodo_ottimale_di_potatura",
]);

// Maps Shopify CSV column header → internal metafield key
export const CSV_COLUMN_TO_KEY: Record<string, ShopifyMetafieldKey> = {
  "product.metafields.custom.care_info": "care_info",
  "product.metafields.custom.come_prendersene_cura": "come_prendersene_cura",
  "product.metafields.custom.conosci_meglio_la_tua_pianta": "conosci_meglio_la_tua_pianta",
  "product.metafields.custom.difficolta_di_coltivazione": "difficolta_di_coltivazione",
  "product.metafields.custom.key_features": "key_features",
  "product.metafields.custom.nome_botanico": "nome_botanico",
  "product.metafields.custom.nome_comune": "nome_comune",
  "product.metafields.custom.origini_e_habitat": "origini_e_habitat",
  "product.metafields.custom.periodo_di_fioritura": "periodo_di_fioritura",
  "product.metafields.custom.periodo_di_messa_a_dimora": "periodo_di_messa_a_dimora",
  "product.metafields.custom.periodo_di_raccolta": "periodo_di_raccolta",
  "product.metafields.custom.periodo_ottimale_di_potatura": "periodo_ottimale_di_potatura",
  "product.metafields.custom.promo_text": "promo_text",
  "product.metafields.custom.short_intro": "short_intro",
  "product.metafields.custom.special_bullets": "special_bullets",
  "product.metafields.custom.titolo_sezione_faq": "titolo_sezione_faq",
};

// ── Input / output types ────────────────────────────────────────────────────

/** Minimum data a client must supply to trigger AI generation */
export interface EssentialProductInput {
  handle: string;
  title: string;
  product_category: string;
  type: string;
  variant_sku?: string;
  variant_price?: string;
  image_src?: string;
  nome_botanico?: string;
  nome_comune?: string;
  vendor?: string;
  tags?: string;
  /** Free-text hints the admin can add (cultivation notes, origin, etc.) */
  cultivation_notes?: string;
  seed_style: string;
}

export type EnrichedMetafields = Partial<Record<ShopifyMetafieldKey, string>>;

/** Full AI-generated draft aligned to Shopify CSV schema */
export interface EnrichedProductDraft {
  input_handle: string;
  input_title: string;
  body_html: string;
  seo_title: string;
  seo_description: string;
  metafields: EnrichedMetafields;
  seed_style: string;
  generated_at: string;
}

// ── Completeness analysis ───────────────────────────────────────────────────

export interface ProductFieldStatus {
  key: string;
  label: string;
  present: boolean;
  /** Has a value but it is very short (< 40 chars) */
  is_weak: boolean;
  value: string;
  category: "core" | "seo" | "metafield";
}

export interface ProductFieldCompleteness {
  handle: string;
  title: string;
  total_fields: number;
  present_count: number;
  missing_count: number;
  weak_count: number;
  /** 0-100 */
  completeness_score: number;
  fields: ProductFieldStatus[];
  missing_metafield_keys: ShopifyMetafieldKey[];
  /** Informs the UI that metafields were not fetched from Shopify API */
  metafields_available: boolean;
}

// ── Shopify CSV schema reference ────────────────────────────────────────────

/** Mirrors the columns present in a Shopify product export CSV */
export interface ShopifyProductContentSchema {
  handle: string;
  title: string;
  body_html: string;
  vendor: string;
  product_category: string;
  type: string;
  tags: string;
  seo_title: string;
  seo_description: string;
  image_src: string;
  variant_sku: string;
  variant_price: string;
  status: string;
  metafields: EnrichedMetafields;
}
