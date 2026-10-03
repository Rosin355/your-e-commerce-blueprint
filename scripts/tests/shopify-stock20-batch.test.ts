import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  executeStock20Batch,
  Stock20Error,
  stock20IdempotencyKey,
  stock20RecoveryIdempotencyKey,
} from "../../supabase/functions/shopify-stock20-batch/executor.ts";
import { parseStock20Manifest } from "../../supabase/functions/shopify-stock20-batch/manifest.ts";
import {
  STOCK20_LOCATION_ID,
  type Stock20LiveState,
  type Stock20Manifest,
  type Stock20ManifestItem,
  type Stock20ShopifyClient,
} from "../../supabase/functions/shopify-stock20-batch/types.ts";
import { canWriteCanary } from "../../supabase/functions/_shared/admin-v2-permissions.ts";
import {
  buildBatchManifest,
  parseCsv,
} from "../build-stock20-batch-manifest.mjs";

function item(
  n = 1,
  override: Partial<Stock20ManifestItem> = {},
): Stock20ManifestItem {
  return {
    sku: `OG_TEST_${n}`,
    shopifyProductId: `gid://shopify/Product/${1000 + n}`,
    shopifyVariantId: `gid://shopify/ProductVariant/${2000 + n}`,
    inventoryItemId: `gid://shopify/InventoryItem/${3000 + n}`,
    locationId: STOCK20_LOCATION_ID,
    currentTracked: false,
    currentPolicy: "DENY",
    currentAvailable: 0,
    targetAvailable: 20,
    readiness: "READY_FOR_SALE",
    structureStatus: "UPDATE_EXISTING",
    ...override,
  };
}

function manifest(items = [item()]): Stock20Manifest {
  return parseStock20Manifest({
    schemaVersion: "3B.1G-v1",
    sourceManifest: "3B.1C",
    batchId: "batch-test-001",
    items,
  });
}

class MockClient implements Stock20ShopifyClient {
  states = new Map<string, Stock20LiveState>();
  mutations: string[] = [];
  reads = 0;
  failSku: string | null = null;
  systemicSku: string | null = null;
  concurrentReplay = false;
  failTracking = false;
  failPolicy = false;
  quantityFailures: string[] = [];
  previousAttemptLeavesTarget = false;
  postconditionFailure = false;
  quantitySucceeded = false;
  quantityKeys: string[] = [];

  constructor(items: Stock20ManifestItem[]) {
    for (const entry of items) {
      this.states.set(entry.sku, {
        sku: entry.sku,
        shopifyProductId: entry.shopifyProductId,
        shopifyVariantId: entry.shopifyVariantId,
        inventoryItemId: entry.inventoryItemId,
        locationId: entry.locationId,
        tracked: entry.currentTracked ?? false,
        inventoryPolicy: entry.currentPolicy ?? "DENY",
        available: entry.currentAvailable ?? 0,
        onHand: entry.currentAvailable ?? 0,
      });
    }
  }

  async readState(entry: Stock20ManifestItem) {
    this.reads += 1;
    if (entry.sku === this.systemicSku) {
      throw new Stock20Error("AUTH_SCOPE", "scope mancante", true);
    }
    if (entry.sku === this.failSku) throw new Error("fixture item failure");
    const state = structuredClone(this.states.get(entry.sku)!);
    if (this.postconditionFailure && this.quantitySucceeded) {
      state.available = 19;
    }
    return state;
  }

  async enableTracking(inventoryItemId: string) {
    if (this.failTracking) {
      throw new Stock20Error("ITEM_SHOPIFY_ERROR", "fixture tracking");
    }
    this.mutations.push(`track:${inventoryItemId}`);
    for (const state of this.states.values()) {
      if (state.inventoryItemId === inventoryItemId) state.tracked = true;
    }
  }

  async setInventoryPolicy(_productId: string, variantId: string) {
    if (this.failPolicy) {
      throw new Stock20Error("ITEM_SHOPIFY_ERROR", "fixture policy");
    }
    this.mutations.push(`policy:${variantId}`);
    for (const state of this.states.values()) {
      if (state.shopifyVariantId === variantId) state.inventoryPolicy = "DENY";
    }
  }

  async setAvailableAbsolute(input: {
    inventoryItemId: string;
    quantity: 20;
    compareQuantity: number;
    idempotencyKey: string;
  }) {
    this.mutations.push(`quantity:${input.inventoryItemId}:${input.quantity}`);
    this.quantityKeys.push(input.idempotencyKey);
    const state = [...this.states.values()].find((candidate) =>
      candidate.inventoryItemId === input.inventoryItemId
    )!;
    assert.equal(state.available, input.compareQuantity);
    const failure = this.quantityFailures.shift();
    if (failure) {
      if (this.previousAttemptLeavesTarget) {
        state.tracked = true;
        state.inventoryPolicy = "DENY";
        state.available = 20;
        state.onHand = 20;
      }
      throw new Stock20Error(failure, `fixture ${failure}`);
    }
    state.available = input.quantity;
    state.onHand = input.quantity;
    this.quantitySucceeded = true;
    if (this.concurrentReplay) throw new Error("COMPARE_QUANTITY_STALE");
  }
}

test("manifest: massimo 25, denylist, duplicati, location e struttura sono fail-fast", () => {
  assert.equal(
    manifest(Array.from({ length: 25 }, (_, i) => item(i + 1))).items.length,
    25,
  );
  assert.throws(
    () => manifest(Array.from({ length: 26 }, (_, i) => item(i + 1))),
    /BATCH_TOO_LARGE/,
  );
  assert.throws(
    () => manifest([item(1, { sku: "OG_393883" })]),
    /MANIFEST_DENYLIST/,
  );
  assert.throws(
    () => manifest([item(1), item(2, { sku: item(1).sku })]),
    /DUPLICATE_SKU/,
  );
  assert.throws(
    () =>
      manifest([
        item(1),
        item(2, { inventoryItemId: item(1).inventoryItemId }),
      ]),
    /DUPLICATE_INVENTORY_ITEM/,
  );
  assert.throws(
    () => manifest([item(1, { locationId: "gid://shopify/Location/9" })]),
    /LOCATION_MISMATCH/,
  );
  assert.throws(
    () =>
      manifest([item(1, { structureStatus: "RESTRUCTURE_REQUIRED" as never })]),
    /STRUCTURE_BLOCKED/,
  );
});

test("importer: seleziona solo simple UPDATE_EXISTING con contenuto e prezzo validi", () => {
  const rows = parseCsv(
    "sku,entity_type,shopify_product_id,action,price,content_ready,stock_target,block_reason\n" +
      "OG_SAFE,simple,1001,UPDATE_EXISTING,12.50,YES,20,\n" +
      "OG_NO_PRICE,simple,1002,UPDATE_EXISTING,0,YES,20,\n" +
      "OG_RESTRUCTURE,simple,1003,RESTRUCTURE_REQUIRED,9,YES,20,STRUCTURE_MISMATCH\n" +
      "OG_VARIATION,variation,1004,UPDATE_EXISTING,9,YES,20,\n",
  );
  const result = buildBatchManifest({
    rows,
    inventoryRows: [{
      sku: "OG_SAFE",
      shopifyProductId: "gid://shopify/Product/1001",
      shopifyVariantId: "gid://shopify/ProductVariant/2001",
      inventoryItemId: "gid://shopify/InventoryItem/3001",
      currentTracked: false,
      currentPolicy: "DENY",
      currentAvailable: 0,
    }],
    batchId: "batch-import-001",
    limit: 25,
  });
  assert.deepEqual(result.items.map((entry) => entry.sku), ["OG_SAFE"]);
});

test("auth: solo admin e tech_admin superano il gate canary", () => {
  assert.equal(canWriteCanary(["admin"]), true);
  assert.equal(canWriteCanary(["tech_admin"]), true);
  assert.equal(canWriteCanary(["editor"]), false);
  assert.equal(canWriteCanary([]), false);
});

test("DRY_RUN è default-safe: legge e pianifica senza mutation", async () => {
  const m = manifest();
  const client = new MockClient(m.items);
  const report = await executeStock20Batch(client, m, "DRY_RUN");
  assert.deepEqual(client.mutations, []);
  assert.equal(report.summary.SKIPPED, 1);
  assert.deepEqual(report.results[0].plannedMutations, [
    "ENABLE_TRACKING",
    "SET_AVAILABLE_20",
  ]);
});

for (const current of [0, 5]) {
  test(`EXECUTE imposta available assoluto ${current}→20 e il retry resta 20`, async () => {
    const m = manifest([
      item(1, { currentAvailable: current, currentTracked: true }),
    ]);
    const client = new MockClient(m.items);
    const first = await executeStock20Batch(client, m, "EXECUTE");
    assert.equal(first.results[0].status, "UPDATED");
    assert.equal(client.states.get("OG_TEST_1")?.available, 20);
    const retry = await executeStock20Batch(client, m, "EXECUTE");
    assert.equal(retry.results[0].status, "ALREADY_AT_TARGET");
    assert.equal(
      client.mutations.filter((entry) => entry.startsWith("quantity:")).length,
      1,
    );
  });
}

test("available=20, tracked e DENY non produce write", async () => {
  const m = manifest([item(1, { currentAvailable: 20, currentTracked: true })]);
  const client = new MockClient(m.items);
  const report = await executeStock20Batch(client, m, "EXECUTE");
  assert.equal(report.results[0].status, "ALREADY_AT_TARGET");
  assert.deepEqual(client.mutations, []);
});

test("drift rispetto al manifest blocca la write prima di ogni mutation", async () => {
  const m = manifest([item(1, { currentAvailable: 5, currentTracked: true })]);
  const client = new MockClient(m.items);
  client.states.get("OG_TEST_1")!.available = 7;
  const report = await executeStock20Batch(client, m, "EXECUTE");
  assert.equal(report.results[0].status, "FAILED");
  assert.equal(report.results[0].code, "MANIFEST_STATE_DRIFT");
  assert.deepEqual(client.mutations, []);
});

test("tracking false→true e CONTINUE→DENY senza altri cambiamenti", async () => {
  const m = manifest([
    item(1, { currentAvailable: 20, currentPolicy: "CONTINUE" }),
  ]);
  const client = new MockClient(m.items);
  const report = await executeStock20Batch(client, m, "EXECUTE");
  assert.equal(report.results[0].status, "UPDATED");
  assert.deepEqual(client.mutations, [
    `track:${m.items[0].inventoryItemId}`,
    `policy:${m.items[0].shopifyVariantId}`,
  ]);
});

test("errore elemento isolato; errore sistemico arresta i successivi", async () => {
  const m = manifest([item(1), item(2), item(3)]);
  const isolated = new MockClient(m.items);
  isolated.failSku = "OG_TEST_2";
  const partial = await executeStock20Batch(isolated, m, "DRY_RUN");
  assert.equal(partial.results[0].status, "SKIPPED");
  assert.equal(partial.results[1].status, "FAILED");
  assert.equal(partial.results[2].status, "SKIPPED");
  assert.equal(partial.stopped, false);

  const systemic = new MockClient(m.items);
  systemic.systemicSku = "OG_TEST_2";
  const stopped = await executeStock20Batch(systemic, m, "DRY_RUN");
  assert.equal(stopped.stopped, true);
  assert.equal(stopped.results[2].code, "BATCH_STOPPED");
});

test("retry concorrente viene riconciliato con una sola rilettura e nessun secondo set", async () => {
  const m = manifest([item(1, { currentTracked: true })]);
  const client = new MockClient(m.items);
  client.concurrentReplay = true;
  const report = await executeStock20Batch(client, m, "EXECUTE");
  assert.equal(report.results[0].status, "ALREADY_AT_TARGET");
  assert.equal(report.results[0].code, "CONCURRENT_REPLAY_RECONCILED");
  assert.equal(
    client.mutations.filter((entry) => entry.startsWith("quantity:")).length,
    1,
  );
});

test("P1-A: tracking confermato resta nel report se policy fallisce", async () => {
  const m = manifest([item(1, { currentPolicy: "CONTINUE" })]);
  const client = new MockClient(m.items);
  client.failPolicy = true;
  const report = await executeStock20Batch(client, m, "EXECUTE");
  const result = report.results[0];
  assert.equal(result.status, "FAILED");
  assert.equal(result.failedStep, "SET_POLICY_DENY");
  assert.deepEqual(result.appliedMutations, ["ENABLE_TRACKING"]);
  assert.deepEqual(result.plannedMutations, [
    "ENABLE_TRACKING",
    "SET_POLICY_DENY",
    "SET_AVAILABLE_20",
  ]);
  assert.equal(result.before?.tracked, false);
  assert.equal(client.quantityKeys.length, 0);
});

test("P1-B: tracking e policy restano nel report se quantity fallisce", async () => {
  const m = manifest([item(1, { currentPolicy: "CONTINUE" })]);
  const client = new MockClient(m.items);
  client.quantityFailures = ["ITEM_SHOPIFY_ERROR"];
  const report = await executeStock20Batch(client, m, "EXECUTE");
  const result = report.results[0];
  assert.equal(result.status, "FAILED");
  assert.equal(result.failedStep, "SET_AVAILABLE_20_PRIMARY");
  assert.deepEqual(result.appliedMutations, [
    "ENABLE_TRACKING",
    "SET_POLICY_DENY",
  ]);
  assert.equal(
    result.message,
    "Operazione Shopify non completata per l'elemento",
  );
});

test("P1-C: quantity confermata resta nel report se la postcondition fallisce", async () => {
  const m = manifest([item(1, { currentPolicy: "CONTINUE" })]);
  const client = new MockClient(m.items);
  client.postconditionFailure = true;
  const report = await executeStock20Batch(client, m, "EXECUTE");
  const result = report.results[0];
  assert.equal(result.status, "FAILED");
  assert.equal(result.failedStep, "POSTCONDITION");
  assert.deepEqual(result.appliedMutations, [
    "ENABLE_TRACKING",
    "SET_POLICY_DENY",
    "SET_AVAILABLE_20",
  ]);
  assert.equal(result.after?.available, 19);
});

test("P1-D: fallimento prima della prima mutation riporta applied vuoto", async () => {
  const m = manifest();
  const client = new MockClient(m.items);
  client.failTracking = true;
  const report = await executeStock20Batch(client, m, "EXECUTE");
  const result = report.results[0];
  assert.equal(result.status, "FAILED");
  assert.equal(result.failedStep, "ENABLE_TRACKING");
  assert.deepEqual(result.appliedMutations, []);
});

test("P2-A: previous attempt già a 20 viene riconciliato senza recovery write", async () => {
  const m = manifest([item(1, { currentTracked: true })]);
  const client = new MockClient(m.items);
  client.quantityFailures = ["IDEMPOTENCY_PREVIOUS_ATTEMPT_FAILED"];
  client.previousAttemptLeavesTarget = true;
  const report = await executeStock20Batch(client, m, "EXECUTE");
  const result = report.results[0];
  assert.equal(result.status, "ALREADY_AT_TARGET");
  assert.equal(result.code, "IDEMPOTENCY_PREVIOUS_ATTEMPT_RECONCILED");
  assert.equal(result.recoveryAttempted, false);
  assert.equal(result.recoveryIdempotencyKey, undefined);
  assert.equal(result.primaryIdempotencyKey, result.idempotencyKey);
  assert.deepEqual(client.quantityKeys, [result.idempotencyKey]);
});

test("P2-B: previous attempt fallito usa una sola recovery-1 deterministica", async () => {
  const m = manifest([item(1, { currentTracked: true })]);
  const client = new MockClient(m.items);
  client.quantityFailures = ["IDEMPOTENCY_PREVIOUS_ATTEMPT_FAILED"];
  const report = await executeStock20Batch(client, m, "EXECUTE");
  const result = report.results[0];
  const recoveryKey = stock20RecoveryIdempotencyKey(
    m.batchId,
    m.items[0].inventoryItemId,
  );
  assert.equal(result.status, "UPDATED");
  assert.equal(result.recoveryAttempted, true);
  assert.equal(result.recoveryIdempotencyKey, recoveryKey);
  assert.deepEqual(client.quantityKeys, [result.idempotencyKey, recoveryKey]);
  assert.equal(client.states.get("OG_TEST_1")?.available, 20);
});

test("P2-C: errore anche su recovery-1 fallisce senza loop", async () => {
  const m = manifest([item(1, { currentTracked: true })]);
  const client = new MockClient(m.items);
  client.quantityFailures = [
    "IDEMPOTENCY_PREVIOUS_ATTEMPT_FAILED",
    "IDEMPOTENCY_PREVIOUS_ATTEMPT_FAILED",
  ];
  const report = await executeStock20Batch(client, m, "EXECUTE");
  const result = report.results[0];
  assert.equal(result.status, "FAILED");
  assert.equal(result.code, "IDEMPOTENCY_PREVIOUS_ATTEMPT_FAILED");
  assert.equal(result.failedStep, "SET_AVAILABLE_20_RECOVERY");
  assert.equal(result.recoveryAttempted, true);
  assert.equal(client.quantityKeys.length, 2);
  assert.match(client.quantityKeys[1], /:recovery-1$/);
});

test("P2-D: altri item error non attivano recovery speciale", async () => {
  const m = manifest([item(1, { currentTracked: true })]);
  const client = new MockClient(m.items);
  client.quantityFailures = ["ITEM_SHOPIFY_ERROR"];
  const report = await executeStock20Batch(client, m, "EXECUTE");
  const result = report.results[0];
  assert.equal(result.status, "FAILED");
  assert.equal(result.failedStep, "SET_AVAILABLE_20_PRIMARY");
  assert.equal(result.recoveryAttempted, false);
  assert.equal(client.quantityKeys.length, 1);
});

test("chiave stabile e output/log non includono segreti", () => {
  assert.equal(
    stock20IdempotencyKey("batch-test-001", "gid://shopify/InventoryItem/3001"),
    "stock20:batch-test-001:gid://shopify/InventoryItem/3001:20",
  );
  assert.equal(
    stock20RecoveryIdempotencyKey(
      "batch-test-001",
      "gid://shopify/InventoryItem/3001",
    ),
    "stock20:batch-test-001:gid://shopify/InventoryItem/3001:20:recovery-1",
  );
  const sources = [
    "supabase/functions/shopify-stock20-batch/index.ts",
    "supabase/functions/shopify-stock20-batch/executor.ts",
    "supabase/functions/shopify-stock20-batch/shopify-client.ts",
  ].map((path) => readFileSync(path, "utf8")).join("\n");
  assert.doesNotMatch(
    sources,
    /shpat_|SHOPIFY_ADMIN_API_TOKEN.*console|accessToken.*console/,
  );
  assert.doesNotMatch(
    sources,
    /Storefront|productCreate|productUpdate|metafield|priceSet/,
  );
  assert.doesNotMatch(sources, /locations\s*\(|location\s*\{\s*id/);
  assert.match(
    sources,
    /entry\.code === "IDEMPOTENCY_PREVIOUS_ATTEMPT_FAILED"/,
  );
  assert.match(sources, /:recovery-1/);
  const endpoint = readFileSync(
    "supabase/functions/shopify-stock20-batch/index.ts",
    "utf8",
  );
  assert.match(endpoint, /canWriteCanary\(auth\.roles\)/);
  assert.match(endpoint, /body\.confirm !== "STOCK20_EXECUTE"/);
  assert.match(endpoint, /SHOPIFY_STOCK20_EXECUTE_ENABLED/);
  assert.match(endpoint, /SHOPIFY_STOCK20_BATCH_MANIFEST_JSON/);
  assert.doesNotMatch(endpoint, /body\.(items|locationId|inventoryItemId)/);
});
