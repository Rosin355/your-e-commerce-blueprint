import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { shopifyAdminGraphQLAtVersion } from "./shopify-admin-client.ts";
import { OperationalError } from "./admin-operational-core.ts";
import {
  type ShopifyGraphQL,
  toProductGid,
} from "./admin-v2-shopify-field-sync.ts";

type Member = { sku: string; product: { id: string } | null };
const denied = () =>
  new OperationalError(
    "VALIDATION_ERROR",
    "Collegamento SKU/ID incompleto o ambiguo. Verifica il prodotto padre e i suoi SKU in Shopify prima di inviare.",
  );

export function verifyFamilyMembers(
  skus: string[],
  productId: string,
  found: Member[],
) {
  if (
    !skus.length || new Set(skus).size !== skus.length || !skus.every((sku) => {
      const matches = found.filter((row) => row.sku === sku);
      return matches.length === 1 && matches[0].product?.id === productId;
    })
  ) throw denied();
}

export async function verifyCatalogIdentity(
  db: SupabaseClient,
  product: { id: string; sku: string; entity_type: string },
  remoteId: string,
  graphql: ShopifyGraphQL = (q, vars) =>
    shopifyAdminGraphQLAtVersion("2026-10", q, vars, true),
) {
  let skus = [product.sku];
  if (product.entity_type === "variable") {
    const children = await db.from("products").select("sku").eq(
      "parent_product_id",
      product.id,
    ).limit(101);
    if (
      children.error || !children.data?.length || children.data.length > 100
    ) throw denied();
    skus = children.data.map((row) => row.sku);
  }
  const id = toProductGid(remoteId);
  for (let start = 0; start < skus.length; start += 15) {
    const batch = skus.slice(start, start + 15);
    const quote = (sku: string) => '"' + sku.replace(/["\\]/g, "\\$&") + '"';
    const { productVariants } = await graphql<
      {
        productVariants: {
          nodes: Member[];
          pageInfo: { hasNextPage: boolean };
        };
      }
    >(
      "query AdminFamilyIdentity($query:String!){productVariants(first:100,query:$query){nodes{sku product{id}} pageInfo{hasNextPage}}}",
      { query: batch.map((sku) => "sku:" + quote(sku)).join(" OR ") },
    );
    if (!productVariants || productVariants.pageInfo?.hasNextPage !== false) {
      throw denied();
    }
    verifyFamilyMembers(batch, id, productVariants.nodes);
  }
  return skus;
}
