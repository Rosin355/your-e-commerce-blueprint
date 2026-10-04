import type {
  PublicationEvidence,
  PublicationEvidenceLedger,
  PublicationItem,
  PublicationLiveProduct,
  PublicationManifest,
  PublicationMode,
  PublicationReport,
  PublicationResult,
  PublicationResultStatus,
  PublicationShopifyClient,
} from "./types.ts";

export class PublicationError extends Error {
  constructor(public code: string, message: string, public systemic = false) {
    super(message);
  }
}

function normalizeHtml(value: string) {
  return value.replace(/\r\n?/g, "\n").trim();
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
        .join(",")
    }}`;
  }
  return JSON.stringify(value);
}

function orderedProduct(value: PublicationLiveProduct) {
  return {
    ...value,
    variants: [...value.variants].sort((a, b) => a.id.localeCompare(b.id)),
    media: [...value.media].sort((a, b) => a.id.localeCompare(b.id)),
    publicationIds: [...value.publicationIds].sort(),
    scheduledPublicationIds: [...value.scheduledPublicationIds].sort(),
  };
}

function invariantIssue(
  product: PublicationLiveProduct,
  item: PublicationItem,
) {
  const expected = item.expected;
  if (product.id !== item.shopifyProductId || product.id !== expected.id) {
    return "IDENTITY_MISMATCH";
  }
  if (product.title !== expected.title || product.handle !== expected.handle) {
    return "IDENTITY_CONFLICT";
  }
  if (
    normalizeHtml(product.descriptionHtml) !==
      normalizeHtml(expected.descriptionHtml)
  ) return "DESCRIPTION_NOT_APPROVED";
  if (canonical(product.options) !== canonical(expected.options)) {
    return "OPTION_STRUCTURE_MISMATCH";
  }
  if (
    product.variantCount !== expected.variants.length ||
    product.variants.length !== expected.variants.length
  ) return "UNEXPECTED_VARIANTS";
  const actualVariants = [...product.variants].sort((a, b) =>
    a.id.localeCompare(b.id)
  );
  const expectedVariants = [...expected.variants].sort((a, b) =>
    a.id.localeCompare(b.id)
  );
  if (canonical(actualVariants) !== canonical(expectedVariants)) {
    return "VARIANT_OR_INVENTORY_MISMATCH";
  }
  if (
    product.mediaCount !== expected.media.length ||
    product.media.length !== expected.media.length
  ) return "MEDIA_SET_MISMATCH";
  const actualMedia = [...product.media].sort((a, b) =>
    a.id.localeCompare(b.id)
  );
  const expectedMedia = [...expected.media].sort((a, b) =>
    a.id.localeCompare(b.id)
  );
  if (canonical(actualMedia) !== canonical(expectedMedia)) {
    return "MEDIA_NOT_READY";
  }
  return null;
}

function unrelatedState(product: PublicationLiveProduct) {
  const ordered = orderedProduct(product);
  return {
    ...ordered,
    status: "__STATUS__",
    publicationIds: ["__PUBLICATIONS__"],
    scheduledPublicationIds: ["__SCHEDULED_PUBLICATIONS__"],
  };
}

function planned(product: PublicationLiveProduct, targetPublicationId: string) {
  const operations: PublicationResult["plannedOperations"] = [];
  if (product.status !== "ACTIVE") operations.push("SET_ACTIVE");
  if (!product.publicationIds.includes(targetPublicationId)) {
    operations.push("PUBLISH_ONLINE_STORE");
  }
  return operations;
}

function safeError(error: unknown) {
  if (error instanceof PublicationError) return error;
  const raw = error instanceof Error ? error.message : String(error);
  const systemic =
    /401|403|scope|throttl|rate limit persistente|network|fetch|HTTP 5|service unavailable|LEDGER_/i
      .test(raw);
  return new PublicationError(
    systemic ? "SYSTEMIC_SHOPIFY_ERROR" : "ITEM_SHOPIFY_ERROR",
    systemic
      ? "Errore sistemico Shopify"
      : "Pubblicazione Shopify non completata",
    systemic,
  );
}

export function publicationEvidenceRequestKey(
  batchId: string,
  productId: string,
) {
  return `shopify-publication:${batchId}:${productId}:SET_ACTIVE`;
}

export async function buildPublicationEvidence(
  manifest: PublicationManifest,
  item: PublicationItem,
): Promise<PublicationEvidence> {
  const requestKey = publicationEvidenceRequestKey(
    manifest.batchId,
    item.shopifyProductId,
  );
  const payload =
    `${manifest.batchId}:${item.parentSku}:${item.shopifyProductId}:SET_ACTIVE`;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload),
  );
  return {
    batchId: manifest.batchId,
    parentSku: item.parentSku,
    productId: item.shopifyProductId,
    operation: "SET_ACTIVE",
    requestKey,
    payloadHash: [...new Uint8Array(digest)]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join(""),
    status: "RESERVED",
    appliedAt: null,
    verifiedAt: null,
  };
}

function evidenceIssue(
  actual: PublicationEvidence,
  expected: PublicationEvidence,
): string | null {
  if (
    actual.batchId !== expected.batchId ||
    actual.parentSku !== expected.parentSku ||
    actual.productId !== expected.productId ||
    actual.operation !== "SET_ACTIVE" ||
    actual.requestKey !== expected.requestKey ||
    actual.payloadHash !== expected.payloadHash
  ) return "IDEMPOTENCY_CONFLICT";
  if (
    (actual.status === "APPLIED" && Boolean(actual.appliedAt)) ||
    (actual.status === "VERIFIED" &&
      Boolean(actual.appliedAt) &&
      Boolean(actual.verifiedAt))
  ) return null;
  return "IDEMPOTENCY_CONFLICT";
}

async function executeItem(
  client: PublicationShopifyClient,
  ledger: PublicationEvidenceLedger,
  manifest: PublicationManifest,
  item: PublicationItem,
  targetPublicationId: string,
  mode: PublicationMode,
): Promise<PublicationResult> {
  const product = await client.readProduct(item.shopifyProductId);
  const base = {
    parentSku: item.parentSku,
    shopifyProductId: item.shopifyProductId,
    plannedOperations: [] as PublicationResult["plannedOperations"],
    appliedOperations: [] as PublicationResult["appliedOperations"],
  };
  if (!product) {
    return { ...base, status: "BLOCKED", code: "PRODUCT_NOT_FOUND" };
  }
  const issue = invariantIssue(product, item);
  if (issue) return { ...base, status: "BLOCKED", code: issue };
  const unexpectedPublications = product.publicationIds.filter((id) =>
    id !== targetPublicationId
  );
  if (unexpectedPublications.length || product.scheduledPublicationIds.length) {
    return { ...base, status: "BLOCKED", code: "UNEXPECTED_PUBLICATION" };
  }
  if (!["DRAFT", "ACTIVE"].includes(product.status)) {
    return { ...base, status: "BLOCKED", code: "PRODUCT_STATUS_BLOCKED" };
  }
  const expectedEvidence = await buildPublicationEvidence(manifest, item);
  const storedEvidence = await ledger.find(
    manifest.batchId,
    item.parentSku,
  );
  if (storedEvidence) {
    const proofIssue = evidenceIssue(storedEvidence, expectedEvidence);
    if (proofIssue) {
      return { ...base, status: "BLOCKED", code: proofIssue };
    }
  }
  if (product.status === "ACTIVE" && !storedEvidence) {
    return { ...base, status: "BLOCKED", code: "STATE_DRIFT" };
  }
  if (product.status === "DRAFT" && storedEvidence) {
    return { ...base, status: "BLOCKED", code: "STATE_DRIFT" };
  }
  const operations = planned(product, targetPublicationId);
  if (operations.length === 0) {
    if (mode === "EXECUTE" && storedEvidence?.status === "APPLIED") {
      await ledger.markVerified(expectedEvidence);
    }
    return { ...base, status: "ALREADY_PUBLISHED" };
  }
  if (mode === "DRY_RUN") {
    return {
      ...base,
      status: "READY_TO_PUBLISH",
      plannedOperations: operations,
    };
  }
  const applied: PublicationResult["appliedOperations"] = [];
  if (operations.includes("SET_ACTIVE")) {
    const reservation = await ledger.reserve(expectedEvidence);
    if (reservation.kind === "EXISTING") {
      const proofIssue = evidenceIssue(reservation.evidence, expectedEvidence);
      return {
        ...base,
        status: "BLOCKED",
        code: proofIssue ?? "STATE_DRIFT",
      };
    }
    await client.activateProduct(item.shopifyProductId);
    await ledger.markApplied(expectedEvidence);
    applied.push("SET_ACTIVE");
  }
  if (operations.includes("PUBLISH_ONLINE_STORE")) {
    await client.publishProduct(item.shopifyProductId, targetPublicationId);
    applied.push("PUBLISH_ONLINE_STORE");
  }
  const after = await client.readProduct(item.shopifyProductId);
  if (!after || after.id !== product.id || invariantIssue(after, item)) {
    throw new PublicationError(
      "PUBLICATION_POSTCONDITION_FAILED",
      "Stato commerciale variato",
    );
  }
  if (canonical(unrelatedState(product)) !== canonical(unrelatedState(after))) {
    throw new PublicationError(
      "FIELD_ISOLATION_POSTCONDITION_FAILED",
      "Campo non autorizzato variato",
      true,
    );
  }
  if (
    after.status !== "ACTIVE" ||
    !after.publicationIds.includes(targetPublicationId) ||
    after.publicationIds.some((id) => id !== targetPublicationId)
  ) {
    throw new PublicationError(
      "PUBLICATION_POSTCONDITION_FAILED",
      "Prodotto non visibile solo su Online Store",
    );
  }
  await ledger.markVerified(expectedEvidence);
  return {
    ...base,
    status: "PUBLISHED",
    plannedOperations: operations,
    appliedOperations: applied,
  };
}

export async function executePublicationBatch(
  client: PublicationShopifyClient,
  ledger: PublicationEvidenceLedger,
  manifest: PublicationManifest,
  mode: PublicationMode,
): Promise<PublicationReport> {
  const publication = await client.readPublication(
    manifest.targetPublication.id,
  );
  if (
    !publication || publication.id !== manifest.targetPublication.id ||
    publication.name !== "Online Store"
  ) {
    throw new PublicationError(
      "ONLINE_STORE_PUBLICATION_MISMATCH",
      "Canale Online Store non verificato",
      true,
    );
  }
  const results: PublicationResult[] = [];
  let stopped = false;
  let stopCode: string | undefined;
  for (const item of manifest.items) {
    if (stopped) {
      results.push({
        parentSku: item.parentSku,
        shopifyProductId: item.shopifyProductId,
        status: "SKIPPED",
        plannedOperations: [],
        appliedOperations: [],
        code: "BATCH_STOPPED",
      });
      continue;
    }
    try {
      results.push(
        await executeItem(
          client,
          ledger,
          manifest,
          item,
          publication.id,
          mode,
        ),
      );
    } catch (error) {
      const safe = safeError(error);
      results.push({
        parentSku: item.parentSku,
        shopifyProductId: item.shopifyProductId,
        status: "FAILED",
        plannedOperations: [],
        appliedOperations: [],
        code: safe.code,
        message: safe.message,
      });
      if (safe.systemic) {
        stopped = true;
        stopCode = safe.code;
      }
    }
  }
  const statuses: PublicationResultStatus[] = [
    "READY_TO_PUBLISH",
    "PUBLISHED",
    "ALREADY_PUBLISHED",
    "BLOCKED",
    "FAILED",
    "SKIPPED",
  ];
  const summary = Object.fromEntries(
    statuses.map((
      status,
    ) => [status, results.filter((result) => result.status === status).length]),
  ) as Record<PublicationResultStatus, number>;
  return {
    ok: !stopped && summary.BLOCKED === 0 && summary.FAILED === 0,
    mode,
    batchId: manifest.batchId,
    targetPublication: manifest.targetPublication,
    stopped,
    ...(stopCode ? { stopCode } : {}),
    summary,
    results,
  };
}
