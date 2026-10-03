import {
  STOCK20_LOCATION_ID,
  STOCK20_TARGET,
  type Stock20BatchReport,
  type Stock20FailedStep,
  type Stock20ItemResult,
  type Stock20LiveState,
  type Stock20Manifest,
  type Stock20ManifestItem,
  type Stock20Mode,
  type Stock20Mutation,
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

interface Stock20ExecutionContext {
  before?: Stock20LiveState;
  after?: Stock20LiveState;
  plannedMutations: Stock20Mutation[];
  appliedMutations: Stock20Mutation[];
  failedStep: Stock20FailedStep;
  recoveryAttempted: boolean;
  recoveryIdempotencyKey?: string;
}

export class Stock20ExecutionError extends Stock20Error {
  constructor(
    code: string,
    message: string,
    systemic: boolean,
    public context: Stock20ExecutionContext,
  ) {
    super(code, message, systemic);
  }
}

export function stock20IdempotencyKey(
  batchId: string,
  inventoryItemId: string,
): string {
  return `stock20:${batchId}:${inventoryItemId}:${STOCK20_TARGET}`;
}

export function stock20RecoveryIdempotencyKey(
  batchId: string,
  inventoryItemId: string,
): string {
  return `${stock20IdempotencyKey(batchId, inventoryItemId)}:recovery-1`;
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
    if (error.code === "ITEM_SHOPIFY_ERROR") {
      return {
        code: error.code,
        message: "Operazione Shopify non completata per l'elemento",
        systemic: false,
      };
    }
    if (error.code === "SYSTEMIC_SHOPIFY_ERROR") {
      return {
        code: error.code,
        message: "Errore Shopify sistemico; batch interrotto",
        systemic: true,
      };
    }
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

function executionFailure(
  error: unknown,
  context: Stock20ExecutionContext,
): Stock20ExecutionError {
  const safe = safeError(error);
  return new Stock20ExecutionError(
    safe.code,
    safe.message,
    safe.systemic,
    {
      ...context,
      plannedMutations: [...context.plannedMutations],
      appliedMutations: [...context.appliedMutations],
    },
  );
}

function resultRecoveryFields(
  recoveryAttempted: boolean,
  recoveryIdempotencyKey?: string,
): Pick<
  Stock20ItemResult,
  "recoveryAttempted" | "recoveryIdempotencyKey"
> {
  return {
    recoveryAttempted,
    ...(recoveryIdempotencyKey ? { recoveryIdempotencyKey } : {}),
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
  let before: Stock20LiveState;
  try {
    before = await client.readState(item);
  } catch (error) {
    throw executionFailure(error, {
      plannedMutations: [],
      appliedMutations: [],
      failedStep: "READ_BEFORE",
      recoveryAttempted: false,
    });
  }
  try {
    assertLiveIdentity(item, before);
  } catch (error) {
    throw executionFailure(error, {
      before,
      plannedMutations: [],
      appliedMutations: [],
      failedStep: "VALIDATE_BEFORE",
      recoveryAttempted: false,
    });
  }
  const mutations = planned(before);
  if (desired(before)) {
    return {
      sku: item.sku,
      inventoryItemId: item.inventoryItemId,
      idempotencyKey,
      primaryIdempotencyKey: idempotencyKey,
      status: "ALREADY_AT_TARGET",
      before,
      after: before,
      plannedMutations: [],
      appliedMutations: [],
      recoveryAttempted: false,
    };
  }
  try {
    assertManifestState(item, before);
  } catch (error) {
    throw executionFailure(error, {
      before,
      plannedMutations: mutations,
      appliedMutations: [],
      failedStep: "VALIDATE_BEFORE",
      recoveryAttempted: false,
    });
  }
  if (mode === "DRY_RUN") {
    return {
      sku: item.sku,
      inventoryItemId: item.inventoryItemId,
      idempotencyKey,
      primaryIdempotencyKey: idempotencyKey,
      status: "SKIPPED",
      code: "DRY_RUN_WOULD_UPDATE",
      message: "Dry-run: nessuna mutation eseguita",
      before,
      plannedMutations: mutations,
      appliedMutations: [],
      recoveryAttempted: false,
    };
  }

  const applied: Stock20ItemResult["appliedMutations"] = [];
  if (!before.tracked) {
    try {
      await client.enableTracking(item.inventoryItemId);
    } catch (error) {
      throw executionFailure(error, {
        before,
        plannedMutations: mutations,
        appliedMutations: applied,
        failedStep: "ENABLE_TRACKING",
        recoveryAttempted: false,
      });
    }
    applied.push("ENABLE_TRACKING");
  }
  if (before.inventoryPolicy !== "DENY") {
    try {
      await client.setInventoryPolicy(
        item.shopifyProductId,
        item.shopifyVariantId,
        "DENY",
      );
    } catch (error) {
      throw executionFailure(error, {
        before,
        plannedMutations: mutations,
        appliedMutations: applied,
        failedStep: "SET_POLICY_DENY",
        recoveryAttempted: false,
      });
    }
    applied.push("SET_POLICY_DENY");
  }
  let recoveryAttempted = false;
  let recoveryIdempotencyKey: string | undefined;
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
      let reconciled: Stock20LiveState;
      try {
        reconciled = await client.readState(item);
        assertLiveIdentity(item, reconciled);
      } catch (readError) {
        throw executionFailure(readError, {
          before,
          plannedMutations: mutations,
          appliedMutations: applied,
          failedStep: "READ_AFTER_PRIMARY_ERROR",
          recoveryAttempted: false,
        });
      }
      if (desired(reconciled)) {
        return {
          sku: item.sku,
          inventoryItemId: item.inventoryItemId,
          idempotencyKey,
          primaryIdempotencyKey: idempotencyKey,
          status: "ALREADY_AT_TARGET",
          code: error instanceof Stock20Error &&
              error.code === "IDEMPOTENCY_PREVIOUS_ATTEMPT_FAILED"
            ? "IDEMPOTENCY_PREVIOUS_ATTEMPT_RECONCILED"
            : "CONCURRENT_REPLAY_RECONCILED",
          message: "Target già presente dopo la riconciliazione read-only",
          before,
          after: reconciled,
          plannedMutations: mutations,
          appliedMutations: applied,
          recoveryAttempted: false,
        };
      }

      if (
        error instanceof Stock20Error &&
        error.code === "IDEMPOTENCY_PREVIOUS_ATTEMPT_FAILED"
      ) {
        recoveryAttempted = true;
        recoveryIdempotencyKey = stock20RecoveryIdempotencyKey(
          manifest.batchId,
          item.inventoryItemId,
        );
        try {
          await client.setAvailableAbsolute({
            inventoryItemId: item.inventoryItemId,
            locationId: STOCK20_LOCATION_ID,
            quantity: STOCK20_TARGET,
            compareQuantity: reconciled.available,
            idempotencyKey: recoveryIdempotencyKey,
          });
          applied.push("SET_AVAILABLE_20");
        } catch (recoveryError) {
          throw executionFailure(recoveryError, {
            before,
            after: reconciled,
            plannedMutations: mutations,
            appliedMutations: applied,
            failedStep: "SET_AVAILABLE_20_RECOVERY",
            recoveryAttempted,
            recoveryIdempotencyKey,
          });
        }
      } else {
        throw executionFailure(error, {
          before,
          after: reconciled,
          plannedMutations: mutations,
          appliedMutations: applied,
          failedStep: "SET_AVAILABLE_20_PRIMARY",
          recoveryAttempted: false,
        });
      }
    }
  }
  let after: Stock20LiveState;
  try {
    after = await client.readState(item);
    assertLiveIdentity(item, after);
  } catch (error) {
    throw executionFailure(error, {
      before,
      plannedMutations: mutations,
      appliedMutations: applied,
      failedStep: "READ_AFTER",
      recoveryAttempted,
      recoveryIdempotencyKey,
    });
  }
  if (!desired(after)) {
    throw executionFailure(
      new Stock20Error(
        "POSTCONDITION_FAILED",
        "Verifica post-write non conforme al target",
      ),
      {
        before,
        after,
        plannedMutations: mutations,
        appliedMutations: applied,
        failedStep: "POSTCONDITION",
        recoveryAttempted,
        recoveryIdempotencyKey,
      },
    );
  }
  return {
    sku: item.sku,
    inventoryItemId: item.inventoryItemId,
    idempotencyKey,
    primaryIdempotencyKey: idempotencyKey,
    status: "UPDATED",
    before,
    after,
    plannedMutations: mutations,
    appliedMutations: applied,
    ...resultRecoveryFields(recoveryAttempted, recoveryIdempotencyKey),
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
        primaryIdempotencyKey: stock20IdempotencyKey(
          manifest.batchId,
          item.inventoryItemId,
        ),
        status: "SKIPPED",
        code: "BATCH_STOPPED",
        message: "Elemento non processato dopo errore sistemico",
        plannedMutations: [],
        appliedMutations: [],
        recoveryAttempted: false,
      });
      continue;
    }
    try {
      results.push(await executeItem(client, manifest, item, mode));
    } catch (error) {
      const safe = safeError(error);
      const context = error instanceof Stock20ExecutionError
        ? error.context
        : undefined;
      results.push({
        sku: item.sku,
        inventoryItemId: item.inventoryItemId,
        idempotencyKey: stock20IdempotencyKey(
          manifest.batchId,
          item.inventoryItemId,
        ),
        primaryIdempotencyKey: stock20IdempotencyKey(
          manifest.batchId,
          item.inventoryItemId,
        ),
        status: "FAILED",
        code: safe.code,
        message: safe.message,
        ...(context?.before ? { before: context.before } : {}),
        ...(context?.after ? { after: context.after } : {}),
        plannedMutations: context?.plannedMutations ?? [],
        appliedMutations: context?.appliedMutations ?? [],
        ...(context?.failedStep ? { failedStep: context.failedStep } : {}),
        ...resultRecoveryFields(
          context?.recoveryAttempted ?? false,
          context?.recoveryIdempotencyKey,
        ),
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
