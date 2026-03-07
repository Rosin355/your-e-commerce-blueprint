function safeString(value) {
  return String(value ?? "").trim();
}

function normalizeArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((v) => safeString(v)).filter(Boolean))];
}

function clamp(value, max) {
  const s = safeString(value);
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trim()}…`;
}

function stripHtml(text) {
  return safeString(text).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeOutput(raw, input) {
  const fallbackDescription = safeString(input.descriptionHtml || input.shortDescription || "");
  return {
    title: safeString(raw?.title || input.title),
    descriptionHtml: safeString(raw?.descriptionHtml || fallbackDescription),
    seoTitle: clamp(raw?.seoTitle || input.title, 60),
    seoDescription: clamp(raw?.seoDescription || stripHtml(raw?.descriptionHtml || fallbackDescription), 155),
    imageAltText: safeString(raw?.imageAltText || input.title),
    tags: normalizeArray([...(raw?.tags || []), ...(input.tags || [])]),
    productType: safeString(raw?.productType || ""),
    googleProductCategory: safeString(raw?.googleProductCategory || ""),
    customLabels: {
      0: safeString(raw?.customLabels?.["0"] || ""),
      1: safeString(raw?.customLabels?.["1"] || ""),
      2: safeString(raw?.customLabels?.["2"] || ""),
      3: safeString(raw?.customLabels?.["3"] || ""),
      4: safeString(raw?.customLabels?.["4"] || ""),
    },
  };
}

function mockEnrichment(input) {
  const base = stripHtml(input.shortDescription || input.descriptionHtml || input.title);
  return {
    title: safeString(input.title),
    descriptionHtml: safeString(input.descriptionHtml || `<p>${safeString(base || input.title)}</p>`),
    seoTitle: clamp(input.title, 60),
    seoDescription: clamp(base, 155),
    imageAltText: safeString(input.title),
    tags: normalizeArray([...(input.tags || []), "ai-enriched"]),
    productType: safeString(input.categories?.[0] || ""),
    googleProductCategory: "",
    customLabels: {
      0: "draft",
      1: "woo-import",
      2: "",
      3: "",
      4: "",
    },
  };
}

async function withTimeout(task, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await task(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

async function httpEnrichment(input, context) {
  const endpoint = safeString(context.endpoint || process.env.AI_ENRICH_ENDPOINT);
  if (!endpoint) throw new Error("AI_ENRICH_ENDPOINT mancante");
  const apiKey = safeString(context.apiKey || process.env.AI_ENRICH_API_KEY);
  const timeoutMs = Number(context.timeoutMs || process.env.AI_ENRICH_TIMEOUT_MS || 30000);

  const response = await withTimeout(
    (signal) =>
      fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(input),
        signal,
      }),
    timeoutMs,
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI enrichment HTTP ${response.status}: ${text.slice(0, 300)}`);
  }

  const payload = await response.json();
  if (!payload || typeof payload !== "object") {
    throw new Error("AI enrichment response JSON non valido");
  }
  return payload;
}

export async function enrichProductContent(input, context = {}) {
  const mode = safeString(context.mode || process.env.AI_ENRICH_MODE || "mock").toLowerCase();
  if (mode === "disabled") return normalizeOutput({}, input);
  if (mode === "mock") return normalizeOutput(mockEnrichment(input), input);
  if (mode === "http") return normalizeOutput(await httpEnrichment(input, context), input);
  throw new Error(`AI_ENRICH_MODE non supportata: ${mode}`);
}

// backward-compatible adapter factory for previous scripts
export function createAiProductEnricher(env = process.env) {
  return {
    config: {
      mode: safeString(env.AI_ENRICH_MODE || "mock").toLowerCase(),
      endpoint: safeString(env.AI_ENRICH_ENDPOINT),
      apiKey: safeString(env.AI_ENRICH_API_KEY),
      timeoutMs: Number(env.AI_ENRICH_TIMEOUT_MS || 30000),
      concurrency: Math.max(1, Number(env.AI_ENRICH_CONCURRENCY || 2)),
    },
    async enrich(payload) {
      try {
        const enriched = await enrichProductContent(payload, env);
        return { enriched, usedFallback: false };
      } catch (error) {
        return {
          enriched: normalizeOutput({}, payload),
          usedFallback: true,
          warning: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}
