import { supabase } from "@/integrations/supabase/client";
import type { ProductSyncCatalogDashboard, ProductSyncJob, SyncMode } from "../types/productSync";

interface StartResponse {
  success: boolean;
  job_id: string;
  mode: SyncMode;
  status: string;
  created_at: string;
  error?: string;
}

interface ProcessResponse {
  success: boolean;
  done: boolean;
  error?: string;
  job: ProductSyncJob;
}

interface DashboardResponse {
  success: boolean;
  dashboard?: ProductSyncCatalogDashboard;
  error?: string;
}

interface CsvProductRow {
  sku: string;
  title?: string;
  description?: string;
  price?: string;
  compareAtPrice?: string;
  barcode?: string;
  weight?: number;
  inventoryQuantity?: number;
  tags?: string[];
  productCategory?: string;
  productCategoryId?: string;
  imageUrls?: string[];
  handle?: string;
  shortDescription?: string;
  vendor?: string;
  productType?: string;
  parentSku?: string;
  metafields?: {
    exposure?: string;
    soil?: string;
    watering?: string;
    petSafe?: string;
    heightCm?: string;
  };
}

const BATCH_SIZE = 200;

function headers(adminEmail: string): Record<string, string> {
  return { "x-admin-email": adminEmail };
}

// ── CSV Parser (browser-side) ──────────────────────────────

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch === "\r") {
      continue;
    } else {
      field += ch;
    }
  }

  row.push(field);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}

function normalizeHeader(value: string): string {
  return String(value || "").toLowerCase().trim().replace(/\s+/g, "_");
}

function toFloat(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(String(value).replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(String(value).trim(), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toTags(value: string | undefined): string[] {
  return String(value || "").split(/[,|]/).map((tag) => tag.trim()).filter(Boolean);
}

function toImageUrls(value: string | undefined): string[] {
  return String(value || "").split(/[,|]/).map((url) => url.trim()).filter(Boolean);
}

function pick(row: Record<string, string>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== "") return value;
  }
  return undefined;
}

export function parseShopifyReadyCsv(text: string): CsvProductRow[] {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ""));
  if (!rows.length) return [];

  const csvHeaders = rows[0].map((header) => normalizeHeader(header));
  const dataRows = rows.slice(1);
  const parsed: CsvProductRow[] = [];

  for (const cells of dataRows) {
    const mapped: Record<string, string> = {};
    for (let i = 0; i < csvHeaders.length; i += 1) {
      mapped[csvHeaders[i]] = String(cells[i] || "").trim();
    }

    const sku = pick(mapped, "variant_sku", "sku", "variant_sku_1");
    if (!sku) continue;

    // Weight: WooCommerce uses kg, convert to grams
    let weight = toFloat(pick(mapped, "variant_grams", "weight", "variant_weight", "peso_(kg)"));
    const rawWeightKg = pick(mapped, "peso_(kg)");
    if (rawWeightKg && !pick(mapped, "variant_grams")) {
      const kg = toFloat(rawWeightKg);
      if (kg !== undefined) weight = Math.round(kg * 1000);
    }

    // Metafields from WooCommerce ACF meta columns
    const metaExposure = pick(mapped, "meta:_esposizione_pianta_acf", "meta:_esposizione_pianta", "esposizione");
    const metaSoil = pick(mapped, "meta:_tipo_terreno_acf", "meta:_tipo_terreno", "tipo_terreno");
    const metaWatering = pick(mapped, "meta:_irrigazione_acf", "meta:_irrigazione", "irrigazione");
    const metaPetSafe = pick(mapped, "meta:_tossicita_per_animali_acf", "meta:_tossicita_per_animali", "tossicita");
    const metaHeight = pick(mapped, "meta:_altezza_massima_pianta_acf", "meta:_altezza_massima_pianta", "altezza_massima");

    const hasMetafields = metaExposure || metaSoil || metaWatering || metaPetSafe || metaHeight;

    parsed.push({
      sku,
      title: pick(mapped, "title", "name", "nome"),
      description: pick(mapped, "body_html", "description", "body_(html)", "descrizione"),
      shortDescription: pick(mapped, "short_description", "breve_descrizione"),
      handle: pick(mapped, "handle", "slug", "permalink"),
      vendor: pick(mapped, "vendor", "marchi", "brand"),
      productType: pick(mapped, "type", "tipo"),
      parentSku: pick(mapped, "parent", "genitore", "parent_sku"),
      price: pick(mapped, "variant_price", "price", "regular_price", "prezzo_di_listino", "prezzo_regolare", "prezzo"),
      compareAtPrice: pick(mapped, "variant_compare_at_price", "compare_at_price", "sale_price", "prezzo_in_offerta", "prezzo_di_vendita", "prezzo_scontato"),
      barcode: pick(mapped, "variant_barcode", "barcode", "gtin,_upc,_ean,_o_isbn"),
      weight,
      inventoryQuantity: toInt(pick(mapped, "variant_inventory_qty", "inventory_quantity", "stock", "magazzino")),
      tags: toTags(pick(mapped, "tags", "tag")),
      productCategory: pick(mapped, "product_category", "category", "categorie", "categories"),
      productCategoryId: pick(mapped, "product_category_id", "category_gid"),
      imageUrls: toImageUrls(pick(mapped, "image_src", "images", "immagini", "immagine")),
      metafields: hasMetafields
        ? {
            exposure: metaExposure,
            soil: metaSoil,
            watering: metaWatering,
            petSafe: metaPetSafe,
            heightCm: metaHeight,
          }
        : undefined,
    });
  }

  return parsed;
}

// ── API calls ──────────────────────────────────────────────

export async function startProductSync(mode: SyncMode, adminEmail: string): Promise<StartResponse> {
  const { data, error } = await supabase.functions.invoke("start-product-sync", {
    body: { mode },
    headers: headers(adminEmail),
  });

  if (error) throw new Error(error.message || "Errore avvio sincronizzazione");
  if (!data?.success) throw new Error(data?.error || "Errore avvio job");
  return data as StartResponse;
}

export async function sendBatch(
  jobId: string,
  rows: CsvProductRow[],
  batchIndex: number,
  totalBatches: number,
  totalRows: number,
  adminEmail: string,
  sourceFile = "shopify-ready.csv",
): Promise<ProcessResponse> {
  const { data, error } = await supabase.functions.invoke("process-product-sync", {
    body: {
      job_id: jobId,
      rows,
      batch_index: batchIndex,
      total_batches: totalBatches,
      total_rows: totalRows,
      source_file: sourceFile,
    },
    headers: headers(adminEmail),
  });

  if (error) throw new Error(error.message || "Errore processamento batch");
  if (!data?.job) throw new Error(data?.error || "Risposta job non valida");
  return data as ProcessResponse;
}

/** Lightweight GET poll — reads current job state without processing */
export async function pollJobStatus(jobId: string, adminEmail: string): Promise<ProcessResponse> {
  const url = `process-product-sync?job_id=${encodeURIComponent(jobId)}`;
  const { data, error } = await supabase.functions.invoke(url, {
    method: "GET",
    headers: headers(adminEmail),
  });

  if (error) throw new Error(error.message || "Errore polling job");
  if (!data?.job) throw new Error(data?.error || "Risposta job non valida");
  return {
    success: true,
    done: data.job.status === "completed" || data.job.status === "failed",
    job: data.job,
  } as ProcessResponse;
}

export async function fetchProductSyncDashboard(adminEmail: string, limit = 20): Promise<ProductSyncCatalogDashboard> {
  const { data, error } = await supabase.functions.invoke("get-product-sync-dashboard", {
    body: { limit },
    headers: headers(adminEmail),
  });

  if (error) throw new Error(error.message || "Errore caricamento dashboard catalogo");
  const typed = data as DashboardResponse;
  if (!typed?.success || !typed.dashboard) throw new Error(typed?.error || "Risposta dashboard non valida");
  return typed.dashboard;
}

export async function uploadSyncCsv(file: File, _adminEmail: string): Promise<string> {
  const storagePath = "shopify-ready.csv";
  const { error } = await supabase.storage
    .from("sync")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: "text/csv",
    });

  if (error) throw new Error(error.message || "Errore upload CSV");
  return storagePath;
}

// ── AI Enrichment ──────────────────────────────────────────

export interface AiEnrichResponse {
  success: boolean;
  processed: number;
  remaining: number;
  errors: string[];
  error?: string;
}

export async function runAiEnrichBatch(
  adminEmail: string,
  batchSize = 5,
  seedStyle = "pratico",
): Promise<AiEnrichResponse> {
  const { data, error } = await supabase.functions.invoke("ai-enrich-products", {
    body: { batch_size: batchSize, seed_style: seedStyle },
    headers: headers(adminEmail),
  });

  if (error) throw new Error(error.message || "Errore AI enrichment");
  return data as AiEnrichResponse;
}

export async function getAiEnrichCount(adminEmail: string): Promise<{ total: number; unenriched: number; enrichedWithDifferentStyle?: number }> {
  const { data, error } = await supabase.functions.invoke("ai-enrich-products", {
    body: { count_only: true },
    headers: headers(adminEmail),
  });

  if (error) throw new Error(error.message || "Errore conteggio AI");
  return { total: data.total ?? 0, unenriched: data.unenriched ?? 0 };
}

export async function getStyleConflictCount(adminEmail: string, selectedStyle: string): Promise<number> {
  const { data, error } = await supabase.functions.invoke("ai-enrich-products", {
    body: { count_style_conflict: true, seed_style: selectedStyle },
    headers: headers(adminEmail),
  });

  if (error) throw new Error(error.message || "Errore conteggio stili");
  return data?.conflict_count ?? 0;
}

export async function resetStyleConflicts(adminEmail: string, selectedStyle: string): Promise<number> {
  const { data, error } = await supabase.functions.invoke("ai-enrich-products", {
    body: { reset_style_conflict: true, seed_style: selectedStyle },
    headers: headers(adminEmail),
  });

  if (error) throw new Error(error.message || "Errore reset stili");
  return data?.reset_count ?? 0;
}

// ── Export enriched CSV ─────────────────────────────────────

export async function exportEnrichedCsv(adminEmail: string): Promise<Blob> {
  const { data, error } = await supabase.functions.invoke("export-enriched-csv", {
    body: {},
    headers: headers(adminEmail),
  });

  if (error) throw new Error(error.message || "Errore export CSV");

  if (typeof data === "object" && data?.error) {
    throw new Error(data.error);
  }

  if (typeof data === "string") {
    return new Blob([data], { type: "text/csv;charset=utf-8;" });
  }

  if (data instanceof Blob) return data;

  throw new Error("Formato risposta non valido");
}

// ── Price fix utilities ─────────────────────────────────────

export async function propagateVariantPrices(adminEmail: string): Promise<{ updated: number }> {
  const { data, error } = await supabase.functions.invoke("update-product-prices", {
    body: { action: "propagate_variants" },
    headers: headers(adminEmail),
  });

  if (error) throw new Error(error.message || "Errore propagazione prezzi");
  return { updated: data?.updated ?? 0 };
}

export async function batchUpdatePrices(
  adminEmail: string,
  rows: Array<{ sku: string; price?: string; compareAtPrice?: string }>,
): Promise<{ updated: number }> {
  const { data, error } = await supabase.functions.invoke("update-product-prices", {
    body: { action: "update_prices", rows },
    headers: headers(adminEmail),
  });

  if (error) throw new Error(error.message || "Errore aggiornamento prezzi");
  return { updated: data?.updated ?? 0 };
}

// ── Batch size export for UI ────────────────────────────────
export { BATCH_SIZE };
