import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SHOPIFY_STORE = Deno.env.get("SHOPIFY_STORE") || "";
    const SHOPIFY_CLIENT_ID = Deno.env.get("SHOPIFY_CLIENT_ID");
    const SHOPIFY_CLIENT_SECRET = Deno.env.get("SHOPIFY_CLIENT_SECRET");
    const API_VERSION = Deno.env.get("SHOPIFY_API_VERSION") || "2025-01";

    if (!SHOPIFY_STORE) {
      return new Response(
        JSON.stringify({ success: false, error: "SHOPIFY_STORE non configurato" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ success: false, error: "SHOPIFY_CLIENT_ID o SHOPIFY_CLIENT_SECRET mancanti" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // OAuth client_credentials
    const credentials = btoa(`${SHOPIFY_CLIENT_ID}:${SHOPIFY_CLIENT_SECRET}`);
    const tokenRes = await fetch(`https://${SHOPIFY_STORE}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${credentials}` },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return new Response(
        JSON.stringify({ success: false, error: `OAuth fallito (${tokenRes.status}): ${errText.slice(0, 200)}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { access_token } = await tokenRes.json();

    // Query shop info
    const shopRes = await fetch(
      `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": access_token,
        },
        body: JSON.stringify({ query: `{ shop { name url myshopifyDomain } }` }),
      },
    );

    if (!shopRes.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Shop query fallita (${shopRes.status})` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const shopData = await shopRes.json();
    if (shopData.errors) {
      return new Response(
        JSON.stringify({ success: false, error: shopData.errors.map((e: { message: string }) => e.message).join(", ") }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const shop = shopData.data?.shop;
    return new Response(
      JSON.stringify({ success: true, shop: { name: shop?.name, domain: shop?.myshopifyDomain, url: shop?.url } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Errore sconosciuto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
