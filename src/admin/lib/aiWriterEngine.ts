import { supabase } from "@/integrations/supabase/client";
import type { AiDraftGenerationResponse, AiWriterDraft, ShopifyAdminProduct } from "../types/aiWriter";

type ProxyAction =
  | "list_products"
  | "get_product"
  | "list_drafts"
  | "list_db_products"
  | "save_enriched_draft"
  | "get_enriched_drafts"
  | "update_product"
  | "generate_product_copy_draft"
  | "publish_product_copy";

async function callProxy<T>(action: ProxyAction, data: Record<string, unknown>) {
  const { data: response, error } = await supabase.functions.invoke("shopify-admin-proxy", {
    body: { action, data },
  });
  if (error) {
    throw new Error(error.message || "Errore chiamata proxy");
  }
  return response as T;
}

export async function listDbProducts(params?: { limit?: number }) {
  return callProxy<{ products: any[] }>("list_db_products", params ?? {});
}

export async function saveEnrichedDraftToDb(params: {
  sku: string;
  draft: unknown;
  seedStyle?: string;
}) {
  return callProxy<{ success: boolean; sku: string }>("save_enriched_draft", params);
}

export interface EnrichedDraftDbRow {
  sku: string;
  handle: string | null;
  ai_enrichment_json: Record<string, unknown> | null;
  ai_enriched_at: string | null;
  ai_seed_style: string | null;
  seo_title: string | null;
  seo_description: string | null;
  optimized_description: string | null;
}

export async function getEnrichedDraftsBySkus(skus: string[]) {
  if (!skus.length) return { drafts: [] as EnrichedDraftDbRow[] };
  return callProxy<{ drafts: EnrichedDraftDbRow[] }>("get_enriched_drafts", { skus });
}


export async function listShopifyProducts(params: {
  status?: string;
  tag?: string;
  query?: string;
  limit?: number;
  pageInfo?: string;
}) {
  return callProxy<{ products: ShopifyAdminProduct[]; hasNextPage: boolean; nextPageInfo?: string }>("list_products", params);
}

export async function getShopifyProduct(productId: number) {
  return callProxy<{ product: ShopifyAdminProduct }>("get_product", { productId });
}

export async function listProductDrafts(productId: number) {
  return callProxy<{ drafts: AiWriterDraft[] }>("list_drafts", { productId });
}

export async function generateProductDraft(params: {
  productId: number;
  seedStyle: string;
  language?: string;
  adminEmail?: string;
}) {
  return callProxy<AiDraftGenerationResponse>("generate_product_copy_draft", params);
}

export async function publishDraft(draftId: string, adminEmail?: string) {
  return callProxy<{ success: boolean; draft: AiWriterDraft; productId: number }>("publish_product_copy", {
    draftId,
    adminEmail,
  });
}

/**
 * Publishes the EXACT enriched draft the admin reviewed in the panel.
 * Pushes body HTML + SEO title/description AND the 16 custom metafields
 * (namespace `custom`) directly to Shopify via the `update_product` proxy
 * action. Empty metafield values are skipped server-side so they never
 * overwrite existing data.
 */
export async function publishReviewedDraft(params: {
  productId: number;
  bodyHtml: string;
  seoTitle?: string;
  seoDescription?: string;
  metafields?: Record<string, string>;
}) {
  return callProxy<{ success: boolean; id: number; metafields?: { written: number; skipped: number; errors: string[] } }>(
    "update_product",
    {
      id: params.productId,
      body_html: params.bodyHtml,
      metafields_global_title_tag: params.seoTitle ?? "",
      metafields_global_description_tag: params.seoDescription ?? "",
      metafields: params.metafields ?? {},
    },
  );
}

