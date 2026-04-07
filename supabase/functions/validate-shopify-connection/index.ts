import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, shopifyAdminGraphQL, jsonResponse } from "../_shared/shopify-admin-client.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const data = await shopifyAdminGraphQL<{
      shop: { name: string; myshopifyDomain: string; url: string };
    }>(`{ shop { name myshopifyDomain url } }`);

    return jsonResponse({
      success: true,
      shop: {
        name: data.shop?.name,
        domain: data.shop?.myshopifyDomain,
        url: data.shop?.url,
      },
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Errore sconosciuto",
    });
  }
});
