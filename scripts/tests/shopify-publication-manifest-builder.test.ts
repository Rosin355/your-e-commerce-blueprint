// deno-lint-ignore-file no-import-prefix no-unversioned-import
import { assertEquals } from "jsr:@std/assert";
import {
  APPROVED_PUBLICATIONS,
  buildPublicationArtifacts,
} from "../build-shopify-publication-manifests.mjs";
import { parsePublicationManifest } from "../../supabase/functions/shopify-publication-batch/manifest.ts";
import { parseApprovedIndex } from "../lib/run-approved-shopify-batches.mjs";
import { publicationRunnerConfig } from "../run-shopify-publication.mjs";

function item(sequence: number, parentSku?: string) {
  const suffix = String(sequence).padStart(6, "0");
  const productId = `gid://shopify/Product/${100000 + sequence}`;
  return {
    parentSku: parentSku ?? `OG_${suffix}`,
    shopifyProductId: productId,
    expected: {
      id: productId,
      title: `Prodotto ${suffix}`,
      handle: `prodotto-${suffix}`,
      descriptionHtml: `<p>Descrizione ${suffix}</p>`,
      status: "DRAFT",
      options: [{ name: "Formato", values: ["Standard"] }],
      variants: [{
        id: `gid://shopify/ProductVariant/${200000 + sequence}`,
        sku: `OG_${suffix}-01`,
        price: "10.00",
        inventoryItemId: `gid://shopify/InventoryItem/${300000 + sequence}`,
        tracked: true,
        inventoryPolicy: "DENY",
        available: 20,
        selectedOptions: [{ name: "Formato", value: "Standard" }],
      }],
      media: [{
        id: `gid://shopify/MediaImage/${400000 + sequence}`,
        alt: `Prodotto ${suffix}`,
        status: "READY",
        mediaContentType: "IMAGE",
      }],
    },
    descriptionState: "APPROVED",
    mediaState: "READY",
    inventoryState: "TRACKED_DENY_20",
    structureState: "EXACT",
    blockedReasons: [],
    publishBlockedFields: [],
  };
}

Deno.test("builder 3B.4 rigenera 886 famiglie in 36 batch v2", () => {
  const items = [item(1, "OG_111899")];
  for (let sequence = 2; sequence <= 887; sequence += 1) {
    items.push(item(sequence));
  }
  const first = buildPublicationArtifacts({ items, expectedItems: 886 });
  const second = buildPublicationArtifacts({
    items: items.toReversed(),
    expectedItems: 886,
  });

  assertEquals(first.summary, {
    familyCount: 886,
    batchCount: 36,
    batchSize: 25,
    firstBatch: "shopify-publication-3b4-002",
    lastBatch: "shopify-publication-3b4-037",
    excludedCanary: true,
    approvedPublicationCount: 3,
  });
  assertEquals(first.batches.at(-1)?.itemCount, 11);
  assertEquals(first.indexRaw, second.indexRaw);
  assertEquals(
    first.batches.map(({ raw }) => raw),
    second.batches.map(({ raw }) => raw),
  );
  assertEquals(
    first.batches.some(({ raw }) => raw.includes("OG_111899")),
    false,
  );
  assertEquals(
    first.batches.every(({ approvalDigest }) =>
      /^[0-9a-f]{64}$/.test(approvalDigest)
    ),
    true,
  );

  for (const batch of [first.batches[0], first.batches.at(-1)!]) {
    const manifest = parsePublicationManifest(JSON.parse(batch.raw));
    assertEquals(manifest.schemaVersion, "3B.4-v2");
    assertEquals(manifest.approvedPublications, APPROVED_PUBLICATIONS);
  }
  assertEquals(
    parseApprovedIndex(first.index, publicationRunnerConfig).length,
    36,
  );
});

Deno.test("runner 3B.4 rifiuta l'indice single-channel v1 superseded", () => {
  const legacy = {
    schemaVersion: "3B.4-publication-index-v1",
    batches: [{
      batchId: "shopify-publication-3b4-002",
      objectPath: "publication/batches/shopify-publication-3b4-002.json",
      sha256: "0".repeat(64),
      itemCount: 25,
      schemaVersion: "3B.4-v1",
    }],
  };
  try {
    parseApprovedIndex(legacy, publicationRunnerConfig);
    throw new Error("legacy index accepted");
  } catch (error) {
    assertEquals((error as Error).message, "RUNNER_INDEX_INVALID");
  }
});
