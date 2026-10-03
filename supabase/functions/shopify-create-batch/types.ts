export const SHOPIFY_CREATE_API_VERSION = "2026-01";
export const SHOPIFY_CREATE_MAX_FAMILIES = 10;
export const SHOPIFY_CREATE_LOCATION_ID = "gid://shopify/Location/117678014804";
export const SHOPIFY_CREATE_STOCK_TARGET = 20;

export type CreateMode = "DRY_RUN" | "EXECUTE";
export type PublicationIntent = "CREATE_DRAFT" | "READY_TO_PUBLISH";
export type DescriptionSource = "ORIGINAL" | "MANUAL";
export type CreateResultStatus =
  | "PLANNED"
  | "CREATED"
  | "READY_TO_PUBLISH"
  | "ALREADY_EXISTS"
  | "RECONCILED"
  | "BLOCKED"
  | "FAILED"
  | "SKIPPED";

export interface CreateOptionValue {
  name: string;
  value: string;
}

export interface CreateMedia {
  originalSource: string;
  alt: string;
  approved: true;
}

export interface CreateVariant {
  internalProductId: string;
  sku: string;
  parentSku: string;
  entityType: "variation";
  action: "CREATE_VARIANT";
  price: string;
  optionValues: CreateOptionValue[];
  shopifyVariantId: null;
  stockTarget: 20;
  readiness: "READY_FOR_SALE";
  structureStatus: "CREATE_NEW";
}

export interface CreateFamily {
  internalProductId: string;
  parentSku: string;
  entityType: "variable";
  action: "CREATE_VARIABLE_PARENT";
  title: string;
  descriptionHtml: string;
  descriptionSource: DescriptionSource;
  handle: string;
  shopifyProductId: null;
  optionNames: string[];
  variants: CreateVariant[];
  media: CreateMedia[];
  mediaStatus: "APPROVED" | "NO_APPROVED_IMAGE";
  publicationIntent: PublicationIntent;
  publishBlockedFields: string[];
  stockTarget: 20;
  readiness: "READY_FOR_SALE";
  structureStatus: "CREATE_NEW";
}

export interface CreateManifest {
  schemaVersion: "3B.2-v1";
  sourceManifest: "3B.1C";
  batchId: string;
  families: CreateFamily[];
}

export interface ShopifyVariantIdentity {
  id: string;
  sku: string;
  productId: string;
  productHandle: string;
  inventoryItemId: string;
  selectedOptions: CreateOptionValue[];
}

export interface ShopifyProductIdentity {
  id: string;
  handle: string;
  title: string;
  options: Array<{ name: string; values: string[] }>;
  variants: ShopifyVariantIdentity[];
}

export interface CreatedVariant {
  id: string;
  sku: string;
  inventoryItemId: string;
  selectedOptions: CreateOptionValue[];
}

export interface LedgerRecord {
  batchId: string;
  internalSku: string;
  operation:
    | "CREATE_PARENT"
    | "CREATE_OPTIONS"
    | "CREATE_VARIANT"
    | "ATTACH_MEDIA"
    | "CONFIGURE_INVENTORY";
  requestKey: string;
  payloadHash: string;
  status: "RESERVED" | "APPLIED" | "RECONCILED" | "FAILED";
  shopifyProductId?: string;
  shopifyVariantId?: string;
  result?: Record<string, unknown>;
}

export interface CreationLedger {
  reserve(record: LedgerRecord): Promise<
    | { kind: "RESERVED" }
    | { kind: "EXISTING"; record: LedgerRecord }
  >;
  get(requestKey: string): Promise<LedgerRecord | null>;
  complete(record: LedgerRecord): Promise<void>;
}

export interface ShopifyCreateClient {
  findProduct(family: CreateFamily): Promise<{
    product: ShopifyProductIdentity | null;
    ambiguous: boolean;
    reason?: string;
  }>;
  createProductShell(family: CreateFamily): Promise<ShopifyProductIdentity>;
  createOptions(productId: string, family: CreateFamily): Promise<void>;
  findVariantsBySkus(skus: string[]): Promise<ShopifyVariantIdentity[]>;
  createVariants(
    productId: string,
    variants: CreateVariant[],
  ): Promise<CreatedVariant[]>;
  attachMedia(productId: string, media: CreateMedia[]): Promise<void>;
  configureInventory(input: {
    productId: string;
    variantId: string;
    inventoryItemId: string;
    sku: string;
    requestKey: string;
  }): Promise<void>;
  verifyProduct(
    productId: string,
    family: CreateFamily,
  ): Promise<ShopifyProductIdentity>;
}

export interface CreateFamilyResult {
  parentSku: string;
  status: CreateResultStatus;
  requestKey: string;
  shopifyProductId?: string;
  shopifyVariantIds: Record<string, string>;
  plannedOperations: string[];
  appliedOperations: string[];
  code?: string;
  message?: string;
}

export interface CreateBatchReport {
  ok: boolean;
  mode: CreateMode;
  batchId: string;
  stopped: boolean;
  stopCode?: string;
  summary: Record<CreateResultStatus, number>;
  results: CreateFamilyResult[];
}
