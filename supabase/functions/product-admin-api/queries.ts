// F5 — Query di sola lettura. Nessuna tabella o colonna arbitraria dal client.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import type { CurrentValueRow, FieldDefinition, ListProductsRequest } from "./types.ts";
import { normalizePageSize } from "./validation.ts";

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

export async function getFieldDefinitions(db: SupabaseClient): Promise<FieldDefinition[]> {
  const { data, error } = await db
    .from("product_field_definitions")
    .select(
      "key,label,field_group,editor_type,data_type,visible,editable,ai_allowed,manual_only,publishable,required,protected_on_reimport,applies_to,sort_order,help_text,validation_rules,review_policy",
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
      "id,product_id,sku,field_key,entity_type,value_text,value_number,value_json,value_origin,origin,review_status,publish_blocked,protected_on_reimport,is_locked,version,updated_at",
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
export async function listProducts(db: SupabaseClient, req: ListProductsRequest) {
  const pageSize = normalizePageSize(req.pageSize);
  let matchedIds: string[] | null = null;

  const term = (req.search ?? "").trim();
  if (term || req.gtin) {
    const like = `%${escapeLike(req.gtin ?? term)}%`;
    const keys = req.gtin ? ["gtin"] : ["title", "sku", "gtin"];
    const { data, error } = await db
      .from("product_current_values")
      .select("product_id")
      .in("field_key", keys)
      .ilike("value_text", like)
      .limit(500);
    if (error) throw error;
    matchedIds = [...new Set((data ?? []).map((r: { product_id: string }) => r.product_id))];
    if (!matchedIds.length) return { items: [] as string[], nextCursor: null, productRows: [] };
  }

  if (req.reviewRequired || req.publishBlocked) {
    let q = db.from("product_current_values").select("product_id").limit(2000);
    q = req.publishBlocked
      ? q.eq("publish_blocked", true)
      : q.in("review_status", ["review_required", "legacy_unverified"]);
    const { data, error } = await q;
    if (error) throw error;
    const ids = new Set((data ?? []).map((r: { product_id: string }) => r.product_id));
    matchedIds = matchedIds ? matchedIds.filter((id) => ids.has(id)) : [...ids];
    if (!matchedIds.length) return { items: [] as string[], nextCursor: null, productRows: [] };
  }

  let pq = db
    .from("products")
    .select("id,sku,entity_type,parent_product_id,updated_at,is_active")
    .order("sku", { ascending: true })
    .limit(pageSize + 1);

  if (req.sku) pq = pq.ilike("sku", `%${escapeLike(req.sku)}%`);
  if (req.entityType) pq = pq.eq("entity_type", req.entityType);
  if (req.cursor) pq = pq.gt("sku", req.cursor);
  if (matchedIds) pq = pq.in("id", matchedIds.slice(0, 1000));

  const { data, error } = await pq;
  if (error) throw error;

  const rows = data ?? [];
  const hasMore = rows.length > pageSize;
  const page = hasMore ? rows.slice(0, pageSize) : rows;
  return {
    productRows: page,
    nextCursor: hasMore ? page[page.length - 1].sku : null,
    items: page.map((p: { id: string }) => p.id),
  };
}

export async function getProduct(db: SupabaseClient, productId: string) {
  const { data, error } = await db
    .from("products")
    .select("id,sku,entity_type,parent_product_id,legacy_source,is_active,created_at,updated_at")
    .eq("id", productId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Baseline immutabile (snapshot sorgente) in sola lettura. */
export async function getSourceBaseline(db: SupabaseClient, productId: string) {
  const { data, error } = await db
    .from("product_source_snapshots")
    .select("id,batch_id,row_index,sku,parent_sku,row_type,normalized,raw_row,created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getProductHistory(db: SupabaseClient, productId: string, limit = 50) {
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
  const countProducts = async (filter?: (q: any) => any) => {
    let q = db.from("products").select("id", { count: "exact", head: true });
    if (filter) q = filter(q);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  };
  const countValues = async (filter: (q: any) => any) => {
    const { count, error } = await filter(
      db.from("product_current_values").select("id", { count: "exact", head: true }),
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

  const [valuesToReview, blockedValues, classified, described, shopifyErrors] = await Promise.all([
    countValues((q) => q.in("review_status", ["review_required", "legacy_unverified"])),
    countValues((q) => q.eq("publish_blocked", true)),
    countValues((q) => q.eq("field_key", "product_category_raw").not("value_text", "is", null)),
    countValues((q) => q.eq("field_key", "description").not("value_text", "is", null)),
    countValues((q) => q.eq("field_key", "shopify_sync_status").eq("value_text", "error")),
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
