
// Storefront config is env-driven via Vite (VITE_*). These are PUBLIC values by design:
// the Storefront API token is a public access token meant to ship in the browser bundle.
// Fallbacks keep the Lovable preview working when env vars are not yet configured.
// NOTE: Shopify deprecates Storefront API versions ~12 months after release. Keep
// VITE_SHOPIFY_STOREFRONT_API_VERSION current; verify GraphQL fields before bumping to 2026-04.
export const SHOPIFY_API_VERSION =
  import.meta.env?.VITE_SHOPIFY_STOREFRONT_API_VERSION || '2025-07';
export const SHOPIFY_STORE_PERMANENT_DOMAIN =
  import.meta.env?.VITE_SHOPIFY_STORE_PERMANENT_DOMAIN || 'ecom-blueprint-gen-6ud1s.myshopify.com';
export const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
export const SHOPIFY_STOREFRONT_TOKEN =
  import.meta.env?.VITE_SHOPIFY_STOREFRONT_TOKEN || 'cb09ae53041b30962a9358fd3dac7a5d';

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
    seo?: { title: string | null; description: string | null };
    variants: {
      pageInfo?: { hasNextPage: boolean; endCursor: string | null };
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

/** Complete discovery fields, one card image, no variant previews. Never purchasable directly. */
export interface CatalogProduct {
  node: Omit<ShopifyProduct['node'], 'variants'> & { availableForSale: boolean };
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

export async function storefrontApiRequest(query: string, variables: Record<string, unknown> = {}, signal?: AbortSignal) {
  const response = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN
    },
    body: JSON.stringify({ query, variables }),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`Errore HTTP! status: ${response.status}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(`Errore chiamata Shopify: ${data.errors.map((e: { message: string }) => e.message).join(', ')}`);
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

// Separate selection: homepage/related cards keep their existing richer query.
export const STOREFRONT_CATALOG_PAGE_QUERY = `
  query GetProductsPage($first: Int!, $query: String, $after: String) {
    products(first: $first, query: $query, after: $after, sortKey: ID, reverse: false) {
      pageInfo { hasNextPage endCursor }
      edges { node {
        id title description handle availableForSale
        productType tags vendor publishedAt
        collections(first: 50) { edges { node { handle title } } }
        priceRange { minVariantPrice { amount currencyCode } }
        images(first: 1) { edges { node { url altText } } }
        options { name values }
      } }
    }
  }
`;

/** Reject malformed/repeated cursors rather than returning an incomplete connection. */
export function nextPageCursor(pageInfo: { hasNextPage: boolean; endCursor: string | null }, seen: Set<string>): string | null {
  if (!pageInfo || typeof pageInfo.hasNextPage !== 'boolean') throw new Error('Paginazione Shopify non valida');
  if (!pageInfo.hasNextPage) return null;
  const cursor = pageInfo.endCursor;
  if (!cursor || seen.has(cursor)) throw new Error('Cursore Shopify mancante o ripetuto');
  seen.add(cursor);
  return cursor;
}

/** Exhaust the connection without an application result cap. Filters/sort are local
 * over the COMPLETE response, never over a silently truncated first page.
 */
export async function fetchAllProducts(query?: string, signal?: AbortSignal): Promise<CatalogProduct[]> {
  const products = new Map<string, CatalogProduct>();
  const seen = new Set<string>();
  let after: string | null = null;
  do {
    signal?.throwIfAborted();
    const response = await storefrontApiRequest(STOREFRONT_CATALOG_PAGE_QUERY, { first: 100, after, query }, signal);
    const connection = response?.data?.products;
    if (!Array.isArray(connection?.edges)) throw new Error('Risposta catalogo non valida');
    connection.edges.forEach((product: CatalogProduct) => {
      if (typeof product.node?.availableForSale !== 'boolean') throw new Error('Disponibilità catalogo non valida');
      products.set(product.node.id, product);
    });
    after = nextPageCursor(connection.pageInfo, seen);
  } while (after);
  signal?.throwIfAborted();
  return visibleOnly([...products.values()]);
}

export const PRODUCT_VARIANTS_PAGE_QUERY = `
  query GetProductVariants($id: ID!, $after: String) {
    product(id: $id) {
      id
      variants(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges { node { id title price { amount currencyCode } availableForSale selectedOptions { name value } } }
      }
    }
  }
`;

export async function completeProductVariants(product: ShopifyProduct, signal?: AbortSignal): Promise<ShopifyProduct> {
  const seen = new Set<string>();
  const variants = new Map(product.node.variants.edges.map(edge => [edge.node.id, edge]));
  let after = nextPageCursor(product.node.variants.pageInfo, seen);
  while (after) {
    signal?.throwIfAborted();
    const response = await storefrontApiRequest(PRODUCT_VARIANTS_PAGE_QUERY, { id: product.node.id, after }, signal);
    const page = response?.data?.product;
    if (page?.id !== product.node.id || !Array.isArray(page?.variants?.edges)) throw new Error('Risposta varianti non valida');
    page.variants.edges.forEach((edge: ShopifyProduct['node']['variants']['edges'][number]) => variants.set(edge.node.id, edge));
    after = nextPageCursor(page.variants.pageInfo, seen);
  }
  signal?.throwIfAborted();
  return { node: { ...product.node, variants: { edges: [...variants.values()], pageInfo: { hasNextPage: false, endCursor: null } } } };
}

export interface ShopifyCollectionMeta {
  title: string;
  description: string;
  handle: string;
  seo?: { title: string | null; description: string | null };
}

export interface CollectionResult {
  collection: ShopifyCollectionMeta | null;
  products: ShopifyProduct[];
  nextCursor: string | null;
}

const COLLECTION_QUERY = `
  query GetCollection($handle: String!, $first: Int!, $after: String) {
    collection(handle: $handle) {
      title
      description
      handle
      seo { title description }
      products(first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            availableForSale
            id
            title
            description
            handle
            priceRange { minVariantPrice { amount currencyCode } }
            images(first: 1) { edges { node { url altText } } }
            variants(first: 1) {
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

export async function fetchCollectionByHandle(handle: string, first: number = 60, after: string | null = null, signal?: AbortSignal): Promise<CollectionResult> {
  try {
    const data = await storefrontApiRequest(COLLECTION_QUERY, { handle, first, after }, signal);
    const col = data?.data?.collection;
    if (!col) return { collection: null, products: [], nextCursor: null };
    return {
      collection: { title: col.title, description: col.description || '', handle: col.handle, seo: col.seo },
      products: visibleOnly(col.products?.edges || []),
      nextCursor: nextPageCursor(col.products?.pageInfo, new Set(after ? [after] : [])),
    };
  } catch (error) {
    console.error('Errore nel recupero della collezione:', error);
    throw error;
  }
}
