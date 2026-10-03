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
  MediaPollingOptions,
  ShopifyCreateClient,
  ShopifyMediaIdentity,
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

function sameOptions(
  actual: Array<{ name: string; value: string }>,
  expected: Array<{ name: string; value: string }>,
) {
  if (actual.length !== expected.length) return false;
  const actualMap = new Map(
    actual.map((entry) => [entry.name, entry.value]),
  );
  return expected.every((entry) => actualMap.get(entry.name) === entry.value);
}

function normalizeHtml(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

function moneyCents(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function sameSet(actual: string[], expected: string[]) {
  return actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    new Set(expected).size === expected.length &&
    actual.every((entry) => expected.includes(entry)) &&
    expected.every((entry) => actual.includes(entry));
}

function variantPostconditionIssue(
  actual: ShopifyProductIdentity["variants"][number],
  expected: CreateVariant,
): ProductPostconditionIssue | null {
  if (!sameOptions(actual.selectedOptions, expected.optionValues)) {
    return {
      code: "VARIANT_IDENTITY_CONFLICT",
      message: `Opzioni non conformi per ${expected.sku}`,
    };
  }
  if (moneyCents(actual.price) !== moneyCents(expected.price)) {
    return {
      code: "VARIANT_PRICE_MISMATCH",
      message: `Prezzo non conforme per ${expected.sku}`,
    };
  }
  if (
    !actual.inventoryItemId || actual.tracked !== true ||
    actual.inventoryPolicy !== "DENY" || actual.available !== 20
  ) {
    return {
      code: "INVENTORY_MISMATCH",
      message: `Inventario non conforme per ${expected.sku}`,
    };
  }
  return null;
}

export interface ProductPostconditionIssue {
  code: string;
  message: string;
}

function parentPostconditionIssue(
  product: ShopifyProductIdentity,
  family: CreateFamily,
): ProductPostconditionIssue | null {
  if (product.handle !== family.handle || product.title !== family.title) {
    return {
      code: "IDENTITY_CONFLICT",
      message: "Handle o titolo non coincidono",
    };
  }
  if (
    normalizeHtml(product.descriptionHtml) !==
      normalizeHtml(family.descriptionHtml) || product.status !== "DRAFT"
  ) {
    return {
      code: "PRODUCT_STATE_MISMATCH",
      message: "Descrizione o stato prodotto non coincidono",
    };
  }
  return null;
}

export function productPostconditionIssue(
  product: ShopifyProductIdentity,
  family: CreateFamily,
): ProductPostconditionIssue | null {
  const parentIssue = parentPostconditionIssue(product, family);
  if (parentIssue) return parentIssue;
  if (product.options.length !== family.optionNames.length) {
    return {
      code: "OPTION_STRUCTURE_MISMATCH",
      message: "Numero opzioni Shopify non conforme",
    };
  }
  for (const [index, name] of family.optionNames.entries()) {
    const actual = product.options[index];
    const expectedValues = [
      ...new Set(
        family.variants.map((variant) =>
          variant.optionValues.find((entry) => entry.name === name)?.value ?? ""
        ),
      ),
    ];
    if (
      !actual || actual.name !== name ||
      !sameSet(actual.values, expectedValues)
    ) {
      return {
        code: "OPTION_STRUCTURE_MISMATCH",
        message: `Opzione non conforme: ${name}`,
      };
    }
  }
  const expectedSkus = family.variants.map((entry) => entry.sku);
  const actualSkus = product.variants.map((entry) => entry.sku);
  if (
    product.variantCount > family.variants.length ||
    actualSkus.some((entry) => !expectedSkus.includes(entry))
  ) {
    return {
      code: "UNEXPECTED_VARIANTS",
      message: "Shopify contiene varianti extra non previste",
    };
  }
  if (!sameSet(actualSkus, expectedSkus)) {
    return {
      code: "INCOMPLETE_EXISTING_PRODUCT",
      message: "Mancano una o più varianti attese",
    };
  }
  for (const expected of family.variants) {
    const actual = product.variants.find((entry) =>
      entry.sku === expected.sku
    )!;
    const issue = variantPostconditionIssue(actual, expected);
    if (issue) return issue;
  }
  const expectedAlts = family.media.map((entry) => entry.alt);
  const actualAlts = product.media.map((entry) => entry.alt);
  if (
    product.mediaCount > family.media.length ||
    product.media.some((entry) => entry.mediaContentType !== "IMAGE") ||
    actualAlts.some((entry) => !expectedAlts.includes(entry))
  ) {
    return {
      code: "MEDIA_SET_MISMATCH",
      message: "Sono presenti media non approvati o inattesi",
    };
  }
  if (!sameSet(actualAlts, expectedAlts)) {
    return {
      code: "MEDIA_MISSING",
      message: "Mancano uno o più media approvati",
    };
  }
  if (product.media.some((entry) => entry.status === "FAILED")) {
    return { code: "MEDIA_FAILED", message: "Elaborazione media fallita" };
  }
  if (product.media.some((entry) => entry.status !== "READY")) {
    return { code: "MEDIA_PENDING", message: "Media non ancora READY" };
  }
  return null;
}

const DEFAULT_MEDIA_POLLING: MediaPollingOptions = {
  maxAttempts: 5,
  delayMs: 750,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

async function pollMediaReady(
  client: ShopifyCreateClient,
  productId: string,
  mediaIds: string[],
  initial: ShopifyMediaIdentity[],
  polling: MediaPollingOptions,
) {
  let media = initial;
  for (let attempt = 0; attempt < polling.maxAttempts; attempt += 1) {
    if (media.length !== mediaIds.length) {
      throw new ShopifyCreateError(
        "MEDIA_CONFIRMATION_FAILED",
        "Shopify non restituisce tutti i media attesi",
      );
    }
    if (media.some((entry) => entry.status === "FAILED")) {
      return { state: "FAILED" as const, media };
    }
    if (media.every((entry) => entry.status === "READY")) {
      return { state: "READY" as const, media };
    }
    if (attempt + 1 < polling.maxAttempts) {
      await polling.sleep(polling.delayMs);
      media = await client.getMedia(productId, mediaIds);
    }
  }
  return { state: "PENDING" as const, media };
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
  status: LedgerRecord["status"],
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
  mediaPolling: MediaPollingOptions,
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
    if (identity.product) {
      const issue = productPostconditionIssue(identity.product, family);
      if (!issue) {
        return {
          ...result,
          status: "ALREADY_EXISTS",
          shopifyProductId: identity.product.id,
          shopifyVariantIds: Object.fromEntries(
            identity.product.variants.map((entry) => [entry.sku, entry.id]),
          ),
        };
      }
      return {
        ...result,
        status: issue.code === "MEDIA_PENDING" ? "MEDIA_PENDING" : "BLOCKED",
        code: issue.code,
        message: issue.message,
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
    if (identity.product) {
      const existingParentRecord = await ledger.get(parentRecord.requestKey);
      if (!existingParentRecord) {
        const issue = productPostconditionIssue(identity.product, family);
        if (!issue) {
          return {
            ...result,
            status: "ALREADY_EXISTS",
            shopifyProductId: identity.product.id,
            shopifyVariantIds: Object.fromEntries(
              identity.product.variants.map((entry) => [entry.sku, entry.id]),
            ),
          };
        }
        return {
          ...result,
          status: issue.code === "MEDIA_PENDING" ? "MEDIA_PENDING" : "BLOCKED",
          code: issue.code,
          message: issue.message,
          shopifyProductId: identity.product.id,
        };
      }
    }
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
        const parentIssue = parentPostconditionIssue(product, family);
        if (parentIssue) {
          throw new ShopifyCreateError(parentIssue.code, parentIssue.message);
        }
        await complete(ledger, parentRecord, "RECONCILED", {
          shopifyProductId: product.id,
        });
        result.appliedOperations.push("RECONCILE_PARENT");
      } else if (!productPostconditionIssue(product, family)) {
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
        const issue = productPostconditionIssue(product, family)!;
        throw new ShopifyCreateError(
          issue.code,
          issue.message,
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
      const variantIssue = variantPostconditionIssue(existing, expected);
      if (variantIssue) {
        throw new ShopifyCreateError(
          variantIssue.code,
          variantIssue.message,
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
      let media: ShopifyMediaIdentity[];
      let mediaIds: string[];
      if (mediaReservation.kind === "RESERVED") {
        media = await client.attachMedia(product.id, family.media);
        mediaIds = media.map((entry) => entry.id);
        await complete(ledger, mediaRecord, "RESERVED", {
          result: { mediaIds },
        });
        result.appliedOperations.push("ATTACH_APPROVED_MEDIA");
      } else {
        const saved = mediaReservation.record.result?.mediaIds;
        mediaIds = Array.isArray(saved)
          ? saved.filter((entry): entry is string => typeof entry === "string")
          : [];
        if (mediaIds.length === 0) {
          product = await client.verifyProduct(product.id, family);
          const expectedAlts = new Set(family.media.map((entry) => entry.alt));
          const candidates = product.media.filter((entry) =>
            expectedAlts.has(entry.alt)
          );
          if (candidates.length !== family.media.length) {
            throw new ShopifyCreateError(
              "MEDIA_RECONCILIATION_REQUIRED",
              "Media reservation senza ID riconciliabili; nessun nuovo upload eseguito",
            );
          }
          mediaIds = candidates.map((entry) => entry.id);
          media = candidates;
          await complete(ledger, mediaRecord, "RESERVED", {
            result: { mediaIds },
          });
        } else {
          media = await client.getMedia(product.id, mediaIds);
        }
      }
      const mediaResult = await pollMediaReady(
        client,
        product.id,
        mediaIds,
        media,
        mediaPolling,
      );
      if (mediaResult.state === "FAILED") {
        await complete(ledger, mediaRecord, "FAILED", {
          result: { mediaIds },
        });
        throw new ShopifyCreateError(
          "MEDIA_FAILED",
          "Shopify ha terminato l'elaborazione media con FAILED",
        );
      }
      if (mediaResult.state === "PENDING") {
        return {
          ...result,
          status: "MEDIA_PENDING",
          code: "MEDIA_PROCESSING_TIMEOUT",
          message: "Media ancora PROCESSING/UPLOADED al termine del polling",
        };
      }
      await complete(
        ledger,
        mediaRecord,
        mediaReservation.kind === "RESERVED" ? "APPLIED" : "RECONCILED",
        { result: { mediaIds } },
      );
      result.appliedOperations.push("VERIFY_MEDIA_READY");
    }

    product = await client.verifyProduct(product.id, family);
    const finalIssue = productPostconditionIssue(product, family);
    if (finalIssue) {
      throw new ShopifyCreateError(finalIssue.code, finalIssue.message);
    }
    result.appliedOperations.push("VERIFY_MAPPING");
    const mutated = result.appliedOperations.some((entry) =>
      entry === "CREATE_PARENT_DRAFT" || entry === "CREATE_OPTIONS" ||
      entry.startsWith("CREATE_VARIANT:") ||
      entry === "ATTACH_APPROVED_MEDIA"
    );
    result.status = !mutated
      ? "RECONCILED"
      : family.publicationIntent === "READY_TO_PUBLISH"
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
  mediaPolling: MediaPollingOptions = DEFAULT_MEDIA_POLLING,
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
        await executeFamily(
          client,
          ledger,
          manifest,
          family,
          mode,
          mediaPolling,
        ),
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
    MEDIA_PENDING: 0,
    BLOCKED: 0,
    FAILED: 0,
    SKIPPED: 0,
  };
  for (const result of results) summary[result.status] += 1;
  return {
    ok: summary.FAILED === 0 && summary.BLOCKED === 0 &&
      summary.MEDIA_PENDING === 0,
    mode,
    batchId: manifest.batchId,
    stopped,
    ...(stopCode ? { stopCode } : {}),
    summary,
    results,
  };
}
