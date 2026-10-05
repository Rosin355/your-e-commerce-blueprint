#!/usr/bin/env node
import { readFileSync } from "node:fs";
import {
  invokeApprovedBatch,
  parseApprovedIndex,
  runApprovedBatches,
} from "./lib/run-approved-shopify-batches.mjs";

const CONFIG = {
  indexSchema: "3B.4-publication-index-v2",
  manifestSchema: "3B.4-v2",
  objectPrefix: "publication/batches",
  maxItems: 25,
  allowed: {
    DRY_RUN: ["READY_TO_PUBLISH", "ALREADY_PUBLISHED"],
    EXECUTE: ["PUBLISHED", "ALREADY_PUBLISHED"],
  },
  verified: ["ALREADY_PUBLISHED"],
};

function args(argv) {
  const value = { executeWindow: false };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--execute-window") value.executeWindow = true;
    else {
      value[argv[index].slice(2)] = argv[index + 1];
      index += 1;
    }
  }
  if (!value.index) {
    throw new Error(
      "Uso: --index <privato> [--start-batch <id>] [--execute-window]",
    );
  }
  return value;
}

export { CONFIG as publicationRunnerConfig };

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = args(process.argv.slice(2));
  const endpoint = process.env.SHOPIFY_PUBLICATION_ENDPOINT;
  const token = process.env.SHOPIFY_FINAL_ADMIN_JWT;
  if (!endpoint || !token) {
    throw new Error(
      "SHOPIFY_PUBLICATION_ENDPOINT/SHOPIFY_FINAL_ADMIN_JWT mancanti",
    );
  }
  const batchIds = parseApprovedIndex(
    JSON.parse(readFileSync(input.index, "utf8")),
    CONFIG,
  );
  try {
    const completed = await runApprovedBatches({
      batchIds,
      config: CONFIG,
      startBatch: input["start-batch"],
      executeWindow: input.executeWindow,
      callBatch: (batchId, mode, approvalDigest) =>
        invokeApprovedBatch({
          endpoint,
          token,
          batchId,
          mode,
          approvalDigest,
          confirmation: "SHOPIFY_PUBLICATION_EXECUTE",
        }),
      onReport: (report) => console.log(JSON.stringify(report)),
    });
    console.log(JSON.stringify({ ok: true, completed: completed.length }));
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : "PUBLICATION_STOPPED",
      action: "DISABLE_SHOPIFY_PUBLICATION_EXECUTE_ENABLED",
    }));
    process.exitCode = 1;
  }
}
