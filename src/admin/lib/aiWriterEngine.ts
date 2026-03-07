import { supabase } from "@/integrations/supabase/client";
import type { AiDraftGenerationResponse, AiWriterDraft, ShopifyAdminProduct } from "../types/aiWriter";

type ProxyAction =
  | "list_products"
  | "get_product"
  | "list_drafts"
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

export async function listShopifyProducts(params: {
  status?: string;
  tag?: string;
  query?: string;
  limit?: number;
  page?: number;
}) {
  return callProxy<{ products: ShopifyAdminProduct[]; hasNextPage: boolean; page: number }>("list_products", params);
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
