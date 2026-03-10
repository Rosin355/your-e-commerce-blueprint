import type { ShopifyProductSnapshot } from "./product-sync-types.ts";

const SHOPIFY_STORE = Deno.env.get("SHOPIFY_STORE") || "";
const SHOPIFY_API_VERSION = Deno.env.get("SHOPIFY_API_VERSION") || "2025-01";
const SHOPIFY_ACCESS_TOKEN = Deno.env.get("SHOPIFY_ACCESS_TOKEN") || "";

function endpoint(): string {
  if (!SHOPIFY_STORE) throw new Error("SHOPIFY_STORE mancante");
  if (!SHOPIFY_ACCESS_TOKEN) throw new Error("SHOPIFY_ACCESS_TOKEN mancante");
  return `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function shopifyGraphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const url = endpoint();
  let attempts = 0;

  while (attempts < 3) {
    attempts += 1;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After") || "1");
      await sleep(retryAfter * 1000);
      continue;
    }

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(`Shopify HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 600)}`);
    }

    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      throw new Error(`Shopify GraphQL errors: ${payload.errors.map((e: { message: string }) => e.message).join(" | ")}`);
    }

    return payload.data as T;
  }

  throw new Error("Shopify rate limit persistente");
}

const PRODUCT_PAGE_QUERY = `
query ProductPage($first: Int!, $after: String) {
  products(first: $first, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id
      title
      descriptionHtml
      tags
      productCategory {
        productTaxonomyNode { id fullName }
      }
      media(first: 10) {
        nodes {
          ... on MediaImage {
            image { url }
          }
        }
      }
      variants(first: 100) {
        nodes {
          id
          sku
          barcode
          price
          compareAtPrice
          inventoryQuantity
          inventoryItem {
            id
            measurement {
              weight {
                value
                unit
              }
            }
          }
        }
      }
    }
  }
}
`;

const PRODUCTS_COUNT_QUERY = `
query ProductsCount {
  productsCount {
    count
  }
}
`;

const PRODUCT_UPDATE_MUTATION = `
mutation ProductUpdate($product: ProductUpdateInput!) {
  productUpdate(product: $product) {
    product { id }
    userErrors { field message }
  }
}
`;

const VARIANTS_BULK_UPDATE_MUTATION = `
mutation ProductVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    userErrors { field message }
  }
}
`;

const INVENTORY_SET_QUANTITIES_MUTATION = `
mutation InventorySetQuantities($input: InventorySetQuantitiesInput!) {
  inventorySetQuantities(input: $input) {
    userErrors { field message }
  }
}
`;

const PRODUCT_CREATE_MEDIA_MUTATION = `
mutation ProductCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
  productCreateMedia(productId: $productId, media: $media) {
    media { alt }
    mediaUserErrors { field message }
  }
}
`;

const INVENTORY_LOCATION_QUERY = `
query InventoryLocation {
  locations(first: 1) {
    nodes { id }
  }
}
`;

export async function fetchProductsPage(first: number, after: string | null): Promise<{
  products: ShopifyProductSnapshot[];
  hasNextPage: boolean;
  endCursor: string | null;
}> {
  const data = await shopifyGraphql<{
    products: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: Array<Record<string, unknown>>;
    };
  }>(PRODUCT_PAGE_QUERY, { first, after });

  const products = data.products.nodes.map((node: Record<string, unknown>) => {
    const mediaNodes = (node.media as { nodes?: Array<{ image?: { url?: string } }> } | undefined)?.nodes || [];
    const variantNodes = (node.variants as { nodes?: Array<Record<string, unknown>> } | undefined)?.nodes || [];
    const categoryNode = (node.productCategory as { productTaxonomyNode?: { id?: string; fullName?: string } } | undefined)
      ?.productTaxonomyNode;

    return {
      id: String(node.id || ""),
      title: String(node.title || ""),
      descriptionHtml: String(node.descriptionHtml || ""),
      tags: Array.isArray(node.tags) ? (node.tags as string[]) : [],
      productCategoryId: categoryNode?.id || null,
      productCategoryName: categoryNode?.fullName || null,
      mediaImageUrls: mediaNodes
        .map((mediaNode) => String(mediaNode?.image?.url || "").trim())
        .filter(Boolean),
      variants: variantNodes
        .map((variantNode) => {
          const weight = (variantNode.inventoryItem as { measurement?: { weight?: { value?: number; unit?: string } } } | undefined)
            ?.measurement?.weight;
          return {
            id: String(variantNode.id || ""),
            sku: String(variantNode.sku || ""),
            inventoryItemId: String(
              (variantNode.inventoryItem as { id?: string } | undefined)?.id || "",
            ) || null,
            barcode: variantNode.barcode ? String(variantNode.barcode) : null,
            price: variantNode.price ? String(variantNode.price) : null,
            compareAtPrice: variantNode.compareAtPrice ? String(variantNode.compareAtPrice) : null,
            inventoryQuantity: typeof variantNode.inventoryQuantity === "number" ? Number(variantNode.inventoryQuantity) : null,
            weight: typeof weight?.value === "number" ? Number(weight.value) : null,
            weightUnit: weight?.unit || null,
          };
        })
        .filter((variant) => variant.sku),
    } satisfies ShopifyProductSnapshot;
  });

  return {
    products,
    hasNextPage: data.products.pageInfo.hasNextPage,
    endCursor: data.products.pageInfo.endCursor,
  };
}

export async function fetchProductsCount(): Promise<number> {
  const data = await shopifyGraphql<{ productsCount: { count: number } }>(PRODUCTS_COUNT_QUERY, {});
  return Number(data.productsCount?.count || 0);
}

function assertNoUserErrors(
  errors: Array<{ field?: string[]; message: string }> | undefined,
  context: string,
): void {
  if (!errors || errors.length === 0) return;
  throw new Error(`${context}: ${errors.map((entry) => entry.message).join(" | ")}`);
}

export async function updateProduct(productInput: Record<string, unknown>): Promise<void> {
  const data = await shopifyGraphql<{
    productUpdate: {
      userErrors: Array<{ message: string; field?: string[] }>;
    };
  }>(PRODUCT_UPDATE_MUTATION, { product: productInput });

  assertNoUserErrors(data.productUpdate?.userErrors, "productUpdate");
}

export async function updateVariants(productId: string, variants: Array<Record<string, unknown>>): Promise<void> {
  if (variants.length === 0) return;

  const data = await shopifyGraphql<{
    productVariantsBulkUpdate: {
      userErrors: Array<{ message: string; field?: string[] }>;
    };
  }>(VARIANTS_BULK_UPDATE_MUTATION, { productId, variants });

  assertNoUserErrors(data.productVariantsBulkUpdate?.userErrors, "productVariantsBulkUpdate");
}

let cachedLocationId: string | null = null;

async function getLocationId(): Promise<string> {
  if (cachedLocationId) return cachedLocationId;
  const data = await shopifyGraphql<{ locations: { nodes: Array<{ id: string }> } }>(INVENTORY_LOCATION_QUERY, {});
  const locationId = data.locations?.nodes?.[0]?.id;
  if (!locationId) throw new Error("Nessuna location Shopify disponibile");
  cachedLocationId = locationId;
  return locationId;
}

export async function setInventoryQuantity(inventoryItemId: string, quantity: number): Promise<void> {
  const locationId = await getLocationId();
  const data = await shopifyGraphql<{
    inventorySetQuantities: {
      userErrors: Array<{ message: string; field?: string[] }>;
    };
  }>(INVENTORY_SET_QUANTITIES_MUTATION, {
    input: {
      name: "available",
      reason: "correction",
      quantities: [{ inventoryItemId, locationId, quantity }],
    },
  });

  assertNoUserErrors(data.inventorySetQuantities?.userErrors, "inventorySetQuantities");
}

export async function createProductMedia(
  productId: string,
  mediaItems: Array<{ originalSource: string; alt?: string }>,
): Promise<void> {
  if (mediaItems.length === 0) return;

  const media = mediaItems.map((item) => ({
    mediaContentType: "IMAGE",
    originalSource: item.originalSource,
    alt: item.alt || null,
  }));

  const data = await shopifyGraphql<{
    productCreateMedia: {
      mediaUserErrors: Array<{ message: string; field?: string[] }>;
    };
  }>(PRODUCT_CREATE_MEDIA_MUTATION, { productId, media });

  assertNoUserErrors(data.productCreateMedia?.mediaUserErrors, "productCreateMedia");
}
