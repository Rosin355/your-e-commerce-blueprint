import {
  APPROVED_PUBLICATIONS,
  type ApprovedPublicationTarget,
  PUBLICATION_MANIFEST_SCHEMA,
  PUBLICATION_MAX_ITEMS,
  type PublicationItem,
  type PublicationManifest,
  type PublicationProductExpectation,
} from "./types.ts";

const BATCH_ID = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const PRODUCT_GID = /^gid:\/\/shopify\/Product\/\d+$/;
const PUBLICATION_GID = /^gid:\/\/shopify\/Publication\/\d+$/;
const VARIANT_GID = /^gid:\/\/shopify\/ProductVariant\/\d+$/;
const INVENTORY_GID = /^gid:\/\/shopify\/InventoryItem\/\d+$/;
const STRUCTURAL = new Set([
  "OG_152965",
  "OG_891874",
  "OG_758263",
  "OG_393883",
]);

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

function cents(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function parseExpected(
  value: unknown,
  label: string,
): PublicationProductExpectation {
  const expected = record(value, label);
  if (
    expected.status !== "DRAFT" || !Array.isArray(expected.options) ||
    !Array.isArray(expected.variants) || expected.variants.length === 0 ||
    !Array.isArray(expected.media) || expected.media.length === 0
  ) {
    throw new Error(`MANIFEST_INVALID: ${label}`);
  }
  const options = expected.options.map((value, index) => {
    const option = record(value, `${label}.options[${index}]`);
    if (!Array.isArray(option.values) || option.values.length === 0) {
      throw new Error(`MANIFEST_INVALID: ${label}.options[${index}]`);
    }
    return {
      name: text(option.name, "option.name"),
      values: option.values.map((entry) => text(entry, "option.value")),
    };
  });
  const variants = expected.variants.map((value, index) => {
    const variant = record(value, `${label}.variants[${index}]`);
    const price = text(variant.price, "variant.price");
    if (
      cents(price) === null || cents(price)! <= 0 || variant.tracked !== true ||
      variant.inventoryPolicy !== "DENY" || variant.available !== 20 ||
      !Array.isArray(variant.selectedOptions)
    ) {
      throw new Error(
        `PUBLICATION_VARIANT_BLOCKED: ${label}.variants[${index}]`,
      );
    }
    return {
      id: text(variant.id, "variant.id", VARIANT_GID),
      sku: text(variant.sku, "variant.sku"),
      price,
      inventoryItemId: text(
        variant.inventoryItemId,
        "variant.inventoryItemId",
        INVENTORY_GID,
      ),
      tracked: true as const,
      inventoryPolicy: "DENY" as const,
      available: 20 as const,
      selectedOptions: variant.selectedOptions.map((entry, optionIndex) => {
        const option = record(entry, `selectedOptions[${optionIndex}]`);
        return {
          name: text(option.name, "selectedOption.name"),
          value: text(option.value, "selectedOption.value"),
        };
      }),
    };
  });
  const media = expected.media.map((value, index) => {
    const media = record(value, `${label}.media[${index}]`);
    if (media.status !== "READY" || media.mediaContentType !== "IMAGE") {
      throw new Error(`PUBLICATION_MEDIA_BLOCKED: ${label}.media[${index}]`);
    }
    return {
      id: text(media.id, "media.id"),
      alt: typeof media.alt === "string" ? media.alt : "",
      status: "READY" as const,
      mediaContentType: "IMAGE" as const,
    };
  });
  return {
    id: text(expected.id, `${label}.id`, PRODUCT_GID),
    title: text(expected.title, `${label}.title`),
    handle: text(expected.handle, `${label}.handle`),
    descriptionHtml: text(expected.descriptionHtml, `${label}.descriptionHtml`),
    status: "DRAFT",
    options,
    variants,
    media,
  };
}

function parseItem(value: unknown, index: number): PublicationItem {
  const item = record(value, `items[${index}]`);
  const parentSku = text(item.parentSku, `items[${index}].parentSku`)
    .toUpperCase();
  if (STRUCTURAL.has(parentSku) || /TEST/i.test(parentSku)) {
    throw new Error(`PUBLICATION_STRUCTURAL_BLOCKED: ${parentSku}`);
  }
  if (
    item.descriptionState !== "APPROVED" || item.mediaState !== "READY" ||
    item.inventoryState !== "TRACKED_DENY_20" ||
    item.structureState !== "EXACT" ||
    !Array.isArray(item.blockedReasons) || item.blockedReasons.length !== 0 ||
    !Array.isArray(item.publishBlockedFields) ||
    item.publishBlockedFields.length !== 0
  ) {
    throw new Error(`PUBLICATION_READINESS_BLOCKED: ${parentSku}`);
  }
  const shopifyProductId = text(
    item.shopifyProductId,
    "shopifyProductId",
    PRODUCT_GID,
  );
  const expected = parseExpected(item.expected, `items[${index}].expected`);
  if (expected.id !== shopifyProductId) {
    throw new Error(`MANIFEST_IDENTITY_MISMATCH: ${parentSku}`);
  }
  return {
    parentSku,
    shopifyProductId,
    expected,
    descriptionState: "APPROVED",
    mediaState: "READY",
    inventoryState: "TRACKED_DENY_20",
    structureState: "EXACT",
    blockedReasons: [],
    publishBlockedFields: [],
  };
}

export function parsePublicationManifest(value: unknown): PublicationManifest {
  const input = record(value, "manifest");
  const manifestKeys = Object.keys(input).sort();
  if (
    JSON.stringify(manifestKeys) !==
      JSON.stringify([
        "approvedPublications",
        "batchId",
        "items",
        "schemaVersion",
        "sourceManifest",
      ])
  ) {
    throw new Error("MANIFEST_INVALID: fields");
  }
  if (
    input.schemaVersion !== PUBLICATION_MANIFEST_SCHEMA ||
    input.sourceManifest !== "3B.2-v1"
  ) {
    throw new Error("MANIFEST_INVALID: schemaVersion/sourceManifest");
  }
  const batchId = text(input.batchId, "batchId", BATCH_ID);
  if (
    !Array.isArray(input.approvedPublications) ||
    input.approvedPublications.length !== APPROVED_PUBLICATIONS.length
  ) {
    throw new Error("PUBLICATION_TARGET_BLOCKED");
  }
  const approvedPublications = input.approvedPublications.map(
    (value, index): ApprovedPublicationTarget => {
      const target = record(value, `approvedPublications[${index}]`);
      const approved = APPROVED_PUBLICATIONS[index];
      const keys = Object.keys(target).sort();
      const expectedKeys = ("id" in approved ? ["id", "name"] : ["name"])
        .sort();
      if (
        JSON.stringify(keys) !== JSON.stringify(expectedKeys) ||
        target.name !== approved.name ||
        ("id" in approved &&
          text(
              target.id,
              `approvedPublications[${index}].id`,
              PUBLICATION_GID,
            ) !==
            approved.id)
      ) {
        throw new Error("PUBLICATION_TARGET_BLOCKED");
      }
      return "id" in approved
        ? { id: approved.id, name: approved.name }
        : { name: approved.name };
    },
  );
  if (
    !Array.isArray(input.items) || input.items.length === 0 ||
    input.items.length > PUBLICATION_MAX_ITEMS
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
    schemaVersion: PUBLICATION_MANIFEST_SCHEMA,
    sourceManifest: "3B.2-v1",
    batchId,
    approvedPublications,
    items,
  };
}
