// Admin V2 — policy pure e condivise tra validazione, sync e test.
// Nessuna dipendenza da Deno, database o Shopify.
import type { FieldDefinition } from "./admin-v2-types.ts";

export const MONTHS = Object.freeze([
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
] as const);

export const DIFFICULTY_OPTIONS = Object.freeze([
  "Facile",
  "Media",
  "Difficile",
] as const);

export const SEASONAL_FIELD_KEYS = Object.freeze([
  "periodo_di_fioritura",
  "periodo_di_messa_a_dimora",
  "periodo_di_raccolta",
  "periodo_ottimale_di_potatura",
] as const);

/**
 * Uniche chiavi non-manual_only per cui il client Admin può creare il primo
 * valore. La policy è server-side e non viene derivata da input del browser.
 */
export const CLIENT_CREATABLE_MISSING_FIELD_KEYS = Object.freeze([
  ...SEASONAL_FIELD_KEYS,
  "difficolta_di_coltivazione",
] as const);

export type Month = (typeof MONTHS)[number];
export type FieldSyncState =
  | "INTERNAL_ONLY"
  | "PENDING_SYNC"
  | "SYNCED"
  | "SYNC_ERROR";

export type ShopifyFieldTarget =
  | { kind: "product"; field: "title" | "descriptionHtml" | "vendor" | "tags" }
  | { kind: "seo"; field: "title" | "description" }
  | {
    kind: "metafield";
    namespace: "custom";
    key: string;
    valueType:
      | "single_line_text_field"
      | "multi_line_text_field"
      | "list.single_line_text_field"
      | "json";
  }
  | { kind: "variant"; field: "price" | "compareAtPrice" | "barcode" };

export class FieldPolicyError extends Error {
  readonly code = "VALIDATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "FieldPolicyError";
  }
}

const MONTH_INDEX = new Map<string, number>(
  MONTHS.map((month, index) => [month, index]),
);
const SEASONAL_KEYS = new Set<string>(SEASONAL_FIELD_KEYS);
const CLIENT_CREATABLE_MISSING_KEYS = new Set<string>(
  CLIENT_CREATABLE_MISSING_FIELD_KEYS,
);

const CORE_ALLOWLIST: Readonly<Record<string, "title" | "descriptionHtml" | "vendor" | "tags">> = {
  title: "title",
  description: "descriptionHtml",
  optimized_description: "descriptionHtml",
  vendor: "vendor",
  tags: "tags",
};

const SEO_ALLOWLIST: Readonly<Record<string, "title" | "description">> = {
  seo_title: "title",
  seo_description: "description",
};

const VARIANT_ALLOWLIST: Readonly<Record<string, "price" | "compareAtPrice" | "barcode">> = {
  price: "price",
  compare_at_price: "compareAtPrice",
  gtin: "barcode",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isSeasonalField(fieldKey: string): boolean {
  return SEASONAL_KEYS.has(fieldKey);
}

export function isClientCreatableMissingFieldKey(fieldKey: string): boolean {
  return CLIENT_CREATABLE_MISSING_KEYS.has(fieldKey);
}

export function normalizeMonths(value: unknown): Month[] {
  if (!Array.isArray(value)) {
    throw new FieldPolicyError("Seleziona uno o più mesi dall’elenco disponibile.");
  }
  if (value.length === 0) {
    throw new FieldPolicyError("Seleziona almeno un mese.");
  }
  const unique = new Set<Month>();
  for (const item of value) {
    if (typeof item !== "string" || !MONTH_INDEX.has(item)) {
      throw new FieldPolicyError(`Mese non valido: ${String(item)}.`);
    }
    unique.add(item as Month);
  }
  return [...unique].sort(
    (left, right) => MONTH_INDEX.get(left)! - MONTH_INDEX.get(right)!,
  );
}

/** Il metafield Shopify scalare usa mesi separati da virgola, in ordine Gennaio→Dicembre. */
export function serializeMonthsForShopify(value: unknown): string {
  return normalizeMonths(value).join(", ");
}

export function deserializeMonthsFromShopify(value: unknown): Month[] {
  if (Array.isArray(value)) return normalizeMonths(value);
  if (typeof value !== "string" || value.trim() === "") return [];

  const serialized = value.trim();
  // Compatibilità di sola lettura con valori verificati prima del passaggio al
  // metafield scalare. Le nuove scritture usano sempre la forma CSV leggibile.
  if (serialized.startsWith("[")) {
    try {
      return normalizeMonths(JSON.parse(serialized));
    } catch (error) {
      if (error instanceof FieldPolicyError) throw error;
      throw new FieldPolicyError(
        "Il valore stagionale Shopify non è in un formato supportato.",
      );
    }
  }

  const months = serialized.split(",").map((month) => month.trim());
  if (months.some((month) => month === "")) {
    throw new FieldPolicyError(
      "Il valore stagionale Shopify non è in un formato supportato.",
    );
  }
  return normalizeMonths(months);
}

export function validateConstrainedFieldValue(
  fieldKey: string,
  value: unknown,
): unknown {
  if (isSeasonalField(fieldKey)) return normalizeMonths(value);
  if (fieldKey === "difficolta_di_coltivazione") {
    if (
      typeof value !== "string" ||
      !DIFFICULTY_OPTIONS.includes(
        value as (typeof DIFFICULTY_OPTIONS)[number],
      )
    ) {
      throw new FieldPolicyError(
        "La difficoltà deve essere Facile, Media o Difficile.",
      );
    }
  }
  return value;
}

function metafieldValueType(def: FieldDefinition): ShopifyFieldTarget & { kind: "metafield" } {
  const mapping = def.shopify_mapping as Record<string, unknown>;
  const key = String(mapping.key ?? "");
  if (isSeasonalField(def.key)) {
    return { kind: "metafield", namespace: "custom", key, valueType: "single_line_text_field" };
  }
  if (def.key === "faq") {
    return { kind: "metafield", namespace: "custom", key, valueType: "json" };
  }
  if (def.data_type === "json" || def.data_type === "array") {
    return { kind: "metafield", namespace: "custom", key, valueType: "json" };
  }
  const multiline = def.editor_type === "textarea" || def.editor_type === "richtext";
  return {
    kind: "metafield",
    namespace: "custom",
    key,
    valueType: multiline ? "multi_line_text_field" : "single_line_text_field",
  };
}

/**
 * Il client invia esclusivamente fieldKey. Il target viene derivato da una
 * definizione caricata dal DB e accettato soltanto da questa allowlist.
 */
export function resolveShopifyTarget(
  def: FieldDefinition,
): ShopifyFieldTarget | null {
  if (!def.publishable || !isRecord(def.shopify_mapping)) return null;
  const mapping = def.shopify_mapping;
  const type = mapping.type;

  if (type === "core") {
    const allowed = CORE_ALLOWLIST[def.key];
    return allowed && mapping.field === allowed
      ? { kind: "product", field: allowed as "title" | "descriptionHtml" | "vendor" | "tags" }
      : null;
  }
  if (type === "seo") {
    const allowed = SEO_ALLOWLIST[def.key];
    return allowed && mapping.field === allowed
      ? { kind: "seo", field: allowed }
      : null;
  }
  if (type === "variant") {
    const allowed = VARIANT_ALLOWLIST[def.key];
    return allowed && mapping.field === allowed
      ? { kind: "variant", field: allowed }
      : null;
  }
  if (type === "metafield") {
    const namespace = mapping.namespace;
    const key = mapping.key;
    if (
      namespace !== "custom" ||
      typeof key !== "string" ||
      !/^[a-z0-9_]{2,64}$/.test(key)
    ) return null;
    // Eccezione documentata: il campo Admin `faq` usa il metafield storico faq_prodotto.
    if (key !== def.key && !(def.key === "faq" && key === "faq_prodotto")) return null;
    return metafieldValueType(def);
  }
  return null;
}

export function serializeValueForShopify(
  def: FieldDefinition,
  value: unknown,
): string | string[] {
  const normalized = validateConstrainedFieldValue(def.key, value);
  const target = resolveShopifyTarget(def);
  if (!target) throw new FieldPolicyError("Mapping Shopify non consentito.");

  if (isSeasonalField(def.key)) return serializeMonthsForShopify(normalized);
  if (target.kind === "metafield") {
    if (target.valueType === "json") return JSON.stringify(normalized);
    if (typeof normalized !== "string") {
      throw new FieldPolicyError("Il metafield richiede un testo.");
    }
    return normalized;
  }
  if (target.kind === "product" && target.field === "tags") {
    if (!Array.isArray(normalized) || normalized.some((item) => typeof item !== "string")) {
      throw new FieldPolicyError("I tag devono essere una lista di testi.");
    }
    return normalized as string[];
  }
  if (typeof normalized === "number") return String(normalized);
  if (typeof normalized !== "string") {
    throw new FieldPolicyError("Valore Shopify non supportato.");
  }
  return normalized;
}

/** Decodifica soltanto formati deterministici per la visualizzazione Admin. */
export function deserializeValueForAdminDisplay(
  def: FieldDefinition,
  value: unknown,
): unknown {
  if (isSeasonalField(def.key)) return deserializeMonthsFromShopify(value);
  const target = resolveShopifyTarget(def);
  if (
    target?.kind === "metafield" &&
    target.valueType === "json" &&
    typeof value === "string"
  ) {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      // Un JSON Shopify opaco resta visibile ma non viene reinterpretato.
      return value;
    }
  }
  return value;
}

export function syncStateFromPublishState(
  publishState: string | null | undefined,
  hasTarget: boolean,
): FieldSyncState {
  if (!hasTarget) return "INTERNAL_ONLY";
  if (publishState === "pending_publish") return "PENDING_SYNC";
  if (publishState === "published") return "SYNCED";
  if (publishState === "failed") return "SYNC_ERROR";
  return "INTERNAL_ONLY";
}

export function sameShopifyValue(
  target: ShopifyFieldTarget,
  actual: unknown,
  expected: unknown,
): boolean {
  if (target.kind === "variant" && target.field !== "barcode") {
    const left = Number(actual);
    const right = Number(expected);
    return Number.isFinite(left) && Number.isFinite(right) && left === right;
  }
  if (isSeasonalFieldKeyTarget(target)) {
    try {
      return JSON.stringify(deserializeMonthsFromShopify(actual)) ===
        JSON.stringify(deserializeMonthsFromShopify(expected));
    } catch {
      return false;
    }
  }
  return JSON.stringify(actual ?? null) === JSON.stringify(expected ?? null);
}

function isSeasonalFieldKeyTarget(target: ShopifyFieldTarget): boolean {
  return target.kind === "metafield" && SEASONAL_KEYS.has(target.key);
}
