#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readCsvFile, readCsvHeaders, writeJsonFile } from "../sync/lib/csv-utils.mjs";
import { compareWithLegacy, decideIdentity, resolveProduct } from "../src/catalog/lossless/sourceResolver.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAW_DIR = path.join(ROOT, "imports", "wordpress", "raw");
const AUDIT_PATH = path.join(ROOT, "docs", "wordpress-import-audit-data.json");
const DEFAULT_OUTPUT = path.join(ROOT, "docs", "wordpress-golden-foundation-dry-run.json");
const DEFAULT_LEGACY_BACKUP = path.join(ROOT, "backups", "legacy-golden", "golden-skus-1a2-20260923.json");
const EXPECTED_LEGACY_SHA256 = "3fd7eb29c5b9c873a3892e58374bbf5dce16306d309537f5bfa4accac2e5c258";

export function parseArgs(argv) {
  const args = {
    dryRun: false,
    goldenOnly: false,
    offline: true,
    legacyAuthoritative: false,
    output: DEFAULT_OUTPUT,
    legacyFile: DEFAULT_LEGACY_BACKUP,
    rawDir: RAW_DIR,
  };
  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--golden-only") args.goldenOnly = true;
    else if (arg === "--offline") args.offline = true;
    else if (arg === "--legacy-authoritative") args.legacyAuthoritative = true;
    else if (arg.startsWith("--output=")) args.output = path.resolve(ROOT, arg.slice("--output=".length));
    else if (arg.startsWith("--legacy-file=")) args.legacyFile = path.resolve(ROOT, arg.slice("--legacy-file=".length));
    else if (arg.startsWith("--raw-dir=")) args.rawDir = path.resolve(ROOT, arg.slice("--raw-dir=".length));
    else throw new Error(`Argomento non riconosciuto: ${arg}`);
  }
  return args;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function loadSourceSnapshots(rawDir = RAW_DIR) {
  if (!fs.existsSync(rawDir)) {
    throw new Error("PRIVATE_WORDPRESS_RAW_DIR_MISSING: ripristinare localmente gli 8 CSV autorizzati; nessun download automatico");
  }
  const files = fs.readdirSync(rawDir).filter((file) => file.endsWith(".csv")).sort();
  if (files.length !== 8) {
    throw new Error(`PRIVATE_WORDPRESS_RAW_FILE_COUNT_MISMATCH: attesi 8 CSV, trovati ${files.length}`);
  }
  const snapshots = [];
  const fileMetadata = [];

  for (const sourceFile of files) {
    const filePath = path.join(rawDir, sourceFile);
    const headers = readCsvHeaders(filePath);
    const rows = readCsvFile(filePath);
    const fileBytes = fs.readFileSync(filePath);
    fileMetadata.push({
      sourceFile,
      sha256: sha256(fileBytes),
      rowCount: rows.length,
      headerCount: headers.length,
      headers,
    });

    for (const row of rows) {
      const rawRow = Object.fromEntries(headers.map((header) => [header, String(row[header] ?? "")]));
      const sourceRowNumber = Number(row.__rowNumber);
      snapshots.push({
        sourceFile,
        sourceRowNumber,
        sourceHash: sha256(JSON.stringify({ sourceFile, sourceRowNumber, rawRow })),
        sourceSku: rawRow.SKU.trim() || null,
        sourceParentReference: rawRow.Genitore.trim() || null,
        sourceType: rawRow.Tipo.trim() || null,
        rawRow,
      });
    }
  }

  return { snapshots, fileMetadata };
}

function readJsonArray(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return [];
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object" && Array.isArray(parsed.legacy_csv)) {
    return parsed.legacy_csv;
  }
  return [];
}

export async function loadLegacyRows(skus, options = {}) {
  const legacyFile = options.legacyFile ?? DEFAULT_LEGACY_BACKUP;
  if (options.legacyAuthoritative) {
    if (!fs.existsSync(legacyFile)) {
      throw new Error("AUTHORIZED_LEGACY_EXPORT_MISSING");
    }
    const actualSha256 = sha256(fs.readFileSync(legacyFile));
    if (actualSha256 !== EXPECTED_LEGACY_SHA256) {
      throw new Error("AUTHORIZED_LEGACY_EXPORT_SHA256_MISMATCH");
    }
  }
  const allLocalRows = readJsonArray(legacyFile);
  const localRows = allLocalRows
    .filter((row) => skus.includes(String(row.sku ?? "")));
  if (options.legacyAuthoritative) {
    return {
      rows: localRows,
      visibleRowCount: allLocalRows.length,
      source: "authorized-local-export",
      accessRole: "authorized-export",
      authoritative: true,
      checksumVerified: true,
      warning: localRows.length ? null : "AUTHORIZED_LEGACY_EXPORT_HAS_NO_GOLDEN_SKUS",
    };
  }
  return {
    rows: localRows,
    visibleRowCount: allLocalRows.length,
    source: fs.existsSync(legacyFile) ? "local-unverified-export" : "local-file-missing",
    accessRole: "offline-local-only",
    authoritative: false,
    checksumVerified: false,
    warning: "AUTHORIZED_LEGACY_EXPORT_REQUIRED_FOR_COMPARISON",
  };
}

function compactResolvedField(field) {
  return {
    rawColumn: field.rawColumn,
    resolution: field.resolution,
    value: field.value,
    sourceFile: field.sourceFile,
    sourceRow: field.sourceRow,
    candidates: field.candidates.filter((candidate) => candidate.value.trim() !== ""),
  };
}

export async function buildGoldenDryRun(options) {
  if (!options.dryRun) throw new Error("Fase 1A protetta: specificare --dry-run");
  if (!options.goldenOnly) throw new Error("Fase 1A protetta: specificare --golden-only");

  const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, "utf8"));
  const goldenSkus = audit.goldenDataset.map((item) => item.sku);
  const { snapshots, fileMetadata } = loadSourceSnapshots(options.rawDir ?? RAW_DIR);
  const legacy = await loadLegacyRows(goldenSkus, options);
  const legacyComparisonPerformed = legacy.authoritative === true;
  const legacyBySku = new Map(legacy.rows.map((row) => [String(row.sku), row]));

  const products = goldenSkus.map((sku) => {
    const resolution = resolveProduct(sku, snapshots);
    const comparisons = legacyComparisonPerformed ? compareWithLegacy(resolution, legacyBySku.get(sku) ?? null) : [];
    const legacyFieldsToPreserve = comparisons.filter((item) => item.classification === "LEGACY_VALUE_TO_PRESERVE");
    return {
      sku,
      legacyComparisonStatus: legacyComparisonPerformed ? "PERFORMED" : "NOT_RUN_AUTHORIZED_LEGACY_EXPORT_REQUIRED",
      entityType: resolution.entityType,
      identityStatus: resolution.identityStatus,
      sourceFiles: resolution.sourceFiles,
      rawSnapshotCount: resolution.snapshots.length,
      parentRelation: {
        sourceReference: resolution.parentReference,
        resolvedParentSku: resolution.parentSku,
        sourceReferencePreserved: true,
      },
      resolvedFields: Object.fromEntries(Object.entries(resolution.resolvedFields).map(([key, field]) => [key, compactResolvedField(field)])),
      verticalFills: resolution.verticalFills,
      conflicts: resolution.conflicts,
      wordpressOriginal: Object.fromEntries(Object.entries(resolution.resolvedFields).filter(([, field]) => field.value !== null).map(([key, field]) => [key, field.value])),
      legacyCurrent: Object.fromEntries(comparisons.filter((item) => item.legacyCurrent !== null && item.legacyCurrent !== undefined).map((item) => [item.fieldKey, item.legacyCurrent])),
      legacyFieldsToPreserve,
      reconciliation: comparisons,
      reconciliationCounts: Object.fromEntries(
        ["SAME", "LEGACY_VALUE_TO_PRESERVE", "SOURCE_ONLY", "CONFLICT"]
          .map((classification) => [classification, comparisons.filter((item) => item.classification === classification).length]),
      ),
      warnings: resolution.warnings,
      proposedCurrentValues: Object.fromEntries(comparisons.filter((item) => item.proposedCurrentSource !== null).map((item) => [item.fieldKey, {
        value: item.proposedCurrentValue,
        source: item.proposedCurrentSource,
      }])),
    };
  });

  const missingSkuRecords = snapshots
    .filter((snapshot) => !snapshot.sourceSku)
    .map((snapshot) => ({
      sourceFile: snapshot.sourceFile,
      sourceRow: snapshot.sourceRowNumber,
      wooId: snapshot.rawRow.ID,
      type: snapshot.rawRow.Tipo,
      parentReference: snapshot.rawRow.Genitore,
      title: snapshot.rawRow.Nome,
      identity: decideIdentity(snapshot.rawRow),
      rawSnapshotPreserved: true,
    }));

  const legacyPreserveFields = products.flatMap((product) => product.legacyFieldsToPreserve.map((field) => ({ sku: product.sku, ...field })));
  const reconciliationCounts = Object.fromEntries(
    ["SAME", "LEGACY_VALUE_TO_PRESERVE", "SOURCE_ONLY", "CONFLICT"]
      .map((classification) => [classification, products.reduce((total, product) => total + product.reconciliationCounts[classification], 0)]),
  );
  const report = {
    mode: "dry-run",
    goldenOnly: true,
    writesPerformed: 0,
    aiInvocations: 0,
    masterSourceFile: "wc-product-export-27-7-2026-1785163658156.csv",
    sourceFiles: fileMetadata,
    sourceSnapshotCount: snapshots.length,
    uniqueRawColumns: [...new Set(fileMetadata.flatMap((file) => file.headers))],
    goldenSkuCount: goldenSkus.length,
    reconciliationCounts,
    legacyRead: {
      source: legacy.source,
      accessRole: legacy.accessRole,
      authoritative: legacy.authoritative,
      checksumVerified: legacy.checksumVerified,
      visibleRowCount: legacy.visibleRowCount,
      rowsFound: legacy.rows.length,
      warning: legacy.warning,
    },
    legacyComparisonPerformed,
    legacyValueToPreserveCount: legacyPreserveFields.length,
    legacyProductsToPreserveCount: new Set(legacyPreserveFields.map((field) => field.sku)).size,
    missingSkuRecordCount: missingSkuRecords.length,
    missingSkuRecords,
    products,
  };
  return report;
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  console.log("[lossless] mode=dry-run scope=golden-only db-writes=0 ai-calls=0");
  const report = await buildGoldenDryRun(options);
  writeJsonFile(options.output, report);
  for (const product of report.products) {
    console.log(`[lossless] sku=${product.sku} type=${product.entityType} snapshots=${product.rawSnapshotCount} fills=${product.verticalFills.length} conflicts=${product.conflicts.length} legacy-preserve=${product.legacyFieldsToPreserve.length}`);
  }
  console.log(`[lossless] missing-sku=${report.missingSkuRecordCount} legacy-visible=${report.legacyRead.visibleRowCount} legacy-authoritative=${report.legacyRead.authoritative} comparison=${report.legacyComparisonPerformed ? "performed" : "blocked"} legacy-preserve-fields=${report.legacyValueToPreserveCount}`);
  console.log(`[lossless] report=${path.relative(ROOT, options.output)}`);
}

const isEntrypoint = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isEntrypoint) {
  main().catch((error) => {
    console.error(`[lossless] ERROR ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
