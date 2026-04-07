import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function shopifyAdminGraphQL(shopDomain: string, accessToken: string, query: string) {
  const apiVersion = Deno.env.get("SHOPIFY_API_VERSION") || "2025-01";
  const res = await fetch(`https://${shopDomain}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(data.errors.map((e: any) => e.message).join(", "));
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: connection, error } = await serviceClient
      .from("shopify_connections")
      .select("shop_domain, access_token")
      .eq("is_active", true)
      .maybeSingle();

    if (error || !connection) {
      return new Response(JSON.stringify({ success: false, error: "No active Shopify connection" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await shopifyAdminGraphQL(connection.shop_domain, connection.access_token,
      `{ products(first: 3) { edges { node { id title handle } } } }`);

    const products = result.data?.products?.edges?.map((e: any) => ({
      id: e.node.id, title: e.node.title, handle: e.node.handle,
    })) || [];

    return new Response(JSON.stringify({
      success: true,
      shop_domain: connection.shop_domain,
      products_found: products.length,
      sample_products: products,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[shopify-test-connection] Error:", (error as Error).message);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
