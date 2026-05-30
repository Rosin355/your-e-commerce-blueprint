export type DraftStatus = "draft" | "approved" | "published" | "error";

export interface ShopifyAdminProduct {
  id: number;
  title: string;
  handle: string;
  status: string;
  tags: string;
  body_html?: string;
  metafields_global_title_tag?: string;
  metafields_global_description_tag?: string;
  updated_at?: string;
  images?: Array<{
    id: number;
    src: string;
    alt?: string;
  }>;
  /** Optional: only present when product comes from local DB (Catalogo DB source) */
  sku?: string;
  /** Optional: custom metafields already saved in DB (used by completeness) */
  metafields?: Record<string, string>;
}

export interface AiWriterDraft {
  id: string;
  shopify_product_id: string;
  handle: string | null;
  seed_style: string | null;
  language: string;
  facts_json: Record<string, unknown>;
  copy_json: Record<string, unknown>;
  status: DraftStatus;
  created_by: string | null;
  error: string | null;
  published_at: string | null;
  created_at: string;
}

export interface AiDraftGenerationResponse {
  draft: AiWriterDraft;
  product: ShopifyAdminProduct;
}
