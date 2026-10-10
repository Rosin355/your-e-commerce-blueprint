import { toast } from "sonner";

// Storefront config is env-driven via Vite (VITE_*). These are PUBLIC values by design:
// the Storefront API token is a public access token meant to ship in the browser bundle.
// Fallbacks keep the Lovable preview working when env vars are not yet configured.
// NOTE: Shopify deprecates Storefront API versions ~12 months after release. Keep
// VITE_SHOPIFY_STOREFRONT_API_VERSION current; verify GraphQL fields before bumping to 2026-04.
export const SHOPIFY_API_VERSION =
  import.meta.env.VITE_SHOPIFY_STOREFRONT_API_VERSION || '2025-07';
export const SHOPIFY_STORE_PERMANENT_DOMAIN =
  import.meta.env.VITE_SHOPIFY_STORE_PERMANENT_DOMAIN || 'ecom-blueprint-gen-6ud1s.myshopify.com';
export const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
export const SHOPIFY_STOREFRONT_TOKEN =
  import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN || 'cb09ae53041b30962a9358fd3dac7a5d';

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
    /** Shopify product type — rose detection (PDP) e ricerca catalogo. */
    productType?: string | null;
    /** Tag prodotto — rose detection (PDP) e ricerca catalogo. */
    tags?: string[] | null;
    /** Vendor — usato dalla ricerca catalogo. */
    vendor?: string | null;
    /** Metadati pubblici Storefront usati per ordinamento e discovery deterministica. */
    availableForSale?: boolean;
    publishedAt?: string | null;
    collections?: {
      edges: Array<{
        node: {
          handle: string;
          title: string;
        };
      }>;
    };
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
    /** custom.ibridatore — mostrato solo per le rose */
    hybridizer?: { value: string; type?: string } | null;
    /** custom.colore_fiore */
    flowerColor?: { value: string; type?: string } | null;
    /** custom.colore_foglia */
    leafColor?: { value: string; type?: string } | null;
    /** custom.curiosita — sostituisce "Spedizione e resi" quando valorizzato */
    curiosity?: { value: string; type?: string } | null;
  };
}

export const STOREFRONT_PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
    products(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse) {
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
          productType
          tags
          vendor
          availableForSale
          publishedAt
          collections(first: 50) {
            edges {
              node {
                handle
                title
              }
            }
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

export async function storefrontApiRequest(query: string, variables: Record<string, unknown> = {}) {
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
    throw new Error(`Errore chiamata Shopify: ${data.errors.map((error: { message?: string }) => error.message ?? "Errore sconosciuto").join(', ')}`);
  }

  return data;
}

/**
 * Prodotti di test nascosti dalla vetrina (stato Shopify invariato, reversibile).
 * ID Shopify: 15357653156180 (TEST-001), 15357653188948 (TEST-002).
 */
export const HIDDEN_STOREFRONT_PRODUCT_IDS: ReadonlySet<string> = new Set([
  "gid://shopify/Product/15357653156180",
  "gid://shopify/Product/15357653188948",
]);
export const isHiddenStorefrontProduct = (p: { node?: { id?: string } } | null | undefined) =>
  !!p?.node?.id && HIDDEN_STOREFRONT_PRODUCT_IDS.has(p.node.id);
const visibleOnly = <T extends { node?: { id?: string } }>(list: T[]): T[] => list.filter((p) => !isHiddenStorefrontProduct(p));

export async function fetchProducts(
  first: number = 20,
  query?: string,
  options: { sortKey?: "ID" | "CREATED_AT" | "UPDATED_AT" | "TITLE"; reverse?: boolean } = {},
): Promise<ShopifyProduct[]> {
  try {
    const sfData = await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, {
      first,
      query,
      sortKey: options.sortKey ?? "ID",
      reverse: options.reverse ?? false,
    });
    return visibleOnly(sfData?.data?.products?.edges || []);
  } catch (error) {
    console.error('Errore nel recupero dei prodotti:', error);
    throw error;
  }
}

// Variante paginata della query prodotti: stessa selezione campi, con cursore.
const STOREFRONT_PRODUCTS_PAGE_QUERY = STOREFRONT_PRODUCTS_QUERY
  .replace(
    'query GetProducts($first: Int!, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {',
    'query GetProductsPage($first: Int!, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean, $after: String) {',
  )
  .replace(
    'products(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse) {',
    'products(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse, after: $after) { pageInfo { hasNextPage endCursor }',
  );

/**
 * Carica l'intero catalogo paginando a blocchi di 250 (limite Storefront API),
 * fino a `maxTotal` come tetto di sicurezza. Usata dalla pagina "Tutti i prodotti"
 * così la ricerca client-side copre davvero tutto il catalogo (oggi ~460 prodotti).
 */
export async function fetchAllProducts(maxTotal: number = 1000): Promise<ShopifyProduct[]> {
  const all: ShopifyProduct[] = [];
  let after: string | null = null;
  try {
    while (all.length < maxTotal) {
      const pageSize = Math.min(250, maxTotal - all.length);
      const sfData = await storefrontApiRequest(STOREFRONT_PRODUCTS_PAGE_QUERY, {
        first: pageSize,
        after,
        sortKey: "ID",
        reverse: false,
      });
      const conn = sfData?.data?.products;
      if (!conn) break;
      all.push(...visibleOnly((conn.edges || []) as ShopifyProduct[]));
      if (!conn.pageInfo?.hasNextPage || !conn.pageInfo?.endCursor) break;
      after = conn.pageInfo.endCursor;
    }
  } catch (error) {
    console.error('Errore nel recupero del catalogo completo:', error);
    if (all.length === 0) throw error; // fallimento totale → propaga; parziale → restituisci ciò che c'è
  }
  return all;
}

export interface ShopifyCollectionMeta {
  title: string;
  description: string;
  handle: string;
}

export interface CollectionResult {
  collection: ShopifyCollectionMeta | null;
  products: ShopifyProduct[];
}

const COLLECTION_QUERY = `
  query GetCollection($handle: String!, $first: Int!) {
    collection(handle: $handle) {
      title
      description
      handle
      products(first: $first) {
        edges {
          node {
            id
            title
            description
            handle
            priceRange { minVariantPrice { amount currencyCode } }
            images(first: 5) { edges { node { url altText } } }
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
          }
        }
      }
    }
  }
`;

export async function fetchCollectionByHandle(handle: string, first: number = 60): Promise<CollectionResult> {
  try {
    const data = await storefrontApiRequest(COLLECTION_QUERY, { handle, first });
    const col = data?.data?.collection;
    if (!col) return { collection: null, products: [] };
    return {
      collection: { title: col.title, description: col.description || '', handle: col.handle },
      products: visibleOnly(col.products?.edges || []),
    };
  } catch (error) {
    console.error('Errore nel recupero della collezione:', error);
    throw error;
  }
}
