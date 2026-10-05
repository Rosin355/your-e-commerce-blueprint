const SHA256 = /^[0-9a-f]{64}$/;

export function parseApprovedIndex(value, config) {
  if (
    !value || typeof value !== "object" || Array.isArray(value) ||
    value.schemaVersion !== config.indexSchema ||
    !Array.isArray(value.batches) ||
    value.batches.length === 0
  ) {
    throw new Error("RUNNER_INDEX_INVALID");
  }
  const ids = value.batches.map((entry) => {
    if (
      !entry || typeof entry !== "object" || Array.isArray(entry) ||
      Object.keys(entry).length !== 5 ||
      !["batchId", "objectPath", "sha256", "itemCount", "schemaVersion"]
        .every((key) => Object.hasOwn(entry, key)) ||
      typeof entry.batchId !== "string" ||
      !/^[a-z0-9][a-z0-9._-]{2,63}$/.test(entry.batchId) ||
      entry.objectPath !== `${config.objectPrefix}/${entry.batchId}.json` ||
      !SHA256.test(entry.sha256) || !Number.isInteger(entry.itemCount) ||
      entry.itemCount < 1 || entry.itemCount > config.maxItems ||
      entry.schemaVersion !== config.manifestSchema
    ) {
      throw new Error("RUNNER_INDEX_INVALID");
    }
    return entry.batchId;
  });
  if (new Set(ids).size !== ids.length) throw new Error("RUNNER_INDEX_INVALID");
  return ids;
}

function approval(report, expected) {
  const valid = SHA256.test(String(report?.approvalDigest ?? "")) &&
    SHA256.test(String(report?.manifestSha256 ?? ""));
  return valid && (!expected ||
    (report.approvalDigest === expected.approvalDigest &&
      report.manifestSha256 === expected.manifestSha256));
}

function safe(report, mode, batchId, config, expected) {
  return report?.ok === true && report?.mode === mode &&
    report?.batchId === batchId && report?.stopped === false &&
    approval(report, expected) &&
    Number(report?.summary?.BLOCKED ?? 0) === 0 &&
    Number(report?.summary?.FAILED ?? 0) === 0 &&
    Array.isArray(report?.results) &&
    report.results.every((result) =>
      config.allowed[mode].includes(result.status)
    );
}

export async function runApprovedBatches({
  batchIds,
  callBatch,
  config,
  startBatch = "",
  executeWindow = false,
  onReport = () => {},
}) {
  const start = startBatch ? batchIds.indexOf(startBatch) : 0;
  if (start < 0) throw new Error("START_BATCH_NOT_APPROVED");
  const completed = [];
  for (const batchId of batchIds.slice(start)) {
    const dry = await callBatch(batchId, "DRY_RUN");
    onReport({ batchId, phase: "DRY_RUN", summary: dry.summary });
    if (!safe(dry, "DRY_RUN", batchId, config)) {
      throw new Error(`SCALEOUT_STOP_DRY_RUN:${batchId}`);
    }
    const pinned = {
      approvalDigest: dry.approvalDigest,
      manifestSha256: dry.manifestSha256,
    };
    if (!executeWindow) {
      completed.push({ batchId, phase: "DRY_RUN" });
      continue;
    }
    const execute = await callBatch(batchId, "EXECUTE", pinned.approvalDigest);
    onReport({ batchId, phase: "EXECUTE", summary: execute.summary });
    if (!safe(execute, "EXECUTE", batchId, config, pinned)) {
      throw new Error(`SCALEOUT_STOP_EXECUTE:${batchId}`);
    }
    const verify = await callBatch(batchId, "DRY_RUN", pinned.approvalDigest);
    onReport({ batchId, phase: "VERIFY", summary: verify.summary });
    if (
      !safe(verify, "DRY_RUN", batchId, config, pinned) ||
      !verify.results.every((result) => config.verified.includes(result.status))
    ) {
      throw new Error(`SCALEOUT_STOP_VERIFY:${batchId}`);
    }
    completed.push({ batchId, phase: "VERIFIED" });
  }
  return completed;
}

export async function invokeApprovedBatch({
  endpoint,
  token,
  batchId,
  mode,
  approvalDigest,
  confirmation,
}) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      batchId,
      mode,
      ...(mode === "EXECUTE" ? { confirm: confirmation } : {}),
      ...(approvalDigest ? { approvalDigest } : {}),
    }),
  });
  const report = await response.json().catch(() => null);
  if (!response.ok || !report) {
    throw new Error(`SCALEOUT_HTTP_ERROR:${batchId}:${response.status}`);
  }
  return report;
}
