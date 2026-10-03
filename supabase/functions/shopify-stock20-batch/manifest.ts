import {
  STOCK20_LOCATION_ID,
  STOCK20_MAX_ITEMS,
  STOCK20_TARGET,
  type Stock20Manifest,
  type Stock20ManifestItem,
} from "./types.ts";

const DENIED_SKUS = new Set([
  "OG_393883",
  "OG_891874",
  "OG_758263",
  "OG_152965",
]);

const SKU = /^[A-Z0-9][A-Z0-9._-]{1,63}$/;
const BATCH_ID = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const GID: Record<string, RegExp> = {
  product: /^gid:\/\/shopify\/Product\/\d+$/,
  variant: /^gid:\/\/shopify\/ProductVariant\/\d+$/,
  item: /^gid:\/\/shopify\/InventoryItem\/\d+$/,
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("MANIFEST_INVALID: oggetto JSON atteso");
  }
  return value as Record<string, unknown>;
}

function exactString(
  value: unknown,
  label: string,
  pattern?: RegExp,
): string {
  if (
    typeof value !== "string" || !value || (pattern && !pattern.test(value))
  ) {
    throw new Error(`MANIFEST_INVALID: ${label} non valido`);
  }
  return value;
}

function nullableBoolean(value: unknown, label: string): boolean | null {
  if (value === null) return null;
  if (typeof value === "boolean") return value;
  throw new Error(`MANIFEST_INVALID: ${label} deve essere boolean o null`);
}

function parseItem(value: unknown, index: number): Stock20ManifestItem {
  const item = record(value);
  const prefix = `items[${index}]`;
  const sku = exactString(item.sku, `${prefix}.sku`, SKU).toUpperCase();
  if (DENIED_SKUS.has(sku)) {
    throw new Error(`MANIFEST_DENYLIST: ${sku}`);
  }
  if (item.locationId !== STOCK20_LOCATION_ID) {
    throw new Error(`LOCATION_MISMATCH: ${sku}`);
  }
  if (item.targetAvailable !== STOCK20_TARGET) {
    throw new Error(`TARGET_MISMATCH: ${sku}`);
  }
  if (item.readiness !== "READY_FOR_SALE") {
    throw new Error(`READINESS_BLOCKED: ${sku}`);
  }
  if (item.structureStatus !== "UPDATE_EXISTING") {
    throw new Error(`STRUCTURE_BLOCKED: ${sku}`);
  }
  if (
    item.currentPolicy !== null && item.currentPolicy !== "DENY" &&
    item.currentPolicy !== "CONTINUE"
  ) {
    throw new Error(`MANIFEST_INVALID: ${prefix}.currentPolicy`);
  }
  const currentAvailable = item.currentAvailable;
  if (
    currentAvailable !== null &&
    (typeof currentAvailable !== "number" ||
      !Number.isInteger(currentAvailable) || currentAvailable < 0)
  ) {
    throw new Error(`MANIFEST_INVALID: ${prefix}.currentAvailable`);
  }
  return {
    sku,
    shopifyProductId: exactString(
      item.shopifyProductId,
      `${prefix}.shopifyProductId`,
      GID.product,
    ),
    shopifyVariantId: exactString(
      item.shopifyVariantId,
      `${prefix}.shopifyVariantId`,
      GID.variant,
    ),
    inventoryItemId: exactString(
      item.inventoryItemId,
      `${prefix}.inventoryItemId`,
      GID.item,
    ),
    locationId: STOCK20_LOCATION_ID,
    currentTracked: nullableBoolean(
      item.currentTracked,
      `${prefix}.currentTracked`,
    ),
    currentPolicy: item.currentPolicy as "DENY" | "CONTINUE" | null,
    currentAvailable: currentAvailable as number | null,
    targetAvailable: STOCK20_TARGET,
    readiness: "READY_FOR_SALE",
    structureStatus: "UPDATE_EXISTING",
  };
}

export function parseStock20Manifest(value: unknown): Stock20Manifest {
  const input = record(value);
  if (input.schemaVersion !== "3B.1G-v1") {
    throw new Error("MANIFEST_INVALID: schemaVersion attesa 3B.1G-v1");
  }
  if (input.sourceManifest !== "3B.1C") {
    throw new Error("MANIFEST_INVALID: sourceManifest atteso 3B.1C");
  }
  const batchId = exactString(input.batchId, "batchId", BATCH_ID);
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error("MANIFEST_INVALID: items vuoto");
  }
  if (input.items.length > STOCK20_MAX_ITEMS) {
    throw new Error(`BATCH_TOO_LARGE: massimo ${STOCK20_MAX_ITEMS}`);
  }
  const items = input.items.map(parseItem);
  const sku = new Set<string>();
  const inventoryItem = new Set<string>();
  for (const item of items) {
    if (sku.has(item.sku)) throw new Error(`DUPLICATE_SKU: ${item.sku}`);
    if (inventoryItem.has(item.inventoryItemId)) {
      throw new Error(`DUPLICATE_INVENTORY_ITEM: ${item.inventoryItemId}`);
    }
    sku.add(item.sku);
    inventoryItem.add(item.inventoryItemId);
  }
  return {
    schemaVersion: "3B.1G-v1",
    sourceManifest: "3B.1C",
    batchId,
    items,
  };
}

export function loadServerManifest(raw: string | undefined): Stock20Manifest {
  if (!raw) {
    throw new Error(
      "MANIFEST_NOT_CONFIGURED: configurare SHOPIFY_STOCK20_BATCH_MANIFEST_JSON lato server",
    );
  }
  try {
    return parseStock20Manifest(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("MANIFEST_INVALID: JSON non valido");
    }
    throw error;
  }
}
