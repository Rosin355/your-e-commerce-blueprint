import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getShopifyConfig, jsonResponse } from "../_shared/shopify-admin-client.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const config = getShopifyConfig();
    return jsonResponse({
      connected: true,
      shop_domain: config.shop,
      api_version: config.apiVersion,
    });
  } catch {
    return jsonResponse({ connected: false });
  }
});
