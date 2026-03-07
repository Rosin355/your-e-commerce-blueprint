/**
 * AI product enrichment adapter with 3 modes:
 * - disabled: passthrough
 * - mock: deterministic local enrichment
 * - http: POST to internal enrichment endpoint
 */

function clampText(value, max) {
  const s = String(value || "").trim();
  return s.length <= max ? s : `${s.slice(0, max - 1).trim()}…`;
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`AI timeout after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

function mockEnrich(payload) {
  const title = payload.title || "";
  const baseDesc = payload.descriptionHtml || payload.shortDescription || "";
  const seoTitle = clampText(title, 60);
  const seoDescription = clampText(baseDesc.replace(/<[^>]+>/g, " "), 155);
  return {
    title: title,
    descriptionHtml: baseDesc || `<p>${title}</p>`,
    seoTitle,
    seoDescription,
    imageAltText: title,
    tags: unique([...(payload.tags || []), "ai-enriched"]),
    productType: payload.categories?.[0] || "",
    googleProductCategory: "",
    customLabels: { 0: "draft", 1: "woo-import", 2: "", 3: "", 4: "" },
  };
}

async function httpEnrich(payload, config) {
  if (!config.endpoint) throw new Error("AI_ENRICH_ENDPOINT mancante");
  const response = await withTimeout(
    fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
    }),
    config.timeoutMs,
  );
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI endpoint HTTP ${response.status}: ${errText.slice(0, 300)}`);
  }
  return response.json();
}

function normalizeOutput(output, payload) {
  return {
    title: String(output?.title || payload.title || ""),
    descriptionHtml: String(output?.descriptionHtml || payload.descriptionHtml || payload.shortDescription || ""),
    seoTitle: String(output?.seoTitle || ""),
    seoDescription: String(output?.seoDescription || ""),
    imageAltText: String(output?.imageAltText || payload.title || ""),
    tags: unique([...(output?.tags || []), ...(payload.tags || [])]),
    productType: String(output?.productType || ""),
    googleProductCategory: String(output?.googleProductCategory || ""),
    customLabels: {
      0: String(output?.customLabels?.["0"] || ""),
      1: String(output?.customLabels?.["1"] || ""),
      2: String(output?.customLabels?.["2"] || ""),
      3: String(output?.customLabels?.["3"] || ""),
      4: String(output?.customLabels?.["4"] || ""),
    },
  };
}

export function createAiProductEnricher(env) {
  const mode = String(env.AI_ENRICH_MODE || "mock").toLowerCase();
  const timeoutMs = Number(env.AI_ENRICH_TIMEOUT_MS || 30000);
  const config = {
    mode,
    endpoint: env.AI_ENRICH_ENDPOINT || "",
    apiKey: env.AI_ENRICH_API_KEY || "",
    timeoutMs,
    concurrency: Math.max(1, Number(env.AI_ENRICH_CONCURRENCY || 2)),
  };

  async function enrich(payload) {
    if (mode === "disabled") return { enriched: normalizeOutput({}, payload), usedFallback: true };
    try {
      const raw = mode === "http" ? await httpEnrich(payload, config) : mockEnrich(payload);
      return { enriched: normalizeOutput(raw, payload), usedFallback: false };
    } catch (error) {
      return {
        enriched: normalizeOutput({}, payload),
        usedFallback: true,
        warning: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return { config, enrich };
}
