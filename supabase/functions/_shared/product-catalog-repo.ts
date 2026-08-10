import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import type { CsvProductRow } from "./product-sync-types.ts";
import {
  buildCatalogRowPatch,
  SOURCE_CONTROLLED_COLUMNS,
  type FieldPlan,
} from "./product-catalog-merge.ts";

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

/** Traduce una riga CSV nelle colonne del catalogo, senza applicare default distruttivi. */
function toSourceColumns(row: CsvProductRow): Record<string, unknown> {
  return {
    sku: String(row.sku || "").trim(),
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
    metafields: row.metafields ?? null,
  };
}

export interface UpsertCatalogResult {
  /** Righe scritte (0 in dry-run). */
  written: number;
  /** SKU nuovi creati. */
  created: number;
  /** SKU già esistenti aggiornati. */
  updated: number;
  /** Piano dettagliato delle azioni per campo (popolato solo in dry-run). */
  plan: FieldPlan[];
  dryRun: boolean;
}

/**
 * Importa righe CSV nel catalogo in modo NON DISTRUTTIVO (Fase 0).
 *
 * Prima leggeva la riga sorgente e la scriveva integralmente sopra quella
 * esistente: un CSV privo di metafield azzerava l'oggetto `metafields` in DB,
 * cancellando i campi curati a mano (ibridatore, curiosità, colori) e tutti i
 * metafield editoriali. Stesso rischio per titolo, immagini, tag e prezzi.
 *
 * Ora: si rileggono le righe esistenti e per ogni colonna si scrive il valore
 * sorgente solo quando porta un dato reale, altrimenti si conserva quello in DB.
 * `metafields` viene fuso, mai sostituito, e le chiavi manuali sono intoccabili.
 *
 * Con `dryRun: true` non esegue alcuna scrittura e restituisce solo il piano.
 */
export async function upsertCsvCatalogRows(
  rows: CsvProductRow[],
  sourceFile: string,
  options: { dryRun?: boolean } = {},
): Promise<UpsertCatalogResult> {
  const dryRun = options.dryRun === true;
  const empty: UpsertCatalogResult = { written: 0, created: 0, updated: 0, plan: [], dryRun };
  if (!rows.length) return empty;

  const client = getAdminClient();
  const importedAt = new Date().toISOString();

  const sourceRows = rows
    .map(toSourceColumns)
    .filter((row) => !!row.sku);
  if (!sourceRows.length) return empty;

  // Rilettura delle righe esistenti: indispensabile per non sovrascrivere
  // ciò che la sorgente non contiene.
  const skus = [...new Set(sourceRows.map((r) => String(r.sku)))];
  const existingBySku = new Map<string, Record<string, unknown>>();
  const selectColumns = ["sku", "metafields", ...SOURCE_CONTROLLED_COLUMNS].join(", ");
  for (let i = 0; i < skus.length; i += 500) {
    const chunk = skus.slice(i, i + 500);
    const { data, error } = await client
      .from("product_sync_csv_products")
      .select(selectColumns)
      .in("sku", chunk);
    if (error) {
      throw new Error(`Errore lettura catalogo esistente: ${error.message}`);
    }
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      existingBySku.set(String(row.sku), row);
    }
  }

  const payload: Array<Record<string, unknown>> = [];
  const plan: FieldPlan[] = [];
  let created = 0;
  let updated = 0;

  for (const sourceRow of sourceRows) {
    const existing = existingBySku.get(String(sourceRow.sku)) ?? null;
    const { payload: rowPayload, plan: rowPlan } = buildCatalogRowPatch(sourceRow, existing);
    if (existing) updated++;
    else created++;
    payload.push({ ...rowPayload, source_file: safeText(sourceFile), imported_at: importedAt });
    if (dryRun) plan.push(...rowPlan);
  }

  if (dryRun) {
    return { written: 0, created, updated, plan, dryRun: true };
  }

  const { error } = await client
    .from("product_sync_csv_products")
    .upsert(payload, {
      onConflict: "sku",
      ignoreDuplicates: false,
    });

  if (error) {
    throw new Error(`Errore salvataggio catalogo CSV: ${error.message}`);
  }

  return { written: payload.length, created, updated, plan: [], dryRun: false };
}

export async function getCatalogDashboard(limit = 20): Promise<{
  totalProducts: number;
  missingPriceCount: number;
  missingImageCount: number;
  lastImportAt: string | null;
  sourceFiles: string[];
  preview: Array<{
    sku: string;
    title: string | null;
    price: number | null;
    inventory_quantity: number | null;
    source_file: string | null;
    imported_at: string;
    image_url: string | null;
  }>;
}> {
  const client = getAdminClient();
  const cappedLimit = Math.max(1, Math.min(Number(limit || 20), 100));

  const [{ count, error: countError }, { count: missingPriceCount, error: missingErr }, { count: missingImageCount, error: missingImgErr }, { data, error: rowsError }, { data: lastRow, error: lastError }, { data: sourceRows, error: sourceError }] = await Promise.all([
    client.from("product_sync_csv_products").select("sku", { count: "exact", head: true }),
    client.from("product_sync_csv_products").select("sku", { count: "exact", head: true }).is("price", null),
    client.from("product_sync_csv_products").select("sku", { count: "exact", head: true }).is("parent_sku", null).or("image_urls.is.null,image_urls.eq.[]"),
    client
      .from("product_sync_csv_products")
      .select("sku,title,price,inventory_quantity,source_file,imported_at,image_urls")
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

  if (countError || missingErr || missingImgErr || rowsError || lastError || sourceError) {
    throw new Error(
      countError?.message ||
      missingErr?.message ||
      missingImgErr?.message ||
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
    missingPriceCount: Number(missingPriceCount || 0),
    missingImageCount: Number(missingImageCount || 0),
    lastImportAt: lastRow?.imported_at || null,
    sourceFiles: Array.from(sourceSet),
    preview: (data || []).map((row) => {
      const images = Array.isArray(row.image_urls) ? row.image_urls : [];
      const firstImage = images.length > 0 ? String(images[0]) : null;
      return {
        sku: String(row.sku || ""),
        title: row.title ?? null,
        price: row.price === null || row.price === undefined ? null : Number(row.price),
        inventory_quantity: row.inventory_quantity === null || row.inventory_quantity === undefined ? null : Number(row.inventory_quantity),
        source_file: row.source_file ?? null,
        imported_at: String(row.imported_at),
        image_url: firstImage,
      };
    }),
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
  seedStyle?: string,
): Promise<void> {
  const client = getAdminClient();
  const updatePayload: Record<string, unknown> = {
    seo_title: seoTitle,
    seo_description: seoDescription,
    optimized_description: optimizedDescription,
    ai_enrichment_json: fullJson,
    ai_enriched_at: new Date().toISOString(),
  };
  if (seedStyle) updatePayload.ai_seed_style = seedStyle;

  const { error } = await client
    .from("product_sync_csv_products")
    .update(updatePayload)
    .eq("sku", sku);

  if (error) throw new Error(`Errore salvataggio AI per SKU ${sku}: ${error.message}`);
}

/** Propagate prices from variant children to parent products */
export async function propagateVariantPrices(): Promise<number> {
  const client = getAdminClient();
  
  // Get parent SKUs that have null prices but have children with prices
  const { data: parents, error: parentErr } = await client
    .from("product_sync_csv_products")
    .select("sku")
    .is("price", null)
    .not("sku", "is", null);

  if (parentErr) throw new Error(parentErr.message);
  if (!parents?.length) return 0;

  const parentSkus = parents.map((p) => p.sku);

  // Get children with prices grouped by parent_sku
  const { data: children, error: childErr } = await client
    .from("product_sync_csv_products")
    .select("parent_sku,price")
    .not("parent_sku", "is", null)
    .not("price", "is", null)
    .in("parent_sku", parentSkus);

  if (childErr) throw new Error(childErr.message);
  if (!children?.length) return 0;

  // Group by parent_sku, find min price
  const minPrices = new Map<string, number>();
  for (const child of children) {
    const psku = String(child.parent_sku);
    const price = Number(child.price);
    if (!Number.isFinite(price)) continue;
    const existing = minPrices.get(psku);
    if (existing === undefined || price < existing) {
      minPrices.set(psku, price);
    }
  }

  let updated = 0;
  for (const [parentSku, minPrice] of minPrices) {
    const { error } = await client
      .from("product_sync_csv_products")
      .update({ price: minPrice })
      .eq("sku", parentSku)
      .is("price", null);

    if (!error) updated++;
  }

  return updated;
}

/** Count style conflicts */
export async function countStyleConflicts(selectedStyle: string): Promise<number> {
  const client = getAdminClient();
  const { count, error } = await client
    .from("product_sync_csv_products")
    .select("sku", { count: "exact", head: true })
    .not("ai_enriched_at", "is", null)
    .neq("ai_seed_style", selectedStyle);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Reset enrichment for products with a different style */
export async function resetStyleConflicts(selectedStyle: string): Promise<number> {
  const client = getAdminClient();
  const { data, error } = await client
    .from("product_sync_csv_products")
    .update({ ai_enriched_at: null, ai_seed_style: null })
    .not("ai_enriched_at", "is", null)
    .neq("ai_seed_style", selectedStyle)
    .select("sku");

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}
