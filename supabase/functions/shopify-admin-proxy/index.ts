import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { assertAdminRequest } from "../_shared/admin-auth.ts";
import { corsHeaders, shopifyAdminFetch, shopifyAdminGraphQL, jsonResponse, resolveAdminAccessToken } from "../_shared/shopify-admin-client.ts";
import {
  isHeadlessStorefrontConfigured,
  storefrontListProducts,
  storefrontGetProductByHandle,
} from "../_shared/shopify-storefront-server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_VISION_MODEL = Deno.env.get("OPENAI_VISION_MODEL") || "gpt-4o-mini";
const OPENAI_COPY_MODEL = Deno.env.get("OPENAI_COPY_MODEL") || "gpt-4.1-mini";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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

async function listProducts(data: any) {
  const limit = Math.max(1, Math.min(Number(data?.limit || 50), 250));
  const rawStatus = (data?.status || "active").toLowerCase().trim();
  const tagFilter = (data?.tag || "").toLowerCase().trim();
  const query = (data?.query || "").toLowerCase().trim();
  const pageInfo = data?.pageInfo || "";

  // Multi-status (es. "active,draft"): Shopify REST non accetta lista,
  // facciamo fetch sequenziali e uniamo deduplicando per id. La paginazione
  // multi-status non è supportata: ritorniamo hasNextPage=false e tutti i
  // risultati combinati (il caller carica già fino a 250 per chiamata).
  if (rawStatus.includes(",")) {
    const statuses = rawStatus.split(",").map((s) => s.trim()).filter(Boolean);
    const seen = new Set<number>();
    const merged: any[] = [];
    const warnings: string[] = [];
    for (const s of statuses) {
      try {
        let r;
        // Per "active" preferiamo Storefront (Headless private token): non
        // dipende dallo scope Admin read_products e quindi funziona anche se
        // il token Admin non è approvato.
        if (s === "active" && isHeadlessStorefrontConfigured()) {
          try {
            r = await storefrontListProducts({ limit, status: s, query, tag: tagFilter, cursor: "" });
          } catch (err) {
            console.warn(`[list_products] Storefront fallita per status=${s}, provo Admin:`, err);
            r = await listProductsSingleStatus({ status: s, limit, pageInfo: "", tagFilter, query });
          }
        } else {
          r = await listProductsSingleStatus({ status: s, limit, pageInfo: "", tagFilter, query });
        }
        for (const p of r.products) {
          if (!seen.has(p.id)) {
            seen.add(p.id);
            merged.push(p);
          }
        }
      } catch (err: any) {
        // Non bloccare: log + continua. Tipicamente Admin 403 per scope mancanti
        // su draft/archived quando si usa solo il token Headless.
        const msg = err?.message || String(err);
        console.warn(`[list_products] status=${s} fallito:`, msg);
        warnings.push(`status=${s}: ${msg.slice(0, 200)}`);
      }
    }
    if (merged.length === 0 && warnings.length > 0) {
      throw new Error(`Nessun prodotto recuperato. ${warnings.join(" | ")}`);
    }
    return { products: merged, hasNextPage: false, nextPageInfo: "", warnings: warnings.length ? warnings : undefined };
  }

  const status = rawStatus;

  // Prefer Storefront (Headless private token) for active-only listings: faster, higher rate
  // limit, no admin-token expiry. Falls back to Admin REST on error or when status != active.
  if (status === "active" && isHeadlessStorefrontConfigured()) {
    try {
      return await storefrontListProducts({
        limit,
        status,
        query,
        tag: tagFilter,
        cursor: pageInfo,
      });
    } catch (err) {
      console.warn("[shopify-admin-proxy] Storefront listProducts failed, falling back to Admin:", err);
    }
  }

  return await listProductsSingleStatus({ status, limit, pageInfo, tagFilter, query });
}

async function listProductsSingleStatus({
  status, limit, pageInfo, tagFilter, query,
}: { status: string; limit: number; pageInfo: string; tagFilter: string; query: string }) {
  const search = new URLSearchParams({
    limit: String(limit),
    fields: "id,title,handle,status,tags,updated_at",
    status,
  });
  if (pageInfo) search.set("page_info", pageInfo);

  const shop = Deno.env.get("SHOPIFY_STORE_PERMANENT_DOMAIN") || "ecom-blueprint-gen-6ud1s.myshopify.com";
  const accessToken = await resolveAdminAccessToken();
  const apiVersion = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") || "2025-07";
  const fetchHeaders = { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken };
  const url = `https://${shop}/admin/api/${apiVersion}/products.json?${search.toString()}`;

  let rawResponse = await fetch(url, { method: "GET", headers: fetchHeaders });
  if (rawResponse.status === 429) {
    const retryAfter = parseInt(rawResponse.headers.get("Retry-After") || "2", 10);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    rawResponse = await fetch(url, { method: "GET", headers: fetchHeaders });
  }
  const res = await rawResponse.json();
  if (!rawResponse.ok) {
    throw new Error(`Shopify ${rawResponse.status}: ${JSON.stringify(res).slice(0, 500)}`);
  }

  const linkHeader = rawResponse.headers.get("Link") || "";
  const nextMatch = linkHeader.match(/<[^>]*[?&]page_info=([^>&]+)[^>]*>;\s*rel="next"/);
  const nextPageInfo = nextMatch ? nextMatch[1] : "";

  let products = Array.isArray(res.products) ? res.products : [];
  if (query) {
    products = products.filter((p: any) =>
      [p.title, p.handle].some((value) => String(value || "").toLowerCase().includes(query)),
    );
  }
  if (tagFilter) {
    products = products.filter((p: any) =>
      String(p.tags || "").toLowerCase().split(",").map((t: string) => t.trim()).includes(tagFilter),
    );
  }
  return { products: products.map(normalizeProduct), hasNextPage: !!nextPageInfo, nextPageInfo };
}

async function getProduct(productId: number) {
  const res = await shopifyAdminFetch(
    `products/${productId}.json?fields=id,title,handle,status,tags,body_html,metafields_global_title_tag,metafields_global_description_tag,updated_at,images`,
    "GET",
  );
  return { product: normalizeProduct(res.product) };
}

async function listDbProducts(data: any) {
  const db = getSupabaseAdminClient();
  const limit = Math.min(Number(data?.limit || 1000), 10000);
  const parentSkuOnly = data?.parentOnly !== false;

  let query = db
    .from("product_sync_csv_products")
    .select(
      "sku, parent_sku, title, handle, description, tags, seo_title, seo_description, optimized_description, metafields, ai_enriched_at, ai_enrichment_json, ai_seed_style, imported_at, image_urls, " +
      "shopify_product_id, shopify_synced_at, shopify_sync_status, shopify_sync_error, shopify_resolved_by, " +
      "shopify_metafields_written, shopify_metafields_skipped, shopify_metafields_failed, shopify_metafields_report, shopify_last_sync_mode"
    )
    .order("imported_at", { ascending: false })
    .limit(limit);

  if (parentSkuOnly) query = query.is("parent_sku", null);

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);
  return { products: rows || [] };
}

/**
 * Persist the Shopify sync state for a product into product_sync_csv_products.
 * Matches by sku first, falls back to handle. Never throws (best-effort).
 */
async function persistShopifySyncState(opts: {
  sku?: string | null;
  handle?: string | null;
  productId?: number | string | null;
  resolvedBy?: string | null;
  status: "synced" | "partial" | "failed";
  error?: string | null;
  mode?: string | null;
  metafieldsReport?: any;
}) {
  try {
    const sku = opts.sku ? String(opts.sku).trim() : "";
    const handle = opts.handle ? String(opts.handle).trim() : "";
    if (!sku && !handle) return;
    const db = getSupabaseAdminClient();

    let written = 0, skipped = 0, failed = 0;
    if (opts.metafieldsReport && Array.isArray(opts.metafieldsReport.details)) {
      written = Number(opts.metafieldsReport.written ?? 0) || 0;
      for (const d of opts.metafieldsReport.details) {
        if (d?.status === "skipped") skipped++;
        else if (d?.status === "failed") failed++;
      }
    }

    const patch: Record<string, unknown> = {
      shopify_product_id: opts.productId != null ? String(opts.productId) : null,
      shopify_synced_at: new Date().toISOString(),
      shopify_sync_status: opts.status,
      shopify_sync_error: opts.error ?? null,
      shopify_resolved_by: opts.resolvedBy ?? null,
      shopify_metafields_written: written,
      shopify_metafields_skipped: skipped,
      shopify_metafields_failed: failed,
      shopify_metafields_report: opts.metafieldsReport ?? null,
      shopify_last_sync_mode: opts.mode ?? null,
    };

    let q = db.from("product_sync_csv_products").update(patch);
    if (sku) q = q.eq("sku", sku);
    else q = q.eq("handle", handle);
    const { error, count } = await q.select("sku", { count: "exact", head: true });
    if (error) {
      console.warn("[persistShopifySyncState] DB update error:", error.message);
      return;
    }
    // Fallback by handle if sku didn't match
    if ((!count || count === 0) && sku && handle) {
      const { error: e2 } = await db
        .from("product_sync_csv_products")
        .update(patch)
        .eq("handle", handle);
      if (e2) console.warn("[persistShopifySyncState] handle-fallback error:", e2.message);
    }
  } catch (err) {
    console.warn("[persistShopifySyncState] unexpected:", err);
  }
}


async function saveEnrichedDraft(data: any) {
  const sku = String(data?.sku || "").trim();
  if (!sku) throw new Error("sku mancante");
  const draft = data?.draft;
  if (!draft || typeof draft !== "object") throw new Error("draft mancante");
  const seedStyle = data?.seedStyle ? String(data.seedStyle) : null;

  const db = getSupabaseAdminClient();
  const patch: Record<string, unknown> = {
    seo_title: draft.seo_title ?? null,
    seo_description: draft.seo_description ?? null,
    optimized_description: draft.body_html ?? null,
    metafields: draft.metafields ?? {},
    ai_enrichment_json: draft,
    ai_enriched_at: new Date().toISOString(),
    ai_seed_style: seedStyle,
  };
  const { error } = await db.from("product_sync_csv_products").update(patch).eq("sku", sku);
  if (error) throw new Error(error.message);
  return { success: true, sku };
}

async function getEnrichedDrafts(data: any) {
  const skus = Array.isArray(data?.skus) ? data.skus.filter((s: unknown) => typeof s === "string" && s.length > 0) : [];
  if (skus.length === 0) return { drafts: [] };
  const db = getSupabaseAdminClient();
  const { data: rows, error } = await db
    .from("product_sync_csv_products")
    .select("sku, handle, ai_enrichment_json, ai_enriched_at, ai_seed_style, seo_title, seo_description, optimized_description")
    .in("sku", skus)
    .not("ai_enrichment_json", "is", null);
  if (error) throw new Error(error.message);
  return { drafts: rows || [] };
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

async function openAIChatCompletion(messages: any[], model: string) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY non configurata");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, response_format: { type: "json_object" }, messages, temperature: 0.7 }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(data.error || data));
  return parseJsonSafely(data?.choices?.[0]?.message?.content);
}

async function generateFactsWithVision(product: any) {
  const imageInputs = (product.images || []).slice(0, 3).map((img: any) => ({
    type: "image_url", image_url: { url: img.src },
  }));
  return openAIChatCompletion([
    { role: "system", content: "Sei un botanico e content editor per e-commerce di piante in Italia. Rispondi solo con JSON valido." },
    {
      role: "user", content: [
        {
          type: "text",
          text: `Analizza prodotto e immagini senza inventare dati non plausibili. Usa null quando non deducibile. Output JSON con chiavi: common_name, botanical_guess, plant_type, main_visual_traits, flower_color_guess, leaf_shape_guess, pot_or_garden, seasonality_guess, care_difficulty_guess, warnings, confidence. Nome prodotto: ${product.title}. Categoria/tag: ${product.tags || "n/a"}.`,
        },
        ...imageInputs,
      ],
    },
  ], OPENAI_VISION_MODEL);
}

async function generateCopyFromFacts(product: any, facts: any, seedStyle: string, language: string) {
  return openAIChatCompletion([
    { role: "system", content: "Sei un copywriter SEO italiano specializzato in e-commerce piante. Rispondi solo con JSON valido." },
    {
      role: "user",
      content: `Lingua: ${language}. Stile: ${seedStyle}. Brand voice: Online Garden – più che semplici piante. Cura, affidabilità, consegna protetta. Non inventare dati. Nessun keyword stuffing. Dati prodotto: title=${product.title}, handle=${product.handle}, tags=${product.tags || "n/a"}. Facts JSON: ${JSON.stringify(facts)}. Output JSON con: h1_title, short_description (<=260), long_description (400-800 parole), key_benefits (5), care_guide {light, watering, soil, temperature, notes}, faq (4), seo {meta_title<=60, meta_description<=155, slug, keywords_suggested}, image_alt_texts (3-6), internal_links_suggestions (2-4).`,
    },
  ], OPENAI_COPY_MODEL);
}

async function generateProductCopyDraft(data: any, adminEmail: string) {
  const productId = Number(data?.productId);
  if (!productId) throw new Error("productId mancante");
  const seedStyle = (data?.seedStyle || "Pratico e tecnico").trim();
  const language = (data?.language || "it").trim();

  const productResponse = await getProduct(productId);
  const product = productResponse.product;
  const facts = await generateFactsWithVision(product);
  const copy = await generateCopyFromFacts(product, facts, seedStyle, language);

  const supabase = getSupabaseAdminClient();
  const { data: draft, error } = await supabase.from("product_ai_drafts").insert({
    shopify_product_id: String(product.id), handle: product.handle, seed_style: seedStyle,
    language, facts_json: facts, copy_json: copy, status: "draft", created_by: adminEmail,
  }).select("*").single();
  if (error) throw new Error(error.message);
  return { draft, product };
}

async function publishProductCopyDraft(data: any) {
  const draftId = String(data?.draftId || "");
  if (!draftId) throw new Error("draftId mancante");

  const supabase = getSupabaseAdminClient();
  const { data: draft, error } = await supabase.from("product_ai_drafts").select("*").eq("id", draftId).single();
  if (error || !draft) throw new Error(error?.message || "Draft non trovata");

  const productId = Number(draft.shopify_product_id);
  const copy = draft.copy_json || {};
  const seo = copy.seo || {};

  await shopifyAdminFetch(`products/${productId}.json`, "PUT", {
    product: {
      id: productId,
      body_html: copy.long_description || copy.short_description || "",
      metafields_global_title_tag: seo.meta_title || "",
      metafields_global_description_tag: seo.meta_description || "",
    },
  });

  const productResponse = await getProduct(productId);
  const images = productResponse.product.images || [];
  const altTexts: string[] = Array.isArray(copy.image_alt_texts) ? copy.image_alt_texts : [];
  const updates = Math.min(images.length, altTexts.length);
  for (let i = 0; i < updates; i += 1) {
    await shopifyAdminFetch(`products/${productId}/images/${images[i].id}.json`, "PUT", {
      image: { id: images[i].id, alt: altTexts[i] },
    });
  }

  const { data: updatedDraft, error: updateError } = await supabase
    .from("product_ai_drafts")
    .update({ status: "published", published_at: new Date().toISOString(), error: null })
    .eq("id", draftId).select("*").single();
  if (updateError) throw new Error(updateError.message);
  return { success: true, draft: updatedDraft, productId };
}

/**
 * Resolve an existing product using the most precise identifier available, in order:
 *   1. SKU    (exact variant SKU match — most reliable, avoids "similar title" collisions)
 *   2. handle (unique product slug)
 *   3. title  (last-resort fallback; not unique)
 * Returns { found, id, matchedBy }.
 */
async function searchProductBySkuOrHandle(data: any) {
  const sku = String(data?.sku || "").trim();
  const handle = String(data?.handle || "").trim();
  const title = String(data?.title || data?.query || "").trim();

  // 1. SKU — use GraphQL productVariants which supports exact sku: querying.
  if (sku) {
    const escaped = sku.replace(/(["\\])/g, "\\$1");
    const gql = `
      query FindVariantBySku($q: String!) {
        productVariants(first: 1, query: $q) {
          edges { node { id sku product { legacyResourceId } } }
        }
      }`;
    try {
      const res = await shopifyAdminGraphQL<any>(gql, { q: `sku:${escaped}` });
      const node = res?.productVariants?.edges?.[0]?.node;
      const productId = node?.product?.legacyResourceId;
      if (productId) return { found: true, id: productId, matchedBy: "sku" };
    } catch (err) {
      console.error("SKU lookup failed, falling back to handle/title:", err);
    }
  }

  // 2. handle — REST products.json supports an exact handle filter.
  if (handle) {
    const res = await shopifyAdminFetch(`products.json?handle=${encodeURIComponent(handle)}&limit=1`, "GET");
    const product = res.products?.[0];
    if (product?.id) return { found: true, id: product.id, matchedBy: "handle" };
  }

  // 3. title — last-resort, non-unique fallback.
  if (title) {
    const res = await shopifyAdminFetch(`products.json?title=${encodeURIComponent(title)}&limit=1`, "GET");
    const product = res.products?.[0];
    if (product?.id) return { found: true, id: product.id, matchedBy: "title" };
  }

  return { found: false, id: undefined, matchedBy: null };
}

// ── Custom metafields (namespace "custom") — Shopify GraphQL metafieldsSet ──
//
// Maps each of the 16 enrichment keys to the appropriate Shopify metafield type.
// Empty values are SKIPPED so we never overwrite a populated metafield with "".
const METAFIELD_NAMESPACE = "custom";
const METAFIELD_TYPES: Record<string, string> = {
  nome_botanico: "single_line_text_field",
  nome_comune: "single_line_text_field",
  short_intro: "multi_line_text_field",
  promo_text: "multi_line_text_field",
  key_features: "multi_line_text_field",
  special_bullets: "multi_line_text_field",
  attributi_prodotto: "json",
  care_info: "multi_line_text_field",
  come_prendersene_cura: "multi_line_text_field",
  conosci_meglio_la_tua_pianta: "multi_line_text_field",
  difficolta_di_coltivazione: "single_line_text_field",
  origini_e_habitat: "multi_line_text_field",
  long_description: "multi_line_text_field",
  faq_prodotto: "json",
  periodo_di_fioritura: "single_line_text_field",
  periodo_di_messa_a_dimora: "single_line_text_field",
  periodo_di_raccolta: "single_line_text_field",
  periodo_ottimale_di_potatura: "single_line_text_field",
  titolo_sezione_faq: "single_line_text_field",
};

const DEFAULT_MAX_RETRIES = Number(Deno.env.get("SHOPIFY_METAFIELDS_MAX_RETRIES") ?? "3");
const METAFIELD_DEFINITIONS_CACHE_TTL_MS = 60_000;

interface LiveMetafieldDefinition {
  id: string;
  name: string;
  namespace: string;
  key: string;
  type: string;
  description?: string;
  fullKey: string;
}

let liveMetafieldDefinitionsCache: { expiresAt: number; definitions: LiveMetafieldDefinition[] } | null = null;

async function fetchLiveMetafieldDefinitions(force = false): Promise<LiveMetafieldDefinition[]> {
  if (!force && liveMetafieldDefinitionsCache && liveMetafieldDefinitionsCache.expiresAt > Date.now()) {
    return liveMetafieldDefinitionsCache.definitions;
  }

  const query = `
    query ProductMetafieldDefs {
      metafieldDefinitions(first: 100, ownerType: PRODUCT) {
        edges { node { id name namespace key type { name } description } }
      }
    }`;
  const res = await shopifyAdminGraphQL<any>(query, {});
  const definitions = (res?.metafieldDefinitions?.edges || []).map((e: any) => ({
    id: e.node.id,
    name: e.node.name,
    namespace: e.node.namespace,
    key: e.node.key,
    type: e.node.type?.name,
    description: e.node.description,
    fullKey: `${e.node.namespace}.${e.node.key}`,
  })) as LiveMetafieldDefinition[];

  liveMetafieldDefinitionsCache = {
    definitions,
    expiresAt: Date.now() + METAFIELD_DEFINITIONS_CACHE_TTL_MS,
  };
  return definitions;
}

export type NormalizeResult =
  | { kind: "value"; value: string }
  | { kind: "skip"; reason: string }
  | { kind: "empty" };

function tryParseJson(s: string): unknown | undefined {
  try { return JSON.parse(s); } catch { return undefined; }
}

function legacyFaqToJson(raw: string): string | null {
  // Parses legacy "Q: ...\nA: ...\n\nQ: ..." text blocks
  const blocks = raw.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const items: Array<{ question: string; answer: string }> = [];
  for (const b of blocks) {
    const qm = b.match(/Q\s*[:.\-]\s*([\s\S]*?)\n\s*A\s*[:.\-]\s*([\s\S]+)$/i);
    if (qm) {
      const q = qm[1].trim();
      const a = qm[2].trim();
      if (q && a) items.push({ question: q, answer: a });
    }
  }
  return items.length > 0 ? JSON.stringify(items) : null;
}

function normalizeMetafieldValueDetailed(key: string, raw: unknown, typeOverride?: string): NormalizeResult {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return { kind: "empty" };
  const type = typeOverride || METAFIELD_TYPES[key];

  // list.* — Shopify expects a JSON-encoded array of strings
  if (type?.startsWith("list.")) {
    const parsed = tryParseJson(trimmed);
    if (Array.isArray(parsed)) return { kind: "value", value: JSON.stringify(parsed.map((v) => String(v))) };
    // Fallback: split multilinea o stringa singola
    const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
    return { kind: "value", value: JSON.stringify(lines.length > 1 ? lines : [trimmed]) };
  }

  // json — must be valid JSON. Handle per-key legacy formats.
  if (type === "json") {
    const parsed = tryParseJson(trimmed);
    if (parsed !== undefined) return { kind: "value", value: JSON.stringify(parsed) };

    if (key === "faq_prodotto") {
      const converted = legacyFaqToJson(trimmed);
      if (converted) return { kind: "value", value: converted };
      return { kind: "skip", reason: "faq_prodotto: contenuto legacy non convertibile in JSON [{question,answer}]" };
    }
    if (key === "attributi_prodotto") {
      return { kind: "skip", reason: "attributi_prodotto: atteso JSON array di {key,value}, ricevuto testo non valido" };
    }
    return { kind: "skip", reason: `Tipo Shopify "json" richiede contenuto JSON valido per "${key}"` };
  }

  // rich_text_field — Shopify expects a rich-text JSON document, NOT raw HTML.
  // Per evitare di mandare <h2>...</h2> e rompere il sync, saltiamo in modo sicuro.
  if (type === "rich_text_field") {
    return {
      kind: "skip",
      reason:
        key === "long_description"
          ? "HTML già pubblicato come body_html del prodotto; conversione automatica HTML→rich_text disabilitata"
          : `Tipo Shopify "rich_text_field" non supportato dal sync (conversione HTML→rich_text disabilitata)`,
    };
  }

  // Text types (single_line / multi_line)
  return { kind: "value", value: trimmed };
}

// Retro-compat per il resto del codice che si aspetta string | null
function normalizeMetafieldValue(key: string, raw: unknown, typeOverride?: string): string | null {
  const r = normalizeMetafieldValueDetailed(key, raw, typeOverride);
  return r.kind === "value" ? r.value : null;
}

function isTransientMetafieldError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("throttled") ||
    m.includes("timeout") ||
    m.includes("timed out") ||
    m.includes("econn") ||
    m.includes("network") ||
    m.includes("rate") ||
    m.includes("internal") ||
    m.includes("503") ||
    m.includes("502") ||
    m.includes("500") ||
    m.includes("429")
  );
}

function isTypeMismatchMetafieldError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("type") && (m.includes("definition") || m.includes("match") || m.includes("invalid"))
  ) || m.includes("invalid_type");
}

function getMetafieldErrorIndex(field?: string[]): number | null {
  const raw = (field || []).find((part) => /^\d+$/.test(String(part)));
  return raw ? Number(raw) : null;
}

async function sleep(ms: number) { await new Promise((r) => setTimeout(r, ms)); }

export interface MetafieldDetail {
  key: string;
  namespace: string;
  status: "sent" | "skipped" | "failed";
  error?: string;
  reason?: string;
  attempts?: number;
  type?: string;
  liveTypeUsed?: string;
}

export interface MetafieldDebugEntry {
  chunkIndex: number;
  attempt: number;
  request: unknown;
  response: unknown;
  errorMessage?: string;
  liveDefinitions?: LiveMetafieldDefinition[];
}

async function setProductCustomMetafields(
  productId: number,
  metafields: Record<string, string>,
  options?: { maxRetries?: number; debug?: boolean },
): Promise<{
  written: number;
  skipped: number;
  errors: string[];
  details: MetafieldDetail[];
  debug?: MetafieldDebugEntry[];
}> {
  const maxRetries = Math.max(0, options?.maxRetries ?? DEFAULT_MAX_RETRIES);
  const debugMode = !!options?.debug;
  const ownerId = `gid://shopify/Product/${productId}`;

  let liveDefinitions: LiveMetafieldDefinition[] = [];
  try {
    liveDefinitions = await fetchLiveMetafieldDefinitions();
  } catch (err) {
    console.warn("[metafieldsSet] impossibile leggere le definitions live, uso i tipi locali:", err);
  }
  const liveTypeByKey = new Map(
    liveDefinitions
      .filter((d) => d.namespace === METAFIELD_NAMESPACE && d.type)
      .map((d) => [d.key, d.type]),
  );

  const entries: Array<{ key: string; type: string; value: string; raw: unknown; localType: string; liveTypeUsed?: string }> = [];
  const details: MetafieldDetail[] = [];
  let skipped = 0;

  for (const key of Object.keys(METAFIELD_TYPES)) {
    const localType = METAFIELD_TYPES[key];
    const liveTypeUsed = liveTypeByKey.get(key);
    const type = liveTypeUsed || localType;
    const normalized = normalizeMetafieldValueDetailed(key, metafields[key] ?? "", type);
    if (normalized.kind === "empty") {
      skipped++;
      details.push({ key, namespace: METAFIELD_NAMESPACE, status: "skipped", type, liveTypeUsed, reason: "valore vuoto" });
      continue;
    }
    if (normalized.kind === "skip") {
      skipped++;
      details.push({ key, namespace: METAFIELD_NAMESPACE, status: "skipped", type, liveTypeUsed, reason: normalized.reason });
      continue;
    }
    entries.push({ key, type, value: normalized.value, raw: metafields[key] ?? "", localType, liveTypeUsed });
  }

  const errors: string[] = [];
  const debug: MetafieldDebugEntry[] = [];
  let written = 0;

  const mutation = `
    mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id key namespace }
        userErrors { field message code }
      }
    }`;

  // metafieldsSet accetta fino a 25 campi per call, ma usiamo chunk piccoli (1)
  // così un singolo metafield invalido NON fa marcare tutti gli altri come "non scritto".
  const CHUNK_SIZE = Number(Deno.env.get("SHOPIFY_METAFIELDS_CHUNK_SIZE") ?? "1") || 1;
  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    let chunk = entries.slice(i, i + CHUNK_SIZE);
    const chunkIndex = Math.floor(i / CHUNK_SIZE);
    let typeRetryUsed = false;

    let attempt = 0;
    let success = false;
    let lastErr: string | undefined;
    let lastRes: any;

    while (attempt <= maxRetries && !success) {
      attempt++;
      const variables = {
        metafields: chunk.map((e) => ({
          ownerId, namespace: METAFIELD_NAMESPACE, key: e.key, type: e.type, value: e.value,
        })),
      };
      try {
        const res = await shopifyAdminGraphQL<any>(mutation, variables);
        lastRes = res;
        if (debugMode) debug.push({ chunkIndex, attempt, request: variables, response: res, liveDefinitions });

        const userErrors: Array<{ field?: string[]; message: string; code?: string }> = res?.metafieldsSet?.userErrors || [];
        const writtenList: Array<{ key: string; namespace: string }> = res?.metafieldsSet?.metafields || [];
        const writtenSet = new Set(writtenList.map((m) => `${m.namespace}.${m.key}`));
        const failedEntries: Array<typeof chunk[number] & { error: string }> = [];

        for (const e of chunk) {
          const id = `${METAFIELD_NAMESPACE}.${e.key}`;
          const ueForKey = userErrors.find((ue) => {
            const idx = getMetafieldErrorIndex(ue.field);
            return idx !== null ? chunk[idx]?.key === e.key : (ue.field || []).join(".").includes(e.key);
          });
          if (writtenSet.has(id) && !ueForKey) {
            details.push({ key: e.key, namespace: METAFIELD_NAMESPACE, status: "sent", attempts: attempt, type: e.localType, liveTypeUsed: e.liveTypeUsed || e.type });
            written++;
          } else {
            const errMsg = ueForKey?.message || "non scritto da metafieldsSet";
            failedEntries.push({ ...e, error: errMsg });
          }
        }

        const typeFailures = failedEntries.filter((e) => isTypeMismatchMetafieldError(e.error));
        if (typeFailures.length > 0 && !typeRetryUsed) {
          typeRetryUsed = true;
          liveDefinitions = await fetchLiveMetafieldDefinitions(true);
          const refreshedTypeByKey = new Map(
            liveDefinitions.filter((d) => d.namespace === METAFIELD_NAMESPACE && d.type).map((d) => [d.key, d.type]),
          );
          const remapped = failedEntries.map((e) => {
            const refreshedType = refreshedTypeByKey.get(e.key) || e.type;
            const refreshedValue = normalizeMetafieldValue(e.key, e.raw, refreshedType) || e.value;
            return { ...e, type: refreshedType, value: refreshedValue, liveTypeUsed: refreshedType };
          });
          const changed = remapped.some((e, idx) => e.type !== failedEntries[idx].type || e.value !== failedEntries[idx].value);
          if (changed) {
            chunk = remapped;
            attempt = 0;
            if (debugMode) debug.push({ chunkIndex, attempt: 0, request: { remap: typeFailures.map((e) => e.key) }, response: { liveDefinitions } });
            continue;
          }
        }

        for (const e of failedEntries) {
          details.push({ key: e.key, namespace: METAFIELD_NAMESPACE, status: "failed", error: e.error, attempts: attempt, type: e.localType, liveTypeUsed: e.liveTypeUsed || e.type });
          errors.push(`${e.key}: ${e.error}`);
        }
        success = true;
      } catch (err) {
        lastErr = err instanceof Error ? err.message : String(err);
        if (debugMode) debug.push({ chunkIndex, attempt, request: variables, response: lastRes, errorMessage: lastErr, liveDefinitions });
        if (attempt <= maxRetries && isTransientMetafieldError(lastErr)) {
          const backoff = Math.min(8000, 500 * 2 ** (attempt - 1));
          console.warn(`[metafieldsSet] transient error (attempt ${attempt}/${maxRetries + 1}), retry in ${backoff}ms: ${lastErr}`);
          await sleep(backoff);
        } else {
          for (const e of chunk) {
            details.push({ key: e.key, namespace: METAFIELD_NAMESPACE, status: "failed", error: lastErr, attempts: attempt, type: e.localType, liveTypeUsed: e.liveTypeUsed || e.type });
            errors.push(`${e.key}: ${lastErr}`);
          }
          break;
        }
      }
    }
  }

  return { written, skipped, errors, details, ...(debugMode ? { debug } : {}) };
}

function getMetafieldConfig() {
  return {
    namespace: METAFIELD_NAMESPACE,
    maxRetries: DEFAULT_MAX_RETRIES,
    fields: Object.entries(METAFIELD_TYPES).map(([key, type]) => ({
      key,
      namespace: METAFIELD_NAMESPACE,
      type,
      fullKey: `${METAFIELD_NAMESPACE}.${key}`,
    })),
  };
}

async function getMetafieldConfigLive() {
  const definitions = await fetchLiveMetafieldDefinitions(true);
  const liveTypeByKey = new Map(
    definitions.filter((d) => d.namespace === METAFIELD_NAMESPACE && d.type).map((d) => [d.key, d.type]),
  );
  const base = getMetafieldConfig();
  return {
    ...base,
    fields: base.fields.map((field) => ({
      ...field,
      liveType: liveTypeByKey.get(field.key),
      effectiveType: liveTypeByKey.get(field.key) || field.type,
    })),
    definitions,
  };
}

async function listShopifyMetafieldDefinitions() {
  const defs = await fetchLiveMetafieldDefinitions(true);

  const expected = getMetafieldConfig().fields;
  const byFull = new Map(defs.map((d: any) => [d.fullKey, d]));
  const diff = expected.map((f) => {
    const live = byFull.get(f.fullKey);
    if (!live) return { ...f, status: "missing" as const };
    if (live.type !== f.type) return { ...f, status: "type_mismatch" as const, liveType: live.type };
    return { ...f, status: "ok" as const, liveType: live.type };
  });
  return { definitions: defs, diff };
}



serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate: require valid JWT with admin role
    const adminEmail = await assertAdminRequest(req);

    const { action, data } = await req.json();
    let result: any;

    switch (action) {
      case "search_customer": {
        const res = await shopifyAdminFetch(`customers/search.json?query=email:${encodeURIComponent(data.query)}`, "GET");
        const customer = res.customers?.[0];
        result = { found: !!customer, id: customer?.id };
        break;
      }
      case "create_customer":
        result = { success: true, id: (await shopifyAdminFetch("customers.json", "POST", { customer: data })).customer?.id };
        break;
      case "update_customer": {
        const { id, ...customerData } = data;
        result = { success: true, id: (await shopifyAdminFetch(`customers/${id}.json`, "PUT", { customer: customerData })).customer?.id };
        break;
      }
      case "search_product": {
        const res = await shopifyAdminFetch(`products.json?title=${encodeURIComponent(data.query)}&limit=1`, "GET");
        const product = res.products?.[0];
        result = { found: !!product, id: product?.id };
        break;
      }
      case "search_product_by_sku_or_handle":
        result = await searchProductBySkuOrHandle(data);
        break;
      case "create_product":
        result = { success: true, id: (await shopifyAdminFetch("products.json", "POST", { product: data })).product?.id };
        break;
      case "update_product": {
        const { id, handle, sku, metafields, debug, retries, metafields_only, force, ...productData } = data;
        const looksLikeShopifyId = (v: any) => {
          const n = Number(v);
          return Number.isFinite(n) && n > 0 && String(n).length >= 10;
        };
        let resolvedId: number | null = looksLikeShopifyId(id) ? Number(id) : null;
        let resolvedBy = resolvedId ? "id" : null;

        // ── A1: Short-circuit per prodotti già sincronizzati e non modificati ──
        // Skip SOLO se: status=synced, nessun metafield fallito, esiste shopify_synced_at,
        // e ai_enriched_at <= shopify_synced_at. force=true bypassa tutto.
        if (!force && (sku || handle)) {
          try {
            const db = getSupabaseAdminClient();
            const orParts: string[] = [];
            if (sku)    orParts.push(`sku.eq.${sku}`);
            if (handle) orParts.push(`handle.eq.${handle}`);
            const { data: existing } = await db
              .from("product_sync_csv_products")
              .select("shopify_product_id, shopify_sync_status, shopify_synced_at, shopify_metafields_failed, ai_enriched_at")
              .or(orParts.join(","))
              .limit(1)
              .maybeSingle();

            if (
              existing &&
              existing.shopify_sync_status === "synced" &&
              existing.shopify_synced_at &&
              (!existing.shopify_metafields_failed || Number(existing.shopify_metafields_failed) === 0)
            ) {
              const enrichedAt = existing.ai_enriched_at ? new Date(existing.ai_enriched_at).getTime() : 0;
              const syncedAt = new Date(existing.shopify_synced_at).getTime();
              if (!enrichedAt || enrichedAt <= syncedAt) {
                console.log(`[update_product] short-circuit: sku=${sku} handle=${handle} already synced at ${existing.shopify_synced_at}`);
                result = {
                  success: true,
                  id: existing.shopify_product_id ?? null,
                  skipped: true,
                  reason: "already_synced",
                  sync_status: "synced",
                };
                break;
              }
            }
          } catch (e) {
            console.warn("[update_product] short-circuit precheck failed (procedo comunque):", (e as any)?.message || e);
          }
        }

        try {
          if (!resolvedId && (handle || sku)) {
            const lookup = await searchProductBySkuOrHandle({ handle, sku });
            if (lookup.found && lookup.id) {
              resolvedId = Number(lookup.id);
              resolvedBy = lookup.matchedBy || "lookup";
            }
          }
          if (!resolvedId) {
            throw new Error(
              `Prodotto non trovato su Shopify (id=${id}, handle=${handle || "n/a"}, sku=${sku || "n/a"}). Importa prima il CSV base o crea il prodotto.`,
            );
          }
          console.log(`[update_product] resolved id=${resolvedId} via ${resolvedBy} (input id=${id}, handle=${handle || "—"}${force ? ", force=true" : ""})`);

          let updatedId: any = resolvedId;
          // When metafields_only=true we skip productUpdate (body HTML / SEO) and
          // only push the 19 custom.* metafields. Used by the "Pubblica solo
          // metafield" action for products that already exist in Shopify (e.g.
          // imported via the base CSV) but lack metafield data.
          if (!metafields_only) {
            const updateRes = await shopifyAdminFetch(`products/${resolvedId}.json`, "PUT", {
              product: { ...productData, id: resolvedId },
            });
            updatedId = updateRes.product?.id;
          }
          let metafieldsResult: any;
          if (metafields && typeof metafields === "object") {
            metafieldsResult = await setProductCustomMetafields(Number(resolvedId), metafields as Record<string, string>, {
              debug: !!debug,
              maxRetries: typeof retries === "number" ? retries : undefined,
            });
          }

          // Determina status: skipped non sono errori; failed > 0 => partial
          const failedCount = metafieldsResult?.details
            ? metafieldsResult.details.filter((d: any) => d?.status === "failed").length
            : 0;
          const persistStatus: "synced" | "partial" = failedCount > 0 ? "partial" : "synced";

          // Best-effort persist
          await persistShopifySyncState({
            sku, handle,
            productId: resolvedId,
            resolvedBy,
            status: persistStatus,
            error: null,
            mode: metafields_only ? "metafields_only" : "full_publish",
            metafieldsReport: metafieldsResult ?? null,
          });

          result = {
            success: true,
            id: updatedId,
            resolved_by: resolvedBy,
            metafields: metafieldsResult,
            metafields_only: !!metafields_only,
            sync_status: persistStatus,
          };
        } catch (err: any) {
          // Persist failure state, then rethrow so caller still sees error
          await persistShopifySyncState({
            sku, handle,
            productId: resolvedId,
            resolvedBy,
            status: "failed",
            error: err?.message || String(err),
            mode: metafields_only ? "metafields_only" : "full_publish",
            metafieldsReport: null,
          });
          throw err;
        }
        break;
      }
      case "get_metafield_config":
        result = getMetafieldConfig();
        break;
      case "get_metafield_config_live":
        result = await getMetafieldConfigLive();
        break;
      case "list_shopify_metafield_definitions":
        result = await listShopifyMetafieldDefinitions();
        break;
      case "list_products":
        result = await listProducts(data);
        break;
      case "get_product":
        result = await getProduct(Number(data?.productId));
        break;
      case "list_drafts":
        result = await listDrafts(data);
        break;
      case "list_db_products":
        result = await listDbProducts(data);
        break;
      case "save_enriched_draft":
        result = await saveEnrichedDraft(data);
        break;
      case "generate_product_copy_draft":
        result = await generateProductCopyDraft(data, adminEmail);
        break;
      case "get_enriched_drafts":
        result = await getEnrichedDrafts(data);
        break;
      case "publish_product_copy":
        result = await publishProductCopyDraft(data);
        break;
      case "check_collection_handles": {
        // READ-ONLY: per ciascun handle ritorna { handle, exists, id?, title? }.
        // Usato dal dry-run categorie. NON crea, NON modifica nulla.
        const handles: string[] = Array.isArray(data?.handles) ? data.handles : [];
        const query = `query($handle: String!) {
          collectionByHandle(handle: $handle) { id handle title }
        }`;
        const out: Array<{ handle: string; exists: boolean; id?: string; title?: string; error?: string }> = [];
        for (const handle of handles) {
          try {
            const r: any = await shopifyAdminGraphQL(query, { handle });
            const c = r?.collectionByHandle;
            if (c) out.push({ handle, exists: true, id: c.id, title: c.title });
            else   out.push({ handle, exists: false });
          } catch (e: any) {
            out.push({ handle, exists: false, error: String(e?.message || e) });
          }
        }

        result = { results: out };
        break;
      }
      case "create_collections": {
        // WRITE LIMITATA: crea SOLO collezioni con handle nella allowlist e SOLO se mancanti.
        // Niente delete/rename/assegnazione prodotti. Mai logga token.
        const ALLOWED = new Set([
          "alberi-da-frutto","rose-paesaggistiche","rose-fiore-grande","bulbi",
          "arbusti","alberi","erbacee-perenni-graminacee","piante-da-siepe",
          "piante-grasse-succulente","aromatiche","rampicanti-arbusti-spalliera","conifere",
        ]);
        const items: Array<{ handle: string; title: string }> = Array.isArray(data?.items) ? data.items : [];
        const checkQ = `query($handle: String!) { collectionByHandle(handle: $handle) { id handle title } }`;
        const createM = `mutation($input: CollectionInput!) {
          collectionCreate(input: $input) {
            collection { id handle title }
            userErrors { field message }
          }
        }`;
        const created: Array<{ handle: string; id: string }> = [];
        const already_exists: Array<{ handle: string; id: string }> = [];
        const failed: Array<{ handle: string; error: string }> = [];
        const skipped: Array<{ handle: string; reason: string }> = [];
        for (const it of items) {
          if (!it?.handle || !ALLOWED.has(it.handle)) {
            skipped.push({ handle: String(it?.handle || ""), reason: "not_in_allowlist" });
            continue;
          }
          try {
            const r: any = await shopifyAdminGraphQL(checkQ, { handle: it.handle });
            const c = r?.collectionByHandle;
            if (c) { already_exists.push({ handle: it.handle, id: c.id }); continue; }
            const cr: any = await shopifyAdminGraphQL(createM, { input: { title: it.title, handle: it.handle } });
            const ue = cr?.collectionCreate?.userErrors || [];
            if (ue.length) { failed.push({ handle: it.handle, error: JSON.stringify(ue) }); continue; }
            const col = cr?.collectionCreate?.collection;
            if (col?.id) created.push({ handle: it.handle, id: col.id });
            else failed.push({ handle: it.handle, error: "no_collection_returned" });
          } catch (e: any) {
            failed.push({ handle: it.handle, error: String(e?.message || e) });
          }
        }
        result = { created, already_exists, failed, skipped };
        break;
      }

      default:
        return jsonResponse({ success: false, error: "Azione non valida" }, 400);
    }

    return jsonResponse(result);
  } catch (error: any) {
    const message = error?.message || "Errore durante l'operazione";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 401 : 500;
    console.error("Shopify proxy error:", error);
    return jsonResponse({ success: false, error: message }, status);
  }
});
