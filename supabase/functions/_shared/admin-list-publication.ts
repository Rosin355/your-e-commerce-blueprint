// A single read of the current page's mapped Shopify identities. No SKU inference.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { shopifyAdminGraphQLAtVersion } from "./shopify-admin-client.ts";
import { HEADLESS_PUBLICATION_ID } from "./admin-catalog-commerce.ts";

type Product = { id: string; sku: string };
type LiveNode = { id: string; status: string; publishedOnPublication: boolean };
type State =
  | "local_draft"
  | "shopify_draft"
  | "published"
  | "unlisted"
  | "off_channel"
  | "archived";
function productGid(value: unknown) {
  const match = /^(?:gid:\/\/shopify\/Product\/)?([1-9][0-9]*)$/.exec(
    String(value ?? ""),
  );
  return match ? "gid://shopify/Product/" + match[1] : null;
}

export async function listPublicationStates(
  db: SupabaseClient,
  products: Product[],
  graphql = shopifyAdminGraphQLAtVersion,
): Promise<Map<string, State>> {
  const states = new Map<string, State>();
  if (!products.length) return states;
  const ids = products.map((p) => p.id);
  const [links, legacy, drafts] = await Promise.all([
    db.from("admin_product_shopify_links").select(
      "product_id,shopify_product_gid",
    ).in("product_id", ids),
    db.from("product_sync_csv_products").select("sku,shopify_product_id").in(
      "sku",
      products.map((p) => p.sku),
    ),
    db.from("admin_product_operations").select("product_id,state").in(
      "product_id",
      ids,
    ),
  ]);
  if (links.error || legacy.error || drafts.error) return states;
  const byProduct = new Map<string, string>();
  for (const product of products) {
    const raw = [
      links.data?.find((row) => row.product_id === product.id)
        ?.shopify_product_gid,
      legacy.data?.find((row) => row.sku === product.sku)?.shopify_product_id,
    ].filter((v) => v != null);
    const exact = new Set(raw.map(productGid));
    const operations = drafts.data?.filter((row) =>
      row.product_id === product.id
    ) ?? [];
    if (
      !raw.length && operations.length > 0 &&
      operations.every((row) => row.state === "LOCAL_DRAFT")
    ) {
      states.set(product.id, "local_draft");
    } else if (exact.size === 1 && !exact.has(null)) {
      byProduct.set(product.id, productGid(raw[0])!);
    }
  }
  if (!byProduct.size) return states;
  let nodes: (LiveNode | null)[];
  try {
    const result = await graphql<{ nodes: (LiveNode | null)[] }>(
      "2026-10",
      "query AdminListPublication($ids:[ID!]!,$channel:ID!){nodes(ids:$ids){... on Product{id status publishedOnPublication(publicationId:$channel)}}}",
      {
        ids: [...new Set(byProduct.values())],
        channel: HEADLESS_PUBLICATION_ID,
      },
    );
    nodes = Array.isArray(result.nodes) ? result.nodes : [];
  } catch {
    return states;
  }
  for (const [id, gid] of byProduct) {
    const node = nodes.find((n) => n?.id === gid);
    if (node?.status === "DRAFT") states.set(id, "shopify_draft");
    if (node?.status === "ARCHIVED") states.set(id, "archived");
    if (
      node && ["ACTIVE", "UNLISTED"].includes(node.status) &&
      typeof node.publishedOnPublication === "boolean"
    ) {
      states.set(
        id,
        node.publishedOnPublication
          ? (node.status === "ACTIVE" ? "published" : "unlisted")
          : "off_channel",
      );
    }
  }
  return states;
}
