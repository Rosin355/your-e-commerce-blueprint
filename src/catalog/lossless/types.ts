export type CatalogEntityType = "simple" | "parent" | "variation" | "unknown";
export type IdentityStatus = "resolved" | "identity_review_required" | "duplicate_review_required";
export type ResolutionKind = "MASTER" | "VERTICAL_FILL" | "SAME" | "SOURCE_CONFLICT" | "EMPTY";
export type CurrentValueSource = "wordpress" | "legacy" | "manual" | "ai_accepted" | "shopify_backfill";

export interface SourceSnapshot {
  sourceFile: string;
  sourceRowNumber: number;
  sourceHash: string;
  sourceSku: string | null;
  sourceParentReference: string | null;
  sourceType: string | null;
  rawRow: Record<string, string>;
}

export interface FieldCandidate {
  sourceFile: string;
  sourceRowNumber: number;
  rawColumn: string;
  value: string;
  sourceRole: "master" | "vertical";
}

export interface ResolvedField {
  key: string;
  rawColumn: string;
  resolution: ResolutionKind;
  value: string | null;
  candidates: FieldCandidate[];
  sourceFile: string | null;
  sourceRow: number | null;
}

export interface IdentityDecision {
  sku: string | null;
  entityType: CatalogEntityType;
  parentReference: string | null;
  identityStatus: IdentityStatus;
  createCanonicalEntity: boolean;
  warnings: string[];
}

export interface LegacyFieldComparison {
  fieldKey: string;
  wordpressOriginal: unknown;
  legacyCurrent: unknown;
  legacySource: string | null;
  sameOrDifferent: "SAME" | "DIFFERENT" | "WORDPRESS_ONLY" | "LEGACY_ONLY" | "EMPTY";
  classification: "SAME" | "LEGACY_VALUE_TO_PRESERVE" | "SOURCE_ONLY" | "CONFLICT";
  proposedCurrentValue: unknown;
  proposedCurrentSource: "wordpress" | "legacy" | null;
}

export interface LosslessProductResolution {
  sku: string;
  entityType: CatalogEntityType;
  identityStatus: IdentityStatus;
  sourceFiles: string[];
  snapshots: SourceSnapshot[];
  parentReference: string | null;
  parentSku: string | null;
  resolvedFields: Record<string, ResolvedField>;
  verticalFills: string[];
  conflicts: string[];
  warnings: string[];
}
