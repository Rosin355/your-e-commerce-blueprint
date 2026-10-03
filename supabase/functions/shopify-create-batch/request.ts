import type { CreateMode } from "./types.ts";

const BATCH_ID = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const ALLOWED_FIELDS = new Set([
  "batchId",
  "mode",
  "confirm",
  "approvalDigest",
]);

export interface CreateBatchRequest {
  batchId: string;
  mode: CreateMode;
  confirm?: "SHOPIFY_CREATE_EXECUTE";
  approvalDigest?: string;
}

export function assertManifestApproval(
  mode: CreateMode,
  suppliedDigest: string | undefined,
  currentDigest: string,
): void {
  if (mode === "EXECUTE" && !suppliedDigest) {
    throw new Error(
      "MANIFEST_APPROVAL_REQUIRED: approvalDigest del DRY_RUN richiesto",
    );
  }
  if (suppliedDigest !== undefined && suppliedDigest !== currentDigest) {
    throw new Error(
      "MANIFEST_APPROVAL_MISMATCH: manifest diverso da quello approvato",
    );
  }
}

export function parseCreateBatchRequest(value: unknown): CreateBatchRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("REQUEST_INVALID: body JSON richiesto");
  }
  const input = value as Record<string, unknown>;
  const forbidden = Object.keys(input).find((key) => !ALLOWED_FIELDS.has(key));
  if (forbidden) {
    throw new Error(`REQUEST_FIELD_FORBIDDEN: ${forbidden}`);
  }
  if (typeof input.batchId !== "string" || !BATCH_ID.test(input.batchId)) {
    throw new Error("REQUEST_INVALID: batchId non valido");
  }
  if (
    input.mode !== undefined && input.mode !== "DRY_RUN" &&
    input.mode !== "EXECUTE"
  ) {
    throw new Error("REQUEST_INVALID: mode non valido");
  }
  if (
    input.confirm !== undefined && input.confirm !== "SHOPIFY_CREATE_EXECUTE"
  ) {
    throw new Error("REQUEST_INVALID: confirm non valido");
  }
  if (
    input.approvalDigest !== undefined &&
    (typeof input.approvalDigest !== "string" ||
      !SHA256.test(input.approvalDigest))
  ) {
    throw new Error("REQUEST_INVALID: approvalDigest non valido");
  }
  return {
    batchId: input.batchId,
    mode: input.mode === "EXECUTE" ? "EXECUTE" : "DRY_RUN",
    ...(input.confirm === "SHOPIFY_CREATE_EXECUTE"
      ? { confirm: input.confirm }
      : {}),
    ...(typeof input.approvalDigest === "string"
      ? { approvalDigest: input.approvalDigest }
      : {}),
  };
}
