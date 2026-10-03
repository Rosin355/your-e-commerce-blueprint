import {
  type CreateFamily,
  type CreateManifest,
  type CreateMedia,
  type CreateOptionValue,
  type CreateVariant,
  SHOPIFY_CREATE_LOCATION_ID,
  SHOPIFY_CREATE_MAX_FAMILIES,
  SHOPIFY_CREATE_STOCK_TARGET,
} from "./types.ts";

const DENIED_ROOTS = new Set([
  "OG_393883",
  "OG_152965",
  "OG_891874",
  "OG_758263",
]);
const SKU = /^[A-Z0-9][A-Z0-9._-]{1,63}$/;
const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BATCH_ID = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const INTERNAL_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`MANIFEST_INVALID: ${label} deve essere un oggetto`);
  }
  return value as Record<string, unknown>;
}

function string(
  value: unknown,
  label: string,
  pattern?: RegExp,
): string {
  if (
    typeof value !== "string" || !value.trim() ||
    (pattern && !pattern.test(value))
  ) {
    throw new Error(`MANIFEST_INVALID: ${label}`);
  }
  return value;
}

function sku(value: unknown, label: string): string {
  const result = string(value, label, SKU).toUpperCase();
  const root = result.replace(/[-_]\d+$/, "");
  if (DENIED_ROOTS.has(result) || DENIED_ROOTS.has(root)) {
    throw new Error(`MANIFEST_DENYLIST: ${result}`);
  }
  if (/^TEST(?:[-_]|$)/.test(result)) {
    throw new Error(`MANIFEST_TEST_SKU: ${result}`);
  }
  return result;
}

function exactArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`MANIFEST_INVALID: ${label} deve essere un array`);
  }
  return value;
}

function parseOption(value: unknown, label: string): CreateOptionValue {
  const input = object(value, label);
  return {
    name: string(input.name, `${label}.name`),
    value: string(input.value, `${label}.value`),
  };
}

function parseMedia(value: unknown, label: string): CreateMedia {
  const input = object(value, label);
  const originalSource = string(
    input.originalSource,
    `${label}.originalSource`,
  );
  let url: URL;
  try {
    url = new URL(originalSource);
  } catch {
    throw new Error(`MANIFEST_INVALID: ${label}.originalSource`);
  }
  if (url.protocol !== "https:") {
    throw new Error(`MANIFEST_INVALID: ${label}.originalSource richiede HTTPS`);
  }
  if (input.approved !== true) {
    throw new Error(`MANIFEST_MEDIA_NOT_APPROVED: ${label}`);
  }
  return {
    originalSource,
    alt: string(input.alt, `${label}.alt`),
    approved: true,
  };
}

function parseVariant(
  value: unknown,
  label: string,
  parentSku: string,
  optionNames: string[],
): CreateVariant {
  const input = object(value, label);
  const variantSku = sku(input.sku, `${label}.sku`);
  if (input.parentSku !== parentSku) {
    throw new Error(`MANIFEST_PARENT_MISMATCH: ${variantSku}`);
  }
  if (
    input.entityType !== "variation" || input.action !== "CREATE_VARIANT" ||
    input.shopifyVariantId !== null ||
    input.stockTarget !== SHOPIFY_CREATE_STOCK_TARGET ||
    input.readiness !== "READY_FOR_SALE" ||
    input.structureStatus !== "CREATE_NEW"
  ) {
    throw new Error(`MANIFEST_VARIANT_NOT_ELIGIBLE: ${variantSku}`);
  }
  const price = string(input.price, `${label}.price`);
  if (!/^\d+(?:\.\d{1,2})?$/.test(price) || Number(price) <= 0) {
    throw new Error(`MANIFEST_PRICE_INVALID: ${variantSku}`);
  }
  const optionValues = exactArray(input.optionValues, `${label}.optionValues`)
    .map((entry, index) =>
      parseOption(entry, `${label}.optionValues[${index}]`)
    );
  const optionMap = new Map(optionValues.map((entry) => [entry.name, entry]));
  if (
    optionMap.size !== optionNames.length ||
    optionNames.some((name) => !optionMap.has(name))
  ) {
    throw new Error(`MANIFEST_OPTIONS_INVALID: ${variantSku}`);
  }
  return {
    internalProductId: string(
      input.internalProductId,
      `${label}.internalProductId`,
      INTERNAL_ID,
    ),
    sku: variantSku,
    parentSku,
    entityType: "variation",
    action: "CREATE_VARIANT",
    price,
    optionValues,
    shopifyVariantId: null,
    stockTarget: 20,
    readiness: "READY_FOR_SALE",
    structureStatus: "CREATE_NEW",
  };
}

function parseFamily(value: unknown, index: number): CreateFamily {
  const label = `families[${index}]`;
  const input = object(value, label);
  const parentSku = sku(input.parentSku, `${label}.parentSku`);
  if (
    input.entityType !== "variable" ||
    input.action !== "CREATE_VARIABLE_PARENT" ||
    input.shopifyProductId !== null ||
    input.stockTarget !== SHOPIFY_CREATE_STOCK_TARGET ||
    input.readiness !== "READY_FOR_SALE" ||
    input.structureStatus !== "CREATE_NEW"
  ) {
    throw new Error(`MANIFEST_FAMILY_NOT_ELIGIBLE: ${parentSku}`);
  }
  if (
    input.descriptionSource !== "ORIGINAL" &&
    input.descriptionSource !== "MANUAL"
  ) {
    throw new Error(`MANIFEST_DESCRIPTION_SOURCE_BLOCKED: ${parentSku}`);
  }
  const descriptionHtml = string(
    input.descriptionHtml,
    `${label}.descriptionHtml`,
  );
  if (descriptionHtml.replace(/<[^>]+>/g, "").trim().length < 20) {
    throw new Error(`MANIFEST_DESCRIPTION_MISSING: ${parentSku}`);
  }
  const optionNames = exactArray(input.optionNames, `${label}.optionNames`)
    .map((entry, optionIndex) =>
      string(entry, `${label}.optionNames[${optionIndex}]`)
    );
  if (
    optionNames.length === 0 || optionNames.length > 3 ||
    new Set(optionNames).size !== optionNames.length
  ) {
    throw new Error(`MANIFEST_OPTIONS_INVALID: ${parentSku}`);
  }
  const variants = exactArray(input.variants, `${label}.variants`).map(
    (entry, variantIndex) =>
      parseVariant(
        entry,
        `${label}.variants[${variantIndex}]`,
        parentSku,
        optionNames,
      ),
  );
  if (variants.length === 0 || variants.length > 100) {
    throw new Error(`MANIFEST_VARIANTS_EMPTY: ${parentSku}`);
  }
  const variantSkus = new Set(variants.map((entry) => entry.sku));
  if (variantSkus.size !== variants.length) {
    throw new Error(`MANIFEST_DUPLICATE_VARIANT_SKU: ${parentSku}`);
  }
  const media = exactArray(input.media, `${label}.media`).map(
    (entry, mediaIndex) => parseMedia(entry, `${label}.media[${mediaIndex}]`),
  );
  if (new Set(media.map((entry) => entry.alt)).size !== media.length) {
    throw new Error(`MANIFEST_DUPLICATE_MEDIA_ALT: ${parentSku}`);
  }
  if (
    input.mediaStatus !== "APPROVED" &&
    input.mediaStatus !== "NO_APPROVED_IMAGE"
  ) {
    throw new Error(`MANIFEST_MEDIA_STATUS_INVALID: ${parentSku}`);
  }
  if (input.mediaStatus === "APPROVED" && media.length === 0) {
    throw new Error(`MANIFEST_APPROVED_MEDIA_MISSING: ${parentSku}`);
  }
  const publishBlockedFields = exactArray(
    input.publishBlockedFields,
    `${label}.publishBlockedFields`,
  ).map((entry, fieldIndex) =>
    string(entry, `${label}.publishBlockedFields[${fieldIndex}]`)
  );
  if (publishBlockedFields.length > 0) {
    throw new Error(`MANIFEST_PUBLISH_BLOCKED_AI: ${parentSku}`);
  }
  if (
    input.publicationIntent !== "CREATE_DRAFT" &&
    input.publicationIntent !== "READY_TO_PUBLISH"
  ) {
    throw new Error(`MANIFEST_PUBLICATION_INVALID: ${parentSku}`);
  }
  return {
    internalProductId: string(
      input.internalProductId,
      `${label}.internalProductId`,
      INTERNAL_ID,
    ),
    parentSku,
    entityType: "variable",
    action: "CREATE_VARIABLE_PARENT",
    title: string(input.title, `${label}.title`),
    descriptionHtml,
    descriptionSource: input.descriptionSource,
    handle: string(input.handle, `${label}.handle`, HANDLE),
    shopifyProductId: null,
    optionNames,
    variants,
    media,
    mediaStatus: input.mediaStatus,
    publicationIntent: input.publicationIntent,
    publishBlockedFields: [],
    stockTarget: 20,
    readiness: "READY_FOR_SALE",
    structureStatus: "CREATE_NEW",
  };
}

export function parseCreateManifest(value: unknown): CreateManifest {
  const input = object(value, "manifest");
  if (
    input.schemaVersion !== "3B.2-v1" || input.sourceManifest !== "3B.1C"
  ) {
    throw new Error("MANIFEST_INVALID: schema/source non validi");
  }
  const batchId = string(input.batchId, "batchId", BATCH_ID);
  const families = exactArray(input.families, "families").map(parseFamily);
  if (families.length === 0 || families.length > SHOPIFY_CREATE_MAX_FAMILIES) {
    throw new Error(
      `BATCH_SIZE_INVALID: massimo ${SHOPIFY_CREATE_MAX_FAMILIES} famiglie`,
    );
  }
  const parentSkus = new Set<string>();
  const allSkus = new Set<string>();
  const handles = new Set<string>();
  for (const family of families) {
    if (parentSkus.has(family.parentSku) || handles.has(family.handle)) {
      throw new Error(`MANIFEST_DUPLICATE_PARENT: ${family.parentSku}`);
    }
    parentSkus.add(family.parentSku);
    handles.add(family.handle);
    for (const variant of family.variants) {
      if (allSkus.has(variant.sku)) {
        throw new Error(`MANIFEST_DUPLICATE_SKU: ${variant.sku}`);
      }
      allSkus.add(variant.sku);
    }
  }
  return {
    schemaVersion: "3B.2-v1",
    sourceManifest: "3B.1C",
    batchId,
    families,
  };
}

export { SHOPIFY_CREATE_LOCATION_ID };
