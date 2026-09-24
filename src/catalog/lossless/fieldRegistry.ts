export const LOSSLESS_FIELD_REGISTRY_VERSION = "wordpress-master-map-v1" as const;

export type FieldEditorType =
  | "boolean"
  | "currency"
  | "image_list"
  | "multiselect"
  | "number"
  | "read_only"
  | "rich_text"
  | "select"
  | "tags"
  | "text"
  | "textarea";

export interface CatalogFieldDefinition {
  key: string;
  label: string;
  group: "identity" | "content" | "commerce" | "inventory" | "shipping" | "taxonomy" | "media" | "relations" | "botanical" | "seo" | "care" | "legacy" | "raw";
  editorType: FieldEditorType;
  dataType: "boolean" | "html" | "list" | "number" | "text" | "url_list" | "unknown";
  aliases: string[];
  aiAllowed: boolean;
  manualOnly: boolean;
  protected: boolean;
  sourceControlled: boolean;
  publishable: boolean;
  shopifyMapping: string | null;
  rawColumn?: string;
  legacyMapping?: string;
}

type SourceFieldSeed = readonly [
  rawColumn: string,
  key: string,
  editorType: FieldEditorType,
  dataType: CatalogFieldDefinition["dataType"],
  shopifyMapping: string | null,
  aiAllowed?: boolean,
  protectedField?: boolean,
  publishable?: boolean,
  legacyMapping?: string,
];

const SOURCE_FIELD_SEEDS: SourceFieldSeed[] = [
  ["ID", "woo_id", "read_only", "number", "wooCommerce.id", false, true, false],
  ["Tipo", "product_type", "read_only", "text", "product.status/type", false, true, true],
  ["SKU", "sku", "read_only", "text", "variant.sku", false, true, true, "sku"],
  ["GTIN, UPC, EAN, o ISBN", "gtin", "text", "text", "variant.barcode", false, true, true, "barcode"],
  ["Nome", "title", "text", "text", "product.title", true, false, true, "title"],
  ["Pubblicato", "published", "boolean", "boolean", "product.status/published", false, true, true],
  ["In primo piano?", "featured", "boolean", "boolean", "metafield.legacy.featured"],
  ["Visibilità nel catalogo", "catalog_visibility", "select", "text", "metafield.legacy.catalog_visibility", false, true],
  ["Breve descrizione", "short_description", "rich_text", "html", "metafield.content.short_description", true, false, true, "short_description"],
  ["Descrizione", "description", "rich_text", "html", "product.descriptionHtml", true, false, true, "description"],
  ["Data di partenza del prezzo in saldo", "sale_start_at", "read_only", "text", "metafield.legacy.sale_start_at", false, true],
  ["Data in cui termina l'offerta", "sale_end_at", "read_only", "text", "metafield.legacy.sale_end_at", false, true],
  ["Stato delle imposte", "tax_status", "select", "text", "variant.taxable", false, true],
  ["Aliquota di imposta", "tax_class", "select", "text", "metafield.legacy.tax_class", false, true],
  ["In stock?", "in_stock", "boolean", "boolean", "inventory.available", false, true],
  ["Magazzino", "manage_stock", "boolean", "boolean", "inventory.tracked", false, true],
  ["Quantità in magazzino bassa", "low_stock_threshold", "number", "number", "metafield.legacy.low_stock_threshold", false, true],
  ["Abilita gli ordini arretrati?", "backorders", "select", "text", "inventory.policy", false, true],
  ["Venduto singolarmente?", "sold_individually", "boolean", "boolean", "metafield.legacy.sold_individually", false, true],
  ["Peso (kg)", "weight_kg", "number", "number", "variant.weight", false, true, true, "weight_grams"],
  ["Lunghezza (cm)", "length_cm", "number", "number", "metafield.shipping.length_cm", false, true],
  ["Larghezza (cm)", "width_cm", "number", "number", "metafield.shipping.width_cm", false, true],
  ["Altezza (cm)", "height_cm", "number", "number", "metafield.shipping.height_cm", false, true],
  ["Permetti le recensioni clienti?", "reviews_allowed", "boolean", "boolean", "metafield.legacy.reviews_allowed"],
  ["Nota di acquisto", "purchase_note", "textarea", "text", "metafield.content.purchase_note", true],
  ["Prezzo in offerta", "sale_price", "currency", "number", "variant.price", false, true, true, "price"],
  ["Prezzo di listino", "regular_price", "currency", "number", "variant.compareAtPrice/price", false, true, true, "compare_at_price"],
  ["Categorie", "source_categories", "read_only", "list", "collections", false, true, true, "product_category"],
  ["Tag", "source_tags", "tags", "list", "product.tags", false, false, true, "tags"],
  ["Classe di spedizione", "shipping_class", "select", "text", "metafield.shipping.class", false, true],
  ["Immagine", "image_urls", "image_list", "url_list", "product.media", false, true, true, "image_urls"],
  ["Limite di download", "download_limit", "number", "number", "metafield.legacy.download_limit", false, true],
  ["Scarica i giorni di scadenza", "download_expiry_days", "number", "number", "metafield.legacy.download_expiry_days", false, true],
  ["Genitore", "parent_sku", "read_only", "text", "product/variant relation", false, true, true, "parent_sku"],
  ["Prodotti raggruppati", "grouped_products", "read_only", "list", "metafield.legacy.grouped_products", false, true],
  ["Up-sell", "upsell_skus", "multiselect", "list", "metafield.merchandising.upsell_skus"],
  ["Cross-sell", "cross_sell_skus", "multiselect", "list", "metafield.merchandising.cross_sell_skus"],
  ["URL esterno", "external_url", "text", "text", "metafield.legacy.external_url", false, true],
  ["Testo del pulsante", "button_text", "text", "text", "metafield.content.button_text", true],
  ["Posizione", "menu_order", "number", "number", "metafield.legacy.menu_order", false, true],
  ["EAN", "ean", "text", "text", "variant.barcode", false, true, true, "barcode"],
  ["Marchi", "brands", "multiselect", "list", "product.vendor/tags", false, false, true, "vendor"],
  ["Nome dell'attributo 1", "attribute_1_name", "read_only", "text", "product.option1.name", false, true],
  ["Valore dell'attributo 1", "attribute_1_value", "read_only", "list", "variant.option1", false, true],
  ["Attributo 1 visibile", "attribute_1_visible", "read_only", "boolean", "metafield.legacy.attribute_1_visible", false, true],
  ["Attributo 1 globale", "attribute_1_global", "read_only", "boolean", "metafield.legacy.attribute_1_global", false, true],
];

const COMMERCE_KEYS = new Set(["sale_price", "regular_price", "tax_status", "tax_class", "published", "catalog_visibility"]);
const INVENTORY_KEYS = new Set(["in_stock", "manage_stock", "low_stock_threshold", "backorders", "sold_individually"]);
const SHIPPING_KEYS = new Set(["weight_kg", "length_cm", "width_cm", "height_cm", "shipping_class"]);
const TAXONOMY_KEYS = new Set(["source_categories", "source_tags", "brands"]);
const RELATION_KEYS = new Set(["parent_sku", "grouped_products", "upsell_skus", "cross_sell_skus", "attribute_1_name", "attribute_1_value", "attribute_1_visible", "attribute_1_global"]);

function sourceGroup(key: string): CatalogFieldDefinition["group"] {
  if (["woo_id", "product_type", "sku", "gtin", "ean"].includes(key)) return "identity";
  if (["title", "short_description", "description", "purchase_note", "button_text"].includes(key)) return "content";
  if (COMMERCE_KEYS.has(key)) return "commerce";
  if (INVENTORY_KEYS.has(key)) return "inventory";
  if (SHIPPING_KEYS.has(key)) return "shipping";
  if (TAXONOMY_KEYS.has(key)) return "taxonomy";
  if (RELATION_KEYS.has(key)) return "relations";
  if (key === "image_urls") return "media";
  return "legacy";
}

const sourceFields: CatalogFieldDefinition[] = SOURCE_FIELD_SEEDS.map((seed) => {
  const [rawColumn, key, editorType, dataType, shopifyMapping, aiAllowed = false, protectedField = false, publishable = false, legacyMapping] = seed;
  return {
    key,
    label: rawColumn,
    group: sourceGroup(key),
    editorType,
    dataType,
    aliases: [rawColumn],
    aiAllowed,
    manualOnly: !aiAllowed,
    protected: protectedField,
    sourceControlled: !aiAllowed,
    publishable,
    shopifyMapping,
    rawColumn,
    legacyMapping,
  };
});

const editorialFields: CatalogFieldDefinition[] = [
  ["optimized_description", "Descrizione ottimizzata", "content", "rich_text", "html", true, false, false, false, true, "product.descriptionHtml", "optimized_description"],
  ["seo_title", "Titolo SEO", "seo", "text", "text", true, false, false, false, true, "product.seo.title", "seo_title"],
  ["seo_description", "Descrizione SEO", "seo", "textarea", "text", true, false, false, false, true, "product.seo.description", "seo_description"],
  ["faq", "FAQ", "content", "rich_text", "html", true, false, false, false, true, "metafield.content.faq", "metafields.faq"],
  ["care_light", "Esposizione", "care", "textarea", "text", true, false, false, false, true, "metafield.care.light", "metafields.exposure"],
  ["care_watering", "Irrigazione", "care", "textarea", "text", true, false, false, false, true, "metafield.care.watering", "metafields.watering"],
  ["care_soil", "Terreno", "care", "textarea", "text", true, false, false, false, true, "metafield.care.soil", "metafields.soil"],
  ["botanica", "Botanica", "botanical", "textarea", "text", true, false, false, false, true, "metafield.custom.botanica", "metafields.botanica"],
  ["promo", "Testo promozionale", "content", "textarea", "text", true, false, false, false, true, "metafield.content.promo", "metafields.promo"],
  ["nome_comune", "Nome comune", "botanical", "text", "text", false, true, true, false, true, "metafield.custom.nome_comune", "metafields.nome_comune"],
  ["ibridatore", "Ibridatore", "botanical", "text", "text", false, true, true, false, true, "metafield.custom.ibridatore", "metafields.ibridatore"],
  ["colore_fiore", "Colore fiore", "botanical", "text", "text", false, true, true, false, true, "metafield.custom.colore_fiore", "metafields.colore_fiore"],
  ["colore_foglia", "Colore foglia", "botanical", "text", "text", false, true, true, false, true, "metafield.custom.colore_foglia", "metafields.colore_foglia"],
  ["curiosita", "Curiosità", "botanical", "textarea", "text", true, true, true, false, true, "metafield.custom.curiosita", "metafields.curiosita"],
].map(([key, label, group, editorType, dataType, aiAllowed, manualOnly, protectedField, sourceControlled, publishable, shopifyMapping, legacyMapping]) => ({
  key: String(key),
  label: String(label),
  group: group as CatalogFieldDefinition["group"],
  editorType: editorType as FieldEditorType,
  dataType: dataType as CatalogFieldDefinition["dataType"],
  aliases: [],
  aiAllowed: Boolean(aiAllowed),
  manualOnly: Boolean(manualOnly),
  protected: Boolean(protectedField),
  sourceControlled: Boolean(sourceControlled),
  publishable: Boolean(publishable),
  shopifyMapping: shopifyMapping ? String(shopifyMapping) : null,
  legacyMapping: legacyMapping ? String(legacyMapping) : undefined,
}));

export const LOSSLESS_FIELD_REGISTRY: readonly CatalogFieldDefinition[] = Object.freeze([
  ...sourceFields,
  ...editorialFields,
]);

const BY_RAW_COLUMN = new Map(sourceFields.map((field) => [field.rawColumn!, field]));
const BY_KEY = new Map(LOSSLESS_FIELD_REGISTRY.map((field) => [field.key, field]));

export function fieldForRawColumn(rawColumn: string): CatalogFieldDefinition {
  return BY_RAW_COLUMN.get(rawColumn) ?? {
    key: `raw_source.${rawColumn}`,
    label: rawColumn,
    group: "raw",
    editorType: "read_only",
    dataType: "unknown",
    aliases: [rawColumn],
    aiAllowed: false,
    manualOnly: true,
    protected: true,
    sourceControlled: true,
    publishable: false,
    shopifyMapping: null,
    rawColumn,
  };
}

export function fieldForKey(key: string): CatalogFieldDefinition | undefined {
  return BY_KEY.get(key);
}

export const WORDPRESS_RAW_COLUMNS = Object.freeze(sourceFields.map((field) => field.rawColumn!));
export const AI_ALLOWED_FIELD_KEYS = Object.freeze(LOSSLESS_FIELD_REGISTRY.filter((field) => field.aiAllowed && !field.manualOnly).map((field) => field.key));
export const PROTECTED_FIELD_KEYS = Object.freeze(LOSSLESS_FIELD_REGISTRY.filter((field) => field.protected).map((field) => field.key));
