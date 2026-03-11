import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-email",
};

function escapeCsv(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Fetch all enriched products (paginated to handle >1000)
    const allRows: Record<string, unknown>[] = [];
    const PAGE_SIZE = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await client
        .from("product_sync_csv_products")
        .select("sku,title,handle,description,short_description,vendor,product_type,product_category,price,compare_at_price,barcode,weight_grams,inventory_quantity,tags,image_urls,seo_title,seo_description,optimized_description,ai_enrichment_json,ai_enriched_at")
        .not("ai_enriched_at", "is", null)
        .order("sku")
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allRows.push(...data);
        offset += PAGE_SIZE;
        if (data.length < PAGE_SIZE) hasMore = false;
      }
    }

    if (allRows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nessun prodotto arricchito trovato" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build Shopify-compatible CSV
    const csvHeaders = [
      "Handle",
      "Title",
      "Body (HTML)",
      "Vendor",
      "Type",
      "Tags",
      "Published",
      "Variant SKU",
      "Variant Price",
      "Variant Compare At Price",
      "Variant Barcode",
      "Variant Grams",
      "Variant Inventory Qty",
      "Image Src",
      "SEO Title",
      "SEO Description",
      "Short Description",
      "Care Guide - Light",
      "Care Guide - Watering",
      "Care Guide - Soil",
      "Care Guide - Temperature",
      "Care Guide - Notes",
      "Key Benefits",
      "FAQ",
      "Keywords",
      "Image Alt Texts",
      "Category",
    ];

    const csvLines = [csvHeaders.map(escapeCsv).join(",")];

    for (const row of allRows) {
      const ai = (row.ai_enrichment_json as Record<string, unknown>) || {};
      const careGuide = (ai.care_guide as Record<string, string>) || {};
      const tags = Array.isArray(row.tags) ? (row.tags as string[]).join(", ") : "";
      const imageUrls = Array.isArray(row.image_urls) ? (row.image_urls as string[]) : [];
      const keyBenefits = Array.isArray(ai.key_benefits) ? (ai.key_benefits as string[]).join(" | ") : "";
      const faq = Array.isArray(ai.faq)
        ? (ai.faq as Array<{ q: string; a: string }>).map((f) => `Q: ${f.q} A: ${f.a}`).join(" | ")
        : "";
      const keywords = Array.isArray(ai.keywords_suggested) ? (ai.keywords_suggested as string[]).join(", ") : "";
      const altTexts = Array.isArray(ai.image_alt_texts) ? (ai.image_alt_texts as string[]).join(" | ") : "";

      const line = [
        row.handle || "",
        ai.h1_title || row.title || "",
        row.optimized_description || ai.optimized_description || row.description || "",
        row.vendor || "",
        row.product_type || "",
        tags,
        "TRUE",
        row.sku || "",
        row.price ?? "",
        row.compare_at_price ?? "",
        row.barcode || "",
        row.weight_grams ?? "",
        row.inventory_quantity ?? "",
        imageUrls[0] || "",
        row.seo_title || ai.seo_title || "",
        row.seo_description || ai.seo_description || "",
        ai.short_description || row.short_description || "",
        careGuide.light || "",
        careGuide.watering || "",
        careGuide.soil || "",
        careGuide.temperature || "",
        careGuide.notes || "",
        keyBenefits,
        faq,
        keywords,
        altTexts,
        row.product_category || "",
      ].map(escapeCsv).join(",");

      csvLines.push(line);
    }

    const csvContent = csvLines.join("\n");

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="shopify-seo-enriched-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    console.error("export-enriched-csv error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
