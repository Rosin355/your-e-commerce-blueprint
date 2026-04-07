import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// --- Token Manager ---
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const LOCK_DURATION_MS = 30_000;

async function getPersistedToken(svc: any, shopDomain: string) {
  const { data } = await svc.from("shopify_tokens")
    .select("access_token, expires_at, scope")
    .eq("shop_domain", shopDomain).maybeSingle();
  return data || null;
}

async function saveToken(svc: any, shopDomain: string, accessToken: string, scope: string | null, expiresAt: Date) {
  await svc.from("shopify_tokens").upsert({
    shop_domain: shopDomain, access_token: accessToken, scope,
    expires_at: expiresAt.toISOString(), refreshed_at: new Date().toISOString(),
  }, { onConflict: "shop_domain" });
}

async function acquireRefreshLock(svc: any, shopDomain: string): Promise<boolean> {
  const { data: existing } = await svc.from("shopify_token_locks")
    .select("locked_until").eq("shop_domain", shopDomain).maybeSingle();
  if (existing && new Date(existing.locked_until) > new Date()) return false;
  const { error } = await svc.from("shopify_token_locks").upsert({
    shop_domain: shopDomain, lock_key: crypto.randomUUID(),
    locked_until: new Date(Date.now() + LOCK_DURATION_MS).toISOString(),
  }, { onConflict: "shop_domain" });
  return !error;
}

async function releaseRefreshLock(svc: any, shopDomain: string) {
  await svc.from("shopify_token_locks").delete().eq("shop_domain", shopDomain);
}

async function requestNewShopifyToken(svc: any, shopDomain: string, tokenEndpoint: string) {
  const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET");

  if (clientId && clientSecret) {
    const res = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
    });
    if (res.ok) {
      const body = await res.json();
      const expiresIn = body.expires_in || 86400;
      return { access_token: body.access_token, scope: body.scope || null, expires_at: new Date(Date.now() + expiresIn * 1000) };
    }
    await res.text();
  }

  // Fallback: OAuth token from shopify_connections
  const { data: conn } = await svc.from("shopify_connections")
    .select("access_token").eq("shop_domain", shopDomain).eq("is_active", true).maybeSingle();
  if (conn?.access_token) {
    return { access_token: conn.access_token, scope: null, expires_at: new Date(Date.now() + 365 * 24 * 3600_000) };
  }

  // Fallback: env secret
  const envToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
  if (envToken) {
    return { access_token: envToken, scope: null, expires_at: new Date(Date.now() + 365 * 24 * 3600_000) };
  }

  throw new Error("No Shopify credentials available");
}

async function getValidShopifyAccessToken(svc: any, shopDomain: string, tokenEndpoint: string): Promise<string> {
  const persisted = await getPersistedToken(svc, shopDomain);
  if (persisted) {
    const margin = new Date(persisted.expires_at).getTime() - Date.now();
    if (margin > REFRESH_MARGIN_MS) return persisted.access_token;
  }

  const gotLock = await acquireRefreshLock(svc, shopDomain);
  if (!gotLock) {
    await new Promise((r) => setTimeout(r, 2000));
    const retry = await getPersistedToken(svc, shopDomain);
    if (retry && new Date(retry.expires_at).getTime() - Date.now() > REFRESH_MARGIN_MS) return retry.access_token;
  }

  try {
    const { access_token, scope, expires_at } = await requestNewShopifyToken(svc, shopDomain, tokenEndpoint);
    await saveToken(svc, shopDomain, access_token, scope, expires_at);
    return access_token;
  } finally {
    await releaseRefreshLock(svc, shopDomain);
  }
}

// --- GraphQL ---
async function shopifyAdminGraphQL(svc: any, shopDomain: string, tokenEndpoint: string, graphqlUrl: string, query: string, variables: Record<string, unknown> = {}, retried = false): Promise<any> {
  const token = await getValidShopifyAccessToken(svc, shopDomain, tokenEndpoint);
  const res = await fetch(graphqlUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });

  if ((res.status === 401 || res.status === 403) && !retried) {
    await res.text();
    await svc.from("shopify_tokens").delete().eq("shop_domain", shopDomain);
    return shopifyAdminGraphQL(svc, shopDomain, tokenEndpoint, graphqlUrl, query, variables, true);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Shopify API ${res.status}: ${body.substring(0, 200)}`);
  }
  return await res.json();
}

const ORDERS_QUERY = `
  query GetOrders($search: String!) {
    orders(first: 20, sortKey: PROCESSED_AT, reverse: true, query: $search) {
      edges {
        node {
          id name createdAt processedAt
          displayFinancialStatus displayFulfillmentStatus
          currentTotalPriceSet { shopMoney { amount currencyCode } }
          customer { email firstName lastName }
          shippingAddress { city country }
          lineItems(first: 20) {
            edges {
              node {
                title quantity variantTitle
                originalUnitPriceSet { shopMoney { amount currencyCode } }
                image { url altText }
              }
            }
          }
          fulfillments { trackingInfo { number url company } }
        }
      }
    }
  }
`;

function mapOrder(edge: any, userEmail: string) {
  const n = edge.node;
  const orderEmail = normalizeEmail(n.customer?.email || "");
  if (orderEmail && orderEmail !== userEmail) return null;

  return {
    id: n.id,
    orderNumber: n.name,
    createdAt: n.createdAt,
    processedAt: n.processedAt,
    financialStatus: n.displayFinancialStatus || "",
    fulfillmentStatus: n.displayFulfillmentStatus || "",
    totalAmount: n.currentTotalPriceSet?.shopMoney?.amount || "0",
    currencyCode: n.currentTotalPriceSet?.shopMoney?.currencyCode || "EUR",
    shippingCity: n.shippingAddress?.city || null,
    shippingCountry: n.shippingAddress?.country || null,
    items: (n.lineItems?.edges || []).map((li: any) => ({
      title: li.node.title,
      quantity: li.node.quantity,
      variantTitle: li.node.variantTitle || null,
      amount: li.node.originalUnitPriceSet?.shopMoney?.amount || "0",
      currencyCode: li.node.originalUnitPriceSet?.shopMoney?.currencyCode || "EUR",
      imageUrl: li.node.image?.url || null,
      imageAlt: li.node.image?.altText || null,
    })),
    tracking: n.fulfillments?.flatMap((f: any) => f.trackingInfo || []).filter((t: any) => t.number || t.url) || [],
  };
}

// --- Main ---
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.email) {
      return new Response(JSON.stringify({ success: true, orders: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = normalizeEmail(user.email);
    console.log(`[orders] Fetching for ${email.substring(0, 3)}***`);

    // Determine shop domain from active connection or env
    const { data: conn } = await serviceClient.from("shopify_connections")
      .select("shop_domain").eq("is_active", true).maybeSingle();
    const shopDomain = conn?.shop_domain || Deno.env.get("SHOPIFY_STORE") || "";
    if (!shopDomain) {
      return new Response(JSON.stringify({ success: false, error: "No Shopify store configured" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiVersion = Deno.env.get("SHOPIFY_API_VERSION") || "2025-01";
    const tokenEndpoint = `https://${shopDomain}/admin/oauth/access_token`;
    const graphqlUrl = `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`;

    let data: any;
    try {
      data = await shopifyAdminGraphQL(serviceClient, shopDomain, tokenEndpoint, graphqlUrl, ORDERS_QUERY, { search: `email:"${email}"` });
    } catch (err) {
      console.error("[orders] Query failed:", (err as Error).message);
      return new Response(JSON.stringify({ success: false, error: "shopify_unavailable" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let edges = data?.data?.orders?.edges || [];

    // Fallback: phone search
    if (edges.length === 0) {
      const { data: profile } = await serviceClient.from("profiles").select("phone").eq("id", user.id).maybeSingle();
      if (profile?.phone) {
        let phone = profile.phone.trim().replace(/\s+/g, "");
        if (!phone.startsWith("+")) phone = `+39${phone}`;
        try {
          const phoneData = await shopifyAdminGraphQL(serviceClient, shopDomain, tokenEndpoint, graphqlUrl, ORDERS_QUERY, { search: `phone:${phone}` });
          edges = phoneData?.data?.orders?.edges || [];
        } catch { /* ignore */ }
      }
    }

    const orders = edges.map((e: any) => mapOrder(e, email)).filter(Boolean);
    console.log(`[orders] Returning ${orders.length} orders`);

    return new Response(JSON.stringify({ success: true, orders }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[orders] Error:", error);
    return new Response(JSON.stringify({ success: false, error: "internal_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
