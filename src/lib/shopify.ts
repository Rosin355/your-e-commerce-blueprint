import { toast } from "sonner";

export const SHOPIFY_API_VERSION = '2025-07';
export const SHOPIFY_STORE_PERMANENT_DOMAIN = 'lovable-project-6tknn.myshopify.com';
export const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
export const SHOPIFY_STOREFRONT_TOKEN = '1d883bcf6107ac5e5389c7914625e55e';

export interface ShopifyProduct {
  node: {
    id: string;
    title: string;
    description: string;
    handle: string;
    priceRange: {
      minVariantPrice: {
        amount: string;
        currencyCode: string;
      };
    };
    images: {
      edges: Array<{
        node: {
          url: string;
          altText: string | null;
        };
      }>;
    };
    variants: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          price: {
            amount: string;
            currencyCode: string;
          };
          availableForSale: boolean;
          selectedOptions: Array<{
            name: string;
            value: string;
          }>;
        };
      }>;
    };
    options: Array<{
      name: string;
      values: string[];
    }>;
  };
}

export const STOREFRONT_PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $query: String) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          description
          handle
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
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
                price {
                  amount
                  currencyCode
                }
                availableForSale
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
        }
      }
    }
  }
`;

export const CART_CREATE_MUTATION = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        totalQuantity
        cost {
          totalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    title
                    handle
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export async function storefrontApiRequest(query: string, variables: any = {}) {
  const response = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (response.status === 402) {
    toast.error("Shopify: Pagamento richiesto", {
      description: "L'accesso alle API Shopify richiede un piano di fatturazione attivo. Visita il tuo admin Shopify per aggiornare.",
    });
    return;
  }

  if (!response.ok) {
    throw new Error(`Errore HTTP! status: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`Errore chiamata Shopify: ${data.errors.map((e: any) => e.message).join(', ')}`);
  }

  return data;
}

export async function fetchProducts(first: number = 20, _query?: string): Promise<ShopifyProduct[]> {
  try {
    // Primary: Admin API via edge function
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.functions.invoke("get-products", {
      body: null,
      headers: { "Content-Type": "application/json" },
      method: "GET",
    });

    if (error) throw new Error(error.message || "Edge function error");
    if (data?.error) throw new Error(data.error);
    if (data?.products?.length > 0) return data.products as ShopifyProduct[];

    // Fallback: Storefront API
    console.warn("Admin API returned no products, falling back to Storefront API");
    const sfData = await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, { first, query: _query });
    return sfData?.data?.products?.edges || [];
  } catch (error) {
    console.error('Errore nel recupero dei prodotti:', error);
    // Fallback: Storefront API
    try {
      const sfData = await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, { first, query: _query });
      return sfData?.data?.products?.edges || [];
    } catch (fallbackError) {
      console.error('Fallback Storefront API failed:', fallbackError);
      throw error; // Re-throw original error
    }
  }
}
