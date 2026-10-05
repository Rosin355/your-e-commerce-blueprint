// deno-lint-ignore-file no-explicit-any require-await no-import-prefix no-unversioned-import
import { assertEquals, assertRejects, assertThrows } from "jsr:@std/assert";
import {
  assertApprovedDigest,
  loadApprovedManifest,
  manifestApprovalDigest,
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
  buildPublicationEvidence,
  executePublicationBatch,
  PublicationError,
} from "../../supabase/functions/shopify-publication-batch/executor.ts";
import { parsePublicationManifest } from "../../supabase/functions/shopify-publication-batch/manifest.ts";
import { parsePublicationRequest } from "../../supabase/functions/shopify-publication-batch/request.ts";
import type {
  PublicationEvidence,
  PublicationEvidenceLedger,
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
  persistentThrottle = false;

  async readProduct(_productId: string) {
    if (this.persistentThrottle) {
      throw new Error("Shopify rate limit persistente");
    }
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

Deno.test("3B.3 blocca snapshot varianti o media troncato", async () => {
  const variantsClient = new FakeRemediationClient();
  const variants = await executeRemediationBatch(
    variantsClient,
    remediationManifest({
      expectedCurrent: remediationState({ variantCount: 2 }),
    }),
    "EXECUTE",
  );
  assertEquals(variants.results[0].code, "SNAPSHOT_TRUNCATED");
  assertEquals(variantsClient.writes.length, 0);

  const mediaClient = new FakeRemediationClient();
  mediaClient.product!.mediaCount = 2;
  const media = await executeRemediationBatch(
    mediaClient,
    remediationManifest(),
    "EXECUTE",
  );
  assertEquals(media.results[0].code, "SNAPSHOT_TRUNCATED");
  assertEquals(mediaClient.writes.length, 0);

  const exactClient = new FakeRemediationClient();
  const exact = await executeRemediationBatch(
    exactClient,
    remediationManifest(),
    "DRY_RUN",
  );
  assertEquals(exact.summary.READY_TO_REMEDIATE, 1);
});

Deno.test("3B.3 throttle persistente arresta il batch", async () => {
  const manifest = remediationManifest();
  const second = structuredClone(manifest.items[0]);
  second.parentSku = "OG_341476";
  second.shopifyProductId = "gid://shopify/Product/101";
  second.expectedCurrent.id = second.shopifyProductId;
  manifest.items.push(second);
  const client = new FakeRemediationClient();
  client.persistentThrottle = true;
  const report = await executeRemediationBatch(client, manifest, "EXECUTE");
  assertEquals(report.results[0].code, "SYSTEMIC_SHOPIFY_ERROR");
  assertEquals(report.results[1].code, "BATCH_STOPPED");
  assertEquals(client.writes.length, 0);
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

const ONLINE_STORE_ID = "gid://shopify/Publication/900";
const HEADLESS_ID = "gid://shopify/Publication/338862113108";
const LOVABLE_ID = "gid://shopify/Publication/328891826516";
const POS_ID = "gid://shopify/Publication/901";
const SHOP_ID = "gid://shopify/Publication/902";
const APPROVED_PUBLICATION_IDS = [ONLINE_STORE_ID, HEADLESS_ID, LOVABLE_ID];

function publicationManifest(itemOverride: Record<string, unknown> = {}) {
  const expected = publicationExpected();
  return parsePublicationManifest({
    schemaVersion: "3B.4-v2",
    sourceManifest: "3B.2-v1",
    batchId: "shopify-publication-3b4-001",
    approvedPublications: [
      { name: "Online Store" },
      {
        id: HEADLESS_ID,
        name: "Ecom Blueprint Gen 6ud1s Headless",
      },
      { id: LOVABLE_ID, name: "Lovable" },
    ],
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
  persistentThrottleProductId: string | null = null;
  mutateUnrelatedOnPublish = false;
  mutateInventoryOnPublish = false;
  addUnexpectedPublicationOnPublish = false;
  removeUnrelatedScheduledOnPublish = false;
  addUnapprovedScheduledOnPublish = false;

  constructor(product = publicationLive()) {
    this.products.set(product.id, structuredClone(product));
  }

  async listPublications() {
    return [
      { id: ONLINE_STORE_ID, name: "Online Store" },
      { id: HEADLESS_ID, name: "Ecom Blueprint Gen 6ud1s Headless" },
      { id: LOVABLE_ID, name: "Lovable" },
      { id: POS_ID, name: "Point of Sale" },
      { id: SHOP_ID, name: "Shop" },
    ];
  }

  async readProduct(id: string) {
    if (id === this.persistentThrottleProductId) {
      throw new Error("Shopify rate limit persistente");
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
    const product = this.products.get(id)!;
    if (!product.publicationIds.includes(publicationId)) {
      product.publicationIds.push(publicationId);
    }
    product.scheduledPublicationIds = product.scheduledPublicationIds.filter(
      (id) => id !== publicationId,
    );
    if (this.mutateUnrelatedOnPublish) product.title = "Titolo alterato";
    if (this.mutateInventoryOnPublish) product.variants[0].available = 19;
    if (
      this.addUnexpectedPublicationOnPublish &&
      !product.publicationIds.includes(POS_ID)
    ) {
      product.publicationIds.push(POS_ID);
    }
    if (this.removeUnrelatedScheduledOnPublish) {
      product.scheduledPublicationIds = product.scheduledPublicationIds.filter(
        (id) => id !== "gid://shopify/Publication/999",
      );
    }
    if (
      this.addUnapprovedScheduledOnPublish &&
      !product.scheduledPublicationIds.includes(
        "gid://shopify/Publication/998",
      )
    ) {
      product.scheduledPublicationIds.push("gid://shopify/Publication/998");
    }
  }
}

class FakePublicationLedger implements PublicationEvidenceLedger {
  rows = new Map<string, PublicationEvidence>();

  key(batchId: string, parentSku: string) {
    return `${batchId}:${parentSku}`;
  }

  async find(batchId: string, parentSku: string) {
    return structuredClone(this.rows.get(this.key(batchId, parentSku)) ?? null);
  }

  async reserve(evidence: PublicationEvidence) {
    const key = this.key(evidence.batchId, evidence.parentSku);
    const existing = this.rows.get(key);
    if (existing) {
      return { kind: "EXISTING" as const, evidence: structuredClone(existing) };
    }
    this.rows.set(key, structuredClone(evidence));
    return { kind: "RESERVED" as const };
  }

  async markApplied(evidence: PublicationEvidence) {
    this.rows.set(this.key(evidence.batchId, evidence.parentSku), {
      ...structuredClone(evidence),
      status: "APPLIED",
      appliedAt: "2026-10-04T12:00:00.000Z",
    });
  }

  async markVerified(evidence: PublicationEvidence) {
    const key = this.key(evidence.batchId, evidence.parentSku);
    const current = this.rows.get(key)!;
    this.rows.set(key, {
      ...current,
      status: "VERIFIED",
      verifiedAt: "2026-10-04T12:01:00.000Z",
    });
  }
}

function runPublication(
  client: PublicationShopifyClient,
  manifest: ReturnType<typeof publicationManifest>,
  mode: "DRY_RUN" | "EXECUTE",
  ledger = new FakePublicationLedger(),
) {
  return executePublicationBatch(client, ledger, manifest, mode);
}

async function ledgerWithAppliedProof(
  manifest = publicationManifest(),
) {
  const ledger = new FakePublicationLedger();
  const proof = await buildPublicationEvidence(manifest, manifest.items[0]);
  ledger.rows.set(ledger.key(proof.batchId, proof.parentSku), {
    ...proof,
    status: "APPLIED",
    appliedAt: "2026-10-04T12:00:00.000Z",
  });
  return ledger;
}

Deno.test("3B.4 DRAFT pubblica esattamente sui tre target approvati", async () => {
  const client = new FakePublicationClient();
  const ledger = new FakePublicationLedger();
  const report = await runPublication(
    client,
    publicationManifest(),
    "EXECUTE",
    ledger,
  );
  assertEquals(report.summary.PUBLISHED, 1);
  assertEquals(client.writes, [
    "ACTIVE:gid://shopify/Product/500",
    `PUBLISH:gid://shopify/Product/500:${ONLINE_STORE_ID}`,
    `PUBLISH:gid://shopify/Product/500:${HEADLESS_ID}`,
    `PUBLISH:gid://shopify/Product/500:${LOVABLE_ID}`,
  ]);
  assertEquals(
    client.products.get("gid://shopify/Product/500")!.publicationIds.sort(),
    [...APPROVED_PUBLICATION_IDS].sort(),
  );
  assertEquals(client.writes.some((write) => write.includes(POS_ID)), false);
  assertEquals(client.writes.some((write) => write.includes(SHOP_ID)), false);
  const proof = await ledger.find(
    "shopify-publication-3b4-001",
    "OG_111899",
  );
  assertEquals(proof?.status, "VERIFIED");
  assertEquals(Boolean(proof?.appliedAt && proof.verifiedAt), true);
});

Deno.test("3B.4 ACTIVE con prova SET_ACTIVE valida consente il replay", async () => {
  const manifest = publicationManifest();
  const client = new FakePublicationClient(publicationLive({
    status: "ACTIVE",
  }));
  const ledger = await ledgerWithAppliedProof(manifest);
  const report = await runPublication(
    client,
    manifest,
    "EXECUTE",
    ledger,
  );
  assertEquals(report.summary.PUBLISHED, 1);
  assertEquals(client.writes, [
    `PUBLISH:gid://shopify/Product/500:${ONLINE_STORE_ID}`,
    `PUBLISH:gid://shopify/Product/500:${HEADLESS_ID}`,
    `PUBLISH:gid://shopify/Product/500:${LOVABLE_ID}`,
  ]);
});

Deno.test("3B.4 un target presente aggiunge soltanto i due mancanti", async () => {
  const client = new FakePublicationClient(publicationLive({
    status: "ACTIVE",
    publicationIds: [ONLINE_STORE_ID],
  }));
  const report = await runPublication(
    client,
    publicationManifest(),
    "EXECUTE",
    await ledgerWithAppliedProof(),
  );
  assertEquals(report.summary.PUBLISHED, 1);
  assertEquals(client.writes, [
    `PUBLISH:gid://shopify/Product/500:${HEADLESS_ID}`,
    `PUBLISH:gid://shopify/Product/500:${LOVABLE_ID}`,
  ]);
});

Deno.test("3B.4 due target presenti aggiungono soltanto Lovable", async () => {
  const client = new FakePublicationClient(publicationLive({
    status: "ACTIVE",
    publicationIds: [ONLINE_STORE_ID, HEADLESS_ID],
  }));
  const report = await runPublication(
    client,
    publicationManifest(),
    "EXECUTE",
    await ledgerWithAppliedProof(),
  );
  assertEquals(report.summary.PUBLISHED, 1);
  assertEquals(client.writes, [
    `PUBLISH:gid://shopify/Product/500:${LOVABLE_ID}`,
  ]);
});

async function assertApprovedScheduledTransition(publicationId: string) {
  const client = new FakePublicationClient(publicationLive({
    scheduledPublicationIds: [publicationId],
  }));
  const report = await runPublication(client, publicationManifest(), "EXECUTE");
  assertEquals(report.summary.PUBLISHED, 1);
  assertEquals(report.results[0].code, undefined);
  assertEquals(
    client.products.get("gid://shopify/Product/500")!.publicationIds.sort(),
    [...APPROVED_PUBLICATION_IDS].sort(),
  );
  assertEquals(
    client.products.get("gid://shopify/Product/500")!.scheduledPublicationIds,
    [],
  );
}

Deno.test("3B.4 Online Store schedulato può diventare pubblicato", async () => {
  await assertApprovedScheduledTransition(ONLINE_STORE_ID);
});

Deno.test("3B.4 Headless schedulato può diventare pubblicato", async () => {
  await assertApprovedScheduledTransition(HEADLESS_ID);
});

Deno.test("3B.4 Lovable schedulato può diventare pubblicato", async () => {
  await assertApprovedScheduledTransition(LOVABLE_ID);
});

Deno.test("3B.4 OG_111899 sui tre target è ALREADY_PUBLISHED a zero mutation", async () => {
  const client = new FakePublicationClient(publicationLive({
    status: "ACTIVE",
    publicationIds: [...APPROVED_PUBLICATION_IDS],
  }));
  const report = await runPublication(
    client,
    publicationManifest(),
    "DRY_RUN",
    await ledgerWithAppliedProof(),
  );
  assertEquals(report.summary.ALREADY_PUBLISHED, 1);
  assertEquals(report.results[0].parentSku, "OG_111899");
  assertEquals(client.writes.length, 0);
});

Deno.test("3B.4 ACTIVE senza prova SET_ACTIVE è STATE_DRIFT", async () => {
  const client = new FakePublicationClient(publicationLive({
    status: "ACTIVE",
  }));
  const report = await runPublication(
    client,
    publicationManifest(),
    "EXECUTE",
  );
  assertEquals(report.results[0].code, "STATE_DRIFT");
  assertEquals(client.writes.length, 0);
});

Deno.test("3B.4 ACTIVE con prova conflittuale è IDEMPOTENCY_CONFLICT", async () => {
  const manifest = publicationManifest();
  const client = new FakePublicationClient(publicationLive({
    status: "ACTIVE",
  }));
  const ledger = new FakePublicationLedger();
  const proof = await buildPublicationEvidence(manifest, manifest.items[0]);
  ledger.rows.set(ledger.key(proof.batchId, proof.parentSku), {
    ...proof,
    productId: "gid://shopify/Product/999",
    status: "APPLIED",
    appliedAt: "2026-10-04T12:00:00.000Z",
  });
  const report = await runPublication(client, manifest, "EXECUTE", ledger);
  assertEquals(report.results[0].code, "IDEMPOTENCY_CONFLICT");
  assertEquals(client.writes.length, 0);
});

Deno.test("3B.4 replay completo è idempotente", async () => {
  const replayClient = new FakePublicationClient();
  const replayLedger = new FakePublicationLedger();
  const manifest = publicationManifest();
  await runPublication(replayClient, manifest, "EXECUTE", replayLedger);
  const replay = await runPublication(
    replayClient,
    manifest,
    "EXECUTE",
    replayLedger,
  );
  assertEquals(replay.summary.ALREADY_PUBLISHED, 1);
  assertEquals(replayClient.writes.length, 4);
});

Deno.test("3B.4 DRY_RUN esegue zero mutation", async () => {
  const client = new FakePublicationClient();
  const report = await runPublication(
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
    const report = await runPublication(
      client,
      publicationManifest(),
      "EXECUTE",
    );
    assertEquals(report.results[0].code, code);
    assertEquals(client.writes.length, 0);
  }
});

Deno.test("3B.4 publication storiche restano invariate e sono segnalate", async () => {
  const client = new FakePublicationClient(publicationLive({
    publicationIds: [POS_ID, SHOP_ID],
    scheduledPublicationIds: ["gid://shopify/Publication/999"],
  }));
  const report = await runPublication(
    client,
    publicationManifest(),
    "EXECUTE",
  );
  assertEquals(report.summary.PUBLISHED, 1);
  assertEquals(report.results[0].warningCode, "PRE_EXISTING_EXTRA_PUBLICATION");
  assertEquals(report.results[0].preExistingExtraPublicationIds, [
    POS_ID,
    SHOP_ID,
  ]);
  assertEquals(
    client.products.get("gid://shopify/Product/500")!.publicationIds.sort(),
    [...APPROVED_PUBLICATION_IDS, POS_ID, SHOP_ID].sort(),
  );
  assertEquals(
    client.products.get("gid://shopify/Product/500")!.scheduledPublicationIds,
    ["gid://shopify/Publication/999"],
  );
  assertEquals(client.writes.some((write) => write.includes(POS_ID)), false);
  assertEquals(client.writes.some((write) => write.includes(SHOP_ID)), false);
});

Deno.test("3B.4 variazione di una publication schedulata estranea fallisce", async () => {
  const client = new FakePublicationClient(publicationLive({
    scheduledPublicationIds: ["gid://shopify/Publication/999"],
  }));
  client.removeUnrelatedScheduledOnPublish = true;
  const report = await runPublication(client, publicationManifest(), "EXECUTE");
  assertEquals(
    report.results[0].code,
    "FIELD_ISOLATION_POSTCONDITION_FAILED",
  );
});

Deno.test("3B.4 nuova publication schedulata non approvata fallisce", async () => {
  const client = new FakePublicationClient();
  client.addUnapprovedScheduledOnPublish = true;
  const report = await runPublication(client, publicationManifest(), "EXECUTE");
  assertEquals(
    report.results[0].code,
    "FIELD_ISOLATION_POSTCONDITION_FAILED",
  );
});

Deno.test("3B.4 blocca una publication extra aggiunta durante il workflow", async () => {
  const client = new FakePublicationClient();
  client.addUnexpectedPublicationOnPublish = true;
  const report = await runPublication(client, publicationManifest(), "EXECUTE");
  assertEquals(report.results[0].code, "PUBLICATION_POSTCONDITION_FAILED");
});

Deno.test("3B.4 rileva mutation estranee al contenuto e inventario", async () => {
  for (const kind of ["content", "inventory"] as const) {
    const client = new FakePublicationClient();
    client.mutateUnrelatedOnPublish = kind === "content";
    client.mutateInventoryOnPublish = kind === "inventory";
    const report = await runPublication(
      client,
      publicationManifest(),
      "EXECUTE",
    );
    assertEquals(report.results[0].code, "PUBLICATION_POSTCONDITION_FAILED");
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

Deno.test("3B.4 manifest rifiuta un quarto target arbitrario", () => {
  const raw = structuredClone(publicationManifest()) as any;
  raw.approvedPublications.push({
    id: "gid://shopify/Publication/999",
    name: "Point of Sale",
  });
  assertThrows(
    () => parsePublicationManifest(raw),
    Error,
    "PUBLICATION_TARGET_BLOCKED",
  );
});

Deno.test("3B.4 request rifiuta publication ID forniti dal client", () => {
  assertThrows(
    () =>
      parsePublicationRequest({
        batchId: "shopify-publication-3b4-002",
        mode: "DRY_RUN",
        publicationIds: [POS_ID],
      }),
    Error,
    "REQUEST_FIELD_FORBIDDEN: publicationIds",
  );
});

Deno.test("3B.4 verifica post-publish richiede tutti i tre target", async () => {
  const client = new FakePublicationClient();
  client.publishProduct = async (id: string, publicationId: string) => {
    client.writes.push(`PUBLISH:${id}:${publicationId}`);
    if (publicationId !== LOVABLE_ID) {
      client.products.get(id)!.publicationIds.push(publicationId);
    }
  };
  const report = await runPublication(client, publicationManifest(), "EXECUTE");
  assertEquals(report.results[0].code, "PUBLICATION_POSTCONDITION_FAILED");
});

Deno.test("3B.4 throttle persistente arresta gli item successivi", async () => {
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
  client.persistentThrottleProductId = first.id;
  const report = await runPublication(client, manifest, "EXECUTE");
  assertEquals(report.results[0].status, "FAILED");
  assertEquals(report.results[0].code, "SYSTEMIC_SHOPIFY_ERROR");
  assertEquals(report.results[1].status, "SKIPPED");
  assertEquals(report.results[1].code, "BATCH_STOPPED");
  assertEquals(report.stopped, true);
  assertEquals(client.writes.length, 0);
});

Deno.test("3B.4 identità publication non approvata blocca prima delle mutation", async () => {
  const client = new FakePublicationClient();
  client.listPublications = async () => [
    { id: ONLINE_STORE_ID, name: "Online Store" },
    { id: HEADLESS_ID, name: "Headless rinominato" },
    { id: LOVABLE_ID, name: "Lovable" },
  ];
  await assertRejects(
    () => runPublication(client, publicationManifest(), "EXECUTE"),
    PublicationError,
    "Publication approvata non verificata",
  );
  assertEquals(client.writes.length, 0);
});

Deno.test("3B.4 manomissione target cambia SHA e approvalDigest", async () => {
  const manifest = publicationManifest();
  const approvedBytes = new TextEncoder().encode(JSON.stringify(manifest));
  const tampered = structuredClone(manifest) as any;
  tampered.approvedPublications[2].id = "gid://shopify/Publication/999";
  const tamperedBytes = new TextEncoder().encode(JSON.stringify(tampered));
  const approvedSha = await sha256Hex(approvedBytes);
  const tamperedSha = await sha256Hex(tamperedBytes);
  const approvedDigest = await manifestApprovalDigest(
    manifest.batchId,
    approvedSha,
    manifest.schemaVersion,
  );
  const tamperedDigest = await manifestApprovalDigest(
    manifest.batchId,
    tamperedSha,
    manifest.schemaVersion,
  );
  assertEquals(approvedSha === tamperedSha, false);
  assertEquals(approvedDigest === tamperedDigest, false);
  assertThrows(
    () => assertApprovedDigest("EXECUTE", approvedDigest, tamperedDigest),
    Error,
    "MANIFEST_APPROVAL_MISMATCH",
  );
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
