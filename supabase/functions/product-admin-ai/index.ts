// Fase 2D — proposte AI field-by-field. Nessuna chiamata Shopify e nessun publish.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  authenticate,
  AuthError,
  serviceClient,
} from "../product-admin-api/auth.ts";
import {
  canRead,
  canWrite,
  canWriteCanary,
} from "../product-admin-api/permissions.ts";
import {
  isCanaryField,
  writeMode,
  writesEnabled,
} from "../product-admin-api/commands.ts";
import { AiProviderError, callAiProvider } from "./provider.ts";
import {
  acceptAiSuggestion,
  type AiRepository,
  AiServiceError,
  createSupabaseAiRepository,
  generateAiSuggestion,
  listAiSuggestions,
  rejectAiSuggestion,
} from "./service.ts";
import type { AuthContext } from "../product-admin-api/types.ts";

type AiAction =
  | "get_ai_suggestions"
  | "generate_ai_suggestion"
  | "reject_ai_suggestion"
  | "accept_ai_suggestion";

const ACTIONS: AiAction[] = [
  "get_ai_suggestions",
  "generate_ai_suggestion",
  "reject_ai_suggestion",
  "accept_ai_suggestion",
];

export interface HandlerDependencies {
  authenticate: (req: Request) => Promise<AuthContext>;
  repository: () => AiRepository;
  generate: typeof callAiProvider;
  now: () => Date;
}

const DEFAULT_DEPS: HandlerDependencies = {
  authenticate,
  repository: () => createSupabaseAiRepository(serviceClient()),
  generate: callAiProvider,
  now: () => new Date(),
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const HTTP: Record<string, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  FIELD_NOT_EDITABLE: 422,
  AI_NOT_ALLOWED: 422,
  VALIDATION_ERROR: 422,
  VERSION_CONFLICT: 409,
  IDEMPOTENCY_CONFLICT: 409,
  SUGGESTION_STALE: 409,
  SUGGESTION_RESOLVED: 409,
  RATE_LIMITED: 429,
  AI_NOT_CONFIGURED: 503,
  AI_TIMEOUT: 504,
  AI_PROVIDER_ERROR: 502,
  MALFORMED_AI_OUTPUT: 502,
  WRITES_DISABLED: 503,
  INTERNAL_ERROR: 500,
};

function fail(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): Response {
  return json({
    ok: false,
    error: { code, message, ...(details ? { details } : {}) },
  }, HTTP[code] ?? 500);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );
}

async function requireAiWrite(
  repo: AiRepository,
  auth: AuthContext,
  action: Exclude<AiAction, "get_ai_suggestions">,
  payload: Record<string, unknown>,
): Promise<Response | null> {
  if (!canWrite(auth.roles)) {
    return fail("FORBIDDEN", "Ruolo senza permesso di modifica");
  }
  if (!writesEnabled()) {
    return fail(
      "WRITES_DISABLED",
      "Scritture Admin temporaneamente disabilitate",
    );
  }
  if (writeMode() === "canary" && !canWriteCanary(auth.roles)) {
    return fail(
      "FORBIDDEN",
      "Proposte AI riservate agli amministratori durante il canary",
    );
  }

  let fieldKey = typeof payload.fieldKey === "string" ? payload.fieldKey : null;
  if (
    !fieldKey &&
    (action === "accept_ai_suggestion" || action === "reject_ai_suggestion")
  ) {
    const suggestionId = payload.suggestionId;
    if (!isUuid(suggestionId)) {
      return fail("VALIDATION_ERROR", "suggestionId non valido");
    }
    const suggestion = await repo.getSuggestion(suggestionId);
    if (!suggestion) return fail("NOT_FOUND", "Proposta AI inesistente");
    fieldKey = suggestion.field_key;
  }
  if (!fieldKey) return fail("VALIDATION_ERROR", "fieldKey mancante");
  const def = await repo.getDefinition(fieldKey);
  if (!def) return fail("NOT_FOUND", "Field key non registrata");
  if (writeMode() === "canary" && !isCanaryField(def)) {
    return fail("AI_NOT_ALLOWED", "Campo non abilitato nel canary");
  }
  return null;
}

export async function handleProductAdminAi(
  req: Request,
  deps: HandlerDependencies = DEFAULT_DEPS,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return fail("VALIDATION_ERROR", "Metodo non supportato");
  }

  try {
    const payload = await req.json().catch(() => null) as
      | Record<string, unknown>
      | null;
    if (!payload || typeof payload !== "object") {
      return fail("VALIDATION_ERROR", "Payload non valido");
    }
    const action = payload.action as AiAction;
    if (!ACTIONS.includes(action)) {
      return fail("VALIDATION_ERROR", "Azione non riconosciuta");
    }

    const auth = await deps.authenticate(req);
    if (!canRead(auth.roles)) {
      return fail("FORBIDDEN", "Ruolo senza accesso Admin prodotti");
    }
    const repo = deps.repository();

    if (action === "get_ai_suggestions") {
      if (!isUuid(payload.productId)) {
        return fail("VALIDATION_ERROR", "productId non valido");
      }
      return json({
        ok: true,
        suggestions: await listAiSuggestions(repo, payload.productId),
      });
    }

    const denied = await requireAiWrite(repo, auth, action, payload);
    if (denied) return denied;

    if (action === "generate_ai_suggestion") {
      if (!isUuid(payload.productId)) {
        return fail("VALIDATION_ERROR", "productId non valido");
      }
      if (typeof payload.fieldKey !== "string" || !payload.fieldKey) {
        return fail("VALIDATION_ERROR", "fieldKey mancante");
      }
      if (
        !Number.isInteger(payload.baseVersion) ||
        (payload.baseVersion as number) < 1
      ) {
        return fail("VALIDATION_ERROR", "baseVersion non valida");
      }
      const result = await generateAiSuggestion(
        repo,
        {
          actor: auth.userId,
          productId: payload.productId,
          fieldKey: payload.fieldKey,
          baseVersion: payload.baseVersion as number,
        },
        deps.generate,
        deps.now(),
      );
      console.log(JSON.stringify({
        scope: "product-admin-ai",
        action,
        actor: `${auth.userId.slice(0, 8)}…`,
        fieldKey: payload.fieldKey,
        replayed: result.replayed,
        usageTokens: result.usageTokens,
      }));
      return json({
        ok: true,
        suggestion: result.suggestion,
        replayed: result.replayed,
      });
    }

    if (!isUuid(payload.suggestionId)) {
      return fail("VALIDATION_ERROR", "suggestionId non valido");
    }
    if (action === "reject_ai_suggestion") {
      const suggestion = await rejectAiSuggestion(repo, {
        actor: auth.userId,
        suggestionId: payload.suggestionId,
      });
      return json({ ok: true, suggestion });
    }

    if (
      !Number.isInteger(payload.expectedVersion) ||
      (payload.expectedVersion as number) < 1
    ) {
      return fail("VALIDATION_ERROR", "expectedVersion non valida");
    }
    if (
      typeof payload.idempotencyKey !== "string" ||
      payload.idempotencyKey.length < 8
    ) {
      return fail("VALIDATION_ERROR", "idempotencyKey mancante");
    }
    const accepted = await acceptAiSuggestion(repo, {
      actor: auth.userId,
      suggestionId: payload.suggestionId,
      value: payload.value,
      expectedVersion: payload.expectedVersion as number,
      idempotencyKey: payload.idempotencyKey,
    });
    return json({ ok: true, ...accepted });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.code, error.message);
    if (error instanceof AiProviderError || error instanceof AiServiceError) {
      return fail(
        error.code,
        error.message,
        error instanceof AiServiceError ? error.details : undefined,
      );
    }
    console.error(
      JSON.stringify({
        scope: "product-admin-ai",
        code: "INTERNAL_ERROR",
        hint: (error as Error)?.name,
      }),
    );
    return fail("INTERNAL_ERROR", "Errore interno");
  }
}

Deno.serve((req) => handleProductAdminAi(req));
