import { serviceClient } from "../_shared/admin-v2-auth.ts";
import { parseCreateManifest } from "./manifest.ts";
import type { CreateManifest } from "./types.ts";

export const SHOPIFY_CREATE_MANIFEST_BUCKET = "shopify-create-manifests";
export const SHOPIFY_CREATE_INDEX_PATH = "index.json";
export const SHOPIFY_CREATE_INDEX_SCHEMA = "3B.2-scaleout-v1";

const BATCH_ID = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const MAX_INDEX_BYTES = 1024 * 1024;
const MAX_MANIFEST_BYTES = 5 * 1024 * 1024;
const MAX_INDEX_BATCHES = 1000;

export interface ManifestIndexEntry {
  batchId: string;
  objectPath: string;
  sha256: string;
  familyCount: number;
  schemaVersion: "3B.2-v1";
}

export interface ManifestIndex {
  schemaVersion: "3B.2-scaleout-v1";
  batches: ManifestIndexEntry[];
}

export interface PrivateManifestStore {
  download(path: string): Promise<Uint8Array>;
}

export interface ApprovedCreateManifest {
  manifest: CreateManifest;
  manifestSha256: string;
  approvalDigest: string;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`MANIFEST_INDEX_INVALID: ${label}`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  allowed: string[],
  label: string,
) {
  if (
    Object.keys(value).length !== allowed.length ||
    Object.keys(value).some((key) => !allowed.includes(key))
  ) {
    throw new Error(`MANIFEST_INDEX_INVALID: ${label} metadata non valida`);
  }
}

export function parseManifestIndex(value: unknown): ManifestIndex {
  const input = record(value, "index");
  exactKeys(input, ["schemaVersion", "batches"], "index");
  if (input.schemaVersion !== SHOPIFY_CREATE_INDEX_SCHEMA) {
    throw new Error("MANIFEST_INDEX_INVALID: schemaVersion");
  }
  if (
    !Array.isArray(input.batches) || input.batches.length === 0 ||
    input.batches.length > MAX_INDEX_BATCHES
  ) {
    throw new Error("MANIFEST_INDEX_INVALID: batches");
  }
  const batchIds = new Set<string>();
  const objectPaths = new Set<string>();
  const batches = input.batches.map((value, index): ManifestIndexEntry => {
    const entry = record(value, `batches[${index}]`);
    exactKeys(
      entry,
      ["batchId", "objectPath", "sha256", "familyCount", "schemaVersion"],
      `batches[${index}]`,
    );
    if (typeof entry.batchId !== "string" || !BATCH_ID.test(entry.batchId)) {
      throw new Error("MANIFEST_INDEX_INVALID: batchId");
    }
    const expectedPath = `batches/${entry.batchId}.json`;
    if (entry.objectPath !== expectedPath) {
      throw new Error("MANIFEST_INDEX_INVALID: objectPath");
    }
    if (typeof entry.sha256 !== "string" || !SHA256.test(entry.sha256)) {
      throw new Error("MANIFEST_INDEX_INVALID: sha256");
    }
    if (
      !Number.isInteger(entry.familyCount) || Number(entry.familyCount) < 1 ||
      Number(entry.familyCount) > 10
    ) {
      throw new Error("MANIFEST_INDEX_INVALID: familyCount");
    }
    if (entry.schemaVersion !== "3B.2-v1") {
      throw new Error("MANIFEST_INDEX_INVALID: batch schemaVersion");
    }
    if (batchIds.has(entry.batchId) || objectPaths.has(expectedPath)) {
      throw new Error("MANIFEST_INDEX_INVALID: batch duplicato");
    }
    batchIds.add(entry.batchId);
    objectPaths.add(expectedPath);
    return {
      batchId: entry.batchId,
      objectPath: expectedPath,
      sha256: entry.sha256,
      familyCount: Number(entry.familyCount),
      schemaVersion: "3B.2-v1",
    };
  });
  return { schemaVersion: SHOPIFY_CREATE_INDEX_SCHEMA, batches };
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const input = new Uint8Array(bytes.byteLength);
  input.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", input.buffer);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function createManifestApprovalDigest(
  batchId: string,
  manifestSha256: string,
  schemaVersion: string,
): Promise<string> {
  return await sha256Hex(
    new TextEncoder().encode(
      `${batchId}:${manifestSha256}:${schemaVersion}`,
    ),
  );
}

function parseJson(bytes: Uint8Array, label: string): unknown {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error(`MANIFEST_INVALID: ${label} JSON`);
  }
}

export class SupabasePrivateManifestStore implements PrivateManifestStore {
  async download(path: string): Promise<Uint8Array> {
    const { data, error } = await serviceClient().storage
      .from(SHOPIFY_CREATE_MANIFEST_BUCKET)
      .download(path);
    if (error || !data) throw new Error("MANIFEST_STORAGE_READ_FAILED");
    return new Uint8Array(await data.arrayBuffer());
  }
}

export async function loadApprovedCreateManifest(
  batchId: string,
  store: PrivateManifestStore = new SupabasePrivateManifestStore(),
): Promise<ApprovedCreateManifest> {
  if (!BATCH_ID.test(batchId)) {
    throw new Error("MANIFEST_BATCH_NOT_APPROVED");
  }
  const indexBytes = await store.download(SHOPIFY_CREATE_INDEX_PATH);
  if (indexBytes.byteLength > MAX_INDEX_BYTES) {
    throw new Error("MANIFEST_INDEX_INVALID: dimensione");
  }
  const index = parseManifestIndex(parseJson(indexBytes, "index"));
  const approved = index.batches.find((entry) => entry.batchId === batchId);
  if (!approved) throw new Error("MANIFEST_BATCH_NOT_APPROVED");

  const manifestBytes = await store.download(approved.objectPath);
  if (manifestBytes.byteLength > MAX_MANIFEST_BYTES) {
    throw new Error("MANIFEST_INVALID: dimensione");
  }
  if (await sha256Hex(manifestBytes) !== approved.sha256) {
    throw new Error("MANIFEST_INTEGRITY_ERROR");
  }
  const manifest = parseCreateManifest(parseJson(manifestBytes, "batch"));
  if (
    manifest.batchId !== approved.batchId ||
    manifest.families.length !== approved.familyCount
  ) {
    throw new Error("MANIFEST_INTEGRITY_ERROR");
  }
  return {
    manifest,
    manifestSha256: approved.sha256,
    approvalDigest: await createManifestApprovalDigest(
      approved.batchId,
      approved.sha256,
      approved.schemaVersion,
    ),
  };
}
