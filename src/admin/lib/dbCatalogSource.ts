import type { ShopifyAdminProduct } from "../types/aiWriter";
import { listDbProducts } from "./aiWriterEngine";

// Stable numeric id from sku for React keys (not used for Shopify API calls in DB mode)
function hashSku(sku: string): number {
  let h = 0;
  for (let i = 0; i < sku.length; i++) {
    h = (h * 31 + sku.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

interface DbProductRow {
  sku: string;
  handle: string | null;
  title: string | null;
  description: string | null;
  tags: unknown;
  image_urls: unknown;
  seo_title: string | null;
  seo_description: string | null;
  optimized_description: string | null;
  metafields: unknown;
  ai_enrichment_json?: unknown;
  ai_enriched_at?: string | null;
  ai_seed_style?: string | null;
  shopify_product_id?: string | null;
  shopify_synced_at?: string | null;
  shopify_sync_status?: string | null;
  shopify_sync_error?: string | null;
  shopify_resolved_by?: string | null;
  shopify_metafields_written?: number | null;
  shopify_metafields_skipped?: number | null;
  shopify_metafields_failed?: number | null;
  shopify_metafields_report?: unknown;
  shopify_last_sync_mode?: string | null;
}

function mapRow(r: DbProductRow): ShopifyAdminProduct {
  const tagsArr = Array.isArray(r.tags) ? r.tags.map(String) : [];
  const imgs = Array.isArray(r.image_urls) ? r.image_urls.map(String) : [];
  const mf = r.metafields && typeof r.metafields === "object" && !Array.isArray(r.metafields)
    ? (r.metafields as Record<string, string>)
    : {};

  // Infer sync state: prefer explicit shopify_sync_status; else if we already
  // have a shopify_product_id treat as "synced" (server-side skip logic uses
  // the same signal — see toast "Saltato: già sincronizzato").
  const rawStatus = r.shopify_sync_status as
    | "pending" | "synced" | "partial" | "failed" | null | undefined;
  const hasShopifyId = !!(r.shopify_product_id && String(r.shopify_product_id).trim());
  const effectiveStatus: "pending" | "synced" | "partial" | "failed" | null =
    rawStatus && rawStatus !== "pending"
      ? rawStatus
      : hasShopifyId
        ? "synced"
        : rawStatus ?? null;

  const shopifySync = effectiveStatus
    ? {
        status: effectiveStatus,
        productId: r.shopify_product_id ?? null,
        syncedAt: r.shopify_synced_at ?? null,
        resolvedBy: r.shopify_resolved_by ?? null,
        error: r.shopify_sync_error ?? null,
        lastMode: r.shopify_last_sync_mode ?? null,
        metafields: {
          written: r.shopify_metafields_written ?? 0,
          skipped: r.shopify_metafields_skipped ?? 0,
          failed: r.shopify_metafields_failed ?? 0,
          report: r.shopify_metafields_report ?? undefined,
        },
      }
    : undefined;

  const aiJson =
    r.ai_enrichment_json && typeof r.ai_enrichment_json === "object" && !Array.isArray(r.ai_enrichment_json)
      ? (r.ai_enrichment_json as Record<string, unknown>)
      : null;
  const aiDraft = aiJson
    ? { json: aiJson, enrichedAt: r.ai_enriched_at ?? null, seedStyle: r.ai_seed_style ?? null }
    : undefined;

  return {
    id: hashSku(r.sku),
    sku: r.sku,
    title: r.title ?? r.sku,
    handle: r.handle ?? r.sku.toLowerCase(),
    status: "active",
    tags: tagsArr.join(", "),
    body_html: r.optimized_description ?? r.description ?? "",
    metafields_global_title_tag: r.seo_title ?? "",
    metafields_global_description_tag: r.seo_description ?? "",
    metafields: mf,
    images: imgs.map((src, i) => ({ id: i, src })),
    shopifySync,
    aiDraft,
    aiEnrichedAt: r.ai_enriched_at ?? null,
  };
}

export async function loadDbCatalogProducts(opts?: {
  query?: string;
  onProgress?: (count: number) => void;
}): Promise<ShopifyAdminProduct[]> {
  // Tabella protetta da RLS (solo service_role): passiamo via edge function
  // shopify-admin-proxy / list_db_products che gira con service role.
  const res = await listDbProducts({ limit: 10000 });
  const rows = (res?.products ?? []) as DbProductRow[];
  let mapped = rows.map(mapRow);

  const term = opts?.query?.trim().toLowerCase();
  if (term) {
    mapped = mapped.filter((p) => {
      const hay = `${p.title} ${p.handle} ${p.sku ?? ""}`.toLowerCase();
      return hay.includes(term);
    });
  }

  opts?.onProgress?.(mapped.length);
  return mapped;
}
