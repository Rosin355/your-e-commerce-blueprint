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
 * Pushes only body HTML + SEO title/description to Shopify via the existing
 * `update_product` proxy action — no AI regeneration happens here, so the
 * published content always matches what was shown on screen.
 * NOTE: custom metafields are intentionally NOT sent here (CSV export only).
 */
export async function publishReviewedDraft(params: {
  productId: number;
  bodyHtml: string;
  seoTitle?: string;
  seoDescription?: string;
}) {
  return callProxy<{ success: boolean; id: number }>("update_product", {
    id: params.productId,
    body_html: params.bodyHtml,
    metafields_global_title_tag: params.seoTitle ?? "",
    metafields_global_description_tag: params.seoDescription ?? "",
  });
}
