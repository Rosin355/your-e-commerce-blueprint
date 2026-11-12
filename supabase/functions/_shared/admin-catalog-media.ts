import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import type { AuthContext } from "./admin-v2-types.ts";
import {
  catalogAllowed,
  requireCatalog,
  validateImage,
} from "./admin-catalog-policy.ts";
import { canaryScope } from "./admin-canary-service.ts";
import { requireCanaryScope } from "./admin-canary-policy.ts";
import { demand, OperationalError, UUID } from "./admin-operational-core.ts";
import { payloadHash, writesEnabled } from "./admin-v2-commands.ts";
import { shopifyAdminGraphQLAtVersion } from "./shopify-admin-client.ts";
const gql = <T>(q: string, v: Record<string, unknown> = {}) =>
  shopifyAdminGraphQLAtVersion<T>("2026-01", q, v);
const publicMedia = (row: Record<string, unknown>) => ({
  id: row.id,
  state: row.state,
  url: row.cdn_url,
  alt: row.alt,
});
function allowed(auth: AuthContext, p: Record<string, unknown>) {
  demand(writesEnabled(), "Caricamento immagini disabilitato.");
  if (catalogAllowed(auth, "images")) return;
  const scope = requireCanaryScope(
    canaryScope(),
    auth.userId,
    auth.roles,
    "upload_catalog_image",
  );
  demand(
    p.requestKey === scope.requestKey && p.sku === scope.sku,
    "Immagine fuori dal prodotto tecnico autorizzato.",
  );
}
export async function handleCatalogMedia(
  db: SupabaseClient,
  auth: AuthContext,
  p: Record<string, unknown>,
) {
  if (p.action === "list_catalog_media") {
    requireCatalog(auth, "images");
    const { data, error } = await db.from("admin_catalog_media").select(
      "id,state,cdn_url,alt",
    ).eq("actor", auth.userId).eq("state", "READY").order("created_at", {
      ascending: false,
    }).limit(30);
    demand(!error, "Immagini non disponibili.");
    return { ok: true, media: data.map(publicMedia) };
  }
  allowed(auth, p);
  if (p.action === "get_catalog_media") {
    demand(
      typeof p.mediaId === "string" && UUID.test(p.mediaId),
      "Immagine non valida.",
    );
    const { data, error } = await db.from("admin_catalog_media").select("*").eq(
      "id",
      p.mediaId,
    ).eq("actor", auth.userId).single();
    demand(!error && data, "Immagine non disponibile.");
    return { ok: true, media: publicMedia(await refreshMedia(db, data)) };
  }
  demand(
    p.confirm === true && typeof p.idempotencyKey === "string" &&
      UUID.test(p.idempotencyKey),
    "Conferma caricamento mancante.",
  );
  demand(
    typeof p.base64 === "string" && p.base64.length <= 7_000_000 &&
      /^[A-Za-z0-9+/]*={0,2}$/.test(p.base64),
    "File non valido o troppo grande.",
  );
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(p.base64), (c) => c.charCodeAt(0));
  } catch {
    throw new OperationalError("VALIDATION_ERROR", "File non valido.");
  }
  const format = validateImage(bytes, String(p.mimeType));
  demand(
    typeof p.alt === "string" && p.alt.trim().length > 0 && p.alt.length <= 250,
    "Inserire il testo alternativo dell’immagine.",
  );
  const contentHash = await payloadHash({
    base64: p.base64,
    mime: format.mime,
    alt: p.alt,
  });
  const { data: existing, error: existingError } = await db.from(
    "admin_catalog_media",
  ).select("*").eq("actor", auth.userId).eq("request_key", p.idempotencyKey)
    .maybeSingle();
  demand(!existingError, "Registro immagini non disponibile.");
  if (existing) {
    demand(
      existing.content_hash === contentHash,
      "Richiesta già usata per un altro file.",
    );
    return { ok: true, media: publicMedia(await refreshMedia(db, existing)) };
  }
  const { count, error: rateError } = await db.from("admin_catalog_media")
    .select("id", { count: "exact", head: true }).eq("actor", auth.userId).gte(
      "created_at",
      new Date(Date.now() - 3600000).toISOString(),
    );
  demand(
    !rateError && typeof count === "number" && count < 30,
    "Limite orario caricamenti raggiunto.",
  );
  const { data: entry, error } = await db.from("admin_catalog_media").insert({
    actor: auth.userId,
    request_key: p.idempotencyKey,
    content_hash: contentHash,
    alt: p.alt.trim(),
  }).select("*").single();
  demand(
    !error && entry,
    "Caricamento già avviato o registro non disponibile.",
  );
  try {
    const filename = `og-admin-${entry.id}.${format.extension}`;
    const stage = await gql<
      {
        stagedUploadsCreate: {
          stagedTargets: {
            url: string;
            resourceUrl: string;
            parameters: { name: string; value: string }[];
          }[];
          userErrors: unknown[];
        };
      }
    >(
      "mutation AdminStage($input:[StagedUploadInput!]!){stagedUploadsCreate(input:$input){stagedTargets{url resourceUrl parameters{name value}} userErrors{message}}}",
      {
        input: [{
          filename,
          mimeType: format.mime,
          resource: "IMAGE",
          httpMethod: "POST",
          fileSize: String(bytes.length),
        }],
      },
    );
    demand(
      !stage.stagedUploadsCreate.userErrors.length &&
        stage.stagedUploadsCreate.stagedTargets.length === 1,
      "Destinazione caricamento non disponibile.",
    );
    const target = stage.stagedUploadsCreate.stagedTargets[0];
    const host = new URL(target.url);
    demand(
      host.protocol === "https:" &&
        (/(^|\.)shopify\.com$/.test(host.hostname) ||
          /(^|\.)googleapis\.com$/.test(host.hostname) ||
          /(^|\.)amazonaws\.com$/.test(host.hostname)),
      "Destinazione upload non autorizzata.",
    );
    const body = new FormData();
    for (const parameter of target.parameters) {
      body.append(parameter.name, parameter.value);
    }
    body.append(
      "file",
      new Blob([new Uint8Array(bytes).buffer], { type: format.mime }),
      filename,
    );
    const upload = await fetch(target.url, {
      method: "POST",
      body,
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
    demand(upload.ok, "Trasferimento immagine non riuscito.");
    const created = await gql<
      { fileCreate: { files: { id: string }[]; userErrors: unknown[] } }
    >(
      "mutation AdminFile($files:[FileCreateInput!]!){fileCreate(files:$files){files{id} userErrors{message}}}",
      {
        files: [{
          originalSource: target.resourceUrl,
          contentType: "IMAGE",
          alt: p.alt.trim(),
          filename,
          duplicateResolutionMode: "RAISE_ERROR",
        }],
      },
    );
    demand(
      !created.fileCreate.userErrors.length &&
        created.fileCreate.files.length === 1,
      "Immagine non confermata: verificare lo stato prima di ricaricare.",
    );
    const fileId = created.fileCreate.files[0].id;
    const { error: updateError } = await db.from("admin_catalog_media").update({
      shopify_file_gid: fileId,
      state: "PROCESSING",
    }).eq("id", entry.id);
    demand(
      !updateError,
      "File trasferito: registrazione da riconciliare, non ricaricare.",
    );
    entry.shopify_file_gid = fileId;
    entry.state = "PROCESSING";
    for (let n = 0; n < 8; n++) {
      await refreshMedia(db, entry);
      if (entry.state === "READY") break;
      await new Promise((r) => setTimeout(r, 500));
    }
    return { ok: true, media: publicMedia(entry) };
  } catch (error) {
    await db.from("admin_catalog_media").update({ state: "REVIEW_REQUIRED" })
      .eq("id", entry.id).neq("state", "READY");
    throw error;
  }
}
async function refreshMedia(db: SupabaseClient, row: Record<string, unknown>) {
  if (row.state !== "PROCESSING" || !row.shopify_file_gid) return row;
  const result = await gql<
    {
      node: {
        id: string;
        fileStatus: string;
        image: { url: string; width: number; height: number } | null;
      } | null;
    }
  >(
    "query AdminMedia($id:ID!){node(id:$id){... on MediaImage{id fileStatus image{url width height}}}}",
    { id: row.shopify_file_gid },
  );
  demand(
    result.node?.id === row.shopify_file_gid,
    "File Shopify non verificabile.",
  );
  const file = result.node;
  if (file.fileStatus === "FAILED") {
    throw new OperationalError(
      "VALIDATION_ERROR",
      "Shopify ha rifiutato l’immagine.",
    );
  }
  if (file.fileStatus === "READY") {
    demand(
      file.image && new URL(file.image.url).hostname === "cdn.shopify.com" &&
        file.image.width > 0 && file.image.height > 0,
      "Immagine non disponibile.",
    );
    row.state = "READY";
    row.cdn_url = file.image.url;
    const { error } = await db.from("admin_catalog_media").update({
      state: "READY",
      cdn_url: file.image.url,
    }).eq("id", row.id).eq("state", "PROCESSING");
    demand(!error, "Stato immagine non registrato.");
  }
  return row;
}
