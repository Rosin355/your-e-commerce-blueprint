import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, shopifyAdminGraphQL, jsonResponse } from "../_shared/shopify-admin-client.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const data = await shopifyAdminGraphQL<{
      shop: { name: string; myshopifyDomain: string; url: string };
      products: { edges: Array<{ node: { id: string; title: string; handle: string } }> };
    }>(`{
      shop { name myshopifyDomain url }
      products(first: 3) { edges { node { id title handle } } }
    }`);

    const products = data.products?.edges?.map((e) => ({
      id: e.node.id,
      title: e.node.title,
      handle: e.node.handle,
    })) || [];

    return jsonResponse({
      success: true,
      shop: {
        name: data.shop?.name,
        domain: data.shop?.myshopifyDomain,
        url: data.shop?.url,
      },
      products_found: products.length,
      sample_products: products,
    });
  } catch (error) {
    console.error("[shopify-test-connection] Error:", (error as Error).message);
    return jsonResponse({ success: false, error: (error as Error).message }, 500);
  }
});
