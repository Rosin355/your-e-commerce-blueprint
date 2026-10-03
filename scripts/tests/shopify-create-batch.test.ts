// deno-lint-ignore-file no-explicit-any require-await no-import-prefix no-unversioned-import
import { assert, assertEquals, assertThrows } from "jsr:@std/assert";
import { readFileSync } from "node:fs";
import {
  executeCreateBatch,
  payloadHash,
} from "../../supabase/functions/shopify-create-batch/executor.ts";
import { parseCreateManifest } from "../../supabase/functions/shopify-create-batch/manifest.ts";
import {
  ShopifyCreateError,
} from "../../supabase/functions/shopify-create-batch/shopify-client.ts";
import type {
  CreatedVariant,
  CreateFamily,
  CreateManifest,
  CreateMedia,
  CreateVariant,
  CreationLedger,
  LedgerRecord,
  ShopifyCreateClient,
  ShopifyMediaStatus,
  ShopifyProductIdentity,
  ShopifyVariantIdentity,
} from "../../supabase/functions/shopify-create-batch/types.ts";
import {
  buildCreateManifest,
  summarizeCreateScope,
} from "../build-shopify-create-manifest.mjs";

function rawFamily(override: Record<string, unknown> = {}) {
  return {
    internalProductId: "parent-1",
    parentSku: "OG_CREATE_PARENT",
    entityType: "variable",
    action: "CREATE_VARIABLE_PARENT",
    title: "Rosa fixture approvata",
    descriptionHtml:
      "<p>Descrizione originale sufficientemente lunga per la fixture.</p>",
    descriptionSource: "ORIGINAL",
    handle: "rosa-fixture-approvata",
    shopifyProductId: null,
    optionNames: ["Formato"],
    variants: [{
      internalProductId: "child-1",
      sku: "OG_CREATE_CHILD_1",
      parentSku: "OG_CREATE_PARENT",
      entityType: "variation",
      action: "CREATE_VARIANT",
      price: "12.50",
      optionValues: [{ name: "Formato", value: "Vaso 18 cm" }],
      shopifyVariantId: null,
      stockTarget: 20,
      readiness: "READY_FOR_SALE",
      structureStatus: "CREATE_NEW",
    }],
    media: [{
      originalSource: "https://cdn.example.invalid/rosa.jpg",
      alt: "Rosa fixture",
      approved: true,
    }],
    mediaStatus: "APPROVED",
    publicationIntent: "CREATE_DRAFT",
    publishBlockedFields: [],
    stockTarget: 20,
    readiness: "READY_FOR_SALE",
    structureStatus: "CREATE_NEW",
    ...override,
  };
}

function manifest(families = [rawFamily()]): CreateManifest {
  return parseCreateManifest({
    schemaVersion: "3B.2-v1",
    sourceManifest: "3B.1C",
    batchId: "create-batch-test-001",
    families,
  });
}

class FakeLedger implements CreationLedger {
  rows = new Map<string, LedgerRecord>();
  async reserve(record: LedgerRecord) {
    const existing = this.rows.get(record.requestKey);
    if (existing) return { kind: "EXISTING" as const, record: existing };
    this.rows.set(record.requestKey, { ...record, status: "RESERVED" });
    return { kind: "RESERVED" as const };
  }
  async get(key: string) {
    return this.rows.get(key) ?? null;
  }
  async complete(record: LedgerRecord) {
    const existing = this.rows.get(record.requestKey);
    if (!existing || existing.payloadHash !== record.payloadHash) {
      throw new Error("LEDGER_COMPLETE_FAILED");
    }
    this.rows.set(record.requestKey, structuredClone(record));
  }
}

class FakeClient implements ShopifyCreateClient {
  products = new Map<string, ShopifyProductIdentity>();
  writes: string[] = [];
  ambiguous = false;
  failSystemicSku: string | null = null;
  failVariantsAfter = -1;
  mediaStatusSequence: ShopifyMediaStatus[] = ["READY"];
  mediaPollIndex = 0;
  inventoryInputs: Array<{
    productId: string;
    variantId: string;
    inventoryItemId: string;
    sku: string;
    requestKey: string;
  }> = [];

  async findProduct(family: CreateFamily) {
    if (family.parentSku === this.failSystemicSku) {
      throw new ShopifyCreateError(
        "SYSTEMIC_SHOPIFY_ERROR",
        "fixture outage",
        true,
      );
    }
    return {
      product:
        [...this.products.values()].find((entry) =>
          entry.handle === family.handle
        ) ?? null,
      ambiguous: this.ambiguous,
      ...(this.ambiguous ? { reason: "fixture conflict" } : {}),
    };
  }

  async createProductShell(family: CreateFamily) {
    this.writes.push(`parent:${family.parentSku}`);
    const product: ShopifyProductIdentity = {
      id: `gid://shopify/Product/${this.products.size + 100}`,
      handle: family.handle,
      title: family.title,
      descriptionHtml: family.descriptionHtml,
      status: "DRAFT",
      options: [{ name: "Title", values: ["Default Title"] }],
      variantCount: 0,
      variants: [],
      mediaCount: 0,
      media: [],
    };
    this.products.set(product.id, product);
    return structuredClone(product);
  }

  async createOptions(productId: string, family: CreateFamily) {
    this.writes.push(`options:${family.parentSku}`);
    const product = this.products.get(productId)!;
    product.options = family.optionNames.map((name) => ({
      name,
      values: [
        ...new Set(
          family.variants.map((variant) =>
            variant.optionValues.find((entry) => entry.name === name)!.value
          ),
        ),
      ],
    }));
  }

  async findVariantsBySkus(skus: string[]) {
    return [...this.products.values()].flatMap((product) => product.variants)
      .filter((entry) => skus.includes(entry.sku))
      .map((entry) => structuredClone(entry));
  }

  async createVariants(productId: string, variants: CreateVariant[]) {
    const product = this.products.get(productId)!;
    const created: CreatedVariant[] = [];
    for (const [index, variant] of variants.entries()) {
      if (this.failVariantsAfter === index) {
        throw new ShopifyCreateError(
          "ITEM_SHOPIFY_ERROR",
          "fixture variant failure",
          false,
          created,
        );
      }
      this.writes.push(
        `variant:${variant.sku}:stock=${variant.stockTarget}:DENY:tracked`,
      );
      const identity: ShopifyVariantIdentity = {
        id: `gid://shopify/ProductVariant/${200 + product.variants.length}`,
        sku: variant.sku,
        productId,
        productHandle: product.handle,
        inventoryItemId: `gid://shopify/InventoryItem/${
          300 + product.variants.length
        }`,
        price: variant.price,
        tracked: true,
        inventoryPolicy: "DENY",
        available: 20,
        selectedOptions: variant.optionValues,
      };
      product.variants.push(identity);
      product.variantCount = product.variants.length;
      created.push({
        id: identity.id,
        sku: identity.sku,
        inventoryItemId: identity.inventoryItemId,
        selectedOptions: identity.selectedOptions,
      });
    }
    return created;
  }

  async attachMedia(productId: string, media: CreateMedia[]) {
    this.writes.push(`media:${media.length}`);
    const product = this.products.get(productId)!;
    const status = this.mediaStatusSequence[0] ?? "READY";
    this.mediaPollIndex = 1;
    product.media = media.map((entry, index) => ({
      id: `gid://shopify/MediaImage/${400 + index}`,
      alt: entry.alt,
      status,
      mediaContentType: "IMAGE",
    }));
    product.mediaCount = product.media.length;
    return structuredClone(product.media);
  }

  async getMedia(productId: string, mediaIds: string[]) {
    const product = this.products.get(productId)!;
    const status = this.mediaStatusSequence[
      Math.min(this.mediaPollIndex, this.mediaStatusSequence.length - 1)
    ] ?? "READY";
    this.mediaPollIndex += 1;
    for (const media of product.media) media.status = status;
    return structuredClone(
      product.media.filter((entry) => mediaIds.includes(entry.id)),
    );
  }

  async configureInventory(input: {
    productId: string;
    variantId: string;
    inventoryItemId: string;
    sku: string;
    requestKey: string;
  }) {
    this.inventoryInputs.push(input);
  }

  async verifyProduct(productId: string) {
    return structuredClone(this.products.get(productId)!);
  }
}

async function seedCompleteProduct(
  client: FakeClient,
  family: CreateFamily,
) {
  const product = await client.createProductShell(family);
  await client.createOptions(product.id, family);
  await client.createVariants(product.id, family.variants);
  await client.attachMedia(product.id, family.media);
  client.writes = [];
  return client.products.get(product.id)!;
}

const instantPolling = {
  maxAttempts: 4,
  delayMs: 0,
  sleep: async (_ms: number) => {},
};

Deno.test("manifest: denylist, TEST, duplicate SKU e publish-blocked sono fail-fast", () => {
  assertThrows(
    () => manifest([rawFamily({ parentSku: "OG_393883" })]),
    Error,
    "MANIFEST_DENYLIST",
  );
  assertThrows(
    () => manifest([rawFamily({ parentSku: "TEST-001" })]),
    Error,
    "MANIFEST_TEST_SKU",
  );
  assertThrows(
    () => manifest([rawFamily({ publishBlockedFields: ["seo_title"] })]),
    Error,
    "MANIFEST_PUBLISH_BLOCKED_AI",
  );
  const duplicate = rawFamily() as any;
  duplicate.variants.push(structuredClone(duplicate.variants[0]));
  assertThrows(
    () => manifest([duplicate]),
    Error,
    "MANIFEST_DUPLICATE_VARIANT_SKU",
  );
});

Deno.test("builder: riconta CREATE e seleziona solo famiglie safe", () => {
  const rows = [
    {
      sku: "OG_P",
      entity_type: "variable",
      action: "CREATE_VARIABLE_PARENT",
      current_shopify_structure: "NOT_PRESENT",
      target_shopify_structure: "PARENT_PRODUCT",
      content_ready: "YES",
      image_ready: "YES",
      shopify_product_id: "",
      shopify_variant_id: "",
      block_reason: "",
    },
    {
      sku: "OG_C",
      parent_sku: "OG_P",
      entity_type: "variation",
      action: "CREATE_VARIANT",
      current_shopify_structure: "NOT_PRESENT",
      target_shopify_structure: "VARIANT_OF_OG_P",
      content_ready: "YES",
      image_ready: "INHERIT_PARENT",
      shopify_product_id: "",
      shopify_variant_id: "",
      stock_target: "20",
      block_reason: "",
      price: "9.90",
    },
    { sku: "OG_R", action: "RESTRUCTURE_REQUIRED" },
  ];
  assertEquals(summarizeCreateScope(rows), {
    createParents: 1,
    createVariants: 1,
    restructure: 1,
    skipped: 0,
  });
  const result = buildCreateManifest({
    rows,
    contentRows: [
      {
        sku: "OG_P",
        internalProductId: "p",
        title: "Prodotto",
        descriptionHtml: "<p>Descrizione originale completa e verificata.</p>",
        descriptionSource: "ORIGINAL",
        publishBlockedFields: [],
        handle: "prodotto",
        optionNames: ["Formato"],
        media: [{
          originalSource: "https://example.invalid/p.jpg",
          alt: "P",
          approved: true,
        }],
      },
      {
        sku: "OG_C",
        internalProductId: "c",
        optionValues: [{ name: "Formato", value: "Uno" }],
      },
    ],
    batchId: "builder-test",
    limit: 10,
  });
  assertEquals(result.manifest.families.length, 1);
});

Deno.test("builder: scarta il canary se manca un media reale approvato", () => {
  const result = buildCreateManifest({
    rows: [
      {
        sku: "OG_P",
        entity_type: "variable",
        action: "CREATE_VARIABLE_PARENT",
        current_shopify_structure: "NOT_PRESENT",
        target_shopify_structure: "PARENT_PRODUCT",
        content_ready: "YES",
        image_ready: "YES",
        shopify_product_id: "",
        shopify_variant_id: "",
        block_reason: "",
      },
      {
        sku: "OG_C",
        parent_sku: "OG_P",
        entity_type: "variation",
        action: "CREATE_VARIANT",
        current_shopify_structure: "NOT_PRESENT",
        target_shopify_structure: "VARIANT_OF_OG_P",
        content_ready: "YES",
        image_ready: "INHERIT_PARENT",
        shopify_product_id: "",
        shopify_variant_id: "",
        stock_target: "20",
        block_reason: "",
        price: "9.90",
      },
    ],
    contentRows: [
      {
        sku: "OG_P",
        internalProductId: "p",
        title: "Prodotto",
        descriptionHtml: "<p>Descrizione originale completa e verificata.</p>",
        descriptionSource: "ORIGINAL",
        publishBlockedFields: [],
        handle: "prodotto",
        optionNames: ["Formato"],
        media: [],
      },
      {
        sku: "OG_C",
        internalProductId: "c",
        optionValues: [{ name: "Formato", value: "Uno" }],
      },
    ],
    batchId: "builder-no-media",
    limit: 1,
  });
  assertEquals(result.manifest.families.length, 0);
  assertEquals(result.summary.blocked, [{
    sku: "OG_P",
    reason: "APPROVED_MEDIA_MISSING",
  }]);
});

Deno.test("DRY_RUN legge identità e pianifica con zero write e zero ledger", async () => {
  const m = manifest();
  const client = new FakeClient();
  const ledger = new FakeLedger();
  const report = await executeCreateBatch(client, ledger, m, "DRY_RUN");
  assertEquals(report.summary.PLANNED, 1);
  assertEquals(client.writes, []);
  assertEquals(ledger.rows.size, 0);
});

Deno.test("EXECUTE crea parent, opzioni, variante e media in stato draft", async () => {
  const client = new FakeClient();
  const report = await executeCreateBatch(
    client,
    new FakeLedger(),
    manifest(),
    "EXECUTE",
  );
  assertEquals(report.summary.CREATED, 1);
  assertEquals(client.writes, [
    "parent:OG_CREATE_PARENT",
    "options:OG_CREATE_PARENT",
    "variant:OG_CREATE_CHILD_1:stock=20:DENY:tracked",
    "media:1",
  ]);
});

Deno.test("variante creata usa stock assoluto 20, tracked e DENY", async () => {
  const client = new FakeClient();
  await executeCreateBatch(client, new FakeLedger(), manifest(), "EXECUTE");
  assert(
    client.writes.some((entry) => entry.endsWith("stock=20:DENY:tracked")),
  );
  assertEquals(client.inventoryInputs.length, 1);
});

Deno.test("replay dello stesso batch non duplica parent, variant o media", async () => {
  const client = new FakeClient();
  const ledger = new FakeLedger();
  const m = manifest();
  await executeCreateBatch(client, ledger, m, "EXECUTE");
  const firstWrites = [...client.writes];
  const replay = await executeCreateBatch(client, ledger, m, "EXECUTE");
  assertEquals(replay.summary.RECONCILED, 1);
  assertEquals(client.writes, firstWrites);
  const parentKey = `shopify-create:${m.batchId}:${
    m.families[0].parentSku
  }:CREATE_PARENT`;
  const variantKey = `${
    parentKey.replace(/:CREATE_PARENT$/, "")
  }:CREATE_VARIANT:${m.families[0].variants[0].sku}`;
  assertEquals(ledger.rows.get(parentKey)?.status, "RECONCILED");
  assertEquals(ledger.rows.get(variantKey)?.status, "RECONCILED");
});

Deno.test("parent completo già esistente viene riconciliato senza write", async () => {
  const m = manifest();
  const family = m.families[0];
  const client = new FakeClient();
  await seedCompleteProduct(client, family);
  const report = await executeCreateBatch(
    client,
    new FakeLedger(),
    m,
    "DRY_RUN",
  );
  assertEquals(report.summary.ALREADY_EXISTS, 1);
  assertEquals(client.writes, []);
});

for (
  const scenario of [
    {
      name: "prezzo errato",
      code: "VARIANT_PRICE_MISMATCH",
      mutate: (product: ShopifyProductIdentity) => {
        product.variants[0].price = "99.99";
      },
    },
    {
      name: "variante extra inattesa",
      code: "UNEXPECTED_VARIANTS",
      mutate: (product: ShopifyProductIdentity) => {
        product.variants.push({
          ...structuredClone(product.variants[0]),
          id: "gid://shopify/ProductVariant/extra",
          sku: "OG_UNEXPECTED_EXTRA",
        });
        product.variantCount = product.variants.length;
      },
    },
    {
      name: "descrizione errata",
      code: "PRODUCT_STATE_MISMATCH",
      mutate: (product: ShopifyProductIdentity) => {
        product.descriptionHtml = "<p>Descrizione diversa.</p>";
      },
    },
    {
      name: "stato ACTIVE invece di DRAFT",
      code: "PRODUCT_STATE_MISMATCH",
      mutate: (product: ShopifyProductIdentity) => {
        product.status = "ACTIVE";
      },
    },
    {
      name: "tracking disattivato",
      code: "INVENTORY_MISMATCH",
      mutate: (product: ShopifyProductIdentity) => {
        product.variants[0].tracked = false;
      },
    },
    {
      name: "inventory policy CONTINUE",
      code: "INVENTORY_MISMATCH",
      mutate: (product: ShopifyProductIdentity) => {
        product.variants[0].inventoryPolicy = "CONTINUE";
      },
    },
    {
      name: "available diverso da 20",
      code: "INVENTORY_MISMATCH",
      mutate: (product: ShopifyProductIdentity) => {
        product.variants[0].available = 19;
      },
    },
    {
      name: "media approvato mancante",
      code: "MEDIA_MISSING",
      mutate: (product: ShopifyProductIdentity) => {
        product.media = [];
        product.mediaCount = 0;
      },
    },
  ]
) {
  Deno.test(`reconciliation completa: ${scenario.name} blocca ALREADY_EXISTS`, async () => {
    const m = manifest();
    const client = new FakeClient();
    const product = await seedCompleteProduct(client, m.families[0]);
    scenario.mutate(product);
    const report = await executeCreateBatch(
      client,
      new FakeLedger(),
      m,
      "DRY_RUN",
    );
    assertEquals(report.summary.ALREADY_EXISTS, 0);
    assertEquals(report.results[0].code, scenario.code);
    assertEquals(client.writes, []);
  });
}

Deno.test("parent parziale senza ledger viene bloccato", async () => {
  const m = manifest();
  const client = new FakeClient();
  await client.createProductShell(m.families[0]);
  client.writes = [];
  const report = await executeCreateBatch(
    client,
    new FakeLedger(),
    m,
    "DRY_RUN",
  );
  assertEquals(report.summary.BLOCKED, 1);
  assertEquals(report.results[0].code, "OPTION_STRUCTURE_MISMATCH");
});

Deno.test("identità ambigua blocca prima di qualsiasi write", async () => {
  const client = new FakeClient();
  client.ambiguous = true;
  const report = await executeCreateBatch(
    client,
    new FakeLedger(),
    manifest(),
    "EXECUTE",
  );
  assertEquals(report.summary.BLOCKED, 1);
  assertEquals(client.writes, []);
});

Deno.test("SKU già presente sotto altro parent blocca la creazione", async () => {
  const m = manifest();
  const client = new FakeClient();
  client.products.set("gid://shopify/Product/other", {
    id: "gid://shopify/Product/other",
    handle: "other",
    title: "Other",
    descriptionHtml: "<p>Other product description.</p>",
    status: "DRAFT",
    options: [],
    variantCount: 1,
    variants: [{
      id: "gid://shopify/ProductVariant/other",
      sku: m.families[0].variants[0].sku,
      productId: "gid://shopify/Product/other",
      productHandle: "other",
      inventoryItemId: "gid://shopify/InventoryItem/other",
      price: m.families[0].variants[0].price,
      tracked: true,
      inventoryPolicy: "DENY",
      available: 20,
      selectedOptions: m.families[0].variants[0].optionValues,
    }],
    mediaCount: 0,
    media: [],
  });
  const report = await executeCreateBatch(
    client,
    new FakeLedger(),
    m,
    "EXECUTE",
  );
  assertEquals(report.summary.FAILED, 1);
  assertEquals(report.results[0].code, "DUPLICATE_SKU_CONFLICT");
});

Deno.test("successo parent + fallimento varianti conserva reporting parziale", async () => {
  const client = new FakeClient();
  client.failVariantsAfter = 0;
  const report = await executeCreateBatch(
    client,
    new FakeLedger(),
    manifest(),
    "EXECUTE",
  );
  assertEquals(report.summary.FAILED, 1);
  assert(report.results[0].appliedOperations.includes("CREATE_PARENT_DRAFT"));
  assert(
    !report.results[0].appliedOperations.some((entry) =>
      entry.startsWith("CREATE_VARIANT:")
    ),
  );
});

Deno.test("errore sistemico arresta le famiglie successive", async () => {
  const second = rawFamily({
    internalProductId: "parent-2",
    parentSku: "OG_CREATE_PARENT_2",
    handle: "rosa-fixture-due",
    variants: [{
      ...(rawFamily() as any).variants[0],
      internalProductId: "child-2",
      sku: "OG_CREATE_CHILD_2",
      parentSku: "OG_CREATE_PARENT_2",
    }],
  });
  const m = manifest([rawFamily(), second]);
  const client = new FakeClient();
  client.failSystemicSku = "OG_CREATE_PARENT";
  const report = await executeCreateBatch(
    client,
    new FakeLedger(),
    m,
    "EXECUTE",
  );
  assertEquals(report.stopped, true);
  assertEquals(report.results[1].code, "BATCH_STOPPED");
  assertEquals(client.writes, []);
});

Deno.test("immagine approvata mancante viene riportata, mai sostituita", async () => {
  const m = manifest([
    rawFamily({ media: [], mediaStatus: "NO_APPROVED_IMAGE" }),
  ]);
  const client = new FakeClient();
  const report = await executeCreateBatch(
    client,
    new FakeLedger(),
    m,
    "EXECUTE",
  );
  assertEquals(report.results[0].code, "APPROVED_MEDIA_MISSING");
  assertEquals(client.writes, []);
});

for (
  const scenario of [
    { name: "READY immediato", states: ["READY"] },
    { name: "PROCESSING poi READY", states: ["PROCESSING", "READY"] },
    {
      name: "UPLOADED poi PROCESSING poi READY",
      states: ["UPLOADED", "PROCESSING", "READY"],
    },
  ] as Array<{ name: string; states: ShopifyMediaStatus[] }>
) {
  Deno.test(`media polling: ${scenario.name} completa senza duplicati`, async () => {
    const client = new FakeClient();
    client.mediaStatusSequence = scenario.states;
    const report = await executeCreateBatch(
      client,
      new FakeLedger(),
      manifest(),
      "EXECUTE",
      instantPolling,
    );
    assertEquals(report.summary.CREATED, 1);
    assertEquals(
      client.writes.filter((entry) => entry === "media:1").length,
      1,
    );
  });
}

Deno.test("media polling: PROCESSING poi FAILED non viene marcato APPLIED", async () => {
  const client = new FakeClient();
  client.mediaStatusSequence = ["PROCESSING", "FAILED"];
  const ledger = new FakeLedger();
  const m = manifest();
  const report = await executeCreateBatch(
    client,
    ledger,
    m,
    "EXECUTE",
    instantPolling,
  );
  assertEquals(report.summary.FAILED, 1);
  assertEquals(report.results[0].code, "MEDIA_FAILED");
  const mediaRow = [...ledger.rows.values()].find((entry) =>
    entry.operation === "ATTACH_MEDIA"
  );
  assertEquals(mediaRow?.status, "FAILED");
});

Deno.test("media polling: timeout resta MEDIA_PENDING e ledger RESERVED", async () => {
  const client = new FakeClient();
  client.mediaStatusSequence = ["PROCESSING"];
  const ledger = new FakeLedger();
  const report = await executeCreateBatch(
    client,
    ledger,
    manifest(),
    "EXECUTE",
    { ...instantPolling, maxAttempts: 3 },
  );
  assertEquals(report.summary.MEDIA_PENDING, 1);
  assertEquals(report.results[0].code, "MEDIA_PROCESSING_TIMEOUT");
  const mediaRow = [...ledger.rows.values()].find((entry) =>
    entry.operation === "ATTACH_MEDIA"
  );
  assertEquals(mediaRow?.status, "RESERVED");
});

Deno.test("retry media PROCESSING riusa gli ID e non ripete l'upload", async () => {
  const client = new FakeClient();
  client.mediaStatusSequence = ["PROCESSING"];
  const ledger = new FakeLedger();
  const m = manifest();
  const first = await executeCreateBatch(
    client,
    ledger,
    m,
    "EXECUTE",
    { ...instantPolling, maxAttempts: 2 },
  );
  assertEquals(first.summary.MEDIA_PENDING, 1);
  const writes = [...client.writes];
  client.mediaStatusSequence = ["PROCESSING", "READY"];
  client.mediaPollIndex = 0;
  const replay = await executeCreateBatch(
    client,
    ledger,
    m,
    "EXECUTE",
    instantPolling,
  );
  assertEquals(replay.summary.RECONCILED, 1);
  assertEquals(client.writes, writes);
  assertEquals(client.writes.filter((entry) => entry === "media:1").length, 1);
});

Deno.test("payload hash è canonico e distingue payload differenti", async () => {
  assertEquals(
    await payloadHash({ b: 2, a: { y: 1, x: 0 } }),
    await payloadHash({ a: { x: 0, y: 1 }, b: 2 }),
  );
  assert(
    (await payloadHash({ a: [1, 2] })) !== (await payloadHash({ a: [2, 1] })),
  );
});

Deno.test("nessun segreto, Storefront write o pubblicazione automatica nel runtime", () => {
  const source = [
    "supabase/functions/shopify-create-batch/index.ts",
    "supabase/functions/shopify-create-batch/executor.ts",
    "supabase/functions/shopify-create-batch/shopify-client.ts",
  ].map((path) => readFileSync(path, "utf8")).join("\n");
  assert(
    !/shpat_|SHOPIFY_ADMIN_API_TOKEN.*console|service.role.*response/i.test(
      source,
    ),
  );
  assert(
    !/Storefront|publishablePublish|publicationCreate|productPublish/i.test(
      source,
    ),
  );
  assert(!/body\.(families|products|variants|locationId)/.test(source));
  assert(/SHOPIFY_CREATE_EXECUTE_ENABLED/.test(source));
  assert(/SHOPIFY_CREATE_BATCH_MANIFEST_JSON/.test(source));
});

Deno.test("idempotency conflict nel ledger blocca payload differente", async () => {
  const m = manifest();
  const ledger = new FakeLedger();
  const key = `shopify-create:${m.batchId}:${
    m.families[0].parentSku
  }:CREATE_PARENT`;
  ledger.rows.set(key, {
    batchId: m.batchId,
    internalSku: m.families[0].parentSku,
    operation: "CREATE_PARENT",
    requestKey: key,
    payloadHash: "0".repeat(64),
    status: "RESERVED",
  });
  const report = await executeCreateBatch(
    new FakeClient(),
    ledger,
    m,
    "EXECUTE",
  );
  assertEquals(report.summary.FAILED, 1);
  assertEquals(report.results[0].code, "IDEMPOTENCY_CONFLICT");
});

Deno.test("reservation parent concorrente impedisce un secondo productCreate", async () => {
  const m = manifest();
  const ledger = new FakeLedger();
  const key = `shopify-create:${m.batchId}:${
    m.families[0].parentSku
  }:CREATE_PARENT`;
  ledger.rows.set(key, {
    batchId: m.batchId,
    internalSku: m.families[0].parentSku,
    operation: "CREATE_PARENT",
    requestKey: key,
    payloadHash: await payloadHash(m.families[0]),
    status: "RESERVED",
  });
  const client = new FakeClient();
  const report = await executeCreateBatch(client, ledger, m, "EXECUTE");
  assertEquals(report.summary.FAILED, 1);
  assertEquals(report.results[0].code, "LEDGER_OPERATION_IN_PROGRESS");
  assertEquals(client.writes, []);
});

Deno.test("example manifest è sintatticamente valido e dichiaratamente non live", () => {
  const example = JSON.parse(
    readFileSync("docs/fase3b/shopify-create-manifest.example.json", "utf8"),
  );
  const parsed = parseCreateManifest(example);
  assertEquals(parsed.batchId, "example-do-not-deploy");
});
