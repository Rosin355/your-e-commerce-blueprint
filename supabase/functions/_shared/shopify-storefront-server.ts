/**
 * Server-side Storefront API client (Shopify Headless app).
 * Use for READ-ONLY product/collection data — more resilient than Admin API:
 *  - Private token does not expire like Admin online tokens
 *  - Higher rate limits dedicated to headless storefronts
 *  - Read-only scopes by design (safer)
 *
 * Required secret: SHOPIFY_HEADLESS_PRIVATE_TOKEN (Storefront private access token
 * from a Storefront created inside the official "Headless" Shopify app).
 *
 * For writes (create/update product, customer ops, media) keep using shopify-admin-client.ts.
 */

const SHOPIFY_STOREFRONT_API_VERSION = "2025-07";

function getStorefrontConfig() {
  const shop =
    Deno.env.get("SHOPIFY_STORE_PERMANENT_DOMAIN") ||
    Deno.env.get("SHOPIFY_ADMIN_SHOP") ||
    "ecom-blueprint-gen-6ud1s.myshopify.com";
  const token = Deno.env.get("SHOPIFY_HEADLESS_PRIVATE_TOKEN") || "";
  if (!token) {
    throw new Error("SHOPIFY_HEADLESS_PRIVATE_TOKEN non configurato");
  }
  return { shop, token, apiVersion: SHOPIFY_STOREFRONT_API_VERSION };
}

export function isHeadlessStorefrontConfigured(): boolean {
  return !!Deno.env.get("SHOPIFY_HEADLESS_PRIVATE_TOKEN");
}

export async function shopifyStorefrontGraphQL<T = any>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const cfg = getStorefrontConfig();
  const url = `https://${cfg.shop}/api/${cfg.apiVersion}/graphql.json`;

  let attempts = 0;
  while (attempts < 3) {
    attempts += 1;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Private token uses this header (Storefront private access tokens).
        // Public/anon storefront tokens would use X-Shopify-Storefront-Access-Token.
        "Shopify-Storefront-Private-Token": cfg.token,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After") || "1");
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      continue;
    }

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(
        `Shopify Storefront HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 600)}`,
      );
    }
    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      throw new Error(
        `Shopify Storefront GraphQL errors: ${payload.errors
          .map((e: { message: string }) => e.message)
          .join(" | ")}`,
      );
    }
    return payload.data as T;
  }
  throw new Error("Shopify Storefront rate limit persistente");
}

/**
 * List products via Storefront API.
 * Returns the same shape as shopify-admin-proxy's normalizeProduct() so callers don't change.
 *
 * Notes:
 *  - status filter is mapped to Storefront query language: only `active` products are exposed by
 *    Storefront API by default; "draft"/"archived" are NOT visible. If status !== "active",
 *    caller should fall back to Admin API.
 *  - Cursor: Storefront uses `endCursor` from PageInfo, not Admin's Link header `page_info`.
 */
export async function storefrontListProducts(opts: {
  limit?: number;
  status?: string;
  query?: string;
  tag?: string;
  cursor?: string;
}) {
  const limit = Math.max(1, Math.min(opts.limit ?? 50, 250));
  const queryParts: string[] = [];
  if (opts.query) queryParts.push(`title:*${opts.query.replace(/[":]/g, "")}*`);
  if (opts.tag) queryParts.push(`tag:${opts.tag.replace(/[":]/g, "")}`);
  const queryString = queryParts.join(" ").trim() || null;

  const gql = `
    query StorefrontListProducts($first: Int!, $after: String, $query: String) {
      products(first: $first, after: $after, query: $query) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id
            title
            handle
            tags
            updatedAt
            images(first: 5) {
              edges { node { id: url url altText } }
            }
          }
        }
      }
    }
  `;

  const data = await shopifyStorefrontGraphQL<any>(gql, {
    first: limit,
    after: opts.cursor || null,
    query: queryString,
  });

  const products = (data?.products?.edges || []).map(({ node }: any) => ({
    // Storefront returns GID (gid://shopify/Product/123); extract legacy numeric id.
    id: Number(String(node.id).split("/").pop()) || node.id,
    title: node.title,
    handle: node.handle,
    status: "active", // Storefront only exposes active products
    tags: Array.isArray(node.tags) ? node.tags.join(", ") : node.tags || "",
    body_html: "",
    metafields_global_title_tag: "",
    metafields_global_description_tag: "",
    updated_at: node.updatedAt,
    images: (node.images?.edges || []).map((e: any) => ({
      id: e.node.id,
      src: e.node.url,
      alt: e.node.altText || "",
    })),
  }));

  return {
    products,
    hasNextPage: !!data?.products?.pageInfo?.hasNextPage,
    nextPageInfo: data?.products?.pageInfo?.endCursor || "",
  };
}

export async function storefrontGetProductByHandle(handle: string) {
  const gql = `
    query StorefrontGetProduct($handle: String!) {
      product(handle: $handle) {
        id
        title
        handle
        tags
        updatedAt
        descriptionHtml
        seo { title description }
        images(first: 20) {
          edges { node { url altText } }
        }
      }
    }
  `;
  const data = await shopifyStorefrontGraphQL<any>(gql, { handle });
  const node = data?.product;
  if (!node) return { product: null };
  return {
    product: {
      id: Number(String(node.id).split("/").pop()) || node.id,
      title: node.title,
      handle: node.handle,
      status: "active",
      tags: Array.isArray(node.tags) ? node.tags.join(", ") : node.tags || "",
      body_html: node.descriptionHtml || "",
      metafields_global_title_tag: node.seo?.title || "",
      metafields_global_description_tag: node.seo?.description || "",
      updated_at: node.updatedAt,
      images: (node.images?.edges || []).map((e: any, i: number) => ({
        id: i,
        src: e.node.url,
        alt: e.node.altText || "",
      })),
    },
  };
}
