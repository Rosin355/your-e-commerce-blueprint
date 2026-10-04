// deno-lint-ignore-file no-explicit-any require-await no-import-prefix no-unversioned-import
import { assertEquals, assertRejects, assertThrows } from "jsr:@std/assert";
import {
  assertApprovedDigest,
  loadApprovedManifest,
  sha256Hex,
} from "../../supabase/functions/_shared/shopify-approved-manifest.ts";
import { normalizeApprovedOriginalDescription } from "../../supabase/functions/shopify-description-remediation/description.ts";
import {
  executeRemediationBatch,
  RemediationError,
} from "../../supabase/functions/shopify-description-remediation/executor.ts";
import { parseRemediationManifest } from "../../supabase/functions/shopify-description-remediation/manifest.ts";
import type {
  RemediationProductState,
  RemediationShopifyClient,
} from "../../supabase/functions/shopify-description-remediation/types.ts";
import {
  executePublicationBatch,
  PublicationError,
} from "../../supabase/functions/shopify-publication-batch/executor.ts";
import { parsePublicationManifest } from "../../supabase/functions/shopify-publication-batch/manifest.ts";
import type {
  PublicationLiveProduct,
  PublicationShopifyClient,
} from "../../supabase/functions/shopify-publication-batch/types.ts";

function remediationState(
  override: Partial<RemediationProductState> = {},
): RemediationProductState {
  return {
    id: "gid://shopify/Product/100",
    title: "Rosa fixture",
    handle: "rosa-fixture",
    descriptionHtml: "<p>Testo < br >originale</p>",
    status: "DRAFT",
    variantCount: 1,
    variants: [{
      id: "gid://shopify/ProductVariant/200",
      sku: "OG_238559-01",
      price: "12.50",
      inventoryItemId: "gid://shopify/InventoryItem/300",
      tracked: true,
      inventoryPolicy: "DENY",
      available: 20,
      selectedOptions: [{ name: "Formato", value: "Vaso 18 cm" }],
    }],
    mediaCount: 1,
    media: [{
      id: "gid://shopify/MediaImage/400",
      alt: "Rosa fixture",
      status: "READY",
      mediaContentType: "IMAGE",
    }],
    publicationIds: [],
    scheduledPublicationIds: [],
    ...override,
  };
}

function remediationManifest(override: Record<string, unknown> = {}) {
  const expectedCurrent = remediationState();
  return parseRemediationManifest({
    schemaVersion: "3B.3-v1",
    sourceManifest: "3B.2-v1",
    batchId: "shopify-remediation-3b3-001",
    items: [{
      parentSku: "OG_238559",
      shopifyProductId: expectedCurrent.id,
      descriptionSource: "ORIGINAL",
      approvedOriginalDescriptionHtml: "<p>Testo <br>originale</p>",
      expectedCurrent,
      operation: "UPDATE_DESCRIPTION_ONLY",
      ...override,
    }],
  });
}

class FakeRemediationClient implements RemediationShopifyClient {
  product: RemediationProductState | null = remediationState();
  writes: Array<{ id: string; descriptionHtml: string }> = [];
  mutateUnrelated = false;
  systemic = false;

  async readProduct(_productId: string) {
    if (this.systemic) {
      throw new RemediationError("SYSTEMIC_SHOPIFY_ERROR", "fixture", true);
    }
    return this.product ? structuredClone(this.product) : null;
  }

  async updateDescription(productId: string, descriptionHtml: string) {
    this.writes.push({ id: productId, descriptionHtml });
    this.product!.descriptionHtml = descriptionHtml;
    if (this.mutateUnrelated) this.product!.title = "Titolo alterato";
  }
}

Deno.test("3B.3 normalizza solo newline e BR deterministico", () => {
  assertEquals(
    normalizeApprovedOriginalDescription("<p>Uno\\nDue< br /></p>\r\n"),
    "<p>Uno\nDue<br></p>",
  );
});

Deno.test("3B.3 blocca ORIGINAL corrotto o ambiguo", () => {
  assertThrows(
    () =>
      remediationManifest({
        approvedOriginalDescriptionHtml: "<script>alert(1)</script>",
      }),
    Error,
    "APPROVED_DESCRIPTION_CORRUPTED",
  );
  assertThrows(
    () =>
      remediationManifest({
        approvedOriginalDescriptionHtml: "<p>testo < rotto</p>",
      }),
    Error,
    "APPROVED_DESCRIPTION_AMBIGUOUS_MARKUP",
  );
});

Deno.test("3B.3 aggiorna solo descriptionHtml sull'identità esatta", async () => {
  const client = new FakeRemediationClient();
  const before = structuredClone(client.product);
  const report = await executeRemediationBatch(
    client,
    remediationManifest(),
    "EXECUTE",
  );
  assertEquals(report.summary.REMEDIATED, 1);
  assertEquals(client.writes, [{
    id: "gid://shopify/Product/100",
    descriptionHtml: "<p>Testo <br>originale</p>",
  }]);
  assertEquals({ ...client.product, descriptionHtml: "ignored" }, {
    ...before,
    descriptionHtml: "ignored",
  });
});

Deno.test("3B.3 DRY_RUN e drift concorrente producono zero write", async () => {
  const dryClient = new FakeRemediationClient();
  const dry = await executeRemediationBatch(
    dryClient,
    remediationManifest(),
    "DRY_RUN",
  );
  assertEquals(dry.summary.READY_TO_REMEDIATE, 1);
  assertEquals(dryClient.writes.length, 0);

  const driftClient = new FakeRemediationClient();
  driftClient.product!.descriptionHtml = "<p>Modifica concorrente</p>";
  const drift = await executeRemediationBatch(
    driftClient,
    remediationManifest(),
    "EXECUTE",
  );
  assertEquals(drift.results[0].code, "STATE_DRIFT");
  assertEquals(driftClient.writes.length, 0);
});

Deno.test("3B.3 rileva cambi estranei e il retry non ripete la mutation", async () => {
  const isolated = new FakeRemediationClient();
  isolated.mutateUnrelated = true;
  const failed = await executeRemediationBatch(
    isolated,
    remediationManifest(),
    "EXECUTE",
  );
  assertEquals(failed.results[0].code, "FIELD_ISOLATION_POSTCONDITION_FAILED");

  const replay = new FakeRemediationClient();
  const manifest = remediationManifest();
  await executeRemediationBatch(replay, manifest, "EXECUTE");
  const second = await executeRemediationBatch(replay, manifest, "EXECUTE");
  assertEquals(second.summary.ALREADY_REMEDIATED, 1);
  assertEquals(replay.writes.length, 1);
});

Deno.test("3B.3 non espone alcuna operazione di creazione o duplicazione", () => {
  const client = new FakeRemediationClient() as any;
  assertEquals(client.createProduct, undefined);
  assertEquals(client.createVariant, undefined);
});

function publicationExpected() {
  return {
    id: "gid://shopify/Product/500",
    title: "Pero fixture",
    handle: "pero-fixture",
    descriptionHtml: "<p>Descrizione approvata.</p>",
    status: "DRAFT",
    options: [{ name: "Formato", values: ["Vaso 24 cm"] }],
    variants: [{
      id: "gid://shopify/ProductVariant/600",
      sku: "OG_111899-01",
      price: "23.50",
      inventoryItemId: "gid://shopify/InventoryItem/700",
      tracked: true,
      inventoryPolicy: "DENY",
      available: 20,
      selectedOptions: [{ name: "Formato", value: "Vaso 24 cm" }],
    }],
    media: [{
      id: "gid://shopify/MediaImage/800",
      alt: "Pero fixture",
      status: "READY",
      mediaContentType: "IMAGE",
    }],
  };
}

function publicationManifest(itemOverride: Record<string, unknown> = {}) {
  const expected = publicationExpected();
  return parsePublicationManifest({
    schemaVersion: "3B.4-v1",
    sourceManifest: "3B.2-v1",
    batchId: "shopify-publication-3b4-001",
    targetPublication: {
      id: "gid://shopify/Publication/900",
      name: "Online Store",
    },
    items: [{
      parentSku: "OG_111899",
      shopifyProductId: expected.id,
      expected,
      descriptionState: "APPROVED",
      mediaState: "READY",
      inventoryState: "TRACKED_DENY_20",
      structureState: "EXACT",
      blockedReasons: [],
      publishBlockedFields: [],
      ...itemOverride,
    }],
  });
}

function publicationLive(
  override: Partial<PublicationLiveProduct> = {},
): PublicationLiveProduct {
  const expected = publicationExpected();
  return {
    ...expected,
    status: "DRAFT",
    variantCount: expected.variants.length,
    mediaCount: expected.media.length,
    publicationIds: [],
    scheduledPublicationIds: [],
    ...override,
  } as PublicationLiveProduct;
}

class FakePublicationClient implements PublicationShopifyClient {
  products = new Map<string, PublicationLiveProduct>();
  writes: string[] = [];
  systemicProductId: string | null = null;

  constructor(product = publicationLive()) {
    this.products.set(product.id, structuredClone(product));
  }

  async readPublication(id: string) {
    return { id, name: "Online Store" };
  }

  async readProduct(id: string) {
    if (id === this.systemicProductId) {
      throw new PublicationError("SYSTEMIC_SHOPIFY_ERROR", "fixture", true);
    }
    const product = this.products.get(id);
    return product ? structuredClone(product) : null;
  }

  async activateProduct(id: string) {
    this.writes.push(`ACTIVE:${id}`);
    this.products.get(id)!.status = "ACTIVE";
  }

  async publishProduct(id: string, publicationId: string) {
    this.writes.push(`PUBLISH:${id}:${publicationId}`);
    this.products.get(id)!.publicationIds = [publicationId];
  }
}

Deno.test("3B.4 safe DRAFT pubblica con ACTIVE + solo Online Store", async () => {
  const client = new FakePublicationClient();
  const report = await executePublicationBatch(
    client,
    publicationManifest(),
    "EXECUTE",
  );
  assertEquals(report.summary.PUBLISHED, 1);
  assertEquals(client.writes, [
    "ACTIVE:gid://shopify/Product/500",
    "PUBLISH:gid://shopify/Product/500:gid://shopify/Publication/900",
  ]);
});

Deno.test("3B.4 già pubblicato e replay sono idempotenti", async () => {
  const client = new FakePublicationClient(publicationLive({
    status: "ACTIVE",
    publicationIds: ["gid://shopify/Publication/900"],
  }));
  const first = await executePublicationBatch(
    client,
    publicationManifest(),
    "EXECUTE",
  );
  assertEquals(first.summary.ALREADY_PUBLISHED, 1);
  assertEquals(client.writes.length, 0);

  const replayClient = new FakePublicationClient();
  await executePublicationBatch(replayClient, publicationManifest(), "EXECUTE");
  const replay = await executePublicationBatch(
    replayClient,
    publicationManifest(),
    "EXECUTE",
  );
  assertEquals(replay.summary.ALREADY_PUBLISHED, 1);
  assertEquals(replayClient.writes.length, 2);
});

Deno.test("3B.4 DRY_RUN esegue zero mutation", async () => {
  const client = new FakePublicationClient();
  const report = await executePublicationBatch(
    client,
    publicationManifest(),
    "DRY_RUN",
  );
  assertEquals(report.summary.READY_TO_PUBLISH, 1);
  assertEquals(client.writes.length, 0);
});

Deno.test("3B.4 blocca media mancante, stock errato e variante inattesa", async () => {
  for (
    const [product, code] of [
      [publicationLive({ media: [], mediaCount: 0 }), "MEDIA_SET_MISMATCH"],
      [
        publicationLive({
          variants: [{ ...publicationLive().variants[0], available: 19 }],
        }),
        "VARIANT_OR_INVENTORY_MISMATCH",
      ],
      [publicationLive({ variantCount: 2 }), "UNEXPECTED_VARIANTS"],
    ] as const
  ) {
    const client = new FakePublicationClient(product);
    const report = await executePublicationBatch(
      client,
      publicationManifest(),
      "EXECUTE",
    );
    assertEquals(report.results[0].code, code);
    assertEquals(client.writes.length, 0);
  }
});

Deno.test("3B.4 blocca publication inattese o schedulate", async () => {
  for (
    const product of [
      publicationLive({ publicationIds: ["gid://shopify/Publication/901"] }),
      publicationLive({
        scheduledPublicationIds: ["gid://shopify/Publication/900"],
      }),
    ]
  ) {
    const client = new FakePublicationClient(product);
    const report = await executePublicationBatch(
      client,
      publicationManifest(),
      "EXECUTE",
    );
    assertEquals(report.results[0].code, "UNEXPECTED_PUBLICATION");
    assertEquals(client.writes.length, 0);
  }
});

Deno.test("3B.4 manifest blocca structural, TEST e publishBlocked", () => {
  assertThrows(
    () => publicationManifest({ parentSku: "OG_152965" }),
    Error,
    "PUBLICATION_STRUCTURAL_BLOCKED",
  );
  assertThrows(
    () => publicationManifest({ parentSku: "TEST_SKU" }),
    Error,
    "PUBLICATION_STRUCTURAL_BLOCKED",
  );
  assertThrows(
    () => publicationManifest({ publishBlockedFields: ["description"] }),
    Error,
    "PUBLICATION_READINESS_BLOCKED",
  );
});

Deno.test("3B.4 errore sistemico arresta gli item successivi", async () => {
  const first = publicationExpected();
  const second = structuredClone(first);
  second.id = "gid://shopify/Product/501";
  second.handle = "pero-fixture-2";
  second.variants[0].id = "gid://shopify/ProductVariant/601";
  second.variants[0].sku = "OG_111900-01";
  second.variants[0].inventoryItemId = "gid://shopify/InventoryItem/701";
  const raw = publicationManifest() as any;
  raw.items.push({
    ...structuredClone(raw.items[0]),
    parentSku: "OG_111900",
    shopifyProductId: second.id,
    expected: second,
  });
  const manifest = parsePublicationManifest(raw);
  const client = new FakePublicationClient();
  client.products.set(
    second.id,
    publicationLive({
      ...(second as any),
      status: "DRAFT" as const,
      variantCount: 1,
      mediaCount: 1,
      publicationIds: [],
    }),
  );
  client.systemicProductId = first.id;
  const report = await executePublicationBatch(client, manifest, "EXECUTE");
  assertEquals(report.results[0].status, "FAILED");
  assertEquals(report.results[1].status, "SKIPPED");
  assertEquals(report.stopped, true);
});

Deno.test("3B.4 canale differente viene bloccato prima delle mutation", async () => {
  const client = new FakePublicationClient();
  client.readPublication = async (id: string) => ({ id, name: "Headless" });
  await assertRejects(
    () => executePublicationBatch(client, publicationManifest(), "EXECUTE"),
    PublicationError,
    "Canale Online Store non verificato",
  );
  assertEquals(client.writes.length, 0);
});

Deno.test("manifest privato: SHA e approvalDigest sono pinning obbligatori", async () => {
  const encoder = new TextEncoder();
  const raw = encoder.encode(JSON.stringify({
    schemaVersion: "fixture-v1",
    batchId: "fixture-batch-001",
    items: [{}],
  }));
  const sha = await sha256Hex(raw);
  const index = encoder.encode(JSON.stringify({
    schemaVersion: "fixture-index-v1",
    batches: [{
      batchId: "fixture-batch-001",
      objectPath: "fixture/batches/fixture-batch-001.json",
      sha256: sha,
      itemCount: 1,
      schemaVersion: "fixture-v1",
    }],
  }));
  const files = new Map([
    ["fixture/index.json", index],
    ["fixture/batches/fixture-batch-001.json", raw],
  ]);
  const approved = await loadApprovedManifest({
    batchId: "fixture-batch-001",
    store: {
      download: async (path: string) => files.get(path)!,
    },
    indexPath: "fixture/index.json",
    indexSchema: "fixture-index-v1",
    manifestSchema: "fixture-v1",
    objectPrefix: "fixture/batches",
    maxItems: 10,
    parseManifest: (value) => value as { batchId: string; items: unknown[] },
    manifestBatchId: (value) => value.batchId,
    manifestItemCount: (value) => value.items.length,
  });
  assertEquals(approved.manifestSha256, sha);
  assertApprovedDigest(
    "EXECUTE",
    approved.approvalDigest,
    approved.approvalDigest,
  );
  assertThrows(
    () =>
      assertApprovedDigest("EXECUTE", "0".repeat(64), approved.approvalDigest),
    Error,
    "MANIFEST_APPROVAL_MISMATCH",
  );
});
