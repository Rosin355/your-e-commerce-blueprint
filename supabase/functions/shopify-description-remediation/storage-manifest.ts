import { serviceClient } from "../_shared/admin-v2-auth.ts";
import {
  type ApprovedManifestStore,
  loadApprovedManifest,
} from "../_shared/shopify-approved-manifest.ts";
import { parseRemediationManifest } from "./manifest.ts";
import { REMEDIATION_MAX_ITEMS } from "./types.ts";

export const REMEDIATION_BUCKET = "shopify-create-manifests";
export const REMEDIATION_INDEX_PATH = "remediation/index.json";

export class SupabaseRemediationStore implements ApprovedManifestStore {
  async download(path: string): Promise<Uint8Array> {
    const { data, error } = await serviceClient().storage
      .from(REMEDIATION_BUCKET)
      .download(path);
    if (error || !data) throw new Error("MANIFEST_STORAGE_READ_FAILED");
    return new Uint8Array(await data.arrayBuffer());
  }
}

export async function loadApprovedRemediationManifest(
  batchId: string,
  store: ApprovedManifestStore = new SupabaseRemediationStore(),
) {
  return await loadApprovedManifest({
    batchId,
    store,
    indexPath: REMEDIATION_INDEX_PATH,
    indexSchema: "3B.3-remediation-index-v1",
    manifestSchema: "3B.3-v1",
    objectPrefix: "remediation/batches",
    maxItems: REMEDIATION_MAX_ITEMS,
    parseManifest: parseRemediationManifest,
    manifestBatchId: (manifest) => manifest.batchId,
    manifestItemCount: (manifest) => manifest.items.length,
  });
}
