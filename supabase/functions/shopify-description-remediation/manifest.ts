import { normalizeApprovedOriginalDescription } from "./description.ts";
import {
  BLOCKED_DESCRIPTION_FAMILIES,
  REMEDIATION_MAX_ITEMS,
  type RemediationItem,
  type RemediationManifest,
  type RemediationProductState,
} from "./types.ts";

const BATCH_ID = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const PRODUCT_GID = /^gid:\/\/shopify\/Product\/\d+$/;
const VARIANT_GID = /^gid:\/\/shopify\/ProductVariant\/\d+$/;
const INVENTORY_GID = /^gid:\/\/shopify\/InventoryItem\/\d+$/;

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`MANIFEST_INVALID: ${label}`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, pattern?: RegExp): string {
  if (
    typeof value !== "string" || !value || (pattern && !pattern.test(value))
  ) {
    throw new Error(`MANIFEST_INVALID: ${label}`);
  }
  return value;
}

function parseState(value: unknown, label: string): RemediationProductState {
  const state = record(value, label);
  if (
    !Array.isArray(state.variants) || !Array.isArray(state.media) ||
    !Array.isArray(state.publicationIds) ||
    !Array.isArray(state.scheduledPublicationIds) ||
    !Number.isInteger(state.variantCount) || !Number.isInteger(state.mediaCount)
  ) {
    throw new Error(`MANIFEST_INVALID: ${label} collections`);
  }
  const status = state.status;
  if (!["DRAFT", "ACTIVE", "ARCHIVED", "UNLISTED"].includes(String(status))) {
    throw new Error(`MANIFEST_INVALID: ${label}.status`);
  }
  const variants = state.variants.map((value, index) => {
    const variant = record(value, `${label}.variants[${index}]`);
    if (
      !Array.isArray(variant.selectedOptions) ||
      !["DENY", "CONTINUE"].includes(String(variant.inventoryPolicy)) ||
      typeof variant.tracked !== "boolean" ||
      (variant.available !== null && !Number.isInteger(variant.available))
    ) {
      throw new Error(`MANIFEST_INVALID: ${label}.variants[${index}]`);
    }
    return {
      id: text(variant.id, "variant.id", VARIANT_GID),
      sku: text(variant.sku, "variant.sku"),
      price: text(variant.price, "variant.price"),
      inventoryItemId: text(
        variant.inventoryItemId,
        "variant.inventoryItemId",
        INVENTORY_GID,
      ),
      tracked: variant.tracked,
      inventoryPolicy: variant.inventoryPolicy as "DENY" | "CONTINUE",
      available: variant.available as number | null,
      selectedOptions: variant.selectedOptions.map((entry, optionIndex) => {
        const option = record(entry, `selectedOptions[${optionIndex}]`);
        return {
          name: text(option.name, "option.name"),
          value: text(option.value, "option.value"),
        };
      }),
    };
  });
  const media = state.media.map((value, index) => {
    const media = record(value, `${label}.media[${index}]`);
    return {
      id: text(media.id, "media.id"),
      alt: typeof media.alt === "string" ? media.alt : "",
      status: text(media.status, "media.status"),
      mediaContentType: text(media.mediaContentType, "media.mediaContentType"),
    };
  });
  return {
    id: text(state.id, `${label}.id`, PRODUCT_GID),
    title: text(state.title, `${label}.title`),
    handle: text(state.handle, `${label}.handle`),
    descriptionHtml: text(state.descriptionHtml, `${label}.descriptionHtml`),
    status: status as RemediationProductState["status"],
    variantCount: Number(state.variantCount),
    variants,
    mediaCount: Number(state.mediaCount),
    media,
    publicationIds: state.publicationIds.map((id, index) =>
      text(id, `${label}.publicationIds[${index}]`)
    ),
    scheduledPublicationIds: state.scheduledPublicationIds.map((id, index) =>
      text(id, `${label}.scheduledPublicationIds[${index}]`)
    ),
  };
}

function parseItem(value: unknown, index: number): RemediationItem {
  const item = record(value, `items[${index}]`);
  const parentSku = text(item.parentSku, `items[${index}].parentSku`)
    .toUpperCase();
  if (!BLOCKED_DESCRIPTION_FAMILIES.has(parentSku)) {
    throw new Error(`MANIFEST_FAMILY_NOT_APPROVED: ${parentSku}`);
  }
  if (
    item.descriptionSource !== "ORIGINAL" ||
    item.operation !== "UPDATE_DESCRIPTION_ONLY"
  ) {
    throw new Error(`MANIFEST_OPERATION_BLOCKED: ${parentSku}`);
  }
  const approvedOriginalDescriptionHtml = text(
    item.approvedOriginalDescriptionHtml,
    `items[${index}].approvedOriginalDescriptionHtml`,
  );
  normalizeApprovedOriginalDescription(approvedOriginalDescriptionHtml);
  const shopifyProductId = text(
    item.shopifyProductId,
    `items[${index}].shopifyProductId`,
    PRODUCT_GID,
  );
  const expectedCurrent = parseState(
    item.expectedCurrent,
    `items[${index}].expectedCurrent`,
  );
  if (expectedCurrent.id !== shopifyProductId) {
    throw new Error(`MANIFEST_IDENTITY_MISMATCH: ${parentSku}`);
  }
  return {
    parentSku,
    shopifyProductId,
    descriptionSource: "ORIGINAL",
    approvedOriginalDescriptionHtml,
    expectedCurrent,
    operation: "UPDATE_DESCRIPTION_ONLY",
  };
}

export function parseRemediationManifest(value: unknown): RemediationManifest {
  const input = record(value, "manifest");
  if (input.schemaVersion !== "3B.3-v1" || input.sourceManifest !== "3B.2-v1") {
    throw new Error("MANIFEST_INVALID: schemaVersion/sourceManifest");
  }
  const batchId = text(input.batchId, "batchId", BATCH_ID);
  if (
    !Array.isArray(input.items) || input.items.length === 0 ||
    input.items.length > REMEDIATION_MAX_ITEMS
  ) {
    throw new Error("BATCH_SIZE_INVALID");
  }
  const items = input.items.map(parseItem);
  if (
    new Set(items.map((item) => item.parentSku)).size !== items.length ||
    new Set(items.map((item) => item.shopifyProductId)).size !== items.length
  ) {
    throw new Error("MANIFEST_DUPLICATE_IDENTITY");
  }
  return {
    schemaVersion: "3B.3-v1",
    sourceManifest: "3B.2-v1",
    batchId,
    items,
  };
}
