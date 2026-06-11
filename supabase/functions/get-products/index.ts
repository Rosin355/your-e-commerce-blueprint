import { shopifyAdminGraphQL, jsonResponse, corsHeaders } from "../_shared/shopify-admin-client.ts";
import {
  isHeadlessStorefrontConfigured,
  shopifyStorefrontGraphQL,
} from "../_shared/shopify-storefront-server.ts";

const ADMIN_PRODUCTS_QUERY = `
  query GetActiveProducts($first: Int!) {
    products(first: $first, query: "status:active") {
      edges {
        node {
          id
          title
          handle
          descriptionHtml
          description
          images(first: 5) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price
                inventoryQuantity
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
          options {
            name
            values
          }
          priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;

const STOREFRONT_PRODUCTS_QUERY = `
  query GetActiveProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          handle
          description
          images(first: 5) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price { amount currencyCode }
                availableForSale
                selectedOptions { name value }
              }
            }
          }
          options { name values }
          priceRange {
            minVariantPrice { amount currencyCode }
          }
        }
      }
    }
  }
`;

function mapAdminProduct(node: any) {
  return {
    node: {
      id: node.id,
      title: node.title,
      handle: node.handle,
      description: node.description || "",
      priceRange: {
        minVariantPrice: {
          amount: node.priceRangeV2?.minVariantPrice?.amount || "0",
          currencyCode: node.priceRangeV2?.minVariantPrice?.currencyCode || "EUR",
        },
      },
      images: {
        edges: (node.images?.edges || []).map((img: any) => ({
          node: { url: img.node.url, altText: img.node.altText },
        })),
      },
      variants: {
        edges: (node.variants?.edges || []).map((v: any) => ({
          node: {
            id: v.node.id,
            title: v.node.title,
            price: {
              amount: v.node.price || "0",
              currencyCode: node.priceRangeV2?.minVariantPrice?.currencyCode || "EUR",
            },
            availableForSale: (v.node.inventoryQuantity ?? 1) > 0,
            selectedOptions: v.node.selectedOptions || [],
          },
        })),
      },
      options: node.options || [],
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const first = Math.min(parseInt(url.searchParams.get("first") || "20", 10), 50);

    // Try Storefront API first (Headless private token) — more resilient, no admin-token expiry.
    if (isHeadlessStorefrontConfigured()) {
      try {
        const sfData = await shopifyStorefrontGraphQL<{ products: { edges: Array<{ node: any }> } }>(
          STOREFRONT_PRODUCTS_QUERY,
          { first },
        );
        const products = sfData.products.edges; // already in storefront shape
        return jsonResponse({ products });
      } catch (sfErr) {
        console.warn("[get-products] Storefront failed, falling back to Admin:", sfErr);
      }
    }

    const data = await shopifyAdminGraphQL<{
      products: { edges: Array<{ node: any }> };
    }>(ADMIN_PRODUCTS_QUERY, { first });
    const products = data.products.edges.map(({ node }: any) => mapAdminProduct(node));
    return jsonResponse({ products });
  } catch (err) {
    console.error("[get-products]", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
