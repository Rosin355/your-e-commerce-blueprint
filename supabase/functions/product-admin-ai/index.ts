import { getFieldDefinitions } from '../_shared/admin-v2-queries.ts';
import { generateDraftSheet } from './draft-sheet.ts';
import { registryKeys, safeLabel } from '../_shared/admin-draft-editorial.ts';
import { ConfirmedProposalError, authorizeConfirmedAi, confirmedFacts, generateConfirmedProposal } from '../_shared/admin-ai-confirmed.ts';
import { payloadHash } from '../_shared/admin-v2-commands.ts';
import { loadCatalogGrant, catalogMode } from '../_shared/admin-catalog-approvals.ts';
import { catalogAiAllowed, catalogAllowed } from '../_shared/admin-catalog-policy.ts';
// Fase 2D — proposte AI field-by-field. Nessuna chiamata Shopify e nessun publish.
import { corsHeaders } from "../_shared/cors.ts";
import {
  authenticate,
  AuthError,
  serviceClient,
} from "../_shared/admin-v2-auth.ts";
import {
  canRead,
  canWrite,
  canWriteCanary,
} from "../_shared/admin-v2-permissions.ts";
import {
  isCanaryField,
  writeMode,
  writesEnabled,
} from "../_shared/admin-v2-commands.ts";
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
import type { AuthContext } from "../_shared/admin-v2-types.ts";

type AiAction =
  | "suggest_confirmed_field"
  | "get_ai_suggestions"
  | "generate_ai_suggestion"
  | "reject_ai_suggestion"
  | "accept_ai_suggestion";

const ACTIONS: AiAction[] = [
  "suggest_confirmed_field",
  "get_ai_suggestions",
  "generate_ai_suggestion",
  "reject_ai_suggestion",
  "accept_ai_suggestion",
];

export interface HandlerDependencies {
  authenticate: (req: Request) => Promise<AuthContext>;
  repository: () => AiRepository;
  generate: typeof callAiProvider;
}

const DEFAULT_DEPS: HandlerDependencies = {
  authenticate,
  repository: () => createSupabaseAiRepository(serviceClient()),
  generate: callAiProvider,
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
  INVALID_CONFIRMED_FACTS: 422,
  INVALID_MODEL_PROPOSAL: 502,
  INVALID_FIELD_VALUE: 422,
  VERSION_CONFLICT: 409,
  IDEMPOTENCY_CONFLICT: 409,
  SUGGESTION_STALE: 409,
  SUGGESTION_RESOLVED: 409,
  GENERATION_IN_PROGRESS: 409,
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
  if (catalogMode(auth) === "canary" && !canWriteCanary(auth.roles)) {
    return fail(
      "FORBIDDEN",
      "Proposte AI riservate agli amministratori durante il canary",
    );
  }

  if (catalogMode(auth) === "canary") {
    return fail("WRITES_DISABLED", "Le operazioni AI sono escluse dal canary DRAFT del Livello B");
  }

  let fieldKey = typeof payload.fieldKey === "string" ? payload.fieldKey : null;
  if (
    (action === "accept_ai_suggestion" || action === "reject_ai_suggestion")
  ) {
    const suggestionId = payload.suggestionId;
    if (!isUuid(suggestionId)) {
      return fail("VALIDATION_ERROR", "suggestionId non valido");
    }
    const suggestion = await repo.getSuggestion(suggestionId);
    if (!suggestion || suggestion.created_by !== auth.userId) return fail("NOT_FOUND", "Proposta AI non disponibile per questo account");
    fieldKey = suggestion.field_key;
  }
  if (!fieldKey || !catalogAiAllowed(auth, fieldKey)) return fail('FORBIDDEN', 'AI non autorizzata per questo account e campo.');
  // Un accept replay deve essere riconciliato dal service prima di qualsiasi
  // gate AI mutabile (stato prodotto/campo/valore e allowlist canary).
  if (action === "accept_ai_suggestion") return null;
  if (!fieldKey) return fail("VALIDATION_ERROR", "fieldKey mancante");
  const def = await repo.getDefinition(fieldKey);
  if (!def) return fail("NOT_FOUND", "Field key non registrata");
  if (catalogMode(auth) === "canary" && !isCanaryField(def)) {
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
    await loadCatalogGrant(serviceClient(), auth);
    const repo = deps.repository();
    if (action === 'suggest_confirmed_field') {
      const requestId = isUuid(payload.requestKey) ? payload.requestKey as string : crypto.randomUUID();
      const trace = { scope: 'product-admin-ai', action, requestId, field: null as string | null };
      function reject(code: string, stage: string, message: string) {
        console.warn(JSON.stringify({ ...trace, stage, code }));
        return fail(code, message, { requestId });
      }
      if (!writesEnabled()) return reject('WRITES_DISABLED', 'authorization', 'Assistenza AI temporaneamente disabilitata.');
      const sheet = Object.hasOwn(payload, 'draftTitle');
      if (sheet && Object.keys(payload).some(k => !['action','fieldKey','draftTitle','facts','requestKey','confirmed'].includes(k)))
        return reject('VALIDATION_ERROR', 'input', 'La scheda nuova accetta solo nome e fatti confermati.');
      if (sheet && (payload.fieldKey !== 'description' || typeof payload.draftTitle !== 'string' ||
        !safeLabel(payload.draftTitle) || payload.draftTitle.length > 255))
        return reject('VALIDATION_ERROR', 'input', 'Verifica il nome del prodotto.');
      const registry = sheet ? await getFieldDefinitions(serviceClient()) : undefined;
      const def = registry ? registry.find(d => d.key === 'description') ?? null :
        typeof payload.fieldKey === 'string' ? await repo.getDefinition(payload.fieldKey) : null;
      trace.field = def?.key ?? null;
      try { authorizeConfirmedAi(auth, def, action); }
      catch { return reject('FORBIDDEN', 'authorization', 'Azione AI non autorizzata per questo account e campo.'); }
      let facts: string[];
      try { facts = confirmedFacts(payload.facts, payload.confirmed); }
      catch { return reject('INVALID_CONFIRMED_FACTS', 'input', 'Verifica le righe inserite e confermale.'); }
      if (!isUuid(payload.requestKey)) return reject('VALIDATION_ERROR', 'request', 'Identificativo richiesta non valido.');
      const useDraft = sheet && catalogAllowed(auth, 'drafts') && Deno.env.get('PRODUCT_ADMIN_DRAFTS_ENABLED') === 'true';
      if (sheet && !useDraft) return reject('FORBIDDEN', 'authorization', 'Il tuo account non è abilitato alle nuove bozze.');
      let batch = useDraft && Deno.env.get('PRODUCT_ADMIN_DRAFT_AI_EDITORIAL_ENABLED') !== 'false';
      // The legacy RPC authorizes description alone. Additional inference requires
      // a transaction explicitly authorizing the individual fields for this actor.
      const hash = await payloadHash(sheet ? {facts, title:payload.draftTitle} : {facts});
      const reservation = {p_actor:auth.userId,p_request_key:payload.requestKey,p_context_hash:hash};
      const reserveDescription = () => serviceClient().rpc('reserve_confirmed_ai_request',{...reservation,p_field_key:def!.key,p_action:action});
      let result = batch
        ? await serviceClient().rpc('reserve_new_draft_editorial_v1', reservation)
        : await reserveDescription();
      // During rollout or rollback PostgREST can report the new routine absent.
      // No transaction was executed in this case. Every other error fails closed.
      if (batch && result.error?.code === 'PGRST202') {
        batch = false;
        result = await reserveDescription();
      }
      const {data: reserved, error} = result;
      if (error) {
        return error.code === '42501'
          ? reject('FORBIDDEN', 'reservation', 'Richiesta AI non autorizzata.')
          : reject('INTERNAL_ERROR', 'reservation', 'Impossibile verificare la prenotazione editoriale.');
      }
      if (reserved === false || (batch && reserved?.reserved === false)) return reject('RATE_LIMITED', 'reservation', 'Richiesta già inviata o limite raggiunto.');
      if (batch ? reserved?.reserved !== true || !Array.isArray(reserved.fields) : reserved !== true)
        return reject('INTERNAL_ERROR', 'reservation', 'Risposta di autorizzazione non valida.');
      try {
        const keys = Object.values(registryKeys).filter(key => key === 'tags' || catalogAllowed(auth, 'edit', key));
        const definitions = registry?.filter(d => keys.some(key => key === d.key)) ?? [];
        const authorizedFields = batch ? keys.filter(key => reserved.fields.includes(key) && (key === 'tags' || auth.catalogGrant?.fieldKeys.includes(key))) : [];
        const proposal = useDraft
          ? await generateDraftSheet(def!, facts, payload.draftTitle as string, definitions, authorizedFields, deps.generate)
          : await generateConfirmedProposal(def!, facts, deps.generate);
        if (proposal.source === 'confirmed_facts') {
          console.info(JSON.stringify({ ...trace, stage: 'fallback', code: 'INVALID_MODEL_PROPOSAL' }));
        }
        return json({ ok: true, ...proposal });
      } catch (error) {
        if (error instanceof ConfirmedProposalError) {
          return reject(error.code, error.code === 'INVALID_FIELD_VALUE' ? 'field' : 'model', error.message);
        }
        if (error instanceof AiProviderError) {
          return error.code === 'MALFORMED_AI_OUTPUT'
            ? reject('INVALID_MODEL_PROPOSAL', 'model', 'La risposta AI non contiene una proposta utilizzabile.')
            : reject(error.code, 'provider', error.message);
        }
        return reject('INTERNAL_ERROR', 'generation', 'Errore del servizio durante la preparazione della proposta.');
      }
    }

    if (action === "get_ai_suggestions") {
      if (!isUuid(payload.productId)) {
        return fail("VALIDATION_ERROR", "productId non valido");
      }
      return json({
        ok: true,
        suggestions: (await listAiSuggestions(repo, payload.productId, auth.userId)).filter(s => catalogAiAllowed(auth, s.fieldKey)),
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
      );
      console.log(JSON.stringify({
        scope: "product-admin-ai",
        action,
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
      canaryOnly: catalogMode(auth) === "canary",
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
