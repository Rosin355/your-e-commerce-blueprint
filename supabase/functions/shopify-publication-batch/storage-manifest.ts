import { serviceClient } from "../_shared/admin-v2-auth.ts";
import {
  type ApprovedManifestStore,
  loadApprovedManifest,
} from "../_shared/shopify-approved-manifest.ts";
import { parsePublicationManifest } from "./manifest.ts";
import {
  PUBLICATION_INDEX_SCHEMA,
  PUBLICATION_MANIFEST_SCHEMA,
  PUBLICATION_MAX_ITEMS,
} from "./types.ts";

export const PUBLICATION_BUCKET = "shopify-create-manifests";
export const PUBLICATION_INDEX_PATH = "publication/index.json";

export class SupabasePublicationStore implements ApprovedManifestStore {
  async download(path: string): Promise<Uint8Array> {
    const { data, error } = await serviceClient().storage
      .from(PUBLICATION_BUCKET)
      .download(path);
    if (error || !data) throw new Error("MANIFEST_STORAGE_READ_FAILED");
    return new Uint8Array(await data.arrayBuffer());
  }
}

export async function loadApprovedPublicationManifest(
  batchId: string,
  store: ApprovedManifestStore = new SupabasePublicationStore(),
) {
  return await loadApprovedManifest({
    batchId,
    store,
    indexPath: PUBLICATION_INDEX_PATH,
    indexSchema: PUBLICATION_INDEX_SCHEMA,
    manifestSchema: PUBLICATION_MANIFEST_SCHEMA,
    objectPrefix: "publication/batches",
    maxItems: PUBLICATION_MAX_ITEMS,
    parseManifest: parsePublicationManifest,
    manifestBatchId: (manifest) => manifest.batchId,
    manifestItemCount: (manifest) => manifest.items.length,
  });
}
