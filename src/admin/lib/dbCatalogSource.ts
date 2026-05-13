import { supabase } from "@/integrations/supabase/client";
import type { ShopifyAdminProduct } from "../types/aiWriter";

const PAGE = 1000;

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
  const out: ShopifyAdminProduct[] = [];
  let from = 0;
  while (true) {
    let q = supabase
      .from("product_sync_csv_products")
      .select("sku,handle,title,description,tags,image_urls,seo_title,seo_description")
      .is("parent_sku", null)
      .order("imported_at", { ascending: false })
      .range(from, from + PAGE - 1);

    if (opts?.query?.trim()) {
      const term = `%${opts.query.trim()}%`;
      q = q.or(`title.ilike.${term},handle.ilike.${term},sku.ilike.${term}`);
    }

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as DbProductRow[];
    out.push(...rows.map(mapRow));
    opts?.onProgress?.(out.length);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return out;
}
