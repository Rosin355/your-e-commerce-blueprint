import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOPIFY_STORE = Deno.env.get("SHOPIFY_STORE") || "lovable-project-6tknn.myshopify.com";
const API_VERSION = Deno.env.get("SHOPIFY_API_VERSION") || "2025-01";
const SHOPIFY_CLIENT_ID = Deno.env.get("SHOPIFY_CLIENT_ID");
const SHOPIFY_CLIENT_SECRET = Deno.env.get("SHOPIFY_CLIENT_SECRET");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_VISION_MODEL = Deno.env.get("OPENAI_VISION_MODEL") || "gpt-4o-mini";
const OPENAI_COPY_MODEL = Deno.env.get("OPENAI_COPY_MODEL") || "gpt-4.1-mini";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// OAuth client_credentials token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
    throw new Error("SHOPIFY_CLIENT_ID o SHOPIFY_CLIENT_SECRET non configurati");
  }

  const credentials = btoa(`${SHOPIFY_CLIENT_ID}:${SHOPIFY_CLIENT_SECRET}`);
  const response = await fetch(
    `https://${SHOPIFY_STORE}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OAuth token error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const token = data.access_token;
  // Cache for 23 hours (token valid ~24h)
  cachedToken = { token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };
  return token;
}

function adminUrl(path: string) {
  return `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/${path}`;
}

function getSupabaseAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY mancanti");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function parseJsonSafely(input: unknown) {
  if (typeof input !== "string") return input;
  try {
    return JSON.parse(input);
  } catch {
    const start = input.indexOf("{");
    const end = input.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(input.slice(start, end + 1));
    }
    throw new Error("Output AI non valido (JSON non parsabile)");
  }
}

async function shopifyFetch(path: string, method: string, body?: any, token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": token!,
  };
  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  let response = await fetch(adminUrl(path), opts);
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get("Retry-After") || "2", 10);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    response = await fetch(adminUrl(path), opts);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(JSON.stringify(data.errors || data));
  }
  return data;
}

async function openAIChatCompletion(messages: any[], model: string) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY non configurata");
  }
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages,
      temperature: 0.7,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(JSON.stringify(data.error || data));
  }
  const content = data?.choices?.[0]?.message?.content;
  return parseJsonSafely(content);
}

function normalizeProduct(product: any) {
  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    status: product.status,
    tags: product.tags || "",
    body_html: product.body_html || "",
    metafields_global_title_tag: product.metafields_global_title_tag || "",
    metafields_global_description_tag: product.metafields_global_description_tag || "",
    updated_at: product.updated_at,
    images: Array.isArray(product.images)
      ? product.images.map((image: any) => ({ id: image.id, src: image.src, alt: image.alt || "" }))
      : [],
  };
}

async function listProducts(token: string, data: any) {
  const limit = Math.max(1, Math.min(Number(data?.limit || 50), 100));
  const page = Math.max(1, Number(data?.page || 1));
  const status = (data?.status || "active").toLowerCase();
  const tagFilter = (data?.tag || "").toLowerCase().trim();
  const query = (data?.query || "").toLowerCase().trim();

  const search = new URLSearchParams({
    limit: String(limit),
    page: String(page),
    fields: "id,title,handle,status,tags,updated_at",
    status,
  });
  const res = await shopifyFetch(`products.json?${search.toString()}`, "GET", undefined, token);
  let products = Array.isArray(res.products) ? res.products : [];
  if (query) {
    products = products.filter((p: any) =>
      [p.title, p.handle].some((value) => String(value || "").toLowerCase().includes(query)),
    );
  }
  if (tagFilter) {
    products = products.filter((p: any) =>
      String(p.tags || "")
        .toLowerCase()
        .split(",")
        .map((t: string) => t.trim())
        .includes(tagFilter),
    );
  }
  return {
    products: products.map(normalizeProduct),
    hasNextPage: products.length === limit,
    page,
  };
}

async function getProduct(token: string, productId: number) {
  const res = await shopifyFetch(
    `products/${productId}.json?fields=id,title,handle,status,tags,body_html,metafields_global_title_tag,metafields_global_description_tag,updated_at,images`,
    "GET",
    undefined,
    token,
  );
  return { product: normalizeProduct(res.product) };
}

async function listDrafts(data: any) {
  const productId = String(data?.productId || "");
  if (!productId) throw new Error("productId mancante");
  const supabase = getSupabaseAdminClient();
  const { data: drafts, error } = await supabase
    .from("product_ai_drafts")
    .select("*")
    .eq("shopify_product_id", productId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return { drafts: drafts || [] };
}

async function generateFactsWithVision(product: any) {
  const imageInputs = (product.images || []).slice(0, 3).map((img: any) => ({
    type: "image_url",
    image_url: { url: img.src },
  }));

  const messages = [
    {
      role: "system",
      content:
        "Sei un botanico e content editor per e-commerce di piante in Italia. Rispondi solo con JSON valido.",
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text:
            `Analizza prodotto e immagini senza inventare dati non plausibili. ` +
            `Usa null quando non deducibile. Output JSON con chiavi: ` +
            `common_name, botanical_guess, plant_type, main_visual_traits, flower_color_guess, leaf_shape_guess, ` +
            `pot_or_garden, seasonality_guess, care_difficulty_guess, warnings, confidence. ` +
            `Nome prodotto: ${product.title}. Categoria/tag: ${product.tags || "n/a"}.`,
        },
        ...imageInputs,
      ],
    },
  ];

  return openAIChatCompletion(messages, OPENAI_VISION_MODEL);
}

async function generateCopyFromFacts(product: any, facts: any, seedStyle: string, language: string) {
  const messages = [
    {
      role: "system",
      content:
        "Sei un copywriter SEO italiano specializzato in e-commerce piante. Rispondi solo con JSON valido.",
    },
    {
      role: "user",
      content:
        `Lingua: ${language}. Stile: ${seedStyle}. ` +
        `Brand voice: Online Garden – più che semplici piante. Cura, affidabilità, consegna protetta. ` +
        `Non inventare dati. Nessun keyword stuffing. ` +
        `Dati prodotto: title=${product.title}, handle=${product.handle}, tags=${product.tags || "n/a"}. ` +
        `Facts JSON: ${JSON.stringify(facts)}. ` +
        `Output JSON con: h1_title, short_description (<=260), long_description (400-800 parole), key_benefits (5), ` +
        `care_guide {light, watering, soil, temperature, notes}, faq (4), ` +
        `seo {meta_title<=60, meta_description<=155, slug, keywords_suggested}, image_alt_texts (3-6), internal_links_suggestions (2-4).`,
    },
  ];
  return openAIChatCompletion(messages, OPENAI_COPY_MODEL);
}

async function generateProductCopyDraft(token: string, data: any) {
  const productId = Number(data?.productId);
  if (!productId) throw new Error("productId mancante");
  const seedStyle = (data?.seedStyle || "Pratico e tecnico").trim();
  const language = (data?.language || "it").trim();
  const adminEmail = data?.adminEmail || null;

  const productResponse = await getProduct(token, productId);
  const product = productResponse.product;
  const facts = await generateFactsWithVision(product);
  const copy = await generateCopyFromFacts(product, facts, seedStyle, language);

  const supabase = getSupabaseAdminClient();
  const { data: draft, error } = await supabase
    .from("product_ai_drafts")
    .insert({
      shopify_product_id: String(product.id),
      handle: product.handle,
      seed_style: seedStyle,
      language,
      facts_json: facts,
      copy_json: copy,
      status: "draft",
      created_by: adminEmail,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  return { draft, product };
}

async function publishProductCopyDraft(token: string, data: any) {
  const draftId = String(data?.draftId || "");
  if (!draftId) throw new Error("draftId mancante");

  const supabase = getSupabaseAdminClient();
  const { data: draft, error } = await supabase.from("product_ai_drafts").select("*").eq("id", draftId).single();
  if (error || !draft) throw new Error(error?.message || "Draft non trovata");

  const productId = Number(draft.shopify_product_id);
  const copy = draft.copy_json || {};
  const seo = copy.seo || {};

  await shopifyFetch(
    `products/${productId}.json`,
    "PUT",
    {
      product: {
        id: productId,
        body_html: copy.long_description || copy.short_description || "",
        metafields_global_title_tag: seo.meta_title || "",
        metafields_global_description_tag: seo.meta_description || "",
      },
    },
    token,
  );

  const productResponse = await getProduct(token, productId);
  const images = productResponse.product.images || [];
  const altTexts: string[] = Array.isArray(copy.image_alt_texts) ? copy.image_alt_texts : [];
  const updates = Math.min(images.length, altTexts.length);
  for (let i = 0; i < updates; i += 1) {
    await shopifyFetch(
      `products/${productId}/images/${images[i].id}.json`,
      "PUT",
      { image: { id: images[i].id, alt: altTexts[i] } },
      token,
    );
  }

  const { data: updatedDraft, error: updateError } = await supabase
    .from("product_ai_drafts")
    .update({ status: "published", published_at: new Date().toISOString(), error: null })
    .eq("id", draftId)
    .select("*")
    .single();
  if (updateError) throw new Error(updateError.message);

  return { success: true, draft: updatedDraft, productId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const token = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ success: false, error: "Token Shopify non configurato" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { action, data } = await req.json();
    let result: any;

    switch (action) {
      case "search_customer": {
        const res = await shopifyFetch(
          `customers/search.json?query=email:${encodeURIComponent(data.query)}`,
          "GET",
          undefined,
          token,
        );
        const customer = res.customers?.[0];
        result = { found: !!customer, id: customer?.id };
        break;
      }
      case "create_customer": {
        const res = await shopifyFetch("customers.json", "POST", { customer: data }, token);
        result = { success: true, id: res.customer?.id };
        break;
      }
      case "update_customer": {
        const { id, ...customerData } = data;
        const res = await shopifyFetch(`customers/${id}.json`, "PUT", { customer: customerData }, token);
        result = { success: true, id: res.customer?.id };
        break;
      }
      case "search_product": {
        const res = await shopifyFetch(
          `products.json?title=${encodeURIComponent(data.query)}&limit=1`,
          "GET",
          undefined,
          token,
        );
        const product = res.products?.[0];
        result = { found: !!product, id: product?.id };
        break;
      }
      case "create_product": {
        const res = await shopifyFetch("products.json", "POST", { product: data }, token);
        result = { success: true, id: res.product?.id };
        break;
      }
      case "update_product": {
        const { id, ...productData } = data;
        const res = await shopifyFetch(`products/${id}.json`, "PUT", { product: productData }, token);
        result = { success: true, id: res.product?.id };
        break;
      }
      case "list_products":
        result = await listProducts(token, data);
        break;
      case "get_product":
        result = await getProduct(token, Number(data?.productId));
        break;
      case "list_drafts":
        result = await listDrafts(data);
        break;
      case "generate_product_copy_draft":
        result = await generateProductCopyDraft(token, data);
        break;
      case "publish_product_copy":
        result = await publishProductCopyDraft(token, data);
        break;
      default:
        return new Response(JSON.stringify({ success: false, error: "Azione non valida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Shopify proxy error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Errore durante l'operazione",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
