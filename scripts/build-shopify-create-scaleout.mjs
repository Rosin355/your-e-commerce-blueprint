#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "./build-stock20-batch-manifest.mjs";
import {
  safeBuilderSummary,
  selectCreateFamilies,
} from "./build-shopify-create-manifest.mjs";

const INDEX_SCHEMA = "3B.2-scaleout-v1";

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    values[argv[index]] = argv[index + 1];
  }
  const manifest = values["--manifest"];
  const content = values["--content"];
  const outputDir = values["--output-dir"];
  const batchPrefix = values["--batch-prefix"] || "shopify-create-3b2";
  const batchSize = Number(values["--batch-size"] || 10);
  const startNumber = Number(values["--start-number"] || 2);
  const expectedFamilies = values["--expected-families"] === undefined
    ? undefined
    : Number(values["--expected-families"]);
  if (!manifest || !content || !outputDir) {
    throw new Error(
      "Uso: --manifest <3B1C.csv> --content <approved.json> --output-dir <nuovo-dir> [--batch-prefix shopify-create-3b2] [--batch-size 10] [--start-number 2] [--expected-families 903]",
    );
  }
  if (!/^[a-z0-9][a-z0-9._-]{2,50}$/.test(batchPrefix)) {
    throw new Error("--batch-prefix non valido");
  }
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 10) {
    throw new Error("--batch-size deve essere compreso tra 1 e 10");
  }
  if (!Number.isInteger(startNumber) || startNumber < 1) {
    throw new Error("--start-number deve essere positivo");
  }
  if (
    expectedFamilies !== undefined &&
    (!Number.isInteger(expectedFamilies) || expectedFamilies < 1)
  ) {
    throw new Error("--expected-families deve essere positivo");
  }
  return {
    manifest,
    content,
    outputDir,
    batchPrefix,
    batchSize,
    startNumber,
    expectedFamilies,
  };
}

function batchId(prefix, number) {
  return `${prefix}-${String(number).padStart(3, "0")}`;
}

function sha256(raw) {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function sortFamilies(families) {
  return families.toSorted((left, right) =>
    left.parentSku < right.parentSku
      ? -1
      : left.parentSku > right.parentSku
      ? 1
      : 0
  ).map((family) => ({
    ...family,
    variants: family.variants.toSorted((left, right) =>
      left.sku < right.sku ? -1 : left.sku > right.sku ? 1 : 0
    ),
  }));
}

export function buildScaleoutArtifacts({
  rows,
  contentRows,
  batchPrefix = "shopify-create-3b2",
  batchSize = 10,
  startNumber = 2,
  expectedFamilies,
}) {
  if (!/^[a-z0-9][a-z0-9._-]{2,50}$/.test(batchPrefix)) {
    throw new Error("BATCH_PREFIX_INVALID");
  }
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 10) {
    throw new Error("BATCH_SIZE_INVALID");
  }
  if (!Number.isInteger(startNumber) || startNumber < 1) {
    throw new Error("BATCH_START_INVALID");
  }
  const selected = selectCreateFamilies({ rows, contentRows });
  const families = sortFamilies(selected.families);
  if (expectedFamilies !== undefined && families.length !== expectedFamilies) {
    throw new Error(
      `SAFE_CREATE_COUNT_MISMATCH: attese ${expectedFamilies}, trovate ${families.length}`,
    );
  }
  if (families.length === 0) {
    throw new Error("Nessuna famiglia SAFE_CREATE completa");
  }
  const batches = [];
  for (let offset = 0; offset < families.length; offset += batchSize) {
    const number = startNumber + batches.length;
    const id = batchId(batchPrefix, number);
    const batchFamilies = families.slice(offset, offset + batchSize);
    const manifest = {
      schemaVersion: "3B.2-v1",
      sourceManifest: "3B.1C",
      batchId: id,
      families: batchFamilies,
    };
    const raw = `${JSON.stringify(manifest, null, 2)}\n`;
    batches.push({
      batchId: id,
      objectPath: `batches/${id}.json`,
      sha256: sha256(raw),
      familyCount: batchFamilies.length,
      schemaVersion: "3B.2-v1",
      raw,
    });
  }
  const index = {
    schemaVersion: INDEX_SCHEMA,
    batches: batches.map(({ raw: _raw, ...metadata }) => metadata),
  };
  return {
    batches,
    index,
    indexRaw: `${JSON.stringify(index, null, 2)}\n`,
    summary: safeBuilderSummary({
      ...selected.summary,
      selectedFamilies: families.length,
      safeFamilies: families.length,
      totalParents: families.length,
      totalVariants: families.reduce(
        (total, family) => total + family.variants.length,
        0,
      ),
      batchCount: batches.length,
      batchSize,
      blocked: selected.blocked,
    }),
  };
}

export function writeScaleoutArtifacts(outputDir, artifacts) {
  mkdirSync(outputDir, { mode: 0o700 });
  const batchesDir = join(outputDir, "batches");
  mkdirSync(batchesDir, { mode: 0o700 });
  for (const batch of artifacts.batches) {
    writeFileSync(join(outputDir, batch.objectPath), batch.raw, {
      flag: "wx",
      mode: 0o600,
    });
  }
  writeFileSync(join(outputDir, "index.json"), artifacts.indexRaw, {
    flag: "wx",
    mode: 0o600,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  const rows = parseCsv(readFileSync(args.manifest, "utf8"));
  const parsed = JSON.parse(readFileSync(args.content, "utf8"));
  const contentRows = Array.isArray(parsed) ? parsed : parsed.products;
  if (!Array.isArray(contentRows)) {
    throw new Error("Il content export deve essere un array o {products: []}");
  }
  const artifacts = buildScaleoutArtifacts({ rows, contentRows, ...args });
  writeScaleoutArtifacts(args.outputDir, artifacts);
  console.log(JSON.stringify(artifacts.summary));
}
