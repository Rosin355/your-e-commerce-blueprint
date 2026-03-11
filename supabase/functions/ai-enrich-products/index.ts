import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-email, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = () => Deno.env.get("LOVABLE_API_KEY");
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const STYLE_MAP: Record<string, string> = {
  pratico: "Tono pratico, diretto, orientato all'azione. Frasi brevi e concrete.",
  narrativo: "Tono narrativo, evocativo, che racconta una storia. Crea atmosfera e connessione emotiva.",
  minimal: "Tono minimale, essenziale, elegante. Solo l'informazione necessaria, ben curata.",
  "step-by-step": "Tono didattico, strutturato a passi. Guida chiara per chi è alle prime armi.",
};

function buildSystemPrompt(seedStyle: string): string {
  const styleNote = STYLE_MAP[seedStyle] || STYLE_MAP["pratico"];
  return `Sei un botanico e copywriter SEO italiano per e-commerce di piante.
${styleNote}
Brand voice: "Online Garden – più che semplici piante. Cura, affidabilità, consegna protetta."
NON inventare dati non forniti. NON fare promesse mediche o miracolose.
Se un dato manca, scrivi in modo generico e corretto.`;
}

function buildUserPrompt(product: Record<string, unknown>): string {
  return `Dati prodotto:
- Nome: ${product.title || "N/D"}
- Categoria: ${product.product_category || "N/D"}
- Descrizione originale: ${product.description || "N/D"}
- Breve descrizione: ${product.short_description || "N/D"}
- Tags: ${JSON.stringify(product.tags || [])}
- Vendor: ${product.vendor || "N/D"}
- Metadati pianta: ${JSON.stringify(product.metafields || {})}

Genera i contenuti SEO per questo prodotto.`;
}

const SEO_TOOL = {
  type: "function" as const,
  function: {
    name: "generate_seo_content",
    description: "Genera contenuti SEO completi per un prodotto pianta e-commerce",
    parameters: {
      type: "object",
      properties: {
        seo_title: { type: "string", description: "Titolo SEO, max 60 caratteri" },
        seo_description: { type: "string", description: "Meta description SEO, max 155 caratteri" },
        optimized_description: { type: "string", description: "Descrizione HTML ottimizzata 400-800 parole con tag H2" },
        h1_title: { type: "string", description: "Titolo H1 della pagina prodotto" },
        short_description: { type: "string", description: "Breve descrizione, max 260 caratteri" },
        key_benefits: {
          type: "array",
          items: { type: "string" },
          description: "5 bullet point con i benefici chiave",
        },
        care_guide: {
          type: "object",
          properties: {
            light: { type: "string" },
            watering: { type: "string" },
            soil: { type: "string" },
            temperature: { type: "string" },
            notes: { type: "string" },
          },
          required: ["light", "watering", "soil", "temperature", "notes"],
        },
        faq: {
          type: "array",
          items: {
            type: "object",
            properties: {
              q: { type: "string" },
              a: { type: "string" },
            },
            required: ["q", "a"],
          },
          description: "4 FAQ pertinenti",
        },
        keywords_suggested: {
          type: "array",
          items: { type: "string" },
          description: "8-12 keyword long-tail",
        },
        image_alt_texts: {
          type: "array",
          items: { type: "string" },
          description: "3-6 alt text descrittivi per le immagini",
        },
        internal_links_suggestions: {
          type: "array",
          items: { type: "string" },
          description: "2-4 categorie o collezioni correlate",
        },
      },
      required: [
        "seo_title",
        "seo_description",
        "optimized_description",
        "h1_title",
        "short_description",
        "key_benefits",
        "care_guide",
        "faq",
        "keywords_suggested",
        "image_alt_texts",
        "internal_links_suggestions",
      ],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = LOVABLE_API_KEY();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY non configurata" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { batch_size = 5, seed_style = "pratico", count_only = false } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Count unenriched
    const { count: totalCount } = await client
      .from("product_sync_csv_products")
      .select("sku", { count: "exact", head: true });

    const { count: unenrichedCount } = await client
      .from("product_sync_csv_products")
      .select("sku", { count: "exact", head: true })
      .is("ai_enriched_at", null);

    if (count_only) {
      return new Response(
        JSON.stringify({ success: true, total: totalCount ?? 0, unenriched: unenrichedCount ?? 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch batch
    const cappedBatch = Math.max(1, Math.min(batch_size, 10));
    const { data: products, error: fetchErr } = await client
      .from("product_sync_csv_products")
      .select("sku,title,description,short_description,product_category,tags,metafields,vendor,image_urls")
      .is("ai_enriched_at", null)
      .order("sku")
      .limit(cappedBatch);

    if (fetchErr) throw new Error(fetchErr.message);
    if (!products?.length) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, remaining: 0, errors: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = buildSystemPrompt(seed_style);
    let processed = 0;
    const errors: string[] = [];

    for (const product of products) {
      try {
        const aiResponse = await fetch(AI_GATEWAY, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: buildUserPrompt(product) },
            ],
            tools: [SEO_TOOL],
            tool_choice: { type: "function", function: { name: "generate_seo_content" } },
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          if (aiResponse.status === 429) {
            errors.push(`Rate limit raggiunto, riprova tra poco`);
            break; // Stop the batch on rate limit
          }
          if (aiResponse.status === 402) {
            errors.push(`Crediti AI esauriti`);
            break;
          }
          errors.push(`SKU ${product.sku}: AI error ${aiResponse.status} - ${errText.slice(0, 200)}`);
          continue;
        }

        const aiJson = await aiResponse.json();
        const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall?.function?.arguments) {
          errors.push(`SKU ${product.sku}: nessun tool_call nella risposta AI`);
          continue;
        }

        const seoData = JSON.parse(toolCall.function.arguments);

        // Save to DB
        const { error: updateErr } = await client
          .from("product_sync_csv_products")
          .update({
            seo_title: seoData.seo_title || null,
            seo_description: seoData.seo_description || null,
            optimized_description: seoData.optimized_description || null,
            ai_enrichment_json: seoData,
            ai_enriched_at: new Date().toISOString(),
          })
          .eq("sku", product.sku);

        if (updateErr) {
          errors.push(`SKU ${product.sku}: DB error - ${updateErr.message}`);
          continue;
        }

        processed++;

        // Small delay between AI calls to avoid rate limiting
        if (products.indexOf(product) < products.length - 1) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      } catch (e) {
        errors.push(`SKU ${product.sku}: ${e instanceof Error ? e.message : "Errore sconosciuto"}`);
      }
    }

    const remaining = Math.max(0, (unenrichedCount ?? 0) - processed);

    return new Response(
      JSON.stringify({ success: true, processed, remaining, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-enrich-products error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
