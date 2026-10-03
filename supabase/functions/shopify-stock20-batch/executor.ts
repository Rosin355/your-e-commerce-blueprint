import {
  STOCK20_LOCATION_ID,
  STOCK20_TARGET,
  type Stock20BatchReport,
  type Stock20ItemResult,
  type Stock20LiveState,
  type Stock20Manifest,
  type Stock20ManifestItem,
  type Stock20Mode,
  type Stock20ShopifyClient,
} from "./types.ts";

export class Stock20Error extends Error {
  constructor(
    public code: string,
    message: string,
    public systemic = false,
  ) {
    super(message);
  }
}

export function stock20IdempotencyKey(
  batchId: string,
  inventoryItemId: string,
): string {
  return `stock20:${batchId}:${inventoryItemId}:${STOCK20_TARGET}`;
}

function assertLiveIdentity(
  item: Stock20ManifestItem,
  state: Stock20LiveState,
): void {
  const exact = state.sku === item.sku &&
    state.shopifyProductId === item.shopifyProductId &&
    state.shopifyVariantId === item.shopifyVariantId &&
    state.inventoryItemId === item.inventoryItemId &&
    state.locationId === STOCK20_LOCATION_ID;
  if (!exact) {
    throw new Stock20Error(
      "LIVE_IDENTITY_MISMATCH",
      "Identità Shopify diversa dal manifest approvato",
    );
  }
}

function desired(state: Stock20LiveState): boolean {
  return state.tracked && state.inventoryPolicy === "DENY" &&
    state.available === STOCK20_TARGET;
}

function assertManifestState(
  item: Stock20ManifestItem,
  state: Stock20LiveState,
): void {
  const trackedMatches = item.currentTracked === null ||
    item.currentTracked === state.tracked;
  const policyMatches = item.currentPolicy === null ||
    item.currentPolicy === state.inventoryPolicy;
  const availableMatches = item.currentAvailable === null ||
    item.currentAvailable === state.available;
  if (!trackedMatches || !policyMatches || !availableMatches) {
    throw new Stock20Error(
      "MANIFEST_STATE_DRIFT",
      "Lo stato live è cambiato rispetto al manifest; rigenerare il preflight",
    );
  }
}

function planned(
  state: Stock20LiveState,
): Stock20ItemResult["plannedMutations"] {
  const result: Stock20ItemResult["plannedMutations"] = [];
  if (!state.tracked) result.push("ENABLE_TRACKING");
  if (state.inventoryPolicy !== "DENY") result.push("SET_POLICY_DENY");
  if (state.available !== STOCK20_TARGET) result.push("SET_AVAILABLE_20");
  return result;
}

function safeError(
  error: unknown,
): { code: string; message: string; systemic: boolean } {
  if (error instanceof Stock20Error) {
    return {
      code: error.code,
      message: error.message,
      systemic: error.systemic,
    };
  }
  const raw = error instanceof Error ? error.message : String(error);
  const systemic =
    /401|403|unauthor|forbidden|access.denied|scope|location|graphql.errors|schema|rate limit persistente|throttled/i
      .test(raw);
  return {
    code: systemic ? "SYSTEMIC_SHOPIFY_ERROR" : "ITEM_SHOPIFY_ERROR",
    message: systemic
      ? "Errore Shopify sistemico; batch interrotto"
      : "Operazione Shopify non completata per l'elemento",
    systemic,
  };
}

async function executeItem(
  client: Stock20ShopifyClient,
  manifest: Stock20Manifest,
  item: Stock20ManifestItem,
  mode: Stock20Mode,
): Promise<Stock20ItemResult> {
  const idempotencyKey = stock20IdempotencyKey(
    manifest.batchId,
    item.inventoryItemId,
  );
  const before = await client.readState(item);
  assertLiveIdentity(item, before);
  const mutations = planned(before);
  if (desired(before)) {
    return {
      sku: item.sku,
      inventoryItemId: item.inventoryItemId,
      idempotencyKey,
      status: "ALREADY_AT_TARGET",
      before,
      after: before,
      plannedMutations: [],
      appliedMutations: [],
    };
  }
  assertManifestState(item, before);
  if (mode === "DRY_RUN") {
    return {
      sku: item.sku,
      inventoryItemId: item.inventoryItemId,
      idempotencyKey,
      status: "SKIPPED",
      code: "DRY_RUN_WOULD_UPDATE",
      message: "Dry-run: nessuna mutation eseguita",
      before,
      plannedMutations: mutations,
      appliedMutations: [],
    };
  }

  const applied: Stock20ItemResult["appliedMutations"] = [];
  if (!before.tracked) {
    await client.enableTracking(item.inventoryItemId);
    applied.push("ENABLE_TRACKING");
  }
  if (before.inventoryPolicy !== "DENY") {
    await client.setInventoryPolicy(
      item.shopifyProductId,
      item.shopifyVariantId,
      "DENY",
    );
    applied.push("SET_POLICY_DENY");
  }
  if (before.available !== STOCK20_TARGET) {
    try {
      await client.setAvailableAbsolute({
        inventoryItemId: item.inventoryItemId,
        locationId: STOCK20_LOCATION_ID,
        quantity: STOCK20_TARGET,
        compareQuantity: before.available,
        idempotencyKey,
      });
      applied.push("SET_AVAILABLE_20");
    } catch (error) {
      // Protezione applicativa per retry concorrenti su API 2025-07: una sola
      // rilettura. Nessun retry della mutation e nessun incremento relativo.
      const reconciled = await client.readState(item);
      assertLiveIdentity(item, reconciled);
      if (!desired(reconciled)) throw error;
      return {
        sku: item.sku,
        inventoryItemId: item.inventoryItemId,
        idempotencyKey,
        status: "ALREADY_AT_TARGET",
        code: "CONCURRENT_REPLAY_RECONCILED",
        message: "Target già applicato da una richiesta concorrente",
        before,
        after: reconciled,
        plannedMutations: mutations,
        appliedMutations: applied,
      };
    }
  }
  const after = await client.readState(item);
  assertLiveIdentity(item, after);
  if (!desired(after)) {
    throw new Stock20Error(
      "POSTCONDITION_FAILED",
      "Verifica post-write non conforme al target",
    );
  }
  return {
    sku: item.sku,
    inventoryItemId: item.inventoryItemId,
    idempotencyKey,
    status: "UPDATED",
    before,
    after,
    plannedMutations: mutations,
    appliedMutations: applied,
  };
}

export async function executeStock20Batch(
  client: Stock20ShopifyClient,
  manifest: Stock20Manifest,
  mode: Stock20Mode,
): Promise<Stock20BatchReport> {
  const results: Stock20ItemResult[] = [];
  let stopped = false;
  let stopCode: string | undefined;

  for (const item of manifest.items) {
    if (stopped) {
      results.push({
        sku: item.sku,
        inventoryItemId: item.inventoryItemId,
        idempotencyKey: stock20IdempotencyKey(
          manifest.batchId,
          item.inventoryItemId,
        ),
        status: "SKIPPED",
        code: "BATCH_STOPPED",
        message: "Elemento non processato dopo errore sistemico",
        plannedMutations: [],
        appliedMutations: [],
      });
      continue;
    }
    try {
      results.push(await executeItem(client, manifest, item, mode));
    } catch (error) {
      const safe = safeError(error);
      results.push({
        sku: item.sku,
        inventoryItemId: item.inventoryItemId,
        idempotencyKey: stock20IdempotencyKey(
          manifest.batchId,
          item.inventoryItemId,
        ),
        status: "FAILED",
        code: safe.code,
        message: safe.message,
        plannedMutations: [],
        appliedMutations: [],
      });
      if (safe.systemic) {
        stopped = true;
        stopCode = safe.code;
      }
    }
  }

  const summary = {
    UPDATED: 0,
    ALREADY_AT_TARGET: 0,
    SKIPPED: 0,
    FAILED: 0,
  };
  for (const result of results) summary[result.status] += 1;
  return {
    ok: summary.FAILED === 0,
    mode,
    batchId: manifest.batchId,
    targetAvailable: STOCK20_TARGET,
    locationId: STOCK20_LOCATION_ID,
    stopped,
    ...(stopCode ? { stopCode } : {}),
    summary,
    results,
  };
}
