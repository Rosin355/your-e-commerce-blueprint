import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, shopifyAdminGraphQL, jsonResponse } from "../_shared/shopify-admin-client.ts";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const ORDERS_QUERY = `
  query GetOrders($search: String!) {
    orders(first: 20, sortKey: PROCESSED_AT, reverse: true, query: $search) {
      edges {
        node {
          id name createdAt processedAt
          displayFinancialStatus displayFulfillmentStatus
          currentTotalPriceSet { shopMoney { amount currencyCode } }
          customer { email firstName lastName }
          shippingAddress { city country }
          lineItems(first: 20) {
            edges {
              node {
                title quantity variantTitle
                originalUnitPriceSet { shopMoney { amount currencyCode } }
                image { url altText }
              }
            }
          }
          fulfillments { trackingInfo { number url company } }
        }
      }
    }
  }
`;

function mapOrder(edge: any, userEmail: string) {
  const n = edge.node;
  const orderEmail = normalizeEmail(n.customer?.email || "");
  if (orderEmail && orderEmail !== userEmail) return null;

  return {
    id: n.id,
    orderNumber: n.name,
    createdAt: n.createdAt,
    processedAt: n.processedAt,
    financialStatus: n.displayFinancialStatus || "",
    fulfillmentStatus: n.displayFulfillmentStatus || "",
    totalAmount: n.currentTotalPriceSet?.shopMoney?.amount || "0",
    currencyCode: n.currentTotalPriceSet?.shopMoney?.currencyCode || "EUR",
    shippingCity: n.shippingAddress?.city || null,
    shippingCountry: n.shippingAddress?.country || null,
    items: (n.lineItems?.edges || []).map((li: any) => ({
      title: li.node.title,
      quantity: li.node.quantity,
      variantTitle: li.node.variantTitle || null,
      amount: li.node.originalUnitPriceSet?.shopMoney?.amount || "0",
      currencyCode: li.node.originalUnitPriceSet?.shopMoney?.currencyCode || "EUR",
      imageUrl: li.node.image?.url || null,
      imageAlt: li.node.image?.altText || null,
    })),
    tracking: n.fulfillments?.flatMap((f: any) => f.trackingInfo || []).filter((t: any) => t.number || t.url) || [],
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.email) {
      return jsonResponse({ success: true, orders: [] });
    }

    const email = normalizeEmail(user.email);
    console.log(`[orders] Fetching for ${email.substring(0, 3)}***`);

    let data: any;
    try {
      data = await shopifyAdminGraphQL(ORDERS_QUERY, { search: `email:"${email}"` });
    } catch (err) {
      console.error("[orders] Query failed:", (err as Error).message);
      return jsonResponse({ success: false, error: "shopify_unavailable" });
    }

    let edges = data?.orders?.edges || [];

    // Fallback: phone search
    if (edges.length === 0) {
      const { data: profile } = await serviceClient.from("profiles").select("phone").eq("id", user.id).maybeSingle();
      if (profile?.phone) {
        let phone = profile.phone.trim().replace(/\s+/g, "");
        if (!phone.startsWith("+")) phone = `+39${phone}`;
        try {
          const phoneData = await shopifyAdminGraphQL(ORDERS_QUERY, { search: `phone:${phone}` });
          edges = phoneData?.orders?.edges || [];
        } catch { /* ignore */ }
      }
    }

    const orders = edges.map((e: any) => mapOrder(e, email)).filter(Boolean);
    console.log(`[orders] Returning ${orders.length} orders`);

    return jsonResponse({ success: true, orders });
  } catch (error) {
    console.error("[orders] Error:", error);
    return jsonResponse({ success: false, error: "internal_error" }, 500);
  }
});
