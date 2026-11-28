import type { EditorialKey, EditorialOptions } from '../_shared/admin-draft-editorial.ts';
import { descriptionSchema, selectionInstruction } from '../_shared/admin-ai-editorial-contract.ts';
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
    public httpStatus?: number,
  ) {
    super(message);
  }
}

function outputSchema(strategy: PromptStrategy): Record<string, unknown> {
  const suggested = strategy.id === 'verified-editorial-description' ? descriptionSchema : strategy.kind === "text"
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

interface GatewayCompletion {
  message?: unknown;
  error?: {message?: unknown};
  choices?: {message?: {tool_calls?: {function?: {name?: unknown; arguments?: unknown}}[]}}[];
  usage?: {total_tokens?: unknown};
}

interface ProviderOptions {
  fetchImpl?: typeof fetch;
  apiKey?: string | null;
  model?: string;
  timeoutMs?: number;
}

export function callAiProvider(strategy: PromptStrategy, context: AiTrustedContext, options: ProviderOptions = {}) {
  if (strategy.id === 'verified-editorial-description' || strategy.id === 'verified-field-revision') {
    return complete({
      system: strategy.instruction,
      user: JSON.stringify({ productName: context.productName, field:context.fieldKey, limit:strategy.maxOutputChars, revision:context.revision, facts: context.sourceAtoms ?? String(context.currentValue).split('\n').map((text, index) => ({ index, text })).filter(f => f.text) }),
    }, outputSchema(strategy), 'propose_field_improvement', options);
  }
  return complete(buildPrompt(strategy, context), outputSchema(strategy), 'propose_field_improvement', options);
}

export function callDraftSheetProvider(facts: string[], candidates: Partial<EditorialOptions>, options: ProviderOptions = {}, revision?: AiTrustedContext['revision']) {
  const indices = { type: 'array', items: { type: 'integer' } };
  const properties: Record<string, unknown> = {};
  for (const key of Object.keys(candidates) as EditorialKey[]) properties[key] = key === 'tags' ? indices : { type: 'integer' };
  const schema = { type: 'object', properties: { suggested_value: {
    type: 'object', properties, required: Object.keys(properties), additionalProperties: false,
  } }, required: ['suggested_value'], additionalProperties: false };
  const promptCandidates = { ...candidates, ...(candidates.seoDescription ? {
    seoDescription: candidates.seoDescription.map(value => {
      const index = facts.indexOf(value);
      return index >= 0 ? { fatto: index } : value;
    }),
  } : {}) };
  return complete({
    system: selectionInstruction,
    user: JSON.stringify({ description: facts, ...promptCandidates, revision }),
  }, schema, 'select_draft_editorial', options);
}

async function complete(prompt: {system: string; user: string}, schema: Record<string, unknown>,
  toolName: string, options: ProviderOptions): Promise<AiProviderResult> {
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
        max_tokens: toolName === "select_draft_editorial" ? 256 : 2_000,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        tools: [{
          type: "function",
          function: {
            name: toolName,
            description:
              "Restituisce la proposta editoriale secondo lo schema richiesto",
            parameters: schema,
          },
        }],
        tool_choice: {
          type: "function",
          function: { name: toolName },
        },
      }),
    });

    const payload = await response.json().catch(() => null) as GatewayCompletion | null;
    if (!response.ok) {
      throw new AiProviderError(
        "AI_PROVIDER_ERROR",
        typeof payload?.message === 'string' ? payload.message : typeof payload?.error?.message === 'string' ? payload.error.message : `Provider AI non disponibile (HTTP ${response.status})`,
        response.status,
      );
    }

    const calls = payload?.choices?.[0]?.message?.tool_calls;
    if (!Array.isArray(calls) || calls.length !== 1 || calls[0]?.function?.name !== toolName) {
      throw new AiProviderError('MALFORMED_AI_OUTPUT', 'Risposta editoriale priva della selezione richiesta');
    }
    const args = calls?.[0]?.function?.arguments;
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
    if (!parsed || typeof parsed !== "object" || !("suggested_value" in parsed)) {
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
