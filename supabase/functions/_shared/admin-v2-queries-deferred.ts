import { matchesProductFilters } from "./admin-v2-list-filters.ts";
// F5 — Query di sola lettura. Nessuna tabella o colonna arbitraria dal client.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import type {
  CurrentValueRow,
  FieldDefinition,
  ListProductsRequest,
  SourceSnapshotRow,
} from "./admin-v2-types.ts";
import { normalizePageSize } from "./admin-v2-validation.ts";

const SUMMARY_FIELD_KEYS = [
  "title",
  "description",
  "image_urls",
  "price",
  "category_effective",
  "product_category_raw",
  "shopify_sync_status",
  "gtin",
];

/** Neutralizza i wildcard LIKE mantenendo intatti gli SKU con underscore. */
function escapeLike(raw: string): string {
  return raw.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function getFieldDefinitions(
  db: SupabaseClient,
): Promise<FieldDefinition[]> {
  const { data, error } = await db
    .from("product_field_definitions")
    .select(
      "key,label,field_group,editor_type,data_type,visible,editable,ai_allowed,manual_only,publishable,required,protected_on_reimport,applies_to,sort_order,help_text,validation_rules,shopify_mapping,review_policy",
    )
    .order("field_group")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as FieldDefinition[];
}

export async function getFieldDefinition(
  db: SupabaseClient,
  key: string,
): Promise<FieldDefinition | null> {
  const defs = await getFieldDefinitions(db);
  return defs.find((d) => d.key === key) ?? null;
}

export async function getCurrentValues(
  db: SupabaseClient,
  productIds: string[],
  fieldKeys?: string[],
): Promise<CurrentValueRow[]> {
  if (!productIds.length) return [];
  let q = db
    .from("product_current_values")
    .select(
      "id,product_id,sku,field_key,entity_type,value_text,value_number,value_json,value_origin,origin,review_status,publish_blocked,protected_on_reimport,source_snapshot_id,is_locked,publish_state,shopify_verified_value,shopify_verified_at,shopify_sync_error_code,shopify_sync_error_message,version,updated_at",
    )
    .in("product_id", productIds);
  if (fieldKeys?.length) q = q.in("field_key", fieldKeys);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as CurrentValueRow[];
}

export async function getCurrentValue(
  db: SupabaseClient,
  productId: string,
  fieldKey: string,
): Promise<CurrentValueRow | null> {
  const rows = await getCurrentValues(db, [productId], [fieldKey]);
  return rows[0] ?? null;
}

/** Lista prodotti: keyset stabile su sku, page size limitata. */
export async function listProducts(
  db: SupabaseClient,
  req: ListProductsRequest,
) {
  const pageSize = normalizePageSize(req.pageSize);
  const selected: Array<{ id: string; sku: string; parent_product_id: string | null; entity_type: string; updated_at: string; is_active: boolean }> = [];
  const selectedValues: CurrentValueRow[] = [];
  let after = req.cursor;
  // Read candidate products in stable batches. Filters are evaluated before the
  // page boundary, never on the 25 products already returned to the browser.
  while (selected.length <= pageSize) {
    let pq = db.from("products")
      .select("id,sku,entity_type,parent_product_id,updated_at,is_active")
      .order("sku", { ascending: true }).limit(50);
    if (req.sku?.trim()) pq = pq.ilike("sku", `%${escapeLike(req.sku.trim())}%`);
    if (req.entityType) pq = pq.eq("entity_type", req.entityType);
    if (after) pq = pq.gt("sku", after);
    const { data, error } = await pq;
    if (error) throw error;
    const batch = data ?? [];
    if (!batch.length) break;
    const ids = batch.map((p: { id: string }) => p.id);
    const values: CurrentValueRow[] = [];
    // PostgREST's row ceiling must not silently truncate fields/review flags.
    for (let offset = 0;; offset += 500) {
      const page = await db.from("product_current_values")
        .select("id,product_id,sku,field_key,entity_type,value_text,value_number,value_json,value_origin,origin,review_status,publish_blocked,protected_on_reimport,source_snapshot_id,is_locked,publish_state,shopify_verified_value,shopify_verified_at,shopify_sync_error_code,shopify_sync_error_message,version,updated_at")
        .in("product_id", ids).order("id").range(offset, offset + 499);
      if (page.error) throw page.error;
      values.push(...(page.data ?? []));
      if ((page.data?.length ?? 0) < 500) break;
    }
    for (const product of batch) {
      const current = values.filter(v => v.product_id === product.id);
      if (!matchesProductFilters(product, current, req)) continue;
      selected.push(product);
      selectedValues.push(...current);
      if (selected.length > pageSize) break;
    }
    const lastSku = batch[batch.length - 1].sku;
    if (after && lastSku <= after) throw new Error("CATALOG_CURSOR_INVALID");
    after = lastSku;
    if (batch.length < 50) break;
  }
  const hasMore = selected.length > pageSize;
  const productRows = selected.slice(0, pageSize);
  const ids = new Set(productRows.map(p => p.id));
  return {
    productRows,
    currentValues: selectedValues.filter(v => ids.has(v.product_id)),
    nextCursor: hasMore ? productRows[productRows.length - 1].sku : null,
    items: productRows.map(p => p.id),
  };
}

export async function getProduct(db: SupabaseClient, productId: string) {
  const { data, error } = await db
    .from("products")
    .select(
      "id,sku,entity_type,parent_product_id,legacy_source,is_active,created_at,updated_at",
    )
    .eq("id", productId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getExactShopifyProductMapping(
  db: SupabaseClient,
  sku: string,
) {
  const { data, error } = await db
    .from("product_sync_csv_products")
    .select("sku,shopify_product_id,shopify_sync_status,shopify_synced_at,handle,price,compare_at_price")
    .eq("sku", sku)
    .maybeSingle();
  if (error) throw error;
  // New canonical drafts have an explicit verified link. Legacy mappings remain authoritative
  // for older products; conflicting identities are never silently preferred.
  const { data: canonical, error: canonicalError } = await db.from("products").select("id").eq("sku", sku).maybeSingle();
  if (canonicalError) throw canonicalError;
  if (canonical) {
    const { data: link, error: linkError } = await db.from("admin_product_shopify_links")
      .select("shopify_product_gid,verified_at").eq("product_id", canonical.id).maybeSingle();
    // Additive migration may not yet be deployed. Other errors fail closed.
    if (linkError && !["42P01", "PGRST205"].includes(linkError.code)) throw linkError;
    if (link) {
      if (data?.shopify_product_id && data.shopify_product_id !== link.shopify_product_gid) throw new Error("MAPPING_CONFLICT");
      return { sku, shopify_product_id: link.shopify_product_gid as string, shopify_sync_status: "verified_draft", shopify_synced_at: link.verified_at as string, handle: null, price: null, compare_at_price: null };
    }
  }
  return data as {
    sku: string;
    shopify_product_id: string | null;
    shopify_sync_status: string | null;
    shopify_synced_at: string | null;
    handle?: string | null;
    price: number | null;
    compare_at_price: number | null;
  } | null;
}

/** Baseline immutabile (snapshot sorgente) in sola lettura. */
export async function getSourceBaseline(db: SupabaseClient, productId: string) {
  const { data, error } = await db
    .from("product_source_snapshots")
    .select(
      "id,product_id,batch_id,row_index,sku,parent_sku,row_type,normalized,raw_row,created_at",
    )
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

/** Snapshot puntuali opzionali: nessun errore se source_snapshot_id è NULL. */
export async function getSourceSnapshotsByIds(
  db: SupabaseClient,
  productId: string,
  snapshotIds: string[],
): Promise<SourceSnapshotRow[]> {
  const ids = [...new Set(snapshotIds.filter(Boolean))];
  if (!ids.length) return [];
  const { data, error } = await db
    .from("product_source_snapshots")
    .select("id,product_id,normalized,created_at")
    .eq("product_id", productId)
    .in("id", ids);
  if (error) throw error;
  return (data ?? []) as SourceSnapshotRow[];
}

export async function getProductHistory(
  db: SupabaseClient,
  productId: string,
  limit = 50,
) {
  const { data, error } = await db
    .from("product_field_history")
    .select(
      "id,field_key,change_type,previous_value,new_value,previous_origin,new_origin,previous_review_status,new_review_status,previous_version,new_version,actor,actor_label,created_at",
    )
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 200));
  if (error) throw error;
  return data ?? [];
}

/** Conteggi aggregati per la Dashboard: solo `count`, mai righe complete. */
export async function getDashboardStats(db: SupabaseClient) {
  const queryType = () => db.from("products").select("id", { count: "exact", head: true });
  type CountQuery = ReturnType<typeof queryType>;
  const countProducts = async (filter?: (q: CountQuery) => CountQuery) => {
    let q = db.from("products").select("id", { count: "exact", head: true });
    if (filter) q = filter(q);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  };
  const countValues = async (filter: (q: CountQuery) => CountQuery) => {
    const { count, error } = await filter(
      db.from("product_current_values").select("id", {
        count: "exact",
        head: true,
      }),
    );
    if (error) throw error;
    return count ?? 0;
  };

  const [total, simple, variable, variation] = await Promise.all([
    countProducts(),
    countProducts((q) => q.eq("entity_type", "simple")),
    countProducts((q) => q.eq("entity_type", "variable")),
    countProducts((q) => q.eq("entity_type", "variation")),
  ]);

  const [valuesToReview, blockedValues, classified, described, shopifyErrors] =
    await Promise.all([
      countValues((q) =>
        q.in("review_status", ["review_required", "legacy_unverified"])
      ),
      countValues((q) => q.eq("publish_blocked", true)),
      countValues((q) =>
        q.eq("field_key", "product_category_raw").not("value_text", "is", null)
      ),
      countValues((q) =>
        q.eq("field_key", "description").not("value_text", "is", null)
      ),
      countValues((q) =>
        q.eq("field_key", "shopify_sync_status").eq("value_text", "error")
      ),
    ]);

  const { data: batch } = await db
    .from("product_import_batches")
    .select("file_name,status,total_rows,created_at,applied_at")
    .order("created_at", { ascending: false })
    .limit(1);

  return {
    products: { total, simple, variable, variation },
    values: { toReview: valuesToReview, publishBlocked: blockedValues },
    quality: {
      toClassify: Math.max(total - classified, 0),
      incomplete: Math.max(total - described, 0),
      errors: shopifyErrors,
    },
    lastBaseline: batch?.[0]
      ? {
        label: batch[0].file_name,
        status: batch[0].status,
        rows: batch[0].total_rows,
        createdAt: batch[0].created_at,
        appliedAt: batch[0].applied_at,
      }
      : null,
  };
}
