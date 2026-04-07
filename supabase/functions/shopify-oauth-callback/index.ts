import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function validateHmac(params: Record<string, string | null>, secret: string): Promise<boolean> {
  const hmac = params.hmac;
  if (!hmac) return false;

  const entries: [string, string][] = [];
  for (const [key, value] of Object.entries(params)) {
    if (key !== "hmac" && key !== "signature" && value != null) {
      entries.push([key, value]);
    }
  }
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  const message = entries.map(([k, v]) => `${k}=${v}`).join("&");

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  const computed = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0")).join("");

  if (computed.length !== hmac.length) return false;
  let result = 0;
  for (let i = 0; i < computed.length; i++) {
    result |= computed.charCodeAt(i) ^ hmac.charCodeAt(i);
  }
  return result === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let code: string | null = null;
    let hmac: string | null = null;
    let shop: string | null = null;
    let state: string | null = null;
    let timestamp: string | null = null;

    if (req.method === "POST") {
      const body = await req.json();
      code = body.code; hmac = body.hmac; shop = body.shop; state = body.state; timestamp = body.timestamp;
    } else if (req.method === "GET") {
      const url = new URL(req.url);
      code = url.searchParams.get("code"); hmac = url.searchParams.get("hmac");
      shop = url.searchParams.get("shop"); state = url.searchParams.get("state");
      timestamp = url.searchParams.get("timestamp");
    } else {
      return jsonError("Method not allowed", 405);
    }

    if (!code || !hmac || !shop || !state) return jsonError("Missing required parameters");

    const shopRegex = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
    if (!shopRegex.test(shop.toLowerCase())) return jsonError("Invalid shop domain");

    const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET");
    if (!clientSecret) return jsonError("OAuth configuration incomplete");

    const isHmacValid = await validateHmac({ code, hmac, shop, state, timestamp }, clientSecret);
    if (!isHmacValid) return jsonError("HMAC validation failed");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: stateRecord, error: stateErr } = await serviceClient
      .from("shopify_oauth_states")
      .select("*")
      .eq("state", state)
      .eq("shop_domain", shop)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (stateErr || !stateRecord) return jsonError("Invalid or expired state. Please retry.");

    await serviceClient.from("shopify_oauth_states").update({ used_at: new Date().toISOString() }).eq("id", stateRecord.id);

    const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
    if (!clientId) return jsonError("OAuth configuration incomplete");

    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code }),
    });

    if (!tokenRes.ok) return jsonError("Token exchange failed. Please retry.");

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const scopes = tokenData.scope || "";

    if (!accessToken) return jsonError("No token received from Shopify");

    // Deactivate existing connections
    await serviceClient.from("shopify_connections").update({ is_active: false }).eq("is_active", true);

    // Upsert connection
    const { error: upsertErr } = await serviceClient.from("shopify_connections").upsert({
      shop_domain: shop,
      access_token: accessToken,
      scopes,
      token_type: "offline",
      is_active: true,
      installed_by: stateRecord.user_id !== "00000000-0000-0000-0000-000000000000" ? stateRecord.user_id : null,
      installed_at: new Date().toISOString(),
      metadata: { timestamp, connection_type: "oauth" },
    }, { onConflict: "shop_domain" });

    if (upsertErr) return jsonError("Failed to save connection");

    console.log(`[shopify-oauth-callback] Connection saved for: ${shop}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[shopify-oauth-callback] Error:", (error as Error).message);
    return jsonError("Internal server error", 500);
  }
});
