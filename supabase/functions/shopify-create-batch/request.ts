import type { CreateMode } from "./types.ts";

const BATCH_ID = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const ALLOWED_FIELDS = new Set(["batchId", "mode", "confirm"]);

export interface CreateBatchRequest {
  batchId: string;
  mode: CreateMode;
  confirm?: "SHOPIFY_CREATE_EXECUTE";
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
  return {
    batchId: input.batchId,
    mode: input.mode === "EXECUTE" ? "EXECUTE" : "DRY_RUN",
    ...(input.confirm === "SHOPIFY_CREATE_EXECUTE"
      ? { confirm: input.confirm }
      : {}),
  };
}
