export const REMEDIATION_API_VERSION = "2026-01";
export const REMEDIATION_MAX_ITEMS = 14;

export const BLOCKED_DESCRIPTION_FAMILIES = new Set([
  "OG_238559",
  "OG_341476",
  "OG_422411",
  "OG_489489",
  "OG_538594",
  "OG_553492",
  "OG_644838",
  "OG_728356",
  "OG_746747",
  "OG_778338",
  "OG_839472",
  "OG_847151",
  "OG_865363",
  "OG_942831",
]);

export type RemediationMode = "DRY_RUN" | "EXECUTE";
export type RemediationStatus =
  | "READY_TO_REMEDIATE"
  | "REMEDIATED"
  | "ALREADY_REMEDIATED"
  | "BLOCKED"
  | "FAILED"
  | "SKIPPED";

export interface RemediationVariantState {
  id: string;
  sku: string;
  price: string;
  inventoryItemId: string;
  tracked: boolean;
  inventoryPolicy: "DENY" | "CONTINUE";
  available: number | null;
  selectedOptions: Array<{ name: string; value: string }>;
}

export interface RemediationMediaState {
  id: string;
  alt: string;
  status: string;
  mediaContentType: string;
}

export interface RemediationProductState {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED" | "UNLISTED";
  variantCount: number;
  variants: RemediationVariantState[];
  mediaCount: number;
  media: RemediationMediaState[];
  publicationIds: string[];
  scheduledPublicationIds: string[];
}

export interface RemediationItem {
  parentSku: string;
  shopifyProductId: string;
  descriptionSource: "ORIGINAL";
  approvedOriginalDescriptionHtml: string;
  expectedCurrent: RemediationProductState;
  operation: "UPDATE_DESCRIPTION_ONLY";
}

export interface RemediationManifest {
  schemaVersion: "3B.3-v1";
  sourceManifest: "3B.2-v1";
  batchId: string;
  items: RemediationItem[];
}

export interface RemediationShopifyClient {
  readProduct(productId: string): Promise<RemediationProductState | null>;
  updateDescription(productId: string, descriptionHtml: string): Promise<void>;
}

export interface RemediationResult {
  parentSku: string;
  shopifyProductId: string;
  status: RemediationStatus;
  plannedOperation: "UPDATE_DESCRIPTION_ONLY";
  writeCount: number;
  code?: string;
  message?: string;
}

export interface RemediationReport {
  ok: boolean;
  mode: RemediationMode;
  batchId: string;
  stopped: boolean;
  stopCode?: string;
  summary: Record<RemediationStatus, number>;
  results: RemediationResult[];
}
