/**
 * Centralized Shopify Admin API client.
 * Reads token from DB (shopify_connections) with fallback to env vars.
 * Auto-retries on 401 by clearing cache and re-fetching config.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  source: "db" | "env";
}

let _cachedConfig: ShopifyAdminConfig | null = null;
let _cacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

/** Clear cached config (useful after connect/disconnect or 401) */
export function clearConfigCache() {
  _cachedConfig = null;
  _cacheTime = 0;
}

/**
 * Get Shopify config: first try DB, then fallback to env vars.
 */
export async function getShopifyConfigAsync(skipCache = false): Promise<ShopifyAdminConfig> {
  if (!skipCache && _cachedConfig && Date.now() - _cacheTime < CACHE_TTL) {
    return _cachedConfig;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (supabaseUrl && serviceKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      });
      const { data } = await supabase
        .from("shopify_connections")
        .select("shop_domain, access_token")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (data?.shop_domain && data?.access_token) {
        const apiVersion = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") || "2025-01";
        _cachedConfig = {
          shop: data.shop_domain,
          accessToken: data.access_token,
          apiVersion,
          source: "db",
        };
        _cacheTime = Date.now();
        return _cachedConfig;
      }
    } catch (e) {
      console.warn("[shopify-admin-client] DB lookup failed, falling back to env:", (e as Error).message);
    }
  }

  // Fallback to env vars
  const shop = Deno.env.get("SHOPIFY_ADMIN_SHOP") || Deno.env.get("SHOPIFY_STORE") || "";
  const accessToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN") || Deno.env.get("SHOPIFY_ACCESS_TOKEN") || "";
  const apiVersion = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") || Deno.env.get("SHOPIFY_API_VERSION") || "2025-01";

  if (!shop) throw new Error("Nessuna connessione Shopify attiva e SHOPIFY_ADMIN_SHOP non configurato");
  if (!accessToken) throw new Error("Nessuna connessione Shopify attiva e SHOPIFY_ADMIN_ACCESS_TOKEN non configurato");

  _cachedConfig = { shop, accessToken, apiVersion, source: "env" };
  _cacheTime = Date.now();
  return _cachedConfig;
}

/** Synchronous fallback for backward compat — tries env vars only */
export function getShopifyConfig(): ShopifyAdminConfig {
  const shop = Deno.env.get("SHOPIFY_ADMIN_SHOP") || Deno.env.get("SHOPIFY_STORE") || "";
  const accessToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN") || Deno.env.get("SHOPIFY_ACCESS_TOKEN") || "";
  const apiVersion = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") || Deno.env.get("SHOPIFY_API_VERSION") || "2025-01";

  if (!shop) throw new Error("SHOPIFY_ADMIN_SHOP non configurato");
  if (!accessToken) throw new Error("SHOPIFY_ADMIN_ACCESS_TOKEN non configurato");

  return { shop, accessToken, apiVersion, source: "env" };
}

function adminUrl(config: ShopifyAdminConfig, path: string): string {
  return `https://${config.shop}/admin/api/${config.apiVersion}/${path}`;
}

function graphqlUrl(config: ShopifyAdminConfig): string {
  return `https://${config.shop}/admin/api/${config.apiVersion}/graphql.json`;
}

/**
 * REST Admin API fetch with retry on 429 and auto-retry on 401.
 * On 401: clears config cache, re-fetches from DB, retries once.
 */
export async function shopifyAdminFetch(
  path: string,
  method: string,
  body?: unknown,
  config?: ShopifyAdminConfig,
): Promise<any> {
  let cfg = config || await getShopifyConfigAsync();
  const buildOpts = (c: ShopifyAdminConfig): RequestInit => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": c.accessToken,
    };
    const opts: RequestInit = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    return opts;
  };

  let response = await fetch(adminUrl(cfg, path), buildOpts(cfg));

  // Retry on 429
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get("Retry-After") || "2", 10);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    response = await fetch(adminUrl(cfg, path), buildOpts(cfg));
  }

  // Auto-retry on 401: clear cache, reload config, retry once
  if (response.status === 401 && !config) {
    console.warn("[shopify-admin-client] 401 on REST call, clearing cache and retrying...");
    clearConfigCache();
    cfg = await getShopifyConfigAsync(true);
    response = await fetch(adminUrl(cfg, path), buildOpts(cfg));
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(JSON.stringify(data.errors || data));
  }
  return data;
}

/**
 * GraphQL Admin API request with retry on 429 and auto-retry on 401.
 */
export async function shopifyAdminGraphQL<T = any>(
  query: string,
  variables: Record<string, unknown> = {},
  config?: ShopifyAdminConfig,
): Promise<T> {
  let cfg = config || await getShopifyConfigAsync();
  let attempts = 0;
  let retried401 = false;

  while (attempts < 3) {
    attempts += 1;
    const response = await fetch(graphqlUrl(cfg), {
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

    // Auto-retry on 401: clear cache, reload config, retry once
    if (response.status === 401 && !retried401 && !config) {
      console.warn("[shopify-admin-client] 401 on GraphQL call, clearing cache and retrying...");
      clearConfigCache();
      cfg = await getShopifyConfigAsync(true);
      retried401 = true;
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
