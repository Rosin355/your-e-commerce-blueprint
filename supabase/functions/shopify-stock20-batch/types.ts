export const STOCK20_TARGET = 20;
export const STOCK20_MAX_ITEMS = 25;
export const STOCK20_LOCATION_ID = "gid://shopify/Location/117678014804";

export type Stock20Mode = "DRY_RUN" | "EXECUTE";
export type Stock20ItemStatus =
  | "UPDATED"
  | "ALREADY_AT_TARGET"
  | "SKIPPED"
  | "FAILED";
export type Stock20Mutation =
  | "ENABLE_TRACKING"
  | "SET_POLICY_DENY"
  | "SET_AVAILABLE_20";
export type Stock20FailedStep =
  | "READ_BEFORE"
  | "VALIDATE_BEFORE"
  | "ENABLE_TRACKING"
  | "SET_POLICY_DENY"
  | "SET_AVAILABLE_20_PRIMARY"
  | "READ_AFTER_PRIMARY_ERROR"
  | "SET_AVAILABLE_20_RECOVERY"
  | "READ_AFTER"
  | "POSTCONDITION";

export interface Stock20ManifestItem {
  sku: string;
  shopifyProductId: string;
  shopifyVariantId: string;
  inventoryItemId: string;
  locationId: string;
  currentTracked: boolean | null;
  currentPolicy: "DENY" | "CONTINUE" | null;
  currentAvailable: number | null;
  targetAvailable: 20;
  readiness: "READY_FOR_SALE";
  structureStatus: "UPDATE_EXISTING";
}

export interface Stock20Manifest {
  schemaVersion: "3B.1G-v1";
  sourceManifest: "3B.1C";
  batchId: string;
  items: Stock20ManifestItem[];
}

export interface Stock20LiveState {
  sku: string;
  shopifyProductId: string;
  shopifyVariantId: string;
  inventoryItemId: string;
  locationId: string;
  tracked: boolean;
  inventoryPolicy: "DENY" | "CONTINUE";
  available: number;
  onHand: number | null;
}

export interface Stock20ShopifyClient {
  readState(item: Stock20ManifestItem): Promise<Stock20LiveState>;
  enableTracking(inventoryItemId: string): Promise<void>;
  setInventoryPolicy(
    productId: string,
    variantId: string,
    policy: "DENY",
  ): Promise<void>;
  setAvailableAbsolute(input: {
    inventoryItemId: string;
    locationId: string;
    quantity: 20;
    compareQuantity: number;
    idempotencyKey: string;
  }): Promise<void>;
}

export interface Stock20ItemResult {
  sku: string;
  inventoryItemId: string;
  /** Chiave primaria mantenuta per compatibilità con il report 3B.1G iniziale. */
  idempotencyKey: string;
  primaryIdempotencyKey: string;
  status: Stock20ItemStatus;
  before?: Stock20LiveState;
  after?: Stock20LiveState;
  plannedMutations: Stock20Mutation[];
  appliedMutations: Stock20Mutation[];
  failedStep?: Stock20FailedStep;
  recoveryAttempted: boolean;
  recoveryIdempotencyKey?: string;
  code?: string;
  message?: string;
}

export interface Stock20BatchReport {
  ok: boolean;
  mode: Stock20Mode;
  batchId: string;
  targetAvailable: 20;
  locationId: string;
  stopped: boolean;
  stopCode?: string;
  summary: Record<Stock20ItemStatus, number>;
  results: Stock20ItemResult[];
}
