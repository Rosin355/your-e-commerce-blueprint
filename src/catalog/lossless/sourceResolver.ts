import { fieldForKey, fieldForRawColumn, LOSSLESS_FIELD_REGISTRY } from "./fieldRegistry.ts";
import type {
  CatalogEntityType,
  FieldCandidate,
  IdentityDecision,
  LegacyFieldComparison,
  LosslessProductResolution,
  ResolvedField,
  SourceSnapshot,
} from "./types.ts";

export const MASTER_SOURCE_FILE = "wc-product-export-27-7-2026-1785163658156.csv";

export function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
}

export function normalizeEntityType(sourceType: unknown): CatalogEntityType {
  const value = String(sourceType ?? "").trim().toLowerCase();
  if (value === "variable" || value === "parent") return "parent";
  if (value === "variation") return "variation";
  if (value === "simple") return "simple";
  return "unknown";
}

export function decideIdentity(rawRow: Record<string, string>): IdentityDecision {
  const sku = String(rawRow.SKU ?? "").trim() || null;
  const entityType = normalizeEntityType(rawRow.Tipo);
  const parentReference = String(rawRow.Genitore ?? "").trim() || null;
  const warnings: string[] = [];

  if (!sku) {
    warnings.push("MISSING_SKU: snapshot conservato senza creare un'entità canonica risolta");
    return {
      sku: null,
      entityType,
      parentReference,
      identityStatus: "identity_review_required",
      createCanonicalEntity: false,
      warnings,
    };
  }

  if (entityType === "variation" && !parentReference) {
    warnings.push("VARIATION_WITHOUT_PARENT: relazione parent da revisionare");
  }

  return {
    sku,
    entityType,
    parentReference,
    identityStatus: "resolved",
    createCanonicalEntity: true,
    warnings,
  };
}

function toCandidate(snapshot: SourceSnapshot, rawColumn: string): FieldCandidate {
  return {
    sourceFile: snapshot.sourceFile,
    sourceRowNumber: snapshot.sourceRowNumber,
    rawColumn,
    value: String(snapshot.rawRow[rawColumn] ?? ""),
    sourceRole: snapshot.sourceFile === MASTER_SOURCE_FILE ? "master" : "vertical",
  };
}

function distinctNonEmptyValues(candidates: FieldCandidate[]): string[] {
  const values: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (!hasValue(candidate.value)) continue;
    const comparisonValue = candidate.value.trim();
    if (!seen.has(comparisonValue)) {
      values.push(candidate.value);
      seen.add(comparisonValue);
    }
  }
  return values;
}

export function resolveField(rawColumn: string, snapshots: SourceSnapshot[]): ResolvedField {
  const candidates = snapshots.map((snapshot) => toCandidate(snapshot, rawColumn));
  const masterCandidates = candidates.filter((candidate) => candidate.sourceRole === "master" && hasValue(candidate.value));
  const verticalCandidates = candidates.filter((candidate) => candidate.sourceRole === "vertical" && hasValue(candidate.value));
  const masterValues = distinctNonEmptyValues(masterCandidates);
  const verticalValues = distinctNonEmptyValues(verticalCandidates);
  const allValues = distinctNonEmptyValues([...masterCandidates, ...verticalCandidates]);
  const field = fieldForRawColumn(rawColumn);

  let resolution: ResolvedField["resolution"];
  let selected: FieldCandidate | undefined;

  if (allValues.length === 0) {
    resolution = "EMPTY";
  } else if (masterValues.length > 1 || allValues.length > 1) {
    resolution = "SOURCE_CONFLICT";
  } else if (masterValues.length === 1 && verticalValues.length > 0) {
    resolution = "SAME";
    selected = masterCandidates[0];
  } else if (masterValues.length === 1) {
    resolution = "MASTER";
    selected = masterCandidates[0];
  } else {
    resolution = "VERTICAL_FILL";
    selected = verticalCandidates[0];
  }

  return {
    key: field.key,
    rawColumn,
    resolution,
    value: resolution === "SOURCE_CONFLICT" || resolution === "EMPTY" ? null : selected?.value ?? null,
    candidates,
    sourceFile: selected?.sourceFile ?? null,
    sourceRow: selected?.sourceRowNumber ?? null,
  };
}

export function resolveProduct(sku: string, snapshots: SourceSnapshot[]): LosslessProductResolution {
  const matching = snapshots.filter((snapshot) => snapshot.sourceSku === sku);
  if (matching.length === 0) throw new Error(`SKU ${sku} non trovato negli snapshot sorgente`);

  const sameFileDuplicates = [...new Set(matching.map((snapshot) => snapshot.sourceFile))]
    .filter((file) => matching.filter((snapshot) => snapshot.sourceFile === file).length > 1);
  const identity = decideIdentity(matching[0].rawRow);
  const rawColumns = [...new Set(matching.flatMap((snapshot) => Object.keys(snapshot.rawRow)))];
  const resolvedFields: Record<string, ResolvedField> = {};

  for (const rawColumn of rawColumns) {
    const field = resolveField(rawColumn, matching);
    resolvedFields[field.key] = field;
  }

  const warnings = [...identity.warnings];
  if (sameFileDuplicates.length > 0) {
    warnings.push(`DUPLICATE_SOURCE_ROWS: ${sameFileDuplicates.join(", ")}`);
  }

  const parentField = resolvedFields.parent_sku;
  const parentReference = parentField?.value ?? identity.parentReference;

  return {
    sku,
    entityType: identity.entityType,
    identityStatus: sameFileDuplicates.length > 0 ? "duplicate_review_required" : identity.identityStatus,
    sourceFiles: [...new Set(matching.map((snapshot) => snapshot.sourceFile))].sort(),
    snapshots: matching,
    parentReference,
    parentSku: parentReference && !parentReference.startsWith("id:") ? parentReference : null,
    resolvedFields,
    verticalFills: Object.values(resolvedFields).filter((field) => field.resolution === "VERTICAL_FILL").map((field) => field.key),
    conflicts: Object.values(resolvedFields).filter((field) => field.resolution === "SOURCE_CONFLICT").map((field) => field.key),
    warnings,
  };
}

function parseDecimal(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = String(value ?? "").trim();
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean).sort();
  return String(value ?? "").split(/[,|]/).map((item) => item.trim()).filter(Boolean).sort();
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, stableValue(child)]));
  }
  return value;
}

function normalizeForComparison(fieldKey: string, value: unknown, side: "wordpress" | "legacy"): unknown {
  if (!hasValue(value)) return null;
  const field = fieldForKey(fieldKey);
  if (fieldKey === "weight_kg") {
    const numeric = parseDecimal(value);
    return numeric === null ? String(value).trim() : side === "wordpress" ? Math.round(numeric * 1000) : Math.round(numeric);
  }
  if (field?.dataType === "number") return parseDecimal(value);
  if (field?.dataType === "list" || field?.dataType === "url_list") return parseList(value);
  if (typeof value === "string") return value.trim();
  return stableValue(value);
}

function getPath(record: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[segment];
  }, record);
}

function compareValues(fieldKey: string, wordpressValue: unknown, legacyValue: unknown): LegacyFieldComparison["sameOrDifferent"] {
  const wordpressPresent = hasValue(wordpressValue);
  const legacyPresent = hasValue(legacyValue);
  if (!wordpressPresent && !legacyPresent) return "EMPTY";
  if (wordpressPresent && !legacyPresent) return "WORDPRESS_ONLY";
  if (!wordpressPresent && legacyPresent) return "LEGACY_ONLY";
  return JSON.stringify(normalizeForComparison(fieldKey, wordpressValue, "wordpress")) === JSON.stringify(normalizeForComparison(fieldKey, legacyValue, "legacy"))
    ? "SAME"
    : "DIFFERENT";
}

const LEGACY_ONLY_FIELDS: ReadonlyArray<{ fieldKey: string; path: string }> = [
  { fieldKey: "handle", path: "handle" },
  { fieldKey: "vendor", path: "vendor" },
  { fieldKey: "shopify_product_type", path: "product_type" },
  { fieldKey: "inventory_quantity", path: "inventory_quantity" },
  { fieldKey: "product_category_id", path: "product_category_id" },
  { fieldKey: "optimized_description", path: "optimized_description" },
  { fieldKey: "seo_title", path: "seo_title" },
  { fieldKey: "seo_description", path: "seo_description" },
  { fieldKey: "ai_enrichment_json", path: "ai_enrichment_json" },
  { fieldKey: "ai_seed_style", path: "ai_seed_style" },
  { fieldKey: "ai_enriched_at", path: "ai_enriched_at" },
];

function legacyPathForField(fieldKey: string, product: LosslessProductResolution): string | undefined {
  if (fieldKey === "sale_price") {
    return hasValue(product.resolvedFields.sale_price?.value) ? "price" : undefined;
  }
  if (fieldKey === "regular_price") {
    return hasValue(product.resolvedFields.sale_price?.value) ? "compare_at_price" : "price";
  }
  return fieldForKey(fieldKey)?.legacyMapping;
}

export function compareWithLegacy(
  product: LosslessProductResolution,
  legacyRow: Record<string, unknown> | null,
): LegacyFieldComparison[] {
  const comparisons = new Map<string, LegacyFieldComparison>();
  const legacySource = legacyRow ? `product_sync_csv_products:${String(legacyRow.source_file ?? "unknown")}` : null;

  for (const field of Object.values(product.resolvedFields)) {
    const legacyPath = legacyPathForField(field.key, product);
    const legacyValue = legacyRow && legacyPath ? getPath(legacyRow, legacyPath) : undefined;
    const sameOrDifferent = compareValues(field.key, field.value, legacyValue);
    const sourceConflict = field.resolution === "SOURCE_CONFLICT";
    const preserve = hasValue(legacyValue) && sameOrDifferent !== "SAME";
    const classification = sourceConflict
      ? "CONFLICT"
      : preserve
        ? "LEGACY_VALUE_TO_PRESERVE"
        : sameOrDifferent === "WORDPRESS_ONLY"
          ? "SOURCE_ONLY"
          : "SAME";
    const proposedCurrentSource = sourceConflict ? null : preserve ? "legacy" : hasValue(field.value) ? "wordpress" : null;
    comparisons.set(field.key, {
      fieldKey: field.key,
      wordpressOriginal: field.value,
      legacyCurrent: legacyValue ?? null,
      legacySource,
      sameOrDifferent,
      classification,
      proposedCurrentValue: sourceConflict ? null : preserve ? legacyValue : field.value,
      proposedCurrentSource,
    });
  }

  for (const { fieldKey, path } of LEGACY_ONLY_FIELDS) {
    if (comparisons.has(fieldKey)) continue;
    const legacyValue = legacyRow ? getPath(legacyRow, path) : undefined;
    if (!hasValue(legacyValue)) continue;
    comparisons.set(fieldKey, {
      fieldKey,
      wordpressOriginal: null,
      legacyCurrent: legacyValue,
      legacySource,
      sameOrDifferent: "LEGACY_ONLY",
      classification: "LEGACY_VALUE_TO_PRESERVE",
      proposedCurrentValue: legacyValue,
      proposedCurrentSource: "legacy",
    });
  }

  const metafields = legacyRow?.metafields;
  if (metafields && typeof metafields === "object" && !Array.isArray(metafields)) {
    for (const [metafieldKey, legacyValue] of Object.entries(metafields as Record<string, unknown>)) {
      if (!hasValue(legacyValue)) continue;
      const definition = LOSSLESS_FIELD_REGISTRY.find((field) => field.legacyMapping === `metafields.${metafieldKey}`);
      const fieldKey = definition?.key ?? `legacy.metafields.${metafieldKey}`;
      const existing = comparisons.get(fieldKey);
      if (existing) continue;
      comparisons.set(fieldKey, {
        fieldKey,
        wordpressOriginal: existing?.wordpressOriginal ?? null,
        legacyCurrent: legacyValue,
        legacySource,
        sameOrDifferent: existing ? compareValues(fieldKey, existing.wordpressOriginal, legacyValue) : "LEGACY_ONLY",
        classification: "LEGACY_VALUE_TO_PRESERVE",
        proposedCurrentValue: legacyValue,
        proposedCurrentSource: "legacy",
      });
    }
  }

  return [...comparisons.values()].sort((a, b) => a.fieldKey.localeCompare(b.fieldKey));
}
