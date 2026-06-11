/**
 * Centralized Shopify Admin API client.
 *
 * Token resolution priority:
 *   1. SHOPIFY_ADMIN_API_TOKEN          — long-lived Custom App token (shpat_...), manually set.
 *   2. SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET
 *                                       — auto-refreshed via OAuth client_credentials flow.
 *                                         Produces a shpat_... valid ~24h, cached in-memory.
 *   3. SHOPIFY_ONLINE_ACCESS_TOKEN_*    — short-lived token from native Lovable Shopify connector.
 *   4. SHOPIFY_ACCESS_TOKEN / SHOPIFY_ADMIN_ACCESS_TOKEN — legacy fallback.
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

// ---- In-memory token cache for client_credentials flow ----
interface CachedToken {
  token: string;
  expiresAt: number; // epoch ms
}
let cachedClientCredentialsToken: CachedToken | null = null;
const REFRESH_MARGIN_MS = 5 * 60 * 1000; // refresh 5 min before expiry
const SHOPIFY_AUTH_ERROR_HINT =
  "Connessione Shopify Admin non valida: l'app collegata non risulta installata su questo store oppure il token salvato è scaduto. Ricollega Shopify da chat/Lovable prima di pubblicare.";

function getShopDomain(): string {
  return (
    Deno.env.get("SHOPIFY_STORE_PERMANENT_DOMAIN") ||
    Deno.env.get("SHOPIFY_ADMIN_SHOP") ||
    "ecom-blueprint-gen-6ud1s.myshopify.com"
  );
}

function isLikelyConnectorOnlineToken(token: string): boolean {
  return token.includes(":") || token.length < 32;
}

async function requestClientCredentialsToken(shop: string): Promise<string | null> {
  const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;

  if (
    cachedClientCredentialsToken &&
    cachedClientCredentialsToken.expiresAt - Date.now() > REFRESH_MARGIN_MS
  ) {
    return cachedClientCredentialsToken.token;
  }

  try {
    const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.warn(`[shopify-admin-client] client_credentials failed (${res.status}): ${txt.slice(0, 300)}`);
      return null;
    }
    const body = await res.json();
    const token = body.access_token as string | undefined;
    const expiresIn = Number(body.expires_in || 86400);
    if (!token) return null;
    cachedClientCredentialsToken = {
      token,
      expiresAt: Date.now() + expiresIn * 1000,
    };
    console.log(`[shopify-admin-client] Got new client_credentials token, expires in ${expiresIn}s`);
    return token;
  } catch (err) {
    console.warn("[shopify-admin-client] client_credentials request error:", err);
    return null;
  }
}

/**
 * Resolves the Shopify Admin access token using the priority chain above.
 * Async because the client_credentials flow may need a network call.
 */
export async function resolveAdminAccessToken(): Promise<string> {
  const debug = (src: string, tok: string) =>
    console.log(`[shopify-admin-client] using token from ${src} (len=${tok.length}, prefix=${tok.slice(0, 6)})`);
  // 1. Long-lived Custom App token
  const customAppToken = Deno.env.get("SHOPIFY_ADMIN_API_TOKEN");
  if (customAppToken) return customAppToken;

  // 2. client_credentials auto-refresh
  const shop = getShopDomain();
  const ccToken = await requestClientCredentialsToken(shop);
  if (ccToken) return ccToken;

  // 3. Native Lovable connector online token. These are per-user/online tokens and may
  // not work inside project Edge Functions for Admin REST writes; use only if they look
  // like a real Shopify token, otherwise skip to a clear configuration error.
  for (const [key, value] of Object.entries(Deno.env.toObject())) {
    if (key.startsWith("SHOPIFY_ONLINE_ACCESS_TOKEN") && value && !isLikelyConnectorOnlineToken(value)) {
      return value;
    }
  }

  // 4. Legacy fallback
  const legacy =
    Deno.env.get("SHOPIFY_ACCESS_TOKEN") ||
    Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN") ||
    "";
  if (legacy && !isLikelyConnectorOnlineToken(legacy)) return legacy;

  throw new Error(SHOPIFY_AUTH_ERROR_HINT);
}

async function getConfig(): Promise<ShopifyAdminConfig> {
  const shop = getShopDomain();
  const accessToken = await resolveAdminAccessToken();
  const apiVersion = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") || "2025-07";
  if (!shop) throw new Error("SHOPIFY_STORE_PERMANENT_DOMAIN non configurato");
  return { shop, accessToken, apiVersion };
}

function adminUrl(config: ShopifyAdminConfig, path: string): string {
  return `https://${config.shop}/admin/api/${config.apiVersion}/${path}`;
}

function graphqlUrl(config: ShopifyAdminConfig): string {
  return `https://${config.shop}/admin/api/${config.apiVersion}/graphql.json`;
}

/** Invalidate the cached client_credentials token (e.g. after a 401). */
function invalidateClientCredentialsCache() {
  cachedClientCredentialsToken = null;
}

export async function shopifyAdminFetch(
  path: string,
  method: string,
  body?: unknown,
): Promise<any> {
  let cfg = await getConfig();
  const buildHeaders = (token: string): Record<string, string> => ({
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": token,
  });
  const opts: RequestInit = { method, headers: buildHeaders(cfg.accessToken) };
  if (body) opts.body = JSON.stringify(body);

  let response = await fetch(adminUrl(cfg, path), opts);

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get("Retry-After") || "2", 10);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    response = await fetch(adminUrl(cfg, path), opts);
  }

  // If unauthorized and we used a client_credentials token, refresh once.
  if (response.status === 401) {
    invalidateClientCredentialsCache();
    cfg = await getConfig();
    const retryOpts: RequestInit = { method, headers: buildHeaders(cfg.accessToken) };
    if (body) retryOpts.body = JSON.stringify(body);
    response = await fetch(adminUrl(cfg, path), retryOpts);
  }

  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) throw new Error(SHOPIFY_AUTH_ERROR_HINT);
    throw new Error(JSON.stringify(data.errors || data));
  }
  return data;
}

export async function shopifyAdminGraphQL<T = any>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  let cfg = await getConfig();
  let attempts = 0;
  let unauthorizedRetried = false;

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

    if (response.status === 401 && !unauthorizedRetried) {
      unauthorizedRetried = true;
      invalidateClientCredentialsCache();
      cfg = await getConfig();
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

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
