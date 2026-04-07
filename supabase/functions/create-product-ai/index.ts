import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, shopifyAdminFetch, jsonResponse } from "../_shared/shopify-admin-client.ts";

const LOVABLE_API_KEY = () => Deno.env.get("LOVABLE_API_KEY");
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

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
          properties: { light: { type: "string" }, watering: { type: "string" }, soil: { type: "string" }, temperature: { type: "string" }, notes: { type: "string" } },
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
      required: ["seo_title", "seo_description", "optimized_description", "h1_title", "short_description", "key_benefits", "care_guide", "characteristics", "faq", "image_alt_texts"],
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

  const aiResponse = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: `Sei un botanico e copywriter SEO italiano per e-commerce di piante.\n${styleNote}\nBrand voice: "Online Garden – più che semplici piante. Cura, affidabilità, consegna protetta."\nNON inventare dati non forniti. NON fare promesse mediche o miracolose.\nSe un dato manca, scrivi in modo generico e corretto.` },
        { role: "user", content: `Dati nuovo prodotto da creare:\n- Nome: ${input.title}\n- Categoria: ${input.category || "N/D"}\n- Descrizione fornita: ${input.description || "N/D"}\n- Tags: ${JSON.stringify(input.tags || [])}\n- Vendor: Online Garden\n${input.imageDescription ? `- Descrizione immagine: ${input.imageDescription}` : ""}\n\nGenera i contenuti SEO completi per questo nuovo prodotto.` },
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: { action: string; data: any } = await req.json();
    const { action, data } = body;

    if (action === "generate_content") {
      const input = data as NewProductInput;
      if (!input.title?.trim()) throw new Error("Titolo obbligatorio");
      const seoData = await generateSeoForNewProduct(input);
      return jsonResponse({ success: true, seoData, generatedImageBase64: null });
    }

    if (action === "create_product") {
      const { seoData, title, category, price, tags, imageUrl } = data;
      if (!title?.trim()) throw new Error("Titolo obbligatorio");
      if (!price || price <= 0) throw new Error("Prezzo deve essere > 0");

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

      const createRes = await shopifyAdminFetch("products.json", "POST", { product: productPayload });
      const productId = createRes.product?.id;
      if (!productId) throw new Error("Errore creazione prodotto Shopify");

      if (imageUrl) {
        try {
          if (imageUrl.startsWith("data:image")) {
            await shopifyAdminFetch(`products/${productId}/images.json`, "POST", {
              image: { attachment: imageUrl.split(",")[1], alt: seoData?.image_alt_texts?.[0] || title },
            });
          } else {
            await shopifyAdminFetch(`products/${productId}/images.json`, "POST", {
              image: { src: imageUrl, alt: seoData?.image_alt_texts?.[0] || title },
            });
          }
        } catch (imgErr) {
          console.error("Image upload error (non-blocking):", imgErr);
        }
      }

      const metafields = [
        { namespace: "custom", key: "cura_della_pianta", value: JSON.stringify(seoData?.care_guide || {}), type: "json" },
        { namespace: "custom", key: "caratteristiche", value: JSON.stringify(seoData?.characteristics || []), type: "json" },
        { namespace: "custom", key: "benefici", value: JSON.stringify(seoData?.key_benefits || []), type: "json" },
        { namespace: "custom", key: "content_version", value: "v1", type: "single_line_text_field" },
      ];

      for (const mf of metafields) {
        try {
          await shopifyAdminFetch(`products/${productId}/metafields.json`, "POST", { metafield: { ...mf } });
        } catch (mfErr) {
          console.error(`Metafield ${mf.key} error (non-blocking):`, mfErr);
        }
      }

      return jsonResponse({ success: true, productId, handle: createRes.product?.handle });
    }

    return jsonResponse({ error: "Azione non valida" }, 400);
  } catch (e) {
    console.error("create-product-ai error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Errore sconosciuto" }, 500);
  }
});
