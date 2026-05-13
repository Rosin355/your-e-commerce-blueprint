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
}

function mapRow(r: DbProductRow): ShopifyAdminProduct {
  const tagsArr = Array.isArray(r.tags) ? r.tags.map(String) : [];
  const imgs = Array.isArray(r.image_urls) ? r.image_urls.map(String) : [];
  return {
    id: hashSku(r.sku),
    title: r.title ?? r.sku,
    handle: r.handle ?? r.sku.toLowerCase(),
    status: "active",
    tags: tagsArr.join(", "),
    body_html: r.description ?? "",
    metafields_global_title_tag: r.seo_title ?? "",
    metafields_global_description_tag: r.seo_description ?? "",
    images: imgs.map((src, i) => ({ id: i, src })),
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
      const hay = `${p.title} ${p.handle} ${rows.find((r) => hashSku(r.sku) === p.id)?.sku ?? ""}`.toLowerCase();
      return hay.includes(term);
    });
  }

  opts?.onProgress?.(mapped.length);
  return mapped;
}
