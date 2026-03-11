import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { assertAdminRequest } from "../_shared/admin-auth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    assertAdminRequest(request);

    const body = await request.json();
    const action: string = body?.action || "update_prices";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Action: propagate variant prices to parents
    if (action === "propagate_variants") {
      // Find parent SKUs that are referenced as parent_sku by children with prices
      const { data: children, error: childErr } = await client
        .from("product_sync_csv_products")
        .select("parent_sku,price")
        .not("parent_sku", "is", null)
        .not("price", "is", null);

      if (childErr) throw new Error(childErr.message);

      const minPrices = new Map<string, number>();
      for (const child of children || []) {
        const psku = String(child.parent_sku);
        const price = Number(child.price);
        if (!Number.isFinite(price)) continue;
        const existing = minPrices.get(psku);
        if (existing === undefined || price < existing) {
          minPrices.set(psku, price);
        }
      }

      let updated = 0;
      for (const [parentSku, minPrice] of minPrices) {
        const { error } = await client
          .from("product_sync_csv_products")
          .update({ price: minPrice })
          .eq("sku", parentSku)
          .is("price", null);
        if (!error) updated++;
      }

      return jsonResponse({ success: true, updated, total_parents: minPrices.size });
    }

    // Action: batch update prices from parsed CSV rows
    if (action === "update_prices") {
      const rows: Array<{ sku: string; price?: string | number; compareAtPrice?: string | number }> = body?.rows || [];
      if (!rows.length) return jsonResponse({ success: true, updated: 0 });

      let updated = 0;
      // Process in chunks of 50
      for (let i = 0; i < rows.length; i += 50) {
        const chunk = rows.slice(i, i + 50);
        for (const row of chunk) {
          const sku = String(row.sku || "").trim();
          if (!sku) continue;

          const price = row.price !== undefined && row.price !== "" ? Number(String(row.price).replace(",", ".")) : null;
          const compareAt = row.compareAtPrice !== undefined && row.compareAtPrice !== "" ? Number(String(row.compareAtPrice).replace(",", ".")) : null;

          if (price === null && compareAt === null) continue;
          if (price !== null && !Number.isFinite(price)) continue;

          const updatePayload: Record<string, unknown> = {};
          if (price !== null) updatePayload.price = price;
          if (compareAt !== null && Number.isFinite(compareAt)) updatePayload.compare_at_price = compareAt;

          const { error } = await client
            .from("product_sync_csv_products")
            .update(updatePayload)
            .eq("sku", sku);

          if (!error) updated++;
        }
      }

      return jsonResponse({ success: true, updated });
    }

    return jsonResponse({ error: "Azione non riconosciuta" }, 400);
  } catch (error) {
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      401,
    );
  }
});
