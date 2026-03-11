import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-email, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const IMAGE_MODEL = "google/gemini-3.1-flash-image-preview";
const BUCKET = "sync";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY non configurata" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json();
    const { count_only = false, batch_size = 3 } = body;

    // Count products without images
    // image_urls is jsonb, empty array or null means no images
    const { data: noImageProducts, error: countErr } = await client
      .from("product_sync_csv_products")
      .select("sku, title, description, short_description, product_category, image_urls, parent_sku")
      .or("image_urls.is.null,image_urls.eq.[]")
      .is("parent_sku", null) // Only parent products, not variants
      .order("sku");

    if (countErr) throw new Error(countErr.message);

    const totalMissing = noImageProducts?.length ?? 0;

    if (count_only) {
      // Also get total products count
      const { count: totalCount } = await client
        .from("product_sync_csv_products")
        .select("sku", { count: "exact", head: true })
        .is("parent_sku", null);

      // Get products with images
      const withImages = (totalCount ?? 0) - totalMissing;

      return new Response(
        JSON.stringify({
          success: true,
          total_parents: totalCount ?? 0,
          with_images: withImages,
          missing_images: totalMissing,
          // Return first 20 missing SKUs for the report
          missing_skus: (noImageProducts || []).slice(0, 50).map((p: any) => ({
            sku: p.sku,
            title: p.title || "Senza titolo",
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Generate images for a batch
    const cappedBatch = Math.max(1, Math.min(batch_size, 5));
    const toProcess = (noImageProducts || []).slice(0, cappedBatch);

    if (!toProcess.length) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, remaining: 0, errors: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let processed = 0;
    const errors: string[] = [];

    for (const product of toProcess) {
      try {
        const plantName = product.title || product.sku;
        const category = product.product_category || "pianta";
        const description = product.short_description || product.description || "";

        const prompt = `Generate a beautiful, realistic photo of a ${plantName} (${category}) plant in a decorative pot. 
The plant should be well-lit with soft natural lighting, on a clean white/light background, suitable for an e-commerce product listing.
${description ? `Additional details: ${description.slice(0, 200)}` : ""}
Style: professional product photography, high quality, clean composition.`;

        const aiResponse = await fetch(AI_GATEWAY, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: IMAGE_MODEL,
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!aiResponse.ok) {
          if (aiResponse.status === 429) {
            errors.push("Rate limit raggiunto, riprova tra poco");
            break;
          }
          if (aiResponse.status === 402) {
            errors.push("Crediti AI esauriti");
            break;
          }
          const errText = await aiResponse.text();
          errors.push(`SKU ${product.sku}: AI error ${aiResponse.status} - ${errText.slice(0, 200)}`);
          continue;
        }

        const aiJson = await aiResponse.json();
        const imageData = aiJson.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageData || !imageData.startsWith("data:image")) {
          errors.push(`SKU ${product.sku}: nessuna immagine generata dall'AI`);
          continue;
        }

        // Extract base64 data
        const base64Match = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
        if (!base64Match) {
          errors.push(`SKU ${product.sku}: formato immagine non valido`);
          continue;
        }

        const imageFormat = base64Match[1] === "jpg" ? "jpeg" : base64Match[1];
        const base64Data = base64Match[2];
        const imageBytes = decode(base64Data);

        // Upload to storage
        const safeSku = product.sku.replace(/[^a-zA-Z0-9_-]/g, "_");
        const storagePath = `product-images/${safeSku}.${imageFormat === "jpeg" ? "jpg" : imageFormat}`;

        const { error: uploadErr } = await client.storage
          .from(BUCKET)
          .upload(storagePath, imageBytes, {
            contentType: `image/${imageFormat}`,
            upsert: true,
          });

        if (uploadErr) {
          errors.push(`SKU ${product.sku}: upload error - ${uploadErr.message}`);
          continue;
        }

        // Get public URL (bucket is now public)
        const { data: urlData } = client.storage.from(BUCKET).getPublicUrl(storagePath);
        const imageUrl = urlData.publicUrl;

        // Update DB
        const { error: updateErr } = await client
          .from("product_sync_csv_products")
          .update({ image_urls: [imageUrl] })
          .eq("sku", product.sku);

        if (updateErr) {
          errors.push(`SKU ${product.sku}: DB update error - ${updateErr.message}`);
          continue;
        }

        processed++;

        // Delay between generations
        if (toProcess.indexOf(product) < toProcess.length - 1) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      } catch (e) {
        errors.push(`SKU ${product.sku}: ${e instanceof Error ? e.message : "Errore sconosciuto"}`);
      }
    }

    const remaining = Math.max(0, totalMissing - processed);

    return new Response(
      JSON.stringify({ success: true, processed, remaining, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-product-images error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
