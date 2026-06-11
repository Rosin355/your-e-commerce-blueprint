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
  | "publish_product_copy"
  | "get_metafield_config"
  | "get_metafield_config_live"
  | "list_shopify_metafield_definitions";

async function callProxy<T>(action: ProxyAction, data: Record<string, unknown>) {
  const { data: response, error } = await supabase.functions.invoke("shopify-admin-proxy", {
    body: { action, data },
  });
  if (error) {
    throw new Error(error.message || "Errore chiamata proxy");
  }
  return response as T;
}

export interface MetafieldDetail {
  key: string;
  namespace: string;
  status: "sent" | "skipped" | "failed";
  error?: string;
  attempts?: number;
  type?: string;
  liveTypeUsed?: string;
}
export interface MetafieldDebugEntry {
  chunkIndex: number;
  attempt: number;
  request: unknown;
  response: unknown;
  errorMessage?: string;
  liveDefinitions?: MetafieldDefinitionLive[];
}
export interface MetafieldsReport {
  written: number;
  skipped: number;
  errors: string[];
  details: MetafieldDetail[];
  debug?: MetafieldDebugEntry[];
}
export interface MetafieldConfigField {
  key: string;
  namespace: string;
  type: string;
  fullKey: string;
  liveType?: string;
  effectiveType?: string;
}
export interface MetafieldConfig {
  namespace: string;
  maxRetries: number;
  fields: MetafieldConfigField[];
}
export interface MetafieldDefinitionLive {
  id: string;
  name: string;
  namespace: string;
  key: string;
  type: string;
  description?: string;
  fullKey: string;
}
export interface MetafieldDefinitionDiff extends MetafieldConfigField {
  status: "ok" | "missing" | "type_mismatch";
  liveType?: string;
}

export async function getMetafieldConfig() {
  return callProxy<MetafieldConfig>("get_metafield_config", {});
}

export async function getMetafieldConfigLive() {
  return callProxy<MetafieldConfig & { definitions: MetafieldDefinitionLive[] }>("get_metafield_config_live", {});
}

export async function listShopifyMetafieldDefinitions() {
  return callProxy<{ definitions: MetafieldDefinitionLive[]; diff: MetafieldDefinitionDiff[] }>(
    "list_shopify_metafield_definitions",
    {},
  );
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
  debug?: boolean;
  retries?: number;
}) {
  return callProxy<{ success: boolean; id: number; metafields?: MetafieldsReport }>(
    "update_product",
    {
      id: params.productId,
      body_html: params.bodyHtml,
      metafields_global_title_tag: params.seoTitle ?? "",
      metafields_global_description_tag: params.seoDescription ?? "",
      metafields: params.metafields ?? {},
      debug: !!params.debug,
      ...(typeof params.retries === "number" ? { retries: params.retries } : {}),
    },
  );
}

/**
 * Downloads a Shopify-native importable CSV including variants, multi-images
 * and the 16 custom.* metafields. Works as a stable fallback when direct
 * Shopify API publish is not desirable.
 */
export async function downloadShopifyNativeCsv(opts?: {
  onlyComplete?: boolean;
  status?: "draft" | "active";
}) {
  const onlyComplete = opts?.onlyComplete !== false;
  const status = opts?.status === "active" ? "active" : "draft";
  const projectId = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID as string | undefined;
  if (!projectId) throw new Error("VITE_SUPABASE_PROJECT_ID non configurato");
  const url = `https://${projectId}.supabase.co/functions/v1/export-shopify-native-csv?only_complete=${onlyComplete ? 1 : 0}&status=${status}`;
  const anonKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  const res = await fetch(url, {
    method: "GET",
    headers: anonKey
      ? { Authorization: `Bearer ${anonKey}`, apikey: anonKey }
      : {},
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Export CSV fallito (${res.status}): ${text.slice(0, 200)}`);
  }
  const totalProducts = res.headers.get("X-Total-Products");
  const totalVariants = res.headers.get("X-Total-Variants");
  const blob = await res.blob();
  const today = new Date().toISOString().slice(0, 10);
  const filename = `shopify-products-native-${today}.csv`;
  const dlUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = dlUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(dlUrl);
  return {
    filename,
    totalProducts: totalProducts ? Number(totalProducts) : null,
    totalVariants: totalVariants ? Number(totalVariants) : null,
  };
}

// ── Enrichment Run persistence ──────────────────────────────────────────────

export interface EnrichmentRunRow {
  id: string;
  initiated_by: string;
  status: "running" | "paused" | "completed" | "aborted";
  mode: string;
  total: number;
  done: number;
  failed: number;
  notes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
export interface EnrichmentRunItemRow {
  id: string;
  run_id: string;
  sku: string;
  handle: string | null;
  title: string | null;
  status: "pending" | "done" | "error";
  error_message: string | null;
  metafields_report: MetafieldsReport | null;
  updated_at: string;
}

async function callRun<T>(action: string, data: Record<string, unknown> = {}) {
  const { data: response, error } = await supabase.functions.invoke("enrichment-run", {
    body: { action, data },
  });
  if (error) throw new Error(error.message || "Errore enrichment-run");
  return response as T;
}

export async function startEnrichmentRun(params: {
  items: Array<{ sku: string; handle?: string; title?: string }>;
  mode: "generate" | "generate_and_publish";
  notes?: Record<string, unknown>;
}) {
  return callRun<{ runId: string; total: number }>("start", params);
}

export async function updateEnrichmentItem(params: {
  runId: string;
  sku: string;
  status: "pending" | "done" | "error";
  error?: string | null;
  metafieldsReport?: MetafieldsReport | null;
}) {
  return callRun<{ ok: boolean; done: number; failed: number }>("update_item", params);
}

export async function finishEnrichmentRun(params: {
  runId: string;
  status: "completed" | "aborted" | "paused";
}) {
  return callRun<{ ok: boolean }>("finish", params);
}

export async function getOpenEnrichmentRun() {
  return callRun<{ run: EnrichmentRunRow | null; items: EnrichmentRunItemRow[] }>(
    "get_open_run",
    {},
  );
}

export interface CatalogStatusTotals {
  total: number;
  withImage: number;
  withPriceAndImage: number;
  aiEnriched: number;
  seoComplete: number;
  metafieldsComplete: number;
}
export async function getEnrichmentCatalogStatus() {
  return callRun<{ totals: CatalogStatusTotals; minMetafieldsFilled: number }>(
    "get_catalog_status",
    {},
  );
}



