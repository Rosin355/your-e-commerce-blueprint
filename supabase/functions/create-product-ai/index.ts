import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { assertAdminRequest } from "../_shared/admin-auth.ts";
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
        optimized_description: { type: "string", description: "Descrizione HTML ottimizzata 400-800 parole con tag H2. Italiano naturale, conversazionale, NESSUNA parentesi quadra o JSON nel testo." },
        h1_title: { type: "string", description: "Titolo H1 della pagina prodotto" },
        short_description: { type: "string", description: "Breve descrizione 1-2 frasi, max 260 caratteri, tono umano" },
        key_benefits: { type: "array", items: { type: "string" }, description: "5 frasi benefit chiare, ognuna una frase completa in italiano (NO parentesi quadre nel testo)" },
        care_guide: {
          type: "object",
          properties: { light: { type: "string" }, watering: { type: "string" }, soil: { type: "string" }, temperature: { type: "string" }, notes: { type: "string" } },
          required: ["light", "watering", "soil", "temperature", "notes"],
        },
        characteristics: { type: "array", items: { type: "string" }, description: "5-8 caratteristiche principali, ognuna frase intera in italiano (es. 'Fioritura autunnale da ottobre a gennaio'). NO parentesi quadre nel testo." },
        attributes: {
          type: "array",
          items: {
            type: "object",
            properties: { key: { type: "string" }, value: { type: "string" } },
            required: ["key", "value"],
          },
          description: "5-8 attributi strutturati chiave-valore (es. {key:'Portamento', value:'Arbustivo eretto'}, {key:'Fogliame', value:'Verde scuro lucido'}).",
        },
        botanical_name: { type: "string", description: "Nome botanico latino (es. 'Camellia sasanqua'). Se non certo, indica il più probabile." },
        origins_habitat: { type: "string", description: "Paragrafo 1-2 frasi su origine geografica e habitat naturale." },
        flowering_period: { type: "string", description: "Periodo di fioritura (es. 'Ottobre - Gennaio'). Usa '—' se non applicabile." },
        pruning_period: { type: "string", description: "Periodo ottimale di potatura. Usa '—' se non applicabile." },
        planting_period: { type: "string", description: "Periodo di messa a dimora. Usa '—' se non applicabile." },
        harvest_period: { type: "string", description: "Periodo di raccolta. Usa '—' se non applicabile." },
        faq: {
          type: "array",
          items: { type: "object", properties: { q: { type: "string" }, a: { type: "string" } }, required: ["q", "a"] },
          description: "4 FAQ pertinenti",
        },
        image_alt_texts: { type: "array", items: { type: "string" }, description: "3-6 alt text descrittivi" },
      },
      required: ["seo_title", "seo_description", "optimized_description", "h1_title", "short_description", "key_benefits", "care_guide", "characteristics", "attributes", "botanical_name", "origins_habitat", "flowering_period", "pruning_period", "planting_period", "harvest_period", "faq", "image_alt_texts"],
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

  const requestBody = JSON.stringify({
    model: MODEL,
    messages: [
      { role: "system", content: `Sei un botanico e copywriter SEO italiano per e-commerce di piante.\n${styleNote}\nBrand voice: "Online Garden – più che semplici piante. Cura, affidabilità, consegna protetta."\nNON inventare dati non forniti. NON fare promesse mediche o miracolose.\nSe un dato manca, scrivi in modo generico e corretto.` },
      { role: "user", content: `Dati nuovo prodotto da creare:\n- Nome: ${input.title}\n- Categoria: ${input.category || "N/D"}\n- Descrizione fornita: ${input.description || "N/D"}\n- Tags: ${JSON.stringify(input.tags || [])}\n- Vendor: Online Garden\n${input.imageDescription ? `- Descrizione immagine: ${input.imageDescription}` : ""}\n\nGenera i contenuti SEO completi per questo nuovo prodotto.` },
    ],
    tools: [SEO_TOOL],
    tool_choice: { type: "function", function: { name: "generate_seo_content" } },
  });

  // Retry with exponential backoff for transient upstream errors (502/503/504)
  let aiResponse: Response | null = null;
  let lastErrText = "";
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    aiResponse = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: requestBody,
    });

    if (aiResponse.ok) break;

    lastErrText = await aiResponse.text();
    const status = aiResponse.status;
    const transient = status === 502 || status === 503 || status === 504 || status === 408 || status === 429;
    console.warn(`AI gateway attempt ${attempt}/${maxAttempts} failed: ${status} ${lastErrText.slice(0, 200)}`);

    if (!transient || attempt === maxAttempts) {
      if (status === 429) throw new Error("Rate limit AI raggiunto, riprova tra 30 secondi");
      if (status === 402) throw new Error("Crediti AI esauriti, ricarica il workspace");
      if (status === 503 || status === 502 || status === 504) {
        throw new Error("Servizio AI temporaneamente non disponibile. Riprova tra 1-2 minuti.");
      }
      throw new Error(`AI error ${status}: ${lastErrText.slice(0, 300)}`);
    }

    // Exponential backoff: 1s, 2s, 4s
    await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
  }

  if (!aiResponse || !aiResponse.ok) {
    throw new Error("Servizio AI temporaneamente non disponibile. Riprova tra 1-2 minuti.");
  }

  const aiJson = await aiResponse.json();
  const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("Nessun tool_call nella risposta AI");
  return JSON.parse(toolCall.function.arguments);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Security: only authenticated admins may generate AI content or create Shopify products.
  // verify_jwt is kept false in config.toml for CORS/tooling compatibility, so this check is mandatory.
  try {
    await assertAdminRequest(req);
  } catch (authErr) {
    const message = authErr instanceof Error ? authErr.message : "Unauthorized";
    const status = message.includes("Forbidden") ? 403 : 401;
    return jsonResponse({ error: message }, status);
  }

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
