import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { shop } = await req.json();
    if (!shop || typeof shop !== "string") {
      return new Response(JSON.stringify({ error: "shop domain required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shopDomain = shop.includes(".myshopify.com") ? shop : `${shop}.myshopify.com`;
    const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
    const appUrl = Deno.env.get("SHOPIFY_APP_URL");
    const apiVersion = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") || "2025-01";

    if (!clientId || !appUrl) {
      return new Response(JSON.stringify({ error: "SHOPIFY_CLIENT_ID or SHOPIFY_APP_URL not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const state = crypto.randomUUID();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    await supabase.from("shopify_oauth_states").insert({
      state,
      shop_domain: shopDomain,
    });

    const scopes = "read_products,write_products,read_orders,read_customers,write_customers,read_product_listings,write_product_listings";
    const redirectUri = `${appUrl}/api/shopify/callback`;

    const authUrl = `https://${shopDomain}/admin/oauth/authorize?` +
      `client_id=${clientId}` +
      `&scope=${scopes}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}`;

    console.log("[OAUTH START]", { shopDomain, redirectUri, authUrl });

    return new Response(JSON.stringify({ authUrl, state }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[shopify-oauth-start]", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
