/**
 * Centralized Shopify Admin API client.
 * All Admin API calls go through this module.
 * Uses static env vars: SHOPIFY_ADMIN_SHOP, SHOPIFY_ADMIN_ACCESS_TOKEN, SHOPIFY_ADMIN_API_VERSION
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export { corsHeaders };

export interface ShopifyAdminConfig {
  shop: string;
  accessToken: string;
  apiVersion: string;
}

export function getShopifyConfig(): ShopifyAdminConfig {
  const shop = Deno.env.get("SHOPIFY_ADMIN_SHOP") || Deno.env.get("SHOPIFY_STORE") || "";
  const accessToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN") || Deno.env.get("SHOPIFY_ACCESS_TOKEN") || "";
  const apiVersion = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") || Deno.env.get("SHOPIFY_API_VERSION") || "2025-01";

  if (!shop) throw new Error("SHOPIFY_ADMIN_SHOP non configurato");
  if (!accessToken) throw new Error("SHOPIFY_ADMIN_ACCESS_TOKEN non configurato");

  return { shop, accessToken, apiVersion };
}

function adminUrl(config: ShopifyAdminConfig, path: string): string {
  return `https://${config.shop}/admin/api/${config.apiVersion}/${path}`;
}

function graphqlUrl(config: ShopifyAdminConfig): string {
  return `https://${config.shop}/admin/api/${config.apiVersion}/graphql.json`;
}

/**
 * REST Admin API fetch with retry on 429.
 */
export async function shopifyAdminFetch(
  path: string,
  method: string,
  body?: unknown,
  config?: ShopifyAdminConfig,
): Promise<any> {
  const cfg = config || getShopifyConfig();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": cfg.accessToken,
  };
  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  let response = await fetch(adminUrl(cfg, path), opts);
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get("Retry-After") || "2", 10);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    response = await fetch(adminUrl(cfg, path), opts);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(JSON.stringify(data.errors || data));
  }
  return data;
}

/**
 * GraphQL Admin API request with retry on 429.
 */
export async function shopifyAdminGraphQL<T = any>(
  query: string,
  variables: Record<string, unknown> = {},
  config?: ShopifyAdminConfig,
): Promise<T> {
  const cfg = config || getShopifyConfig();
  const url = graphqlUrl(cfg);
  let attempts = 0;

  while (attempts < 3) {
    attempts += 1;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": cfg.accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After") || "1");
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
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

/**
 * JSON response helper.
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
