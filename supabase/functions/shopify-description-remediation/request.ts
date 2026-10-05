import type { RemediationMode } from "./types.ts";

const BATCH_ID = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const FIELDS = new Set(["batchId", "mode", "confirm", "approvalDigest"]);

export interface RemediationRequest {
  batchId: string;
  mode: RemediationMode;
  confirm?: "SHOPIFY_DESCRIPTION_REMEDIATION_EXECUTE";
  approvalDigest?: string;
}

export function parseRemediationRequest(value: unknown): RemediationRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("REQUEST_INVALID");
  }
  const input = value as Record<string, unknown>;
  const forbidden = Object.keys(input).find((key) => !FIELDS.has(key));
  if (forbidden) throw new Error(`REQUEST_FIELD_FORBIDDEN: ${forbidden}`);
  if (typeof input.batchId !== "string" || !BATCH_ID.test(input.batchId)) {
    throw new Error("REQUEST_INVALID: batchId");
  }
  if (
    input.mode !== undefined && input.mode !== "DRY_RUN" &&
    input.mode !== "EXECUTE"
  ) {
    throw new Error("REQUEST_INVALID: mode");
  }
  if (
    input.confirm !== undefined &&
    input.confirm !== "SHOPIFY_DESCRIPTION_REMEDIATION_EXECUTE"
  ) {
    throw new Error("REQUEST_INVALID: confirm");
  }
  if (
    input.approvalDigest !== undefined &&
    (typeof input.approvalDigest !== "string" ||
      !SHA256.test(input.approvalDigest))
  ) {
    throw new Error("REQUEST_INVALID: approvalDigest");
  }
  return {
    batchId: input.batchId,
    mode: input.mode === "EXECUTE" ? "EXECUTE" : "DRY_RUN",
    ...(input.confirm === "SHOPIFY_DESCRIPTION_REMEDIATION_EXECUTE"
      ? { confirm: input.confirm }
      : {}),
    ...(typeof input.approvalDigest === "string"
      ? { approvalDigest: input.approvalDigest }
      : {}),
  };
}
