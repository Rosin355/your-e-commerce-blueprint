export interface ApprovedManifestIndexEntry {
  batchId: string;
  objectPath: string;
  sha256: string;
  itemCount: number;
  schemaVersion: string;
}

export interface ApprovedManifestStore {
  download(path: string): Promise<Uint8Array>;
}

export interface ApprovedManifest<T> {
  manifest: T;
  manifestSha256: string;
  approvalDigest: string;
}

const BATCH_ID = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const MAX_INDEX_BYTES = 1024 * 1024;
const MAX_MANIFEST_BYTES = 5 * 1024 * 1024;

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`MANIFEST_INDEX_INVALID: ${label}`);
  }
  return value as Record<string, unknown>;
}

function parseJson(bytes: Uint8Array, label: string): unknown {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error(`MANIFEST_INVALID: ${label} JSON`);
  }
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function manifestApprovalDigest(
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

export function parseApprovedManifestIndex(input: {
  value: unknown;
  indexSchema: string;
  manifestSchema: string;
  objectPrefix: string;
  maxItems: number;
}): ApprovedManifestIndexEntry[] {
  const index = record(input.value, "index");
  const keys = Object.keys(index);
  if (
    keys.length !== 2 || !keys.includes("schemaVersion") ||
    !keys.includes("batches") || index.schemaVersion !== input.indexSchema ||
    !Array.isArray(index.batches) || index.batches.length === 0 ||
    index.batches.length > 1000
  ) {
    throw new Error("MANIFEST_INDEX_INVALID: index");
  }
  const ids = new Set<string>();
  const paths = new Set<string>();
  return index.batches.map((value, position) => {
    const entry = record(value, `batches[${position}]`);
    const entryKeys = Object.keys(entry);
    if (
      entryKeys.length !== 5 ||
      !["batchId", "objectPath", "sha256", "itemCount", "schemaVersion"]
        .every((key) => entryKeys.includes(key)) ||
      typeof entry.batchId !== "string" || !BATCH_ID.test(entry.batchId) ||
      entry.objectPath !==
        `${input.objectPrefix}/${entry.batchId}.json` ||
      typeof entry.sha256 !== "string" || !SHA256.test(entry.sha256) ||
      !Number.isInteger(entry.itemCount) || Number(entry.itemCount) < 1 ||
      Number(entry.itemCount) > input.maxItems ||
      entry.schemaVersion !== input.manifestSchema ||
      ids.has(entry.batchId) || paths.has(String(entry.objectPath))
    ) {
      throw new Error(`MANIFEST_INDEX_INVALID: batches[${position}]`);
    }
    ids.add(entry.batchId);
    paths.add(String(entry.objectPath));
    return {
      batchId: entry.batchId,
      objectPath: String(entry.objectPath),
      sha256: entry.sha256,
      itemCount: Number(entry.itemCount),
      schemaVersion: entry.schemaVersion,
    };
  });
}

export async function loadApprovedManifest<T>(input: {
  batchId: string;
  store: ApprovedManifestStore;
  indexPath: string;
  indexSchema: string;
  manifestSchema: string;
  objectPrefix: string;
  maxItems: number;
  parseManifest(value: unknown): T;
  manifestBatchId(manifest: T): string;
  manifestItemCount(manifest: T): number;
}): Promise<ApprovedManifest<T>> {
  if (!BATCH_ID.test(input.batchId)) {
    throw new Error("MANIFEST_BATCH_NOT_APPROVED");
  }
  const indexBytes = await input.store.download(input.indexPath);
  if (indexBytes.byteLength > MAX_INDEX_BYTES) {
    throw new Error("MANIFEST_INDEX_INVALID: dimensione");
  }
  const entries = parseApprovedManifestIndex({
    value: parseJson(indexBytes, "index"),
    indexSchema: input.indexSchema,
    manifestSchema: input.manifestSchema,
    objectPrefix: input.objectPrefix,
    maxItems: input.maxItems,
  });
  const approved = entries.find((entry) => entry.batchId === input.batchId);
  if (!approved) throw new Error("MANIFEST_BATCH_NOT_APPROVED");
  const bytes = await input.store.download(approved.objectPath);
  if (bytes.byteLength > MAX_MANIFEST_BYTES) {
    throw new Error("MANIFEST_INVALID: dimensione");
  }
  if (await sha256Hex(bytes) !== approved.sha256) {
    throw new Error("MANIFEST_INTEGRITY_ERROR");
  }
  const manifest = input.parseManifest(parseJson(bytes, "batch"));
  if (
    input.manifestBatchId(manifest) !== approved.batchId ||
    input.manifestItemCount(manifest) !== approved.itemCount
  ) {
    throw new Error("MANIFEST_INTEGRITY_ERROR");
  }
  return {
    manifest,
    manifestSha256: approved.sha256,
    approvalDigest: await manifestApprovalDigest(
      approved.batchId,
      approved.sha256,
      approved.schemaVersion,
    ),
  };
}

export function assertApprovedDigest(
  mode: "DRY_RUN" | "EXECUTE",
  supplied: string | undefined,
  current: string,
): void {
  if (mode === "EXECUTE" && !supplied) {
    throw new Error("MANIFEST_APPROVAL_REQUIRED");
  }
  if (supplied !== undefined && supplied !== current) {
    throw new Error("MANIFEST_APPROVAL_MISMATCH");
  }
}
