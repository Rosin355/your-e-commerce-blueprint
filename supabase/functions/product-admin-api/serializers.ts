// F5 — Serializzazione risposte e errori. Modulo puro e testabile.
import type {
  ApiErrorCode,
  AppRole,
  CurrentValueRow,
  FieldDefinition,
  SourceSnapshotRow,
} from "./types.ts";
import {
  appliesToEntity,
  calculateFieldCapabilities,
  type CapabilityContext,
  type ProductEntityType,
} from "./capabilities.ts";
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

export type SourceBaselineState = "linked_snapshot" | "unlinked_baseline" | "original_absent";

export interface SourceSerializationContext {
  fallbackSnapshot?: SourceSnapshotRow | null;
  linkedSnapshots?: SourceSnapshotRow[];
}

const READ_ONLY_CAPABILITY_CONTEXT: CapabilityContext = {
  roles: [] as AppRole[],
  writesEnabled: false,
  writeMode: "canary",
};

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function sourceForField(
  def: FieldDefinition,
  row: CurrentValueRow | undefined,
  source: SourceSerializationContext,
): { baselineValue: unknown; sourceState: SourceBaselineState } {
  const linked = row?.source_snapshot_id
    ? source.linkedSnapshots?.find((snapshot) => snapshot.id === row.source_snapshot_id)
    : undefined;

  if (linked && hasOwn(linked.normalized, def.key)) {
    return {
      baselineValue: linked.normalized[def.key],
      sourceState: "linked_snapshot",
    };
  }

  if (linked) return { baselineValue: null, sourceState: "original_absent" };

  // Se un id puntuale è presente ma non risolvibile, non sostituiamo silenziosamente
  // la provenance con lo snapshot più recente del prodotto.
  if (row?.source_snapshot_id) {
    return { baselineValue: null, sourceState: "original_absent" };
  }

  const fallback = source.fallbackSnapshot?.normalized;
  if (fallback && hasOwn(fallback, def.key)) {
    return { baselineValue: fallback[def.key], sourceState: "unlinked_baseline" };
  }

  return { baselineValue: null, sourceState: "original_absent" };
}

export function serializeField(
  def: FieldDefinition,
  row: CurrentValueRow | undefined,
  entityType: ProductEntityType,
  capabilityContext: CapabilityContext = READ_ONLY_CAPABILITY_CONTEXT,
  source: SourceSerializationContext = {},
) {
  const editable = isFieldEditable(def).ok;
  const { baselineValue, sourceState } = sourceForField(def, row, source);
  const capabilities = calculateFieldCapabilities(def, row, entityType, capabilityContext);
  return {
    key: def.key,
    label: def.label,
    group: def.field_group,
    editorType: def.editor_type,
    dataType: def.data_type,
    value: row ? currentValueOf(row) : null,
    baselineValue,
    sourceState,
    sourceSnapshotId: row?.source_snapshot_id ?? null,
    origin: row?.value_origin ?? null,
    reviewStatus: row?.review_status ?? null,
    publishBlocked: row?.publish_blocked ?? false,
    protectedOnReimport: def.protected_on_reimport || row?.protected_on_reimport === true,
    aiAllowed: capabilities.aiAllowed,
    manualOnly: def.manual_only,
    required: def.required,
    appliesTo: def.applies_to,
    validationRules: def.validation_rules ?? {},
    publishable: def.publishable,
    editable,
    locked: row?.is_locked ?? false,
    version: row?.version ?? null,
    helpText: def.help_text,
    sortOrder: def.sort_order,
    capabilities,
  };
}

export function serializeSections(
  defs: FieldDefinition[],
  rows: CurrentValueRow[],
  entityType: ProductEntityType = "simple",
  capabilityContext: CapabilityContext = READ_ONLY_CAPABILITY_CONTEXT,
  source: SourceSerializationContext = {},
) {
  const byKey = new Map(rows.map((r) => [r.field_key, r]));
  return GROUP_ORDER.map(({ key, label }) => ({
    key,
    label,
    fields: defs
      .filter((d) => d.field_group === key && d.visible && appliesToEntity(d.applies_to, entityType))
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((d) => serializeField(d, byKey.get(d.key), entityType, capabilityContext, source)),
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
