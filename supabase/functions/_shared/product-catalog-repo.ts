import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import type { CsvProductRow } from "./product-sync-types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInt(value: unknown): number | null {
  const parsed = toNumber(value);
  if (parsed === null) return null;
  return Math.round(parsed);
}

function safeText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => String(tag || "").trim())
    .filter(Boolean)
    .slice(0, 100);
}

function normalizeImages(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  return urls
    .map((url) => String(url || "").trim())
    .filter((url) => /^https?:\/\//i.test(url))
    .slice(0, 20);
}

export async function upsertCsvCatalogRows(rows: CsvProductRow[], sourceFile: string): Promise<number> {
  if (!rows.length) return 0;
  const client = getAdminClient();

  const payload: Array<Record<string, unknown>> = [];
  const importedAt = new Date().toISOString();

  for (const row of rows) {
    const sku = String(row.sku || "").trim();
    if (!sku) continue;

    payload.push({
      sku,
      title: safeText(row.title),
      description: safeText(row.description),
      short_description: safeText(row.shortDescription),
      handle: safeText(row.handle),
      vendor: safeText(row.vendor),
      product_type: safeText(row.productType),
      parent_sku: safeText(row.parentSku),
      price: toNumber(row.price),
      compare_at_price: toNumber(row.compareAtPrice),
      barcode: safeText(row.barcode),
      weight_grams: toInt(row.weight),
      inventory_quantity: toInt(row.inventoryQuantity),
      tags: normalizeTags(row.tags),
      product_category: safeText(row.productCategory),
      product_category_id: safeText(row.productCategoryId),
      image_urls: normalizeImages(row.imageUrls),
      metafields: row.metafields ?? {},
      source_file: safeText(sourceFile),
      imported_at: importedAt,
    });
  }

  if (!payload.length) return 0;

  const { error } = await client
    .from("product_sync_csv_products")
    .upsert(payload, {
      onConflict: "sku",
      ignoreDuplicates: false,
    });

  if (error) {
    throw new Error(`Errore salvataggio catalogo CSV: ${error.message}`);
  }

  return payload.length;
}

export async function getCatalogDashboard(limit = 20): Promise<{
  totalProducts: number;
  lastImportAt: string | null;
  sourceFiles: string[];
  preview: Array<{
    sku: string;
    title: string | null;
    price: number | null;
    inventory_quantity: number | null;
    source_file: string | null;
    imported_at: string;
  }>;
}> {
  const client = getAdminClient();
  const cappedLimit = Math.max(1, Math.min(Number(limit || 20), 100));

  const [{ count, error: countError }, { data, error: rowsError }, { data: lastRow, error: lastError }, { data: sourceRows, error: sourceError }] = await Promise.all([
    client.from("product_sync_csv_products").select("sku", { count: "exact", head: true }),
    client
      .from("product_sync_csv_products")
      .select("sku,title,price,inventory_quantity,source_file,imported_at")
      .order("imported_at", { ascending: false })
      .limit(cappedLimit),
    client
      .from("product_sync_csv_products")
      .select("imported_at")
      .order("imported_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("product_sync_csv_products")
      .select("source_file")
      .order("imported_at", { ascending: false })
      .limit(200),
  ]);

  if (countError || rowsError || lastError || sourceError) {
    throw new Error(
      countError?.message ||
      rowsError?.message ||
      lastError?.message ||
      sourceError?.message ||
      "Errore lettura dashboard catalogo",
    );
  }

  const sourceSet = new Set<string>();
  for (const row of sourceRows || []) {
    const source = String(row.source_file || "").trim();
    if (source) sourceSet.add(source);
    if (sourceSet.size >= 10) break;
  }

  return {
    totalProducts: Number(count || 0),
    lastImportAt: lastRow?.imported_at || null,
    sourceFiles: Array.from(sourceSet),
    preview: (data || []).map((row) => ({
      sku: String(row.sku || ""),
      title: row.title ?? null,
      price: row.price === null || row.price === undefined ? null : Number(row.price),
      inventory_quantity: row.inventory_quantity === null || row.inventory_quantity === undefined ? null : Number(row.inventory_quantity),
      source_file: row.source_file ?? null,
      imported_at: String(row.imported_at),
    })),
  };
}

export async function getUnenrichedCount(): Promise<number> {
  const client = getAdminClient();
  const { count, error } = await client
    .from("product_sync_csv_products")
    .select("sku", { count: "exact", head: true })
    .is("ai_enriched_at", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getUnenrichedBatch(batchSize: number): Promise<Array<Record<string, unknown>>> {
  const client = getAdminClient();
  const { data, error } = await client
    .from("product_sync_csv_products")
    .select("sku,title,description,short_description,product_category,tags,metafields,vendor,image_urls")
    .is("ai_enriched_at", null)
    .order("sku")
    .limit(batchSize);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveEnrichment(
  sku: string,
  seoTitle: string,
  seoDescription: string,
  optimizedDescription: string,
  fullJson: Record<string, unknown>,
): Promise<void> {
  const client = getAdminClient();
  const { error } = await client
    .from("product_sync_csv_products")
    .update({
      seo_title: seoTitle,
      seo_description: seoDescription,
      optimized_description: optimizedDescription,
      ai_enrichment_json: fullJson,
      ai_enriched_at: new Date().toISOString(),
    })
    .eq("sku", sku);

  if (error) throw new Error(`Errore salvataggio AI per SKU ${sku}: ${error.message}`);
}
