import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizeShopDomain(input: string): string | null {
  let shop = input.trim().toLowerCase();
  shop = shop.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!shop.includes(".")) {
    shop = `${shop}.myshopify.com`;
  }
  const shopRegex = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
  return shopRegex.test(shop) ? shop : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let shopInput: string | null = null;
    if (req.method === "GET") {
      shopInput = new URL(req.url).searchParams.get("shop");
    } else {
      const body = await req.json();
      shopInput = body.shop;
    }

    if (!shopInput || typeof shopInput !== "string") {
      return new Response(JSON.stringify({ error: "Missing shop parameter" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shopDomain = normalizeShopDomain(shopInput);
    if (!shopDomain) {
      return new Response(JSON.stringify({ error: "Invalid shop domain" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
    const scopes = Deno.env.get("SHOPIFY_SCOPES") || "read_products,write_products,read_customers,write_customers,read_orders";

    if (!clientId) {
      return new Response(JSON.stringify({ error: "SHOPIFY_CLIENT_ID not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Clean expired states
    await serviceClient.from("shopify_oauth_states").delete().lt("expires_at", new Date().toISOString());

    const state = crypto.randomUUID();
    const { error: insertErr } = await serviceClient.from("shopify_oauth_states").insert({
      state,
      shop_domain: shopDomain,
      user_id: "00000000-0000-0000-0000-000000000000",
      metadata: { initiated_from: "admin_settings" },
    });

    if (insertErr) {
      console.error("[shopify-oauth-start] Failed to save state:", insertErr.message);
      return new Response(JSON.stringify({ error: "Failed to initiate OAuth" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appUrl = Deno.env.get("SHOPIFY_APP_URL") || "https://ecom-blueprint-gen.lovable.app";
    const redirectUri = `${appUrl}/api/shopify/callback`;
    const authorizeUrl = `https://${shopDomain}/admin/oauth/authorize?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}`;

    console.log(`[shopify-oauth-start] OAuth initiated for shop: ${shopDomain}`);

    return new Response(JSON.stringify({ authorize_url: authorizeUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[shopify-oauth-start] Error:", (error as Error).message);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
