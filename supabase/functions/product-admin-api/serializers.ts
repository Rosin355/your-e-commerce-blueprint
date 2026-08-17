// F5 — Serializzazione risposte e errori. Modulo puro e testabile.
import type { ApiErrorCode, CurrentValueRow, FieldDefinition } from "./types.ts";
import { currentValueOf, isFieldEditable } from "./validation.ts";

export const HTTP_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  FIELD_NOT_EDITABLE: 422,
  VALIDATION_ERROR: 422,
  VERSION_CONFLICT: 409,
  IDEMPOTENCY_CONFLICT: 409,
  REVIEW_STATE_INVALID: 409,
  NO_CHANGE: 200,
  WRITES_DISABLED: 503,
  INTERNAL_ERROR: 500,
};

export interface ApiError {
  ok: false;
  error: { code: ApiErrorCode; message: string; details?: Record<string, unknown> };
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>,
): { body: ApiError; status: number } {
  return { body: { ok: false, error: { code, message, ...(details ? { details } : {}) } }, status: HTTP_BY_CODE[code] };
}

/** Etichette gruppi nell'ordine previsto dalla futura UI. */
export const GROUP_ORDER: Array<{ key: string; label: string }> = [
  { key: "main", label: "Informazioni principali" },
  { key: "content", label: "Contenuti" },
  { key: "botanical", label: "Dati botanici" },
  { key: "categories", label: "Categorie" },
  { key: "pricing", label: "Prezzi" },
  { key: "inventory", label: "Inventario e spedizione" },
  { key: "images", label: "Immagini" },
  { key: "seo", label: "SEO" },
  { key: "shopify_state", label: "Stato Shopify" },
  { key: "other_imported", label: "Altri dati importati" },
  { key: "system", label: "Sistema" },
];

export const SHOPIFY_STATUS_LABEL: Record<string, string> = {
  synced: "Sincronizzato",
  pending: "In attesa",
  error: "Errore",
  never: "Mai sincronizzato",
};

export function serializeField(def: FieldDefinition, row: CurrentValueRow | undefined, baseline?: unknown) {
  const editable = isFieldEditable(def).ok;
  return {
    key: def.key,
    label: def.label,
    group: def.field_group,
    editorType: def.editor_type,
    dataType: def.data_type,
    value: row ? currentValueOf(row) : null,
    baselineValue: baseline ?? null,
    origin: row?.value_origin ?? null,
    reviewStatus: row?.review_status ?? null,
    publishBlocked: row?.publish_blocked ?? false,
    protectedOnReimport: row?.protected_on_reimport ?? def.protected_on_reimport,
    aiAllowed: def.ai_allowed,
    manualOnly: def.manual_only,
    publishable: def.publishable,
    editable,
    locked: row?.is_locked ?? false,
    version: row?.version ?? null,
    helpText: def.help_text,
    sortOrder: def.sort_order,
  };
}

export function serializeSections(
  defs: FieldDefinition[],
  rows: CurrentValueRow[],
  baseline: Record<string, unknown> = {},
) {
  const byKey = new Map(rows.map((r) => [r.field_key, r]));
  return GROUP_ORDER.map(({ key, label }) => ({
    key,
    label,
    fields: defs
      .filter((d) => d.field_group === key && d.visible)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((d) => serializeField(d, byKey.get(d.key), baseline[d.key])),
  })).filter((section) => section.fields.length > 0);
}

/** Riepilogo prodotto per la lista: mai l'intero set di current values. */
export function serializeProductSummary(
  product: { id: string; sku: string; entity_type: string; parent_product_id: string | null; updated_at: string },
  values: CurrentValueRow[],
  parentSku: string | null = null,
) {
  const get = (key: string) => values.find((v) => v.field_key === key);
  const images = get("image_urls")?.value_json;
  const reviewPending = values.filter(
    (v) => v.review_status === "review_required" || v.review_status === "legacy_unverified",
  ).length;
  const blocked = values.filter((v) => v.publish_blocked).length;
  const title = get("title")?.value_text ?? null;
  const shopifyStatus = get("shopify_sync_status")?.value_text ?? "never";

  return {
    productId: product.id,
    sku: product.sku,
    title,
    entityType: product.entity_type,
    parentProductId: product.parent_product_id,
    parentSku,
    mainImage: Array.isArray(images) ? (images[0] ?? null) : null,
    categoryEffective: get("category_effective")?.value_text ?? get("product_category_raw")?.value_text ?? null,
    reviewPendingCount: reviewPending,
    blockedCount: blocked,
    contentStatus: title && get("description")?.value_text ? "completo" : "incompleto",
    shopifyStatus: SHOPIFY_STATUS_LABEL[shopifyStatus] ?? SHOPIFY_STATUS_LABEL.never,
    updatedAt: product.updated_at,
    valuesVersionSum: values.reduce((acc, v) => acc + (v.version ?? 1), 0),
  };
}

/** Log tecnico redatto: nessun token, nessuna query, nessun payload sensibile. */
export function redactedLog(action: string, userId: string | null, code: string, extra?: Record<string, unknown>) {
  return JSON.stringify({
    scope: "product-admin-api",
    action,
    actor: userId ? `${userId.slice(0, 8)}…` : null,
    code,
    ...(extra ?? {}),
  });
}
