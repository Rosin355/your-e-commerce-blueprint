import { corsHeaders } from "../_shared/cors.ts";
import { denyUnlessAdmin } from "../_shared/legacy-admin-access.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const denied = await denyUnlessAdmin(req, corsHeaders);
  if (denied) return denied;

  try {
    const { shop, code } = await req.json();
    if (!shop || !code) {
      return new Response(JSON.stringify({ error: "shop and code are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only the configured store may receive the secret; never follow a redirect.
    const shopDomain = String(shop).toLowerCase();
    const configuredShop = (Deno.env.get("SHOPIFY_STORE_PERMANENT_DOMAIN") ||
      Deno.env.get("SHOPIFY_ADMIN_SHOP") || "ecom-blueprint-gen-6ud1s.myshopify.com").toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain) || shopDomain !== configuredShop) {
      return new Response(JSON.stringify({ error: "Negozio non autorizzato" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
    const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "Missing SHOPIFY_CLIENT_ID/SECRET" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: "POST",
      redirect: "error",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Shopify ${res.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify({ success: true, ...data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Scambio Shopify non riuscito" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
