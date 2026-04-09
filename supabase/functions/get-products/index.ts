import { shopifyAdminGraphQL, jsonResponse, corsHeaders } from "../_shared/shopify-admin-client.ts";

const PRODUCTS_QUERY = `
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const first = Math.min(parseInt(url.searchParams.get("first") || "20", 10), 50);

    const data = await shopifyAdminGraphQL<{
      products: { edges: Array<{ node: any }> };
    }>(PRODUCTS_QUERY, { first });

    // Map to clean storefront-compatible format
    const products = data.products.edges.map(({ node }: any) => ({
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
    }));

    return jsonResponse({ products });
  } catch (err) {
    console.error("[get-products]", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
