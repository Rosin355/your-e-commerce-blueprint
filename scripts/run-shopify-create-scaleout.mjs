#!/usr/bin/env node
import { readFileSync } from "node:fs";

const INDEX_SCHEMA = "3B.2-scaleout-v1";

function parseArgs(argv) {
  const result = { executeWindow: false };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--execute-window") {
      result.executeWindow = true;
      continue;
    }
    result[key.slice(2)] = argv[index + 1];
    index += 1;
  }
  if (!result.index) {
    throw new Error(
      "Uso: --index <private-index.json> [--start-batch <id>] [--execute-window]",
    );
  }
  return result;
}

export function parseRunnerIndex(value) {
  if (
    !value || typeof value !== "object" || Array.isArray(value) ||
    value.schemaVersion !== INDEX_SCHEMA || !Array.isArray(value.batches) ||
    value.batches.length === 0
  ) {
    throw new Error("RUNNER_INDEX_INVALID");
  }
  const ids = value.batches.map((entry) => {
    if (
      !entry || typeof entry !== "object" || Array.isArray(entry) ||
      Object.keys(entry).length !== 5 ||
      !["batchId", "objectPath", "sha256", "familyCount", "schemaVersion"]
        .every((key) => Object.hasOwn(entry, key)) ||
      typeof entry.batchId !== "string" ||
      !/^[a-z0-9][a-z0-9._-]{2,63}$/.test(entry.batchId) ||
      entry.objectPath !== `batches/${entry.batchId}.json` ||
      !/^[0-9a-f]{64}$/.test(entry.sha256) ||
      !Number.isInteger(entry.familyCount) || entry.familyCount < 1 ||
      entry.familyCount > 10 || entry.schemaVersion !== "3B.2-v1"
    ) {
      throw new Error("RUNNER_INDEX_INVALID");
    }
    return entry.batchId;
  });
  if (
    ids.some((id) => typeof id !== "string") ||
    new Set(ids).size !== ids.length
  ) {
    throw new Error("RUNNER_INDEX_INVALID");
  }
  return ids;
}

function zero(report, key) {
  return Number(report?.summary?.[key] || 0) === 0;
}

function safeReport(report, mode, batchId) {
  return report?.mode === mode && report?.batchId === batchId &&
    report?.ok === true && Array.isArray(report?.results) &&
    report?.stopped === false && zero(report, "FAILED") &&
    zero(report, "BLOCKED") && zero(report, "MEDIA_PENDING") &&
    !report.results?.some((result) =>
      /IDENTITY_CONFLICT|DUPLICATE_SKU_CONFLICT|IDEMPOTENCY_CONFLICT/.test(
        String(result?.code || ""),
      )
    );
}

function verifiedReport(report, batchId) {
  return safeReport(report, "DRY_RUN", batchId) &&
    Number(report?.summary?.PLANNED || 0) === 0 &&
    report.results?.every((result) =>
      ["ALREADY_EXISTS", "RECONCILED", "SKIPPED"].includes(result.status)
    );
}

export async function runScaleout({
  batchIds,
  callBatch,
  startBatch = "",
  executeWindow = false,
  onReport = () => {},
}) {
  const start = startBatch ? batchIds.indexOf(startBatch) : 0;
  if (start < 0) throw new Error("START_BATCH_NOT_APPROVED");
  const completed = [];
  for (const batchId of batchIds.slice(start)) {
    const dryRun = await callBatch(batchId, "DRY_RUN");
    onReport({ batchId, phase: "DRY_RUN", summary: dryRun.summary });
    if (!safeReport(dryRun, "DRY_RUN", batchId)) {
      throw new Error(`SCALEOUT_STOP_DRY_RUN:${batchId}`);
    }
    if (!executeWindow) {
      completed.push({ batchId, phase: "DRY_RUN" });
      continue;
    }
    const executed = await callBatch(batchId, "EXECUTE");
    onReport({ batchId, phase: "EXECUTE", summary: executed.summary });
    if (!safeReport(executed, "EXECUTE", batchId)) {
      throw new Error(`SCALEOUT_STOP_EXECUTE:${batchId}`);
    }
    const verified = await callBatch(batchId, "DRY_RUN");
    onReport({ batchId, phase: "VERIFY", summary: verified.summary });
    if (!verifiedReport(verified, batchId)) {
      throw new Error(`SCALEOUT_STOP_VERIFY:${batchId}`);
    }
    completed.push({ batchId, phase: "VERIFIED" });
  }
  return completed;
}

async function invoke(endpoint, token, batchId, mode) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      batchId,
      mode,
      ...(mode === "EXECUTE" ? { confirm: "SHOPIFY_CREATE_EXECUTE" } : {}),
    }),
  });
  const report = await response.json().catch(() => null);
  if (!response.ok || !report) {
    throw new Error(`SCALEOUT_HTTP_ERROR:${batchId}:${response.status}`);
  }
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  const endpoint = process.env.SHOPIFY_CREATE_ENDPOINT;
  const token = process.env.SHOPIFY_CREATE_ADMIN_JWT;
  if (!endpoint || !token) {
    throw new Error(
      "SHOPIFY_CREATE_ENDPOINT/SHOPIFY_CREATE_ADMIN_JWT mancanti",
    );
  }
  const index = JSON.parse(readFileSync(args.index, "utf8"));
  const batchIds = parseRunnerIndex(index);
  try {
    const completed = await runScaleout({
      batchIds,
      startBatch: args["start-batch"],
      executeWindow: args.executeWindow,
      callBatch: (batchId, mode) => invoke(endpoint, token, batchId, mode),
      onReport: (report) => console.log(JSON.stringify(report)),
    });
    console.log(JSON.stringify({ ok: true, completed: completed.length }));
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : "SCALEOUT_STOPPED",
      action: "DISABLE_SHOPIFY_CREATE_EXECUTE_ENABLED",
    }));
    process.exitCode = 1;
  }
}
