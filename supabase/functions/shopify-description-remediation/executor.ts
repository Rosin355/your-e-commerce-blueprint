import {
  canonicalDescription,
  normalizeApprovedOriginalDescription,
} from "./description.ts";
import type {
  RemediationItem,
  RemediationManifest,
  RemediationMode,
  RemediationProductState,
  RemediationReport,
  RemediationResult,
  RemediationShopifyClient,
  RemediationStatus,
} from "./types.ts";

export class RemediationError extends Error {
  constructor(public code: string, message: string, public systemic = false) {
    super(message);
  }
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

function comparable(state: RemediationProductState) {
  return {
    ...state,
    variants: [...state.variants].sort((a, b) => a.id.localeCompare(b.id)),
    media: [...state.media].sort((a, b) => a.id.localeCompare(b.id)),
    publicationIds: [...state.publicationIds].sort(),
    scheduledPublicationIds: [...state.scheduledPublicationIds].sort(),
  };
}

function sameState(a: RemediationProductState, b: RemediationProductState) {
  return canonical(comparable(a)) === canonical(comparable(b));
}

function sameUnrelatedFields(
  before: RemediationProductState,
  after: RemediationProductState,
) {
  return sameState(
    { ...before, descriptionHtml: "__DESCRIPTION__" },
    { ...after, descriptionHtml: "__DESCRIPTION__" },
  );
}

function safeError(error: unknown) {
  if (error instanceof RemediationError) return error;
  const raw = error instanceof Error ? error.message : String(error);
  const systemic =
    /401|403|scope|throttl|rate limit persistente|network|fetch|HTTP 5|service unavailable/i
      .test(raw);
  return new RemediationError(
    systemic ? "SYSTEMIC_SHOPIFY_ERROR" : "ITEM_SHOPIFY_ERROR",
    systemic ? "Errore sistemico Shopify" : "Operazione Shopify non completata",
    systemic,
  );
}

async function executeItem(
  client: RemediationShopifyClient,
  item: RemediationItem,
  mode: RemediationMode,
): Promise<RemediationResult> {
  const base: RemediationResult = {
    parentSku: item.parentSku,
    shopifyProductId: item.shopifyProductId,
    status: "READY_TO_REMEDIATE",
    plannedOperation: "UPDATE_DESCRIPTION_ONLY",
    writeCount: 0,
  };
  const target = normalizeApprovedOriginalDescription(
    item.approvedOriginalDescriptionHtml,
  );
  const before = await client.readProduct(item.shopifyProductId);
  if (!before || before.id !== item.shopifyProductId) {
    return { ...base, status: "BLOCKED", code: "IDENTITY_MISMATCH" };
  }
  if (
    item.expectedCurrent.variantCount !==
      item.expectedCurrent.variants.length ||
    item.expectedCurrent.mediaCount !== item.expectedCurrent.media.length ||
    before.variantCount !== before.variants.length ||
    before.mediaCount !== before.media.length
  ) {
    return { ...base, status: "BLOCKED", code: "SNAPSHOT_TRUNCATED" };
  }
  if (canonicalDescription(before.descriptionHtml) === target) {
    return { ...base, status: "ALREADY_REMEDIATED" };
  }
  if (!sameState(before, item.expectedCurrent)) {
    return {
      ...base,
      status: "BLOCKED",
      code: "STATE_DRIFT",
      message: "Lo stato Shopify differisce dal preflight approvato",
    };
  }
  if (mode === "DRY_RUN") return base;
  await client.updateDescription(item.shopifyProductId, target);
  const after = await client.readProduct(item.shopifyProductId);
  if (!after || after.id !== before.id) {
    throw new RemediationError(
      "POST_WRITE_IDENTITY_MISMATCH",
      "ID prodotto cambiato",
    );
  }
  if (canonicalDescription(after.descriptionHtml) !== target) {
    throw new RemediationError(
      "DESCRIPTION_POSTCONDITION_FAILED",
      "Descrizione non conforme",
    );
  }
  if (!sameUnrelatedFields(before, after)) {
    throw new RemediationError(
      "FIELD_ISOLATION_POSTCONDITION_FAILED",
      "Un campo non autorizzato è cambiato",
      true,
    );
  }
  return { ...base, status: "REMEDIATED", writeCount: 1 };
}

export async function executeRemediationBatch(
  client: RemediationShopifyClient,
  manifest: RemediationManifest,
  mode: RemediationMode,
): Promise<RemediationReport> {
  const results: RemediationResult[] = [];
  let stopped = false;
  let stopCode: string | undefined;
  for (const item of manifest.items) {
    if (stopped) {
      results.push({
        parentSku: item.parentSku,
        shopifyProductId: item.shopifyProductId,
        status: "SKIPPED",
        plannedOperation: "UPDATE_DESCRIPTION_ONLY",
        writeCount: 0,
        code: "BATCH_STOPPED",
      });
      continue;
    }
    try {
      results.push(await executeItem(client, item, mode));
    } catch (error) {
      const safe = safeError(error);
      results.push({
        parentSku: item.parentSku,
        shopifyProductId: item.shopifyProductId,
        status: "FAILED",
        plannedOperation: "UPDATE_DESCRIPTION_ONLY",
        writeCount: 0,
        code: safe.code,
        message: safe.message,
      });
      if (safe.systemic) {
        stopped = true;
        stopCode = safe.code;
      }
    }
  }
  const statuses: RemediationStatus[] = [
    "READY_TO_REMEDIATE",
    "REMEDIATED",
    "ALREADY_REMEDIATED",
    "BLOCKED",
    "FAILED",
    "SKIPPED",
  ];
  const summary = Object.fromEntries(
    statuses.map((
      status,
    ) => [status, results.filter((r) => r.status === status).length]),
  ) as Record<RemediationStatus, number>;
  return {
    ok: !stopped && summary.BLOCKED === 0 && summary.FAILED === 0,
    mode,
    batchId: manifest.batchId,
    stopped,
    ...(stopCode ? { stopCode } : {}),
    summary,
    results,
  };
}
