import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { assertAdminRequest } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-email",
};

const SHOPIFY_STORE = Deno.env.get("SHOPIFY_STORE") || "";
const SHOPIFY_ACCESS_TOKEN = Deno.env.get("SHOPIFY_ACCESS_TOKEN") || "";
const SHOPIFY_API_VERSION = Deno.env.get("SHOPIFY_API_VERSION") || "2025-01";
const PAGE_SIZE = 20;

function shopifyEndpoint(): string {
  if (!SHOPIFY_STORE) throw new Error("SHOPIFY_STORE mancante");
  if (!SHOPIFY_ACCESS_TOKEN) throw new Error("SHOPIFY_ACCESS_TOKEN mancante");
  return `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
}

async function shopifyGraphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const url = shopifyEndpoint();
  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    });
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After") || "2");
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      continue;
    }
    const payload = await response.json();
    if (!response.ok) throw new Error(`Shopify HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 600)}`);
    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      throw new Error(`Shopify GQL: ${payload.errors.map((e: { message: string }) => e.message).join(" | ")}`);
    }
    return payload.data as T;
  }
  throw new Error("Shopify rate limit persistente");
}

const PRODUCTS_QUERY = `
query CompleteProducts($first: Int!, $after: String) {
  products(first: $first, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id
      handle
      title
      descriptionHtml
      vendor
      productType
      tags
      status
      seo { title description }
      media(first: 10) {
        nodes {
          ... on MediaImage {
            image { url altText }
          }
        }
      }
      variants(first: 100) {
        nodes {
          sku
          price
          compareAtPrice
          barcode
          inventoryQuantity
          inventoryItem {
            measurement { weight { value unit } }
          }
        }
      }
    }
  }
}
`;

interface ShopifyNode {
  id: string;
  handle: string;
  title: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  tags: string[];
  status: string;
  seo: { title: string | null; description: string | null };
  media: { nodes: Array<{ image?: { url?: string; altText?: string | null } }> };
  variants: {
    nodes: Array<{
      sku: string;
      price: string;
      compareAtPrice: string | null;
      barcode: string | null;
      inventoryQuantity: number | null;
      inventoryItem?: { measurement?: { weight?: { value?: number; unit?: string } } };
    }>;
  };
}

function isComplete(node: ShopifyNode): boolean {
  // 1) At least one media image
  const images = node.media.nodes.filter((m) => m.image?.url);
  if (images.length === 0) return false;
  // 2) SEO title non-empty
  if (!node.seo?.title?.trim()) return false;
  // 3) SEO description non-empty
  if (!node.seo?.description?.trim()) return false;
  // 4) First variant price > 0
  const firstVariant = node.variants.nodes[0];
  if (!firstVariant) return false;
  const price = parseFloat(firstVariant.price || "0");
  if (!(price > 0)) return false;
  return true;
}

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
    assertAdminRequest(req);

    const csvHeaders = [
      "Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published",
      "Variant SKU", "Variant Price", "Variant Compare At Price", "Variant Barcode",
      "Variant Grams", "Variant Inventory Qty", "Image Src", "Image Alt Text",
      "SEO Title", "SEO Description", "Status",
    ];

    const csvLines: string[] = [csvHeaders.map(escapeCsv).join(",")];

    let cursor: string | null = null;
    let hasNext = true;
    let totalAnalyzed = 0;
    let totalExported = 0;
    let totalSkipped = 0;

    while (hasNext) {
      const data = await shopifyGraphql<{
        products: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          nodes: ShopifyNode[];
        };
      }>(PRODUCTS_QUERY, { first: PAGE_SIZE, after: cursor });

      const page = data.products;
      totalAnalyzed += page.nodes.length;

      for (const node of page.nodes) {
        if (!isComplete(node)) {
          totalSkipped++;
          continue;
        }
        totalExported++;

        const images = node.media.nodes
          .filter((m) => m.image?.url)
          .map((m) => ({ url: m.image!.url!, alt: m.image!.altText || "" }));

        const firstVariant = node.variants.nodes[0];
        const weight = firstVariant?.inventoryItem?.measurement?.weight;
        const grams = weight
          ? weight.unit === "KILOGRAMS"
            ? Math.round((weight.value ?? 0) * 1000)
            : Math.round(weight.value ?? 0)
          : "";

        // Main row with first image
        const mainRow = [
          node.handle,
          node.title,
          node.descriptionHtml,
          node.vendor,
          node.productType,
          node.tags.join(", "),
          "TRUE",
          firstVariant?.sku || "",
          firstVariant?.price || "",
          firstVariant?.compareAtPrice || "",
          firstVariant?.barcode || "",
          grams,
          firstVariant?.inventoryQuantity ?? "",
          images[0]?.url || "",
          images[0]?.alt || "",
          node.seo.title || "",
          node.seo.description || "",
          node.status,
        ].map(escapeCsv).join(",");
        csvLines.push(mainRow);

        // Additional variant rows (if multiple SKU variants)
        for (let vi = 1; vi < node.variants.nodes.length; vi++) {
          const v = node.variants.nodes[vi];
          if (!v.sku) continue;
          const vWeight = v.inventoryItem?.measurement?.weight;
          const vGrams = vWeight
            ? vWeight.unit === "KILOGRAMS"
              ? Math.round((vWeight.value ?? 0) * 1000)
              : Math.round(vWeight.value ?? 0)
            : "";
          const emptyRow = new Array(csvHeaders.length).fill("");
          emptyRow[0] = node.handle;
          emptyRow[csvHeaders.indexOf("Variant SKU")] = v.sku;
          emptyRow[csvHeaders.indexOf("Variant Price")] = v.price || "";
          emptyRow[csvHeaders.indexOf("Variant Compare At Price")] = v.compareAtPrice || "";
          emptyRow[csvHeaders.indexOf("Variant Barcode")] = v.barcode || "";
          emptyRow[csvHeaders.indexOf("Variant Grams")] = String(vGrams);
          emptyRow[csvHeaders.indexOf("Variant Inventory Qty")] = String(v.inventoryQuantity ?? "");
          csvLines.push(emptyRow.map(escapeCsv).join(","));
        }

        // Additional image rows
        for (let ii = 1; ii < images.length; ii++) {
          const emptyRow = new Array(csvHeaders.length).fill("");
          emptyRow[0] = node.handle;
          emptyRow[csvHeaders.indexOf("Image Src")] = images[ii].url;
          emptyRow[csvHeaders.indexOf("Image Alt Text")] = images[ii].alt;
          csvLines.push(emptyRow.map(escapeCsv).join(","));
        }
      }

      hasNext = page.pageInfo.hasNextPage;
      cursor = page.pageInfo.endCursor;
    }

    const csvContent = csvLines.join("\n");

    // Return CSV with stats in custom headers
    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="shopify-products-complete-only.csv"`,
        "X-Total-Analyzed": String(totalAnalyzed),
        "X-Total-Exported": String(totalExported),
        "X-Total-Skipped": String(totalSkipped),
        "Access-Control-Expose-Headers": "X-Total-Analyzed, X-Total-Exported, X-Total-Skipped",
      },
    });
  } catch (e) {
    console.error("export-complete-products-csv error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
