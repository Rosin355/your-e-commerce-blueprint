import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-email",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function escapeCsv(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// NOTE: as of 2026-06, this CSV exports ONLY product base data (titolo,
// descrizione, varianti, prezzi, immagini, SEO). The 16 custom.* metafields
// have been intentionally REMOVED because Shopify's native CSV importer
// silently drops metafield columns when namespace/key/type don't exactly
// match an existing definition — which led to confusing "metafield missing
// after import" behavior. Metafield publication is now exclusively handled
// via the `metafieldsSet` Admin API mutation, exposed through the
// "Pubblica su Shopify" and "Pubblica solo metafield" buttons.

interface DbRow {
  sku: string;
  parent_sku: string | null;
  title: string | null;
  handle: string | null;
  description: string | null;
  short_description: string | null;
  vendor: string | null;
  product_type: string | null;
  product_category: string | null;
  price: number | null;
  compare_at_price: number | null;
  barcode: string | null;
  weight_grams: number | null;
  inventory_quantity: number | null;
  tags: string[] | null;
  image_urls: string[] | null;
  metafields: Record<string, unknown> | null;
  seo_title: string | null;
  seo_description: string | null;
  optimized_description: string | null;
  ai_enrichment_json: Record<string, unknown> | null;
  ai_enriched_at: string | null;
}

function isComplete(row: DbRow): boolean {
  const images = Array.isArray(row.image_urls) ? row.image_urls : [];
  if (images.length === 0) return false;
  const ai = row.ai_enrichment_json || {};
  if (!(row.seo_title || (ai.seo_title as string) || "").trim()) return false;
  if (!(row.seo_description || (ai.seo_description as string) || "").trim()) return false;
  if (!((row.price ?? 0) > 0)) return false;
  return true;
}

function deriveHandle(row: DbRow): string {
  return String(row.handle || row.parent_sku || row.sku || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const onlyComplete = url.searchParams.get("only_complete") !== "0";
    const statusParam = url.searchParams.get("status") === "active" ? "active" : "draft";
    const publishedFlag = statusParam === "active" ? "TRUE" : "FALSE";

    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const allRows: DbRow[] = [];
    const PAGE_SIZE = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await client
        .from("product_sync_csv_products")
        .select(
          "sku,parent_sku,title,handle,description,short_description,vendor,product_type,product_category,price,compare_at_price,barcode,weight_grams,inventory_quantity,tags,image_urls,metafields,seo_title,seo_description,optimized_description,ai_enrichment_json,ai_enriched_at",
        )
        .order("parent_sku", { ascending: true, nullsFirst: false })
        .order("sku", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allRows.push(...(data as unknown as DbRow[]));
        offset += PAGE_SIZE;
        if (data.length < PAGE_SIZE) hasMore = false;
      }
    }

    // Filter
    const eligible = onlyComplete ? allRows.filter(isComplete) : allRows;

    // Group by handle (variants share handle/parent_sku)
    const groups = new Map<string, DbRow[]>();
    for (const row of eligible) {
      const handle = deriveHandle(row);
      if (!handle) continue;
      if (!groups.has(handle)) groups.set(handle, []);
      groups.get(handle)!.push(row);
    }

    // Build CSV
    const baseHeaders = [
      "Handle",
      "Title",
      "Body (HTML)",
      "Vendor",
      "Product Category",
      "Type",
      "Tags",
      "Published",
      "Option1 Name",
      "Option1 Value",
      "Option2 Name",
      "Option2 Value",
      "Option3 Name",
      "Option3 Value",
      "Variant SKU",
      "Variant Grams",
      "Variant Inventory Tracker",
      "Variant Inventory Qty",
      "Variant Inventory Policy",
      "Variant Fulfillment Service",
      "Variant Price",
      "Variant Compare At Price",
      "Variant Requires Shipping",
      "Variant Taxable",
      "Variant Barcode",
      "Image Src",
      "Image Position",
      "Image Alt Text",
      "Gift Card",
      "SEO Title",
      "SEO Description",
      "Variant Weight Unit",
      "Status",
    ];
    const csvHeaders = baseHeaders;
    const COL = Object.fromEntries(csvHeaders.map((h, i) => [h, i])) as Record<string, number>;
    const WIDTH = csvHeaders.length;

    const csvLines = [csvHeaders.map(escapeCsv).join(",")];

    let totalProducts = 0;
    let totalVariants = 0;
    let totalImageRows = 0;

    for (const [handle, variants] of groups) {
      totalProducts++;
      // Sort variants for determinism (parent first if matches)
      variants.sort((a, b) => String(a.sku).localeCompare(String(b.sku)));

      const head = variants[0];
      const ai = head.ai_enrichment_json || {};
      const title = String(ai.h1_title || head.title || handle);
      const body = String(head.optimized_description || (ai as any).optimized_description || head.description || "");
      const tags = Array.isArray(head.tags) ? head.tags.join(", ") : "";
      const seoTitle = String(head.seo_title || (ai as any).seo_title || "");
      const seoDesc = String(head.seo_description || (ai as any).seo_description || "");
      const headImages = Array.isArray(head.image_urls) ? head.image_urls : [];
      const altTexts = Array.isArray((ai as any).image_alt_texts) ? (ai as any).image_alt_texts as string[] : [];
      const headMfValues = buildMetafieldValues(head);

      const hasMultipleVariants = variants.length > 1;
      const optionName = hasMultipleVariants ? "Title" : "Title";
      const optionValueFor = (v: DbRow, idx: number) => {
        if (!hasMultipleVariants) return "Default Title";
        // Try to derive from sku tail or title; fallback to "Variant N"
        const skuTail = String(v.sku).split("-").pop() || `Variant ${idx + 1}`;
        return skuTail;
      };

      variants.forEach((v, vIdx) => {
        totalVariants++;
        const row = new Array(WIDTH).fill("");
        row[COL["Handle"]] = handle;

        if (vIdx === 0) {
          row[COL["Title"]] = title;
          row[COL["Body (HTML)"]] = body;
          row[COL["Vendor"]] = head.vendor || "";
          row[COL["Product Category"]] = head.product_category || "";
          row[COL["Type"]] = head.product_type || "";
          row[COL["Tags"]] = tags;
          row[COL["Published"]] = publishedFlag;
          row[COL["SEO Title"]] = seoTitle;
          row[COL["SEO Description"]] = seoDesc;
          row[COL["Gift Card"]] = "FALSE";
          row[COL["Status"]] = statusParam;
          // First image on first variant row
          if (headImages[0]) {
            row[COL["Image Src"]] = headImages[0];
            row[COL["Image Position"]] = "1";
            row[COL["Image Alt Text"]] = altTexts[0] || title;
          }
          // Metafields only on the first row of the handle
          for (const key of METAFIELD_KEYS) {
            row[COL[metafieldHeader(key)]] = headMfValues[key];
          }
        }

        // Variant fields on every row
        row[COL["Option1 Name"]] = optionName;
        row[COL["Option1 Value"]] = optionValueFor(v, vIdx);
        row[COL["Variant SKU"]] = v.sku || "";
        row[COL["Variant Grams"]] = v.weight_grams != null ? String(v.weight_grams) : "0";
        row[COL["Variant Inventory Tracker"]] = "shopify";
        row[COL["Variant Inventory Qty"]] = v.inventory_quantity != null ? String(v.inventory_quantity) : "0";
        row[COL["Variant Inventory Policy"]] = "deny";
        row[COL["Variant Fulfillment Service"]] = "manual";
        row[COL["Variant Price"]] = v.price != null ? String(v.price) : "";
        row[COL["Variant Compare At Price"]] = v.compare_at_price != null ? String(v.compare_at_price) : "";
        row[COL["Variant Requires Shipping"]] = "TRUE";
        row[COL["Variant Taxable"]] = "TRUE";
        row[COL["Variant Barcode"]] = v.barcode || "";
        row[COL["Variant Weight Unit"]] = "g";

        csvLines.push(row.map(escapeCsv).join(","));
      });

      // Additional images (positions 2+) on the head product
      for (let i = 1; i < headImages.length; i++) {
        totalImageRows++;
        const imgRow = new Array(WIDTH).fill("");
        imgRow[COL["Handle"]] = handle;
        imgRow[COL["Image Src"]] = headImages[i] || "";
        imgRow[COL["Image Position"]] = String(i + 1);
        imgRow[COL["Image Alt Text"]] = altTexts[i] || title;
        csvLines.push(imgRow.map(escapeCsv).join(","));
      }
    }

    const csvContent = csvLines.join("\n");
    const today = new Date().toISOString().slice(0, 10);

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="shopify-products-native-${today}.csv"`,
        "X-Total-Products": String(totalProducts),
        "X-Total-Variants": String(totalVariants),
        "X-Total-Image-Rows": String(totalImageRows),
        "X-Only-Complete": onlyComplete ? "1" : "0",
        "X-Status": statusParam,
        "Access-Control-Expose-Headers":
          "X-Total-Products, X-Total-Variants, X-Total-Image-Rows, X-Only-Complete, X-Status",
      },
    });
  } catch (e) {
    console.error("export-shopify-native-csv error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
