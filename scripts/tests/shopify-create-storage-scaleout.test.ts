// deno-lint-ignore-file no-explicit-any no-import-prefix no-unversioned-import
import {
  assert,
  assertEquals,
  assertRejects,
  assertThrows,
} from "jsr:@std/assert";
import { readFileSync } from "node:fs";
import { parseCreateManifest } from "../../supabase/functions/shopify-create-batch/manifest.ts";
import {
  assertManifestApproval,
  parseCreateBatchRequest,
} from "../../supabase/functions/shopify-create-batch/request.ts";
import {
  createManifestApprovalDigest,
  loadApprovedCreateManifest,
  parseManifestIndex,
  type PrivateManifestStore,
  sha256Hex,
} from "../../supabase/functions/shopify-create-batch/storage-manifest.ts";
import { buildScaleoutArtifacts } from "../build-shopify-create-scaleout.mjs";
import {
  parseRunnerIndex,
  runScaleout,
} from "../run-shopify-create-scaleout.mjs";

const encoder = new TextEncoder();

function rawFamily(parentSku = "OG_SCALE_001", variantSku = "OG_SCALE_001-01") {
  return {
    internalProductId: `parent:${parentSku}`,
    parentSku,
    entityType: "variable",
    action: "CREATE_VARIABLE_PARENT",
    title: `Prodotto ${parentSku}`,
    descriptionHtml: `<p>Descrizione originale completa per ${parentSku}.</p>`,
    descriptionSource: "ORIGINAL",
    handle: parentSku.toLowerCase().replaceAll("_", "-"),
    shopifyProductId: null,
    optionNames: ["Formato"],
    variants: [{
      internalProductId: `variant:${variantSku}`,
      sku: variantSku,
      parentSku,
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
      originalSource:
        `https://www.onlinegarden.it/wp-content/uploads/${parentSku}.jpg`,
      alt: `Prodotto ${parentSku}`,
      approved: true,
    }],
    mediaStatus: "APPROVED",
    publicationIntent: "CREATE_DRAFT",
    publishBlockedFields: [],
    stockTarget: 20,
    readiness: "READY_FOR_SALE",
    structureStatus: "CREATE_NEW",
  };
}

function rawManifest(batchId = "shopify-create-3b2-002", count = 1) {
  return `${
    JSON.stringify(
      {
        schemaVersion: "3B.2-v1",
        sourceManifest: "3B.1C",
        batchId,
        families: Array.from({ length: count }, (_, index) => {
          const suffix = String(index + 1).padStart(3, "0");
          return rawFamily(`OG_SCALE_${suffix}`, `OG_SCALE_${suffix}-01`);
        }),
      },
      null,
      2,
    )
  }\n`;
}

async function indexFor(raw: string, overrides: Record<string, unknown> = {}) {
  return `${
    JSON.stringify(
      {
        schemaVersion: "3B.2-scaleout-v1",
        batches: [{
          batchId: "shopify-create-3b2-002",
          objectPath: "batches/shopify-create-3b2-002.json",
          sha256: await sha256Hex(encoder.encode(raw)),
          familyCount: 1,
          schemaVersion: "3B.2-v1",
          ...overrides,
        }],
      },
      null,
      2,
    )
  }\n`;
}

class FakeStore implements PrivateManifestStore {
  paths: string[] = [];
  constructor(private objects: Map<string, string>) {}
  set(path: string, value: string) {
    this.objects.set(path, value);
  }
  download(path: string): Promise<Uint8Array> {
    this.paths.push(path);
    const value = this.objects.get(path);
    if (value === undefined) throw new Error("MANIFEST_STORAGE_READ_FAILED");
    return Promise.resolve(encoder.encode(value));
  }
}

Deno.test("private index approva il batch e SHA match carica il manifest", async () => {
  const raw = rawManifest();
  const store = new FakeStore(
    new Map([
      ["index.json", await indexFor(raw)],
      ["batches/shopify-create-3b2-002.json", raw],
    ]),
  );
  const approved = await loadApprovedCreateManifest(
    "shopify-create-3b2-002",
    store,
  );
  assertEquals(approved.manifest.batchId, "shopify-create-3b2-002");
  assertEquals(approved.manifest.families.length, 1);
  assertEquals(approved.manifestSha256, await sha256Hex(encoder.encode(raw)));
  assertEquals(
    approved.approvalDigest,
    await createManifestApprovalDigest(
      "shopify-create-3b2-002",
      approved.manifestSha256,
      "3B.2-v1",
    ),
  );
  assertEquals(store.paths, [
    "index.json",
    "batches/shopify-create-3b2-002.json",
  ]);
});

Deno.test("unknown batchId è bloccato prima del download del batch", async () => {
  const raw = rawManifest();
  const store = new FakeStore(new Map([["index.json", await indexFor(raw)]]));
  await assertRejects(
    () => loadApprovedCreateManifest("shopify-create-3b2-999", store),
    Error,
    "MANIFEST_BATCH_NOT_APPROVED",
  );
  assertEquals(store.paths, ["index.json"]);
});

Deno.test("SHA mismatch blocca senza parse o write", async () => {
  const raw = rawManifest();
  const store = new FakeStore(
    new Map([
      ["index.json", await indexFor(raw, { sha256: "0".repeat(64) })],
      ["batches/shopify-create-3b2-002.json", raw],
    ]),
  );
  await assertRejects(
    () => loadApprovedCreateManifest("shopify-create-3b2-002", store),
    Error,
    "MANIFEST_INTEGRITY_ERROR",
  );
});

Deno.test("index accetta solo path deterministico e metadata server-side", async () => {
  const raw = rawManifest();
  const arbitraryPathIndex = JSON.parse(
    await indexFor(raw, {
      objectPath: "../arbitrary.json",
    }),
  );
  assertThrows(
    () => parseManifestIndex(arbitraryPathIndex),
    Error,
    "MANIFEST_INDEX_INVALID: objectPath",
  );
  assertThrows(
    () =>
      parseManifestIndex({
        schemaVersion: "3B.2-scaleout-v1",
        batches: [{
          batchId: "shopify-create-3b2-002",
          objectPath: "batches/shopify-create-3b2-002.json",
          sha256: "0".repeat(64),
          familyCount: 1,
          schemaVersion: "3B.2-v1",
          families: [rawFamily()],
        }],
      }),
    Error,
    "metadata non valida",
  );
});

Deno.test("request non può fornire manifest, object path, SHA o payload", () => {
  assertEquals(parseCreateBatchRequest({ batchId: "shopify-create-3b2-002" }), {
    batchId: "shopify-create-3b2-002",
    mode: "DRY_RUN",
  });
  for (const field of ["manifest", "objectPath", "sha256", "products"]) {
    assertThrows(
      () =>
        parseCreateBatchRequest({
          batchId: "shopify-create-3b2-002",
          [field]: "forbidden",
        }),
      Error,
      "REQUEST_FIELD_FORBIDDEN",
    );
  }
});

async function mutableApprovedStore(raw: string) {
  return new FakeStore(
    new Map([
      ["index.json", await indexFor(raw)],
      ["batches/shopify-create-3b2-002.json", raw],
    ]),
  );
}

async function replaceApprovedManifest(store: FakeStore, raw: string) {
  store.set("index.json", await indexFor(raw));
  store.set("batches/shopify-create-3b2-002.json", raw);
}

Deno.test("A: manifest stabile mantiene approval digest fra DRY_RUN ed EXECUTE", async () => {
  const store = await mutableApprovedStore(rawManifest());
  const dryRun = await loadApprovedCreateManifest(
    "shopify-create-3b2-002",
    store,
  );
  const execute = await loadApprovedCreateManifest(
    "shopify-create-3b2-002",
    store,
  );
  assertEquals(execute.approvalDigest, dryRun.approvalDigest);
  assertManifestApproval(
    "EXECUTE",
    dryRun.approvalDigest,
    execute.approvalDigest,
  );
});

Deno.test("B: sostituzione prima di EXECUTE blocca con zero write", async () => {
  const original = rawManifest();
  const store = await mutableApprovedStore(original);
  const dryRun = await loadApprovedCreateManifest(
    "shopify-create-3b2-002",
    store,
  );
  const replaced = original.replace(
    "Prodotto OG_SCALE_001",
    "Prodotto OG_SCALE_001 aggiornato",
  );
  await replaceApprovedManifest(store, replaced);
  const execute = await loadApprovedCreateManifest(
    "shopify-create-3b2-002",
    store,
  );
  let shopifyWrites = 0;
  assertThrows(
    () => {
      assertManifestApproval(
        "EXECUTE",
        dryRun.approvalDigest,
        execute.approvalDigest,
      );
      shopifyWrites += 1;
    },
    Error,
    "MANIFEST_APPROVAL_MISMATCH",
  );
  assertEquals(shopifyWrites, 0);
});

Deno.test("C: sostituzione prima di VERIFY è rilevata dal digest approvato", async () => {
  const original = rawManifest();
  const store = await mutableApprovedStore(original);
  const execute = await loadApprovedCreateManifest(
    "shopify-create-3b2-002",
    store,
  );
  await replaceApprovedManifest(
    store,
    original.replace("12.50", "13.50"),
  );
  const verify = await loadApprovedCreateManifest(
    "shopify-create-3b2-002",
    store,
  );
  assertThrows(
    () =>
      assertManifestApproval(
        "DRY_RUN",
        execute.approvalDigest,
        verify.approvalDigest,
      ),
    Error,
    "MANIFEST_APPROVAL_MISMATCH",
  );
});

Deno.test("D: digest sconosciuto è bloccato", async () => {
  const store = await mutableApprovedStore(rawManifest());
  const current = await loadApprovedCreateManifest(
    "shopify-create-3b2-002",
    store,
  );
  assertThrows(
    () =>
      assertManifestApproval("EXECUTE", "f".repeat(64), current.approvalDigest),
    Error,
    "MANIFEST_APPROVAL_MISMATCH",
  );
});

Deno.test("E: EXECUTE senza digest è bloccato", () => {
  assertThrows(
    () => assertManifestApproval("EXECUTE", undefined, "a".repeat(64)),
    Error,
    "MANIFEST_APPROVAL_REQUIRED",
  );
});

Deno.test("F: DRY_RUN iniziale non richiede digest", () => {
  assertManifestApproval("DRY_RUN", undefined, "a".repeat(64));
});

Deno.test("G: sha256 raw non può sostituire approvalDigest", () => {
  assertThrows(
    () =>
      parseCreateBatchRequest({
        batchId: "shopify-create-3b2-002",
        mode: "EXECUTE",
        confirm: "SHOPIFY_CREATE_EXECUTE",
        sha256: "a".repeat(64),
      }),
    Error,
    "REQUEST_FIELD_FORBIDDEN: sha256",
  );
});

Deno.test("batch e index applicano il massimo di 10 famiglie", async () => {
  assertThrows(
    () =>
      parseCreateManifest(
        JSON.parse(rawManifest("shopify-create-3b2-002", 11)),
      ),
    Error,
    "BATCH_SIZE_INVALID",
  );
  const raw = rawManifest();
  const oversizedIndex = JSON.parse(await indexFor(raw, { familyCount: 11 }));
  assertThrows(
    () => parseManifestIndex(oversizedIndex),
    Error,
    "MANIFEST_INDEX_INVALID: familyCount",
  );
});

function builderFixture(count = 23) {
  const rows = [];
  const contentRows = [];
  for (let index = 1; index <= count; index += 1) {
    const suffix = String(index).padStart(3, "0");
    const parentSku = `OG_SCALE_${suffix}`;
    const variantSku = `${parentSku}-01`;
    rows.push({
      sku: parentSku,
      action: "CREATE_VARIABLE_PARENT",
      entity_type: "variable",
      current_shopify_structure: "NOT_PRESENT",
      target_shopify_structure: "PARENT_PRODUCT",
      content_ready: "YES",
      image_ready: "YES",
      shopify_product_id: "",
      shopify_variant_id: "",
      block_reason: "",
    }, {
      sku: variantSku,
      parent_sku: parentSku,
      action: "CREATE_VARIANT",
      entity_type: "variation",
      current_shopify_structure: "NOT_PRESENT",
      target_shopify_structure: `VARIANT_OF_${parentSku}`,
      content_ready: "YES",
      image_ready: "INHERIT_PARENT",
      shopify_product_id: "",
      shopify_variant_id: "",
      block_reason: "",
      stock_target: "20",
      price: "12.50",
    });
    contentRows.push({
      sku: parentSku,
      internalProductId: `parent:${parentSku}`,
      title: `Prodotto ${parentSku}`,
      descriptionHtml:
        `<p>Descrizione originale completa per ${parentSku}.</p>`,
      descriptionSource: "ORIGINAL",
      handle: parentSku.toLowerCase().replaceAll("_", "-"),
      optionNames: ["Formato"],
      media: [{
        originalSource:
          `https://www.onlinegarden.it/wp-content/uploads/${parentSku}.jpg`,
        alt: `Prodotto ${parentSku}`,
        approved: true,
      }],
      publishBlockedFields: [],
      publicationIntent: "CREATE_DRAFT",
    }, {
      sku: variantSku,
      internalProductId: `variant:${variantSku}`,
      optionValues: [{ name: "Formato", value: "Vaso 18 cm" }],
    });
  }
  return { rows, contentRows };
}

Deno.test("builder divide deterministicamente in batch da massimo 10 e crea index SHA", async () => {
  const artifacts = buildScaleoutArtifacts({
    ...builderFixture(),
    expectedFamilies: 23,
  });
  assertEquals(artifacts.summary, {
    createParents: 23,
    createVariants: 23,
    restructure: 0,
    skipped: 0,
    selectedFamilies: 23,
    safeFamilies: 23,
    totalParents: 23,
    totalVariants: 23,
    batchCount: 3,
    batchSize: 10,
    blockedCount: 0,
    blockedReasons: {},
  });
  assertEquals(artifacts.batches.map((batch: any) => batch.familyCount), [
    10,
    10,
    3,
  ]);
  assertEquals(artifacts.batches.map((batch: any) => batch.batchId), [
    "shopify-create-3b2-002",
    "shopify-create-3b2-003",
    "shopify-create-3b2-004",
  ]);
  assert(!JSON.stringify(artifacts.summary).includes("OG_SCALE_"));
  for (const batch of artifacts.batches) {
    assertEquals(await sha256Hex(encoder.encode(batch.raw)), batch.sha256);
    assertEquals(
      parseCreateManifest(JSON.parse(batch.raw)).families.length,
      batch.familyCount,
    );
  }
  assertEquals(
    parseManifestIndex(JSON.parse(artifacts.indexRaw)),
    artifacts.index,
  );
});

Deno.test("903 SAFE_CREATE producono 91 batch e il conteggio atteso è fail-fast", () => {
  const input = builderFixture(903);
  const artifacts = buildScaleoutArtifacts({
    ...input,
    expectedFamilies: 903,
  });
  assertEquals(artifacts.summary.totalParents, 903);
  assertEquals(artifacts.summary.totalVariants, 903);
  assertEquals(artifacts.summary.batchCount, 91);
  assertEquals(artifacts.batches.at(-1)?.familyCount, 3);
  assertThrows(
    () => buildScaleoutArtifacts({ ...input, expectedFamilies: 902 }),
    Error,
    "SAFE_CREATE_COUNT_MISMATCH",
  );
});

function summary(status: string, count = 1) {
  return {
    PLANNED: status === "PLANNED" ? count : 0,
    CREATED: status === "CREATED" ? count : 0,
    READY_TO_PUBLISH: 0,
    ALREADY_EXISTS: status === "ALREADY_EXISTS" ? count : 0,
    RECONCILED: 0,
    MEDIA_PENDING: 0,
    BLOCKED: 0,
    FAILED: 0,
    SKIPPED: 0,
  };
}

function report(batchId: string, mode: string, status: string) {
  return {
    ok: true,
    mode,
    batchId,
    stopped: false,
    summary: summary(status),
    results: [{ parentSku: "OG_FIXTURE", status }],
    manifestSha256: "a".repeat(64),
    approvalDigest: "b".repeat(64),
    approvalPinned: mode === "EXECUTE",
  };
}

Deno.test("runner gate disabilitato esegue solo DRY_RUN sequenziali a zero write", async () => {
  const calls: string[] = [];
  const completed = await runScaleout({
    batchIds: ["batch-002", "batch-003"],
    executeWindow: false,
    callBatch: (batchId: string, mode: string) => {
      calls.push(`${batchId}:${mode}`);
      return Promise.resolve(report(batchId, mode, "PLANNED"));
    },
  });
  assertEquals(calls, ["batch-002:DRY_RUN", "batch-003:DRY_RUN"]);
  assertEquals(completed.length, 2);
});

Deno.test("runner esegue DRY_RUN, EXECUTE, verify e supporta resume/replay", async () => {
  const calls: string[] = [];
  const approvalArguments: Array<string | undefined> = [];
  const phases = new Map<string, number>();
  await runScaleout({
    batchIds: ["batch-002", "batch-003", "batch-004"],
    startBatch: "batch-003",
    executeWindow: true,
    callBatch: (
      batchId: string,
      mode: string,
      approvalDigest?: string,
    ) => {
      calls.push(`${batchId}:${mode}`);
      approvalArguments.push(approvalDigest);
      const phase = (phases.get(batchId) || 0) + 1;
      phases.set(batchId, phase);
      const status = phase === 1
        ? "PLANNED"
        : phase === 2
        ? "CREATED"
        : "ALREADY_EXISTS";
      return Promise.resolve(report(batchId, mode, status));
    },
  });
  assertEquals(calls, [
    "batch-003:DRY_RUN",
    "batch-003:EXECUTE",
    "batch-003:DRY_RUN",
    "batch-004:DRY_RUN",
    "batch-004:EXECUTE",
    "batch-004:DRY_RUN",
  ]);
  assertEquals(approvalArguments, [
    undefined,
    "b".repeat(64),
    "b".repeat(64),
    undefined,
    "b".repeat(64),
    "b".repeat(64),
  ]);

  const replayCalls: string[] = [];
  await runScaleout({
    batchIds: ["batch-003"],
    executeWindow: true,
    callBatch: (batchId: string, mode: string) => {
      replayCalls.push(`${batchId}:${mode}`);
      return Promise.resolve(report(batchId, mode, "ALREADY_EXISTS"));
    },
  });
  assertEquals(replayCalls.length, 3);
});

Deno.test("runner arresta globalmente un digest cambiato fra DRY_RUN ed EXECUTE", async () => {
  const calls: string[] = [];
  await assertRejects(
    () =>
      runScaleout({
        batchIds: ["batch-002", "batch-003"],
        executeWindow: true,
        callBatch: (batchId: string, mode: string) => {
          calls.push(`${batchId}:${mode}`);
          const value = report(
            batchId,
            mode,
            mode === "DRY_RUN" ? "PLANNED" : "CREATED",
          );
          if (mode === "EXECUTE") value.approvalDigest = "c".repeat(64);
          return Promise.resolve(value);
        },
      }),
    Error,
    "SCALEOUT_STOP_APPROVAL_MISMATCH:batch-002:EXECUTE",
  );
  assertEquals(calls, ["batch-002:DRY_RUN", "batch-002:EXECUTE"]);
});

Deno.test("runner arresta globalmente un digest cambiato prima del VERIFY", async () => {
  const calls: string[] = [];
  let phase = 0;
  await assertRejects(
    () =>
      runScaleout({
        batchIds: ["batch-002", "batch-003"],
        executeWindow: true,
        callBatch: (batchId: string, mode: string) => {
          phase += 1;
          calls.push(`${batchId}:${mode}`);
          const status = phase === 1
            ? "PLANNED"
            : phase === 2
            ? "CREATED"
            : "ALREADY_EXISTS";
          const value = report(batchId, mode, status);
          if (phase === 3) value.manifestSha256 = "d".repeat(64);
          return Promise.resolve(value);
        },
      }),
    Error,
    "SCALEOUT_STOP_APPROVAL_MISMATCH:batch-002:VERIFY",
  );
  assertEquals(calls, [
    "batch-002:DRY_RUN",
    "batch-002:EXECUTE",
    "batch-002:DRY_RUN",
  ]);
});

Deno.test("handler verifica approval digest prima di costruire il client Shopify", () => {
  const runtime = readFileSync(
    "supabase/functions/shopify-create-batch/index.ts",
    "utf8",
  );
  assert(runtime.indexOf("assertManifestApproval(") > 0);
  assert(
    runtime.indexOf("assertManifestApproval(") <
      runtime.indexOf("new AdminGraphqlCreateClient()"),
  );
});

Deno.test("runner ferma tutti i batch su errore sistemico o integrità", async () => {
  const calls: string[] = [];
  await assertRejects(
    () =>
      runScaleout({
        batchIds: ["batch-002", "batch-003"],
        executeWindow: true,
        callBatch: (batchId: string, mode: string) => {
          calls.push(`${batchId}:${mode}`);
          return Promise.resolve({
            ...report(batchId, mode, "PLANNED"),
            ok: false,
            stopped: true,
            stopCode: "MANIFEST_INTEGRITY_ERROR",
            summary: { ...summary("PLANNED"), FAILED: 1 },
          });
        },
      }),
    Error,
    "SCALEOUT_STOP_DRY_RUN:batch-002",
  );
  assertEquals(calls, ["batch-002:DRY_RUN"]);
});

Deno.test("migration crea bucket privato e deny RLS client; runtime non usa secret manifest", () => {
  const migration = readFileSync(
    "supabase/migrations/20261003205811_create_shopify_create_manifests_bucket.sql",
    "utf8",
  );
  assert(/'shopify-create-manifests'[\s\S]*false/.test(migration));
  assert(/as restrictive[\s\S]*to anon, authenticated/i.test(migration));
  assert(!/to service_role/i.test(migration));
  const runtime = readFileSync(
    "supabase/functions/shopify-create-batch/index.ts",
    "utf8",
  );
  assert(!runtime.includes("SHOPIFY_CREATE_BATCH_MANIFEST_JSON"));
  assert(runtime.includes("SHOPIFY_CREATE_EXECUTE_ENABLED"));
});

Deno.test("runner index contiene solo batchId utilizzati dal workflow", () => {
  assertEquals(
    parseRunnerIndex({
      schemaVersion: "3B.2-scaleout-v1",
      batches: [{
        batchId: "shopify-create-3b2-002",
        objectPath: "batches/shopify-create-3b2-002.json",
        sha256: "0".repeat(64),
        familyCount: 10,
        schemaVersion: "3B.2-v1",
      }],
    }),
    ["shopify-create-3b2-002"],
  );
});
