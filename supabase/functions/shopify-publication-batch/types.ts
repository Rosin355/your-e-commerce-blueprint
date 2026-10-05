export const PUBLICATION_API_VERSION = "2026-01";
export const PUBLICATION_MAX_ITEMS = 25;
export const PUBLICATION_STOCK_TARGET = 20;

export type PublicationMode = "DRY_RUN" | "EXECUTE";
export type PublicationResultStatus =
  | "READY_TO_PUBLISH"
  | "PUBLISHED"
  | "ALREADY_PUBLISHED"
  | "BLOCKED"
  | "FAILED"
  | "SKIPPED";

export interface PublicationVariantExpectation {
  id: string;
  sku: string;
  price: string;
  inventoryItemId: string;
  tracked: true;
  inventoryPolicy: "DENY";
  available: 20;
  selectedOptions: Array<{ name: string; value: string }>;
}

export interface PublicationMediaExpectation {
  id: string;
  alt: string;
  status: "READY";
  mediaContentType: "IMAGE";
}

export interface PublicationProductExpectation {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string;
  status: "DRAFT";
  options: Array<{ name: string; values: string[] }>;
  variants: PublicationVariantExpectation[];
  media: PublicationMediaExpectation[];
}

export interface PublicationItem {
  parentSku: string;
  shopifyProductId: string;
  expected: PublicationProductExpectation;
  descriptionState: "APPROVED";
  mediaState: "READY";
  inventoryState: "TRACKED_DENY_20";
  structureState: "EXACT";
  blockedReasons: [];
  publishBlockedFields: [];
}

export interface PublicationManifest {
  schemaVersion: "3B.4-v1";
  sourceManifest: "3B.2-v1";
  batchId: string;
  targetPublication: { id: string; name: "Online Store" };
  items: PublicationItem[];
}

export interface PublicationLiveProduct {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED" | "UNLISTED";
  options: Array<{ name: string; values: string[] }>;
  variantCount: number;
  variants: Array<
    Omit<
      PublicationVariantExpectation,
      "tracked" | "inventoryPolicy" | "available"
    > & {
      tracked: boolean;
      inventoryPolicy: "DENY" | "CONTINUE";
      available: number | null;
    }
  >;
  mediaCount: number;
  media: Array<
    Omit<PublicationMediaExpectation, "status" | "mediaContentType"> & {
      status: string;
      mediaContentType: string;
    }
  >;
  publicationIds: string[];
  scheduledPublicationIds: string[];
}

export interface PublicationShopifyClient {
  readPublication(
    publicationId: string,
  ): Promise<{ id: string; name: string } | null>;
  readProduct(productId: string): Promise<PublicationLiveProduct | null>;
  activateProduct(productId: string): Promise<void>;
  publishProduct(productId: string, publicationId: string): Promise<void>;
}

export type PublicationEvidenceStatus =
  | "RESERVED"
  | "APPLIED"
  | "VERIFIED"
  | "FAILED";

export interface PublicationEvidence {
  batchId: string;
  parentSku: string;
  productId: string;
  operation: "SET_ACTIVE";
  requestKey: string;
  payloadHash: string;
  status: PublicationEvidenceStatus;
  appliedAt: string | null;
  verifiedAt: string | null;
}

export interface PublicationEvidenceLedger {
  find(batchId: string, parentSku: string): Promise<PublicationEvidence | null>;
  reserve(evidence: PublicationEvidence): Promise<
    | { kind: "RESERVED" }
    | { kind: "EXISTING"; evidence: PublicationEvidence }
  >;
  markApplied(evidence: PublicationEvidence): Promise<void>;
  markVerified(evidence: PublicationEvidence): Promise<void>;
}

export interface PublicationResult {
  parentSku: string;
  shopifyProductId: string;
  status: PublicationResultStatus;
  plannedOperations: Array<"SET_ACTIVE" | "PUBLISH_ONLINE_STORE">;
  appliedOperations: Array<"SET_ACTIVE" | "PUBLISH_ONLINE_STORE">;
  code?: string;
  message?: string;
}

export interface PublicationReport {
  ok: boolean;
  mode: PublicationMode;
  batchId: string;
  targetPublication: { id: string; name: "Online Store" };
  stopped: boolean;
  stopCode?: string;
  summary: Record<PublicationResultStatus, number>;
  results: PublicationResult[];
}
