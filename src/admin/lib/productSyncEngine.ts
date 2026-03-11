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
}

const BATCH_SIZE = 200;

function headers(adminEmail: string): Record<string, string> {
  return {
    "x-admin-email": adminEmail,
  };
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
  return String(value || "").split(",").map((tag) => tag.trim()).filter(Boolean);
}

function toImageUrls(value: string | undefined): string[] {
  return String(value || "").split(",").map((url) => url.trim()).filter(Boolean);
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

    parsed.push({
      sku,
      title: pick(mapped, "title", "name"),
      description: pick(mapped, "body_html", "description", "body_(html)"),
      price: pick(mapped, "variant_price", "price", "regular_price"),
      compareAtPrice: pick(mapped, "variant_compare_at_price", "compare_at_price", "sale_price"),
      barcode: pick(mapped, "variant_barcode", "barcode"),
      weight: toFloat(pick(mapped, "variant_grams", "weight", "variant_weight")),
      inventoryQuantity: toInt(pick(mapped, "variant_inventory_qty", "inventory_quantity", "stock")),
      tags: toTags(pick(mapped, "tags")),
      productCategory: pick(mapped, "product_category", "category"),
      productCategoryId: pick(mapped, "product_category_id", "category_gid"),
      imageUrls: toImageUrls(pick(mapped, "image_src", "images")),
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

  if (error) {
    throw new Error(error.message || "Errore avvio sincronizzazione");
  }

  if (!data?.success) {
    throw new Error(data?.error || "Errore avvio job");
  }

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

  if (error) {
    throw new Error(error.message || "Errore processamento batch");
  }

  if (!data?.job) {
    throw new Error(data?.error || "Risposta job non valida");
  }

  return data as ProcessResponse;
}

/** Lightweight GET poll — reads current job state without processing */
export async function pollJobStatus(jobId: string, adminEmail: string): Promise<ProcessResponse> {
  const url = `process-product-sync?job_id=${encodeURIComponent(jobId)}`;
  const { data, error } = await supabase.functions.invoke(url, {
    method: "GET",
    headers: headers(adminEmail),
  });

  if (error) {
    throw new Error(error.message || "Errore polling job");
  }

  if (!data?.job) {
    throw new Error(data?.error || "Risposta job non valida");
  }

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

  if (error) {
    throw new Error(error.message || "Errore caricamento dashboard catalogo");
  }

  const typed = data as DashboardResponse;
  if (!typed?.success || !typed.dashboard) {
    throw new Error(typed?.error || "Risposta dashboard non valida");
  }

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

  if (error) {
    throw new Error(error.message || "Errore upload CSV");
  }

  return storagePath;
}

// ── Batch size export for UI ────────────────────────────────
export { BATCH_SIZE };
