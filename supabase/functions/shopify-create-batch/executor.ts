import { ShopifyCreateError } from "./shopify-client.ts";
import type {
  CreateBatchReport,
  CreateFamily,
  CreateFamilyResult,
  CreateManifest,
  CreateMode,
  CreateResultStatus,
  CreateVariant,
  CreationLedger,
  LedgerRecord,
  ShopifyCreateClient,
  ShopifyProductIdentity,
} from "./types.ts";

export class CreateExecutionError extends Error {
  constructor(
    public code: string,
    message: string,
    public systemic: boolean,
    public result: CreateFamilyResult,
  ) {
    super(message);
  }
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
        .join(",")
    }}`;
  }
  return JSON.stringify(value);
}

export async function payloadHash(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical(value)),
  );
  return [...new Uint8Array(digest)].map((entry) =>
    entry.toString(16).padStart(2, "0")
  ).join("");
}

function requestKey(
  batchId: string,
  parentSku: string,
  operation: string,
  sku?: string,
) {
  return `shopify-create:${batchId}:${parentSku}:${operation}${
    sku ? `:${sku}` : ""
  }`;
}

function plannedOperations(family: CreateFamily): string[] {
  return [
    "CREATE_PARENT_DRAFT",
    "CREATE_OPTIONS",
    ...family.variants.map((entry) => `CREATE_VARIANT:${entry.sku}`),
    ...(family.media.length ? ["ATTACH_APPROVED_MEDIA"] : []),
    ...family.variants.map((entry) => `VERIFY_INVENTORY:${entry.sku}`),
    "VERIFY_MAPPING",
  ];
}

function initialResult(
  manifest: CreateManifest,
  family: CreateFamily,
): CreateFamilyResult {
  return {
    parentSku: family.parentSku,
    status: "PLANNED",
    requestKey: requestKey(
      manifest.batchId,
      family.parentSku,
      "CREATE_PARENT",
    ),
    shopifyVariantIds: {},
    plannedOperations: plannedOperations(family),
    appliedOperations: [],
  };
}

function safeError(error: unknown) {
  if (error instanceof CreateExecutionError) {
    return { code: error.code, systemic: error.systemic };
  }
  if (error instanceof ShopifyCreateError) {
    return { code: error.code, systemic: error.systemic };
  }
  const raw = error instanceof Error ? error.message : String(error);
  const systemic =
    /LEDGER_|401|403|HTTP 5\d\d|fetch|network|timeout|unauthor|forbidden|scope|throttl|service.unavailable/i
      .test(raw);
  return {
    code: systemic ? "SYSTEMIC_EXECUTION_ERROR" : "ITEM_EXECUTION_ERROR",
    systemic,
  };
}

function failure(
  error: unknown,
  result: CreateFamilyResult,
): CreateExecutionError {
  const safe = safeError(error);
  return new CreateExecutionError(
    safe.code,
    safe.systemic
      ? "Errore sistemico; batch interrotto"
      : "Famiglia Shopify non completata",
    safe.systemic,
    {
      ...result,
      status: "FAILED",
      code: safe.code,
      message: safe.systemic
        ? "Errore sistemico; batch interrotto"
        : "Famiglia Shopify non completata",
    },
  );
}

function exactVariantMatch(
  product: ShopifyProductIdentity,
  variant: CreateVariant,
) {
  const found = product.variants.find((entry) => entry.sku === variant.sku);
  if (!found) return false;
  const actual = new Map(
    found.selectedOptions.map((entry) => [entry.name, entry.value]),
  );
  return variant.optionValues.every((entry) =>
    actual.get(entry.name) === entry.value
  );
}

function isComplete(product: ShopifyProductIdentity, family: CreateFamily) {
  return product.handle === family.handle && product.title === family.title &&
    family.variants.every((variant) => exactVariantMatch(product, variant));
}

async function reserve(
  ledger: CreationLedger,
  record: LedgerRecord,
) {
  const state = await ledger.reserve(record);
  if (
    state.kind === "EXISTING" &&
    state.record.payloadHash !== record.payloadHash
  ) {
    throw new ShopifyCreateError(
      "IDEMPOTENCY_CONFLICT",
      "La request key esiste con un payload differente",
    );
  }
  return state;
}

async function complete(
  ledger: CreationLedger,
  record: LedgerRecord,
  status: "APPLIED" | "RECONCILED",
  extra: Partial<LedgerRecord> = {},
) {
  await ledger.complete({ ...record, ...extra, status });
}

async function executeFamily(
  client: ShopifyCreateClient,
  ledger: CreationLedger,
  manifest: CreateManifest,
  family: CreateFamily,
  mode: CreateMode,
): Promise<CreateFamilyResult> {
  const result = initialResult(manifest, family);
  let identity: Awaited<ReturnType<ShopifyCreateClient["findProduct"]>>;
  try {
    identity = await client.findProduct(family);
  } catch (error) {
    throw failure(error, result);
  }
  if (identity.ambiguous) {
    return {
      ...result,
      status: "BLOCKED",
      code: "AMBIGUOUS_IDENTITY",
      message: identity.reason ?? "Identità Shopify ambigua",
    };
  }
  if (family.mediaStatus === "NO_APPROVED_IMAGE") {
    return {
      ...result,
      status: "BLOCKED",
      code: "APPROVED_MEDIA_MISSING",
      message: "Nessuna immagine reale approvata; nessun placeholder usato",
    };
  }
  if (mode === "DRY_RUN") {
    if (identity.product && isComplete(identity.product, family)) {
      return {
        ...result,
        status: "ALREADY_EXISTS",
        shopifyProductId: identity.product.id,
        shopifyVariantIds: Object.fromEntries(
          identity.product.variants.map((entry) => [entry.sku, entry.id]),
        ),
      };
    }
    if (identity.product) {
      return {
        ...result,
        status: "BLOCKED",
        code: "PARTIAL_EXISTING_WITHOUT_LEDGER",
        message:
          "Esiste un parent parziale; verificare il ledger prima di creare",
      };
    }
    return result;
  }

  const familyHash = await payloadHash(family);
  const parentRecord: LedgerRecord = {
    batchId: manifest.batchId,
    internalSku: family.parentSku,
    operation: "CREATE_PARENT",
    requestKey: result.requestKey,
    payloadHash: familyHash,
    status: "RESERVED",
  };

  try {
    const parentReservation = await reserve(ledger, parentRecord);
    let product = identity.product;
    if (product) {
      if (parentReservation.kind === "EXISTING") {
        const recordedId = parentReservation.record.shopifyProductId;
        if (recordedId && recordedId !== product.id) {
          throw new ShopifyCreateError(
            "AMBIGUOUS_EXISTING_PARENT",
            "Il parent Shopify non coincide con quello registrato nel ledger",
          );
        }
        await complete(ledger, parentRecord, "RECONCILED", {
          shopifyProductId: product.id,
        });
        result.appliedOperations.push("RECONCILE_PARENT");
      } else if (isComplete(product, family)) {
        await complete(ledger, parentRecord, "RECONCILED", {
          shopifyProductId: product.id,
        });
        return {
          ...result,
          status: "ALREADY_EXISTS",
          shopifyProductId: product.id,
          shopifyVariantIds: Object.fromEntries(
            product.variants.map((entry) => [entry.sku, entry.id]),
          ),
        };
      } else {
        throw new ShopifyCreateError(
          "AMBIGUOUS_EXISTING_PARENT",
          "Parent esistente senza corrispondenza ledger certa",
        );
      }
    } else {
      if (parentReservation.kind === "EXISTING") {
        if (parentReservation.record.status === "RESERVED") {
          throw new ShopifyCreateError(
            "LEDGER_OPERATION_IN_PROGRESS",
            "Creazione parent già riservata; nessun secondo create eseguito",
          );
        }
        throw new ShopifyCreateError(
          "LEDGER_PRODUCT_MISSING",
          "Il ledger indica un prodotto applicato che Shopify non restituisce",
          true,
        );
      }
      product = await client.createProductShell(family);
      result.appliedOperations.push("CREATE_PARENT_DRAFT");
      await complete(ledger, parentRecord, "APPLIED", {
        shopifyProductId: product.id,
      });
    }
    result.shopifyProductId = product.id;

    const optionsRecord: LedgerRecord = {
      batchId: manifest.batchId,
      internalSku: family.parentSku,
      operation: "CREATE_OPTIONS",
      requestKey: requestKey(
        manifest.batchId,
        family.parentSku,
        "CREATE_OPTIONS",
      ),
      payloadHash: familyHash,
      status: "RESERVED",
      shopifyProductId: product.id,
    };
    const optionsReservation = await reserve(ledger, optionsRecord);
    if (optionsReservation.kind === "RESERVED") {
      await client.createOptions(product.id, family);
      await complete(ledger, optionsRecord, "APPLIED");
      result.appliedOperations.push("CREATE_OPTIONS");
    } else if (optionsReservation.record.status === "RESERVED") {
      throw new ShopifyCreateError(
        "OPTIONS_RECONCILIATION_REQUIRED",
        "Esito opzioni precedente incerto; nessuna seconda mutation eseguita",
      );
    }

    const existingVariants = await client.findVariantsBySkus(
      family.variants.map((entry) => entry.sku),
    );
    if (existingVariants.some((entry) => entry.productId !== product!.id)) {
      throw new ShopifyCreateError(
        "DUPLICATE_SKU_CONFLICT",
        "Uno SKU esiste sotto un altro prodotto Shopify",
      );
    }
    const missing: CreateVariant[] = [];
    for (const expected of family.variants) {
      const existing = existingVariants.find((entry) =>
        entry.sku === expected.sku
      );
      if (!existing) {
        missing.push(expected);
        continue;
      }
      result.shopifyVariantIds[expected.sku] = existing.id;
      if (!exactVariantMatch({ ...product!, variants: [existing] }, expected)) {
        throw new ShopifyCreateError(
          "VARIANT_IDENTITY_CONFLICT",
          `Opzioni diverse per ${expected.sku}`,
        );
      }
      const record: LedgerRecord = {
        batchId: manifest.batchId,
        internalSku: expected.sku,
        operation: "CREATE_VARIANT",
        requestKey: requestKey(
          manifest.batchId,
          family.parentSku,
          "CREATE_VARIANT",
          expected.sku,
        ),
        payloadHash: await payloadHash(expected),
        status: "RESERVED",
        shopifyProductId: product.id,
        shopifyVariantId: existing.id,
      };
      const reservation = await reserve(ledger, record);
      if (
        reservation.kind === "EXISTING" &&
        reservation.record.shopifyVariantId &&
        reservation.record.shopifyVariantId !== existing.id
      ) {
        throw new ShopifyCreateError(
          "VARIANT_IDENTITY_CONFLICT",
          `La variante ${expected.sku} non coincide con il ledger`,
        );
      }
      await complete(ledger, record, "RECONCILED", {
        shopifyVariantId: existing.id,
        result: { inventoryItemId: existing.inventoryItemId },
      });
      result.appliedOperations.push(`RECONCILE_VARIANT:${expected.sku}`);
    }

    const variantRecords = new Map<string, LedgerRecord>();
    const toCreate: CreateVariant[] = [];
    for (const variant of missing) {
      const record: LedgerRecord = {
        batchId: manifest.batchId,
        internalSku: variant.sku,
        operation: "CREATE_VARIANT",
        requestKey: requestKey(
          manifest.batchId,
          family.parentSku,
          "CREATE_VARIANT",
          variant.sku,
        ),
        payloadHash: await payloadHash(variant),
        status: "RESERVED",
        shopifyProductId: product.id,
      };
      const reservation = await reserve(ledger, record);
      if (
        reservation.kind === "EXISTING" &&
        reservation.record.status === "RESERVED"
      ) {
        throw new ShopifyCreateError(
          "LEDGER_OPERATION_IN_PROGRESS",
          `Creazione ${variant.sku} riservata ma non riconciliabile`,
        );
      }
      if (reservation.kind === "EXISTING") {
        throw new ShopifyCreateError(
          "LEDGER_VARIANT_MISSING",
          `Ledger applicato ma variante assente: ${variant.sku}`,
          true,
        );
      }
      variantRecords.set(variant.sku, record);
      toCreate.push(variant);
    }

    let created: Awaited<ReturnType<ShopifyCreateClient["createVariants"]>> =
      [];
    try {
      created = await client.createVariants(product.id, toCreate);
    } catch (error) {
      if (error instanceof ShopifyCreateError) {
        for (const partial of error.createdVariants) {
          const record = variantRecords.get(partial.sku);
          if (!record) continue;
          await complete(ledger, record, "APPLIED", {
            shopifyVariantId: partial.id,
            result: { inventoryItemId: partial.inventoryItemId },
          });
          result.shopifyVariantIds[partial.sku] = partial.id;
          result.appliedOperations.push(`CREATE_VARIANT:${partial.sku}`);
        }
      }
      throw error;
    }
    for (const variant of created) {
      const record = variantRecords.get(variant.sku);
      if (!record) {
        throw new ShopifyCreateError(
          "UNEXPECTED_VARIANT_CREATED",
          "Shopify ha restituito una variante non richiesta",
          true,
        );
      }
      await complete(ledger, record, "APPLIED", {
        shopifyVariantId: variant.id,
        result: { inventoryItemId: variant.inventoryItemId },
      });
      result.shopifyVariantIds[variant.sku] = variant.id;
      result.appliedOperations.push(`CREATE_VARIANT:${variant.sku}`);
    }

    const finalVariants = await client.findVariantsBySkus(
      family.variants.map((entry) => entry.sku),
    );
    for (const expected of family.variants) {
      const actual = finalVariants.find((entry) => entry.sku === expected.sku);
      if (!actual || actual.productId !== product.id) {
        throw new ShopifyCreateError(
          "VARIANT_VERIFICATION_FAILED",
          `Variante non verificata: ${expected.sku}`,
        );
      }
      result.shopifyVariantIds[expected.sku] = actual.id;
      const inventoryRecord: LedgerRecord = {
        batchId: manifest.batchId,
        internalSku: expected.sku,
        operation: "CONFIGURE_INVENTORY",
        requestKey: requestKey(
          manifest.batchId,
          family.parentSku,
          "CONFIGURE_INVENTORY",
          expected.sku,
        ),
        payloadHash: await payloadHash({
          productId: product.id,
          variantId: actual.id,
          inventoryItemId: actual.inventoryItemId,
          target: 20,
        }),
        status: "RESERVED",
        shopifyProductId: product.id,
        shopifyVariantId: actual.id,
      };
      const inventoryReservation = await reserve(ledger, inventoryRecord);
      if (
        inventoryReservation.kind === "RESERVED" ||
        inventoryReservation.record.status === "RESERVED"
      ) {
        await client.configureInventory({
          productId: product.id,
          variantId: actual.id,
          inventoryItemId: actual.inventoryItemId,
          sku: expected.sku,
          requestKey: inventoryRecord.requestKey,
        });
        await complete(
          ledger,
          inventoryRecord,
          inventoryReservation.kind === "RESERVED" ? "APPLIED" : "RECONCILED",
        );
        result.appliedOperations.push(`VERIFY_INVENTORY:${expected.sku}`);
      }
    }

    if (family.media.length > 0) {
      const mediaRecord: LedgerRecord = {
        batchId: manifest.batchId,
        internalSku: family.parentSku,
        operation: "ATTACH_MEDIA",
        requestKey: requestKey(
          manifest.batchId,
          family.parentSku,
          "ATTACH_MEDIA",
        ),
        payloadHash: await payloadHash(family.media),
        status: "RESERVED",
        shopifyProductId: product.id,
      };
      const mediaReservation = await reserve(ledger, mediaRecord);
      if (mediaReservation.kind === "EXISTING") {
        if (mediaReservation.record.status === "RESERVED") {
          throw new ShopifyCreateError(
            "MEDIA_RECONCILIATION_REQUIRED",
            "Esito media precedente incerto; nessun upload duplicato eseguito",
          );
        }
      } else {
        await client.attachMedia(product.id, family.media);
        await complete(ledger, mediaRecord, "APPLIED");
        result.appliedOperations.push("ATTACH_APPROVED_MEDIA");
      }
    }

    await client.verifyProduct(product.id, family);
    result.appliedOperations.push("VERIFY_MAPPING");
    result.status = family.publicationIntent === "READY_TO_PUBLISH"
      ? "READY_TO_PUBLISH"
      : "CREATED";
    return result;
  } catch (error) {
    throw failure(error, result);
  }
}

export async function executeCreateBatch(
  client: ShopifyCreateClient,
  ledger: CreationLedger,
  manifest: CreateManifest,
  mode: CreateMode,
): Promise<CreateBatchReport> {
  const results: CreateFamilyResult[] = [];
  let stopped = false;
  let stopCode: string | undefined;
  for (const family of manifest.families) {
    if (stopped) {
      results.push({
        ...initialResult(manifest, family),
        status: "SKIPPED",
        code: "BATCH_STOPPED",
        message: "Famiglia non processata dopo errore sistemico",
      });
      continue;
    }
    try {
      results.push(
        await executeFamily(client, ledger, manifest, family, mode),
      );
    } catch (error) {
      const failed = error instanceof CreateExecutionError
        ? error
        : failure(error, initialResult(manifest, family));
      results.push(failed.result);
      if (failed.systemic) {
        stopped = true;
        stopCode = failed.code;
      }
    }
  }
  const summary: Record<CreateResultStatus, number> = {
    PLANNED: 0,
    CREATED: 0,
    READY_TO_PUBLISH: 0,
    ALREADY_EXISTS: 0,
    RECONCILED: 0,
    BLOCKED: 0,
    FAILED: 0,
    SKIPPED: 0,
  };
  for (const result of results) summary[result.status] += 1;
  return {
    ok: summary.FAILED === 0 && summary.BLOCKED === 0,
    mode,
    batchId: manifest.batchId,
    stopped,
    ...(stopCode ? { stopCode } : {}),
    summary,
    results,
  };
}
