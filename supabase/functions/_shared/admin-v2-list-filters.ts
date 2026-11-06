import type { CurrentValueRow, ListProductsFilters } from "./admin-v2-types.ts";

/** Same effective values as the product summary; evaluated before pagination. */
export function matchesProductFilters(
  product: { sku: string },
  values: Pick<CurrentValueRow, "field_key" | "value_text" | "review_status" | "publish_blocked">[],
  req: ListProductsFilters,
): boolean {
  const get = (key: string) => values.find(v => v.field_key === key)?.value_text;
  const contains = (value: string | null | undefined, term: string) =>
    (value ?? "").toLocaleLowerCase("it").includes(term.trim().toLocaleLowerCase("it"));
  if (req.search?.trim() && ![get("title"), product.sku, get("gtin")].some(v => contains(v, req.search!))) return false;
  if (req.gtin?.trim() && !contains(get("gtin"), req.gtin)) return false;
  const category = get("category_effective") ?? get("product_category_raw") ?? "";
  if (req.category?.trim() && !contains(category, req.category)) return false;
  if (req.needsClassification && category) return false;
  const complete = Boolean(get("title") && get("description"));
  if (req.completeness === "complete" && !complete) return false;
  if (req.completeness === "incomplete" && complete) return false;
  const synced = ["synced", "pending", "error"].includes(get("shopify_sync_status") ?? "");
  if (req.origin === "shopify" && !synced) return false;
  if (req.origin === "import" && synced) return false;
  if (req.reviewRequired && !values.some(v => ["review_required", "legacy_unverified"].includes(v.review_status ?? ""))) return false;
  if (req.publishBlocked && !values.some(v => v.publish_blocked)) return false;
  return true;
}
