import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOPIFY_STORE = Deno.env.get("SHOPIFY_STORE") || "lovable-project-6tknn.myshopify.com";
const API_VERSION = Deno.env.get("SHOPIFY_API_VERSION") || "2025-01";
const SHOPIFY_CLIENT_ID = Deno.env.get("SHOPIFY_CLIENT_ID");
const SHOPIFY_CLIENT_SECRET = Deno.env.get("SHOPIFY_CLIENT_SECRET");
const LOVABLE_API_KEY = () => Deno.env.get("LOVABLE_API_KEY");

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

// ── OAuth token (reuse same pattern as shopify-admin-proxy) ──
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;
  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) throw new Error("Credenziali Shopify mancanti");

  const credentials = btoa(`${SHOPIFY_CLIENT_ID}:${SHOPIFY_CLIENT_SECRET}`);
  const response = await fetch(`https://${SHOPIFY_STORE}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${credentials}` },
    body: JSON.stringify({ grant_type: "client_credentials", client_id: SHOPIFY_CLIENT_ID, client_secret: SHOPIFY_CLIENT_SECRET }),
  });
  if (!response.ok) throw new Error(`OAuth error (${response.status}): ${await response.text()}`);
  const data = await response.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };
  return cachedToken.token;
}

function adminUrl(path: string) {
  return `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/${path}`;
}

async function shopifyFetch(path: string, method: string, body?: unknown, token?: string) {
  const opts: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token! },
  };
  if (body) opts.body = JSON.stringify(body);
  let response = await fetch(adminUrl(path), opts);
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get("Retry-After") || "2", 10);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    response = await fetch(adminUrl(path), opts);
  }
  const data = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(data.errors || data));
  return data;
}

// ── AI SEO generation — reuses same tool schema as ai-enrich-products ──
const STYLE_MAP: Record<string, string> = {
  pratico: "Tono pratico, diretto, orientato all'azione. Frasi brevi e concrete.",
  narrativo: "Tono narrativo, evocativo, che racconta una storia. Crea atmosfera e connessione emotiva.",
  minimal: "Tono minimale, essenziale, elegante. Solo l'informazione necessaria, ben curata.",
  "step-by-step": "Tono didattico, strutturato a passi. Guida chiara per chi è alle prime armi.",
};

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
        key_benefits: { type: "array", items: { type: "string" }, description: "5 bullet point con i benefici chiave" },
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
        characteristics: { type: "array", items: { type: "string" }, description: "5-8 caratteristiche principali della pianta" },
        faq: {
          type: "array",
          items: { type: "object", properties: { q: { type: "string" }, a: { type: "string" } }, required: ["q", "a"] },
          description: "4 FAQ pertinenti",
        },
        image_alt_texts: { type: "array", items: { type: "string" }, description: "3-6 alt text descrittivi" },
      },
      required: [
        "seo_title", "seo_description", "optimized_description", "h1_title",
        "short_description", "key_benefits", "care_guide", "characteristics", "faq", "image_alt_texts",
      ],
      additionalProperties: false,
    },
  },
};

interface NewProductInput {
  title: string;
  description: string;
  category: string;
  price: number;
  tags?: string[];
  seedStyle?: string;
  imageUrl?: string;
  generateImage?: boolean;
  imageDescription?: string;
}

async function generateSeoForNewProduct(input: NewProductInput): Promise<Record<string, unknown>> {
  const apiKey = LOVABLE_API_KEY();
  if (!apiKey) throw new Error("LOVABLE_API_KEY non configurata");

  const styleKey = (input.seedStyle || "pratico").toLowerCase().replace(/\s+e\s+/g, " ").split(" ")[0];
  const styleNote = STYLE_MAP[styleKey] || STYLE_MAP["pratico"];

  const systemPrompt = `Sei un botanico e copywriter SEO italiano per e-commerce di piante.
${styleNote}
Brand voice: "Online Garden – più che semplici piante. Cura, affidabilità, consegna protetta."
NON inventare dati non forniti. NON fare promesse mediche o miracolose.
Se un dato manca, scrivi in modo generico e corretto.`;

  const userPrompt = `Dati nuovo prodotto da creare:
- Nome: ${input.title}
- Categoria: ${input.category || "N/D"}
- Descrizione fornita: ${input.description || "N/D"}
- Tags: ${JSON.stringify(input.tags || [])}
- Vendor: Online Garden
${input.imageDescription ? `- Descrizione immagine: ${input.imageDescription}` : ""}

Genera i contenuti SEO completi per questo nuovo prodotto.`;

  const aiResponse = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [SEO_TOOL],
      tool_choice: { type: "function", function: { name: "generate_seo_content" } },
    }),
  });

  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    if (aiResponse.status === 429) throw new Error("Rate limit raggiunto, riprova tra poco");
    if (aiResponse.status === 402) throw new Error("Crediti AI esauriti");
    throw new Error(`AI error ${aiResponse.status}: ${errText.slice(0, 300)}`);
  }

  const aiJson = await aiResponse.json();
  const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("Nessun tool_call nella risposta AI");
  return JSON.parse(toolCall.function.arguments);
}

async function generateAiImage(title: string, category: string): Promise<string | null> {
  const apiKey = LOVABLE_API_KEY();
  if (!apiKey) return null;

  try {
    const prompt = `Professional product photography of a ${title} plant, ${category || "indoor plant"}, white pot, clean white background, studio lighting, e-commerce style, botanical, high quality`;
    const response = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    // Extract base64 image if returned
    const content = data.choices?.[0]?.message?.content;
    if (content && typeof content === "string" && content.startsWith("data:image")) {
      return content;
    }
    return null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: { action: string; data: any } = await req.json();
    const { action, data } = body;

    if (action === "generate_content") {
      // Step 1: Generate AI SEO content only
      const input = data as NewProductInput;
      if (!input.title?.trim()) throw new Error("Titolo obbligatorio");

      const seoData = await generateSeoForNewProduct(input);

      // Optionally generate image
      let generatedImageBase64: string | null = null;
      if (input.generateImage) {
        generatedImageBase64 = await generateAiImage(input.title, input.category);
      }

      return new Response(
        JSON.stringify({ success: true, seoData, generatedImageBase64 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "create_product") {
      // Step 2: Create product on Shopify
      const { seoData, title, category, price, tags, imageUrl } = data;
      if (!title?.trim()) throw new Error("Titolo obbligatorio");
      if (!price || price <= 0) throw new Error("Prezzo deve essere > 0");

      const token = await getAccessToken();

      // 1) Create product
      const productPayload: Record<string, unknown> = {
        title: seoData?.h1_title || title,
        body_html: seoData?.optimized_description || "",
        vendor: "Online Garden",
        product_type: category || "",
        status: "draft",
        tags: (tags || []).join(", "),
        variants: [{ price: String(price), requires_shipping: true }],
        metafields_global_title_tag: seoData?.seo_title || "",
        metafields_global_description_tag: seoData?.seo_description || "",
      };

      const createRes = await shopifyFetch("products.json", "POST", { product: productPayload }, token);
      const productId = createRes.product?.id;
      if (!productId) throw new Error("Errore creazione prodotto Shopify");

      // 2) Add image if provided
      if (imageUrl) {
        try {
          if (imageUrl.startsWith("data:image")) {
            // Base64 image
            const base64Data = imageUrl.split(",")[1];
            await shopifyFetch(`products/${productId}/images.json`, "POST", {
              image: {
                attachment: base64Data,
                alt: seoData?.image_alt_texts?.[0] || title,
              },
            }, token);
          } else {
            // URL image
            await shopifyFetch(`products/${productId}/images.json`, "POST", {
              image: {
                src: imageUrl,
                alt: seoData?.image_alt_texts?.[0] || title,
              },
            }, token);
          }
        } catch (imgErr) {
          console.error("Image upload error (non-blocking):", imgErr);
        }
      }

      // 3) Create metafields
      const metafields = [
        { namespace: "custom", key: "cura_della_pianta", value: JSON.stringify(seoData?.care_guide || {}), type: "json" },
        { namespace: "custom", key: "caratteristiche", value: JSON.stringify(seoData?.characteristics || []), type: "json" },
        { namespace: "custom", key: "benefici", value: JSON.stringify(seoData?.key_benefits || []), type: "json" },
        { namespace: "custom", key: "content_version", value: "v1", type: "single_line_text_field" },
      ];

      for (const mf of metafields) {
        try {
          await shopifyFetch(`products/${productId}/metafields.json`, "POST", { metafield: { ...mf } }, token);
        } catch (mfErr) {
          console.error(`Metafield ${mf.key} error (non-blocking):`, mfErr);
        }
      }

      return new Response(
        JSON.stringify({ success: true, productId, handle: createRes.product?.handle }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Azione non valida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-product-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
