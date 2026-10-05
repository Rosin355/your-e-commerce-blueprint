#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const PUBLICATION_INDEX_SCHEMA = "3B.4-publication-index-v2";
export const PUBLICATION_MANIFEST_SCHEMA = "3B.4-v2";
export const LEGACY_INDEX_SCHEMA = "3B.4-publication-index-v1";
export const LEGACY_MANIFEST_SCHEMA = "3B.4-v1";
export const APPROVED_PUBLICATIONS = [
  { name: "Online Store" },
  {
    id: "gid://shopify/Publication/338862113108",
    name: "Ecom Blueprint Gen 6ud1s Headless",
  },
  {
    id: "gid://shopify/Publication/328891826516",
    name: "Lovable",
  },
];

const SHA256 = /^[0-9a-f]{64}$/;
const STRUCTURAL = new Set([
  "OG_152965",
  "OG_891874",
  "OG_758263",
  "OG_393883",
]);

function sha256(raw) {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function approvalDigest(batchId, manifestSha256) {
  return sha256(
    `${batchId}:${manifestSha256}:${PUBLICATION_MANIFEST_SCHEMA}`,
  );
}

function record(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`PUBLICATION_SOURCE_INVALID:${label}`);
  }
  return value;
}

function validateItem(value, label) {
  const item = record(value, label);
  const parentSku = String(item.parentSku ?? "").toUpperCase();
  if (
    !/^OG_\d+(?:-\d+)*$/.test(parentSku) || STRUCTURAL.has(parentSku) ||
    /TEST/i.test(parentSku)
  ) {
    throw new Error(`PUBLICATION_SOURCE_EXCLUDED:${parentSku || label}`);
  }
  if (
    item.descriptionState !== "APPROVED" || item.mediaState !== "READY" ||
    item.inventoryState !== "TRACKED_DENY_20" ||
    item.structureState !== "EXACT" ||
    !Array.isArray(item.blockedReasons) || item.blockedReasons.length !== 0 ||
    !Array.isArray(item.publishBlockedFields) ||
    item.publishBlockedFields.length !== 0 ||
    !item.expected || item.expected.status !== "DRAFT"
  ) {
    throw new Error(`PUBLICATION_SOURCE_BLOCKED:${parentSku}`);
  }
  return structuredClone({ ...item, parentSku });
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    values[argv[index]] = argv[index + 1];
  }
  const sourceRoot = values["--source-root"];
  const sourceIndex = values["--source-index"] ||
    (sourceRoot ? join(sourceRoot, "publication/index.json") : undefined);
  const outputRoot = values["--output-root"];
  const expectedItems = Number(values["--expected-items"] || 886);
  if (!sourceRoot || !sourceIndex || !outputRoot) {
    throw new Error(
      "Uso: --source-root <dir-privata> [--source-index <index-v1>] --output-root <nuova-dir-privata> [--expected-items 886]",
    );
  }
  if (!Number.isInteger(expectedItems) || expectedItems < 1) {
    throw new Error("EXPECTED_ITEMS_INVALID");
  }
  return { sourceRoot, sourceIndex, outputRoot, expectedItems };
}

export function readLegacyPublicationItems({ sourceRoot, sourceIndex }) {
  const index = record(
    JSON.parse(readFileSync(sourceIndex, "utf8")),
    "index",
  );
  if (
    index.schemaVersion !== LEGACY_INDEX_SCHEMA ||
    !Array.isArray(index.batches) || index.batches.length === 0
  ) {
    throw new Error("PUBLICATION_SOURCE_INDEX_INVALID");
  }
  const batchIds = new Set();
  const items = [];
  for (const [position, rawEntry] of index.batches.entries()) {
    const entry = record(rawEntry, `index.batches[${position}]`);
    if (
      typeof entry.batchId !== "string" || batchIds.has(entry.batchId) ||
      entry.objectPath !==
        `publication/batches/${entry.batchId}.json` ||
      !SHA256.test(String(entry.sha256)) ||
      entry.schemaVersion !== LEGACY_MANIFEST_SCHEMA ||
      !Number.isInteger(entry.itemCount) || entry.itemCount < 1 ||
      entry.itemCount > 25
    ) {
      throw new Error("PUBLICATION_SOURCE_INDEX_INVALID");
    }
    batchIds.add(entry.batchId);
    const raw = readFileSync(join(sourceRoot, entry.objectPath), "utf8");
    if (sha256(raw) !== entry.sha256) {
      throw new Error(`PUBLICATION_SOURCE_SHA_MISMATCH:${entry.batchId}`);
    }
    const manifest = record(JSON.parse(raw), entry.batchId);
    if (
      manifest.schemaVersion !== LEGACY_MANIFEST_SCHEMA ||
      manifest.sourceManifest !== "3B.2-v1" ||
      manifest.batchId !== entry.batchId ||
      manifest.targetPublication?.name !== "Online Store" ||
      !Array.isArray(manifest.items) ||
      manifest.items.length !== entry.itemCount
    ) {
      throw new Error(`PUBLICATION_SOURCE_MANIFEST_INVALID:${entry.batchId}`);
    }
    items.push(...manifest.items);
  }
  return items;
}

export function buildPublicationArtifacts({
  items,
  expectedItems = 886,
  batchSize = 25,
  startNumber = 2,
  batchPrefix = "shopify-publication-3b4",
}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("PUBLICATION_SOURCE_EMPTY");
  }
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 25) {
    throw new Error("BATCH_SIZE_INVALID");
  }
  const selected = items
    .map((item, index) => validateItem(item, `items[${index}]`))
    .filter((item) => item.parentSku !== "OG_111899")
    .toSorted((left, right) => left.parentSku.localeCompare(right.parentSku));
  if (selected.length !== expectedItems) {
    throw new Error(
      `PUBLICATION_COUNT_MISMATCH:attese=${expectedItems}:trovate=${selected.length}`,
    );
  }
  if (
    new Set(selected.map(({ parentSku }) => parentSku)).size !==
      selected.length ||
    new Set(selected.map(({ shopifyProductId }) => shopifyProductId)).size !==
      selected.length
  ) {
    throw new Error("PUBLICATION_DUPLICATE_IDENTITY");
  }

  const batches = [];
  for (let offset = 0; offset < selected.length; offset += batchSize) {
    const batchId = `${batchPrefix}-${
      String(startNumber + batches.length).padStart(3, "0")
    }`;
    const batchItems = selected.slice(offset, offset + batchSize);
    const manifest = {
      schemaVersion: PUBLICATION_MANIFEST_SCHEMA,
      sourceManifest: "3B.2-v1",
      batchId,
      approvedPublications: structuredClone(APPROVED_PUBLICATIONS),
      items: batchItems,
    };
    const raw = `${JSON.stringify(manifest, null, 2)}\n`;
    const manifestSha256 = sha256(raw);
    batches.push({
      batchId,
      objectPath: `publication/batches/${batchId}.json`,
      sha256: manifestSha256,
      itemCount: batchItems.length,
      schemaVersion: PUBLICATION_MANIFEST_SCHEMA,
      approvalDigest: approvalDigest(batchId, manifestSha256),
      raw,
    });
  }
  const index = {
    schemaVersion: PUBLICATION_INDEX_SCHEMA,
    batches: batches.map(({
      approvalDigest: _approvalDigest,
      raw: _raw,
      ...metadata
    }) => metadata),
  };
  return {
    batches,
    index,
    indexRaw: `${JSON.stringify(index, null, 2)}\n`,
    summary: {
      familyCount: selected.length,
      batchCount: batches.length,
      batchSize,
      firstBatch: batches.at(0)?.batchId ?? null,
      lastBatch: batches.at(-1)?.batchId ?? null,
      excludedCanary: items.some((item) => item?.parentSku === "OG_111899"),
      approvedPublicationCount: APPROVED_PUBLICATIONS.length,
    },
  };
}

export function writePublicationArtifacts(outputRoot, artifacts) {
  const publicationDir = join(outputRoot, "publication");
  const batchesDir = join(publicationDir, "batches");
  mkdirSync(batchesDir, { recursive: true, mode: 0o700 });
  for (const batch of artifacts.batches) {
    writeFileSync(join(outputRoot, batch.objectPath), batch.raw, {
      flag: "wx",
      mode: 0o600,
    });
  }
  writeFileSync(join(publicationDir, "index.json"), artifacts.indexRaw, {
    flag: "wx",
    mode: 0o600,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  const items = readLegacyPublicationItems(args);
  const artifacts = buildPublicationArtifacts({
    items,
    expectedItems: args.expectedItems,
  });
  writePublicationArtifacts(args.outputRoot, artifacts);
  console.log(JSON.stringify(artifacts.summary));
}
