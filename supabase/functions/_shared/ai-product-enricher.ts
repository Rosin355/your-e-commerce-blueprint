import type { CsvProductRow } from "./product-sync-types.ts";

interface EnrichedOutput {
  seoTitle: string;
  seoDescription: string;
  optimizedDescription: string;
  generatedImageUrl: string | null;
}

interface EnricherOptions {
  mode?: "mock" | "openai" | "disabled";
  timeoutMs?: number;
}

function clamp(value: string, max: number): string {
  return value.length > max ? value.slice(0, max).trim() : value;
}

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function mockOutput(product: CsvProductRow): EnrichedOutput {
  const title = normalizeText(product.title || product.sku);
  const description = normalizeText(product.description || `Prodotto ${title}`);

  return {
    seoTitle: clamp(`${title} | Online Garden`, 60),
    seoDescription: clamp(description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "), 155),
    optimizedDescription: `<p>${description}</p>`,
    generatedImageUrl: null,
  };
}

async function withTimeout<T>(promiseFactory: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await promiseFactory(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAI(prompt: string, signal: AbortSignal): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  const model = Deno.env.get("OPENAI_COPY_MODEL") || "gpt-4.1-mini";
  if (!apiKey) throw new Error("OPENAI_API_KEY mancante");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: "Sei un copywriter SEO e-commerce. Rispondi solo con JSON valido.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(JSON.stringify(payload?.error || payload));
  }

  return String(payload?.choices?.[0]?.message?.content || "{}");
}

function parseJson(content: string): Record<string, unknown> {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(content.slice(start, end + 1));
    }
    return {};
  }
}

function normalizeOpenAiOutput(raw: Record<string, unknown>, fallback: EnrichedOutput): EnrichedOutput {
  return {
    seoTitle: clamp(normalizeText(raw.seoTitle) || fallback.seoTitle, 60),
    seoDescription: clamp(normalizeText(raw.seoDescription) || fallback.seoDescription, 155),
    optimizedDescription: normalizeText(raw.optimizedDescription) || fallback.optimizedDescription,
    generatedImageUrl: normalizeText(raw.generatedImageUrl) || null,
  };
}

export async function generateSeoContent(
  product: CsvProductRow,
  options: EnricherOptions = {},
): Promise<Pick<EnrichedOutput, "seoTitle" | "seoDescription" | "optimizedDescription">> {
  const mode = options.mode || (Deno.env.get("AI_ENRICH_MODE") as EnricherOptions["mode"]) || "mock";
  const timeoutMs = options.timeoutMs || Number(Deno.env.get("AI_ENRICH_TIMEOUT_MS") || "8000");

  const fallback = mockOutput(product);
  if (mode === "disabled" || mode === "mock") {
    return {
      seoTitle: fallback.seoTitle,
      seoDescription: fallback.seoDescription,
      optimizedDescription: fallback.optimizedDescription,
    };
  }

  try {
    const prompt = JSON.stringify({
      task: "Genera contenuti SEO per scheda prodotto",
      input: {
        title: product.title,
        description: product.description,
        category: product.productCategory,
        tags: product.tags || [],
      },
      outputShape: {
        seoTitle: "string <=60",
        seoDescription: "string <=155",
        optimizedDescription: "html breve",
      },
    });

    const content = await withTimeout((signal) => callOpenAI(prompt, signal), timeoutMs);
    const normalized = normalizeOpenAiOutput(parseJson(content), fallback);

    return {
      seoTitle: normalized.seoTitle,
      seoDescription: normalized.seoDescription,
      optimizedDescription: normalized.optimizedDescription,
    };
  } catch {
    return {
      seoTitle: fallback.seoTitle,
      seoDescription: fallback.seoDescription,
      optimizedDescription: fallback.optimizedDescription,
    };
  }
}

export async function generateProductImage(
  product: CsvProductRow,
  options: EnricherOptions = {},
): Promise<{ generatedImageUrl: string | null }> {
  const mode = options.mode || (Deno.env.get("AI_ENRICH_MODE") as EnricherOptions["mode"]) || "mock";

  if (mode !== "openai") {
    return { generatedImageUrl: null };
  }

  const timeoutMs = options.timeoutMs || Number(Deno.env.get("AI_ENRICH_TIMEOUT_MS") || "8000");

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY mancante");

    const prompt = `Product hero image, e-commerce botanical style: ${normalizeText(product.title)}`;
    const payload = await withTimeout(async (signal) => {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt,
          size: "1024x1024",
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(JSON.stringify(json?.error || json));
      return json;
    }, timeoutMs);

    const imageUrl = String(payload?.data?.[0]?.url || "").trim();
    return { generatedImageUrl: imageUrl || null };
  } catch {
    return { generatedImageUrl: null };
  }
}
