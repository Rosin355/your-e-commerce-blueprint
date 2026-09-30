import {
  type AiTrustedContext,
  buildPrompt,
  type PromptStrategy,
} from "./ai-core.ts";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3-flash-preview";

export interface AiProviderResult {
  value: unknown;
  provider: "lovable";
  model: string;
  usageTokens: number | null;
}

export class AiProviderError extends Error {
  constructor(
    public code:
      | "AI_NOT_CONFIGURED"
      | "AI_TIMEOUT"
      | "AI_PROVIDER_ERROR"
      | "MALFORMED_AI_OUTPUT",
    message: string,
  ) {
    super(message);
  }
}

function outputSchema(strategy: PromptStrategy): Record<string, unknown> {
  const suggested = strategy.kind === "text"
    ? { type: "string" }
    : strategy.kind === "string_list"
    ? { type: "array", items: { type: "string" } }
    : {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
        },
        required: ["question", "answer"],
        additionalProperties: false,
      },
    };
  return {
    type: "object",
    properties: { suggested_value: suggested },
    required: ["suggested_value"],
    additionalProperties: false,
  };
}

export async function callAiProvider(
  strategy: PromptStrategy,
  context: AiTrustedContext,
  options: {
    fetchImpl?: typeof fetch;
    apiKey?: string | null;
    model?: string;
    timeoutMs?: number;
  } = {},
): Promise<AiProviderResult> {
  const apiKey = options.apiKey ?? Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    throw new AiProviderError(
      "AI_NOT_CONFIGURED",
      "Provider AI non configurato",
    );
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const model = options.model ?? Deno.env.get("ADMIN_AI_MODEL") ??
    DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs ??
    Number(Deno.env.get("ADMIN_AI_TIMEOUT_MS") ?? "12000");
  const prompt = buildPrompt(strategy, context);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(AI_GATEWAY, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 2_000,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        tools: [{
          type: "function",
          function: {
            name: "propose_field_improvement",
            description:
              "Propone un miglioramento sicuro per un solo campo prodotto",
            parameters: outputSchema(strategy),
          },
        }],
        tool_choice: {
          type: "function",
          function: { name: "propose_field_improvement" },
        },
      }),
    });

    const payload = await response.json().catch(() => null) as
      | Record<string, any>
      | null;
    if (!response.ok) {
      throw new AiProviderError(
        "AI_PROVIDER_ERROR",
        `Provider AI non disponibile (HTTP ${response.status})`,
      );
    }

    const args = payload?.choices?.[0]?.message?.tool_calls?.[0]?.function
      ?.arguments;
    if (typeof args !== "string") {
      throw new AiProviderError(
        "MALFORMED_AI_OUTPUT",
        "Risposta AI priva della proposta strutturata",
      );
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(args) as Record<string, unknown>;
    } catch {
      throw new AiProviderError(
        "MALFORMED_AI_OUTPUT",
        "Risposta AI non valida",
      );
    }
    if (!("suggested_value" in parsed)) {
      throw new AiProviderError(
        "MALFORMED_AI_OUTPUT",
        "Valore suggerito mancante",
      );
    }
    return {
      value: parsed.suggested_value,
      provider: "lovable",
      model,
      usageTokens: typeof payload?.usage?.total_tokens === "number"
        ? payload.usage.total_tokens
        : null,
    };
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    if ((error as Error)?.name === "AbortError") {
      throw new AiProviderError(
        "AI_TIMEOUT",
        "Il provider AI non ha risposto in tempo",
      );
    }
    throw new AiProviderError(
      "AI_PROVIDER_ERROR",
      "Provider AI non disponibile",
    );
  } finally {
    clearTimeout(timeout);
  }
}
