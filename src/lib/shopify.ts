import { toast } from "sonner";

export const SHOPIFY_API_VERSION = '2025-07';
export const SHOPIFY_STORE_PERMANENT_DOMAIN = 'ecom-blueprint-gen-6ud1s.myshopify.com';
export const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
export const SHOPIFY_STOREFRONT_TOKEN = '713f230dc12508e20c6128d287808360';

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
    shortIntro?: { value: string; type?: string } | null;
    specialBullets?: { value: string; type?: string } | null;
    keyFeatures?: { value: string; type?: string } | null;
    careInfo?: { value: string; type?: string } | null;
    promoText?: { value: string; type?: string } | null;
    cultivationDifficulty?: { value: string; type?: string } | null;
    originsHabitat?: { value: string; type?: string } | null;
    botanicalName?: { value: string; type?: string } | null;
    commonName?: { value: string; type?: string } | null;
    productAttributes?: { value: string; type?: string } | null;
    floweringPeriod?: { value: string; type?: string } | null;
    pruningPeriod?: { value: string; type?: string } | null;
    plantingPeriod?: { value: string; type?: string } | null;
    harvestPeriod?: { value: string; type?: string } | null;
    plantKnowledge?: { value: string; type?: string } | null;
    careGuide?: { value: string; type?: string } | null;
    faqTitle?: { value: string; type?: string } | null;
    faqItems?: { value: string; type?: string } | null;
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
    body: JSON.stringify({ query, variables }),
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
    const sfData = await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, { first, query: _query });
    return sfData?.data?.products?.edges || [];
  } catch (error) {
    console.error('Errore nel recupero dei prodotti:', error);
    throw error;
  }
}
