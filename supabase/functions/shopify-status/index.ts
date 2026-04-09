import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/shopify-admin-client.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data } = await supabase
      .from("shopify_connections")
      .select("shop_domain, scopes, is_active, access_token, created_at, updated_at")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (data) {
      const apiVersion = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") || "2025-01";
      return new Response(JSON.stringify({
        connected: true,
        shop_domain: data.shop_domain,
        scopes: data.scopes,
        api_version: apiVersion,
        connected_at: data.created_at,
        token_present: !!data.access_token,
        source: "db",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ connected: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[shopify-status]", error);
    return new Response(JSON.stringify({ connected: false, error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
