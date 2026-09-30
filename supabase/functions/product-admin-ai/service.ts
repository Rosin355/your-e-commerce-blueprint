import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import {
  type CommandInput,
  executeCommand,
  isCanaryField,
  reconcileCommandReplay,
} from "../product-admin-api/commands.ts";
import {
  getCurrentValue,
  getCurrentValues,
  getFieldDefinition,
  getProduct,
  getSourceBaseline,
  getSourceSnapshotsByIds,
} from "../product-admin-api/queries.ts";
import type {
  CurrentValueRow,
  FieldDefinition,
} from "../product-admin-api/types.ts";
import {
  currentValueOf,
  isFieldEditable,
  validateCommand,
} from "../product-admin-api/validation.ts";
import {
  aiDefinitionEligibility,
  type AiTrustedContext,
  aiValueEligibility,
  mapSuggestionStatus,
  strategyForField,
  validateSuggestedValue,
} from "./ai-core.ts";
import type { AiProviderResult } from "./provider.ts";

export interface AiSuggestionRow {
  id: string;
  sku: string;
  entity_type: "product" | "variant";
  product_id: string;
  field_key: string;
  suggestion_text: string | null;
  suggestion_json: unknown | null;
  model: string | null;
  prompt_hint: string | null;
  based_on_value: unknown | null;
  status: "pending" | "accepted" | "discarded" | "superseded";
  created_by: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  base_version: number | null;
  prompt_version: string | null;
}

export interface ProductRow {
  id: string;
  sku: string;
  entity_type: "simple" | "variable" | "variation";
  is_active: boolean;
}

export type GenerationReservation =
  | { code: "RESERVED"; reservationId: string }
  | {
    code: "GENERATION_IN_PROGRESS";
    reservationId: string;
    suggestionId: string | null;
  }
  | { code: "RATE_LIMITED" };

export interface AiRepository {
  getProduct(productId: string): Promise<ProductRow | null>;
  getDefinition(fieldKey: string): Promise<FieldDefinition | null>;
  getCurrent(
    productId: string,
    fieldKey: string,
  ): Promise<CurrentValueRow | null>;
  getContextValues(productId: string): Promise<CurrentValueRow[]>;
  getOriginal(
    productId: string,
    fieldKey: string,
    snapshotId: string | null,
  ): Promise<unknown | null>;
  listPending(productId: string): Promise<AiSuggestionRow[]>;
  getSuggestion(id: string): Promise<AiSuggestionRow | null>;
  reserveGeneration(input: {
    actor: string;
    productId: string;
    fieldKey: string;
    baseVersion: number;
  }): Promise<GenerationReservation>;
  completeGenerationReservation(
    reservationId: string,
    actor: string,
    outcome: "completed" | "failed",
    suggestionId?: string,
  ): Promise<void>;
  insertSuggestion(
    input: Omit<
      AiSuggestionRow,
      "id" | "created_at" | "resolved_at" | "resolved_by"
    >,
  ): Promise<AiSuggestionRow>;
  resolveSuggestion(
    id: string,
    status: "accepted" | "discarded" | "superseded",
    actor: string,
  ): Promise<boolean>;
  reconcileCommand(
    input: CommandInput,
  ): Promise<Record<string, unknown> | null>;
  executeCommand(input: CommandInput): Promise<Record<string, unknown>>;
}

const SUGGESTION_SELECT = [
  "id",
  "sku",
  "entity_type",
  "product_id",
  "field_key",
  "suggestion_text",
  "suggestion_json",
  "model",
  "prompt_hint",
  "based_on_value",
  "status",
  "created_by",
  "created_at",
  "resolved_at",
  "resolved_by",
  "base_version",
  "prompt_version",
].join(",");

export function createSupabaseAiRepository(db: SupabaseClient): AiRepository {
  return {
    async getProduct(productId) {
      return (await getProduct(db, productId)) as ProductRow | null;
    },
    getDefinition: (fieldKey) => getFieldDefinition(db, fieldKey),
    getCurrent: (productId, fieldKey) =>
      getCurrentValue(db, productId, fieldKey),
    getContextValues: (productId) =>
      getCurrentValues(db, [productId], [
        "title",
        "commercial_title",
        "description",
        "short_description",
        "nome_botanico",
        "category_effective",
        "product_category_raw",
      ]),
    async getOriginal(productId, fieldKey, snapshotId) {
      const snapshot = snapshotId
        ? (await getSourceSnapshotsByIds(db, productId, [snapshotId]))[0]
        : await getSourceBaseline(db, productId);
      const normalized = snapshot?.normalized;
      return normalized &&
          Object.prototype.hasOwnProperty.call(normalized, fieldKey)
        ? normalized[fieldKey]
        : null;
    },
    async listPending(productId) {
      const { data, error } = await db
        .from("product_ai_suggestions")
        .select(SUGGESTION_SELECT)
        .eq("product_id", productId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AiSuggestionRow[];
    },
    async getSuggestion(id) {
      const { data, error } = await db
        .from("product_ai_suggestions")
        .select(SUGGESTION_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as AiSuggestionRow | null;
    },
    async reserveGeneration(input) {
      const { data, error } = await db.rpc("reserve_product_ai_generation", {
        p_actor: input.actor,
        p_product_id: input.productId,
        p_field_key: input.fieldKey,
        p_base_version: input.baseVersion,
      });
      if (error) throw error;
      const reservation = data as GenerationReservation;
      if (
        !reservation ||
        !["RESERVED", "GENERATION_IN_PROGRESS", "RATE_LIMITED"].includes(
          reservation.code,
        )
      ) {
        throw new Error("Invalid AI generation reservation response");
      }
      return reservation;
    },
    async completeGenerationReservation(
      reservationId,
      actor,
      outcome,
      suggestionId,
    ) {
      const { error } = await db
        .from("product_ai_generation_reservations")
        .update({
          status: outcome,
          suggestion_id: outcome === "completed" ? suggestionId : null,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", reservationId)
        .eq("actor", actor)
        .eq("status", "reserved");
      if (error) throw error;
    },
    async insertSuggestion(input) {
      const { data, error } = await db
        .from("product_ai_suggestions")
        .insert(input)
        .select(SUGGESTION_SELECT)
        .single();
      if (error) throw error;
      return data as unknown as AiSuggestionRow;
    },
    async resolveSuggestion(id, status, actor) {
      const { data, error } = await db
        .from("product_ai_suggestions")
        .update({
          status,
          resolved_at: new Date().toISOString(),
          resolved_by: actor,
        })
        .eq("id", id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (error) throw error;
      return data !== null;
    },
    reconcileCommand: (input) => reconcileCommandReplay(db, input),
    executeCommand: (input) => executeCommand(db, input),
  };
}

export type AiServiceErrorCode =
  | "NOT_FOUND"
  | "FIELD_NOT_EDITABLE"
  | "AI_NOT_ALLOWED"
  | "VALIDATION_ERROR"
  | "VERSION_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "SUGGESTION_STALE"
  | "SUGGESTION_RESOLVED"
  | "GENERATION_IN_PROGRESS"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export class AiServiceError extends Error {
  constructor(
    public code: AiServiceErrorCode,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export interface PublicAiSuggestion {
  id: string;
  productId: string;
  fieldKey: string;
  suggestedValue: unknown;
  baseVersion: number;
  promptVersion: string;
  model: string | null;
  status: "pending" | "accepted" | "rejected" | "stale";
  createdAt: string;
}

function suggestionValue(row: AiSuggestionRow): unknown {
  return row.suggestion_json !== null && row.suggestion_json !== undefined
    ? row.suggestion_json
    : row.suggestion_text;
}

export function serializeSuggestion(
  row: AiSuggestionRow,
  currentVersion: number | null,
): PublicAiSuggestion {
  return {
    id: row.id,
    productId: row.product_id,
    fieldKey: row.field_key,
    suggestedValue: suggestionValue(row),
    baseVersion: row.base_version ?? 0,
    promptVersion: row.prompt_version ?? "legacy-unknown",
    model: row.model,
    status: mapSuggestionStatus(row.status, row.base_version, currentVersion),
    createdAt: row.created_at,
  };
}

function compactValue(value: unknown, max = 8_000): unknown {
  if (typeof value === "string") return value.slice(0, max);
  const json = JSON.stringify(value ?? null);
  if (json.length <= max) return value;
  return null;
}

async function trustedContext(
  repo: AiRepository,
  product: ProductRow,
  def: FieldDefinition,
  row: CurrentValueRow,
): Promise<AiTrustedContext> {
  const relatedRows = await repo.getContextValues(product.id);
  const related: Record<string, unknown> = {};
  for (const contextRow of relatedRows) {
    if (contextRow.field_key === def.key) continue;
    const value = compactValue(currentValueOf(contextRow), 2_000);
    if (value !== null && value !== undefined && value !== "") {
      related[contextRow.field_key] = value;
    }
  }
  return {
    sku: product.sku,
    fieldKey: def.key,
    fieldLabel: def.label,
    currentValue: compactValue(currentValueOf(row)),
    wordpressOriginal: compactValue(
      await repo.getOriginal(product.id, def.key, row.source_snapshot_id),
    ),
    sourceSnapshotId: row.source_snapshot_id,
    trustedRelatedValues: related,
  };
}

async function loadEligibleTarget(
  repo: AiRepository,
  productId: string,
  fieldKey: string,
) {
  const [product, def, row] = await Promise.all([
    repo.getProduct(productId),
    repo.getDefinition(fieldKey),
    repo.getCurrent(productId, fieldKey),
  ]);
  if (!product) throw new AiServiceError("NOT_FOUND", "Prodotto inesistente");
  if (!def) throw new AiServiceError("NOT_FOUND", "Field key non registrata");
  if (!product.is_active) {
    throw new AiServiceError(
      "AI_NOT_ALLOWED",
      "Prodotto non attivo",
      { reason: "product_inactive" },
    );
  }
  const applies = def.applies_to === "both" ||
    (product.entity_type === "variation"
      ? def.applies_to === "variant"
      : def.applies_to === "product");
  if (!applies) {
    throw new AiServiceError(
      "AI_NOT_ALLOWED",
      "Campo non applicabile al tipo prodotto",
      {
        reason: "not_applicable",
      },
    );
  }
  if (!isFieldEditable(def).ok) {
    throw new AiServiceError("FIELD_NOT_EDITABLE", "Campo non modificabile");
  }
  const definitionReason = aiDefinitionEligibility(def);
  if (definitionReason !== "allowed") {
    throw new AiServiceError(
      "AI_NOT_ALLOWED",
      "Campo non abilitato alle proposte AI",
      { reason: definitionReason },
    );
  }
  const valueReason = aiValueEligibility(def, row ?? undefined);
  if (valueReason !== "allowed") {
    throw new AiServiceError(
      "AI_NOT_ALLOWED",
      "Valore non idoneo a una proposta AI sicura",
      { reason: valueReason },
    );
  }
  return { product, def, row: row!, strategy: strategyForField(fieldKey)! };
}

export async function listAiSuggestions(
  repo: AiRepository,
  productId: string,
): Promise<PublicAiSuggestion[]> {
  const product = await repo.getProduct(productId);
  if (!product) throw new AiServiceError("NOT_FOUND", "Prodotto inesistente");
  const rows = await repo.listPending(productId);
  return await Promise.all(rows.map(async (suggestion) => {
    const current = await repo.getCurrent(productId, suggestion.field_key);
    return serializeSuggestion(suggestion, current?.version ?? 0);
  }));
}

export async function generateAiSuggestion(
  repo: AiRepository,
  input: {
    actor: string;
    productId: string;
    fieldKey: string;
    baseVersion: number;
  },
  generate: (
    strategy: NonNullable<ReturnType<typeof strategyForField>>,
    context: AiTrustedContext,
  ) => Promise<AiProviderResult>,
): Promise<
  {
    suggestion: PublicAiSuggestion;
    replayed: boolean;
    usageTokens: number | null;
  }
> {
  const { product, def, row, strategy } = await loadEligibleTarget(
    repo,
    input.productId,
    input.fieldKey,
  );
  if (input.baseVersion !== row.version) {
    throw new AiServiceError(
      "VERSION_CONFLICT",
      "Il valore è stato modificato da un altro utente",
      {
        currentVersion: row.version,
      },
    );
  }

  const pending = (await repo.listPending(product.id)).find((item) =>
    item.field_key === def.key
  );
  if (pending && pending.base_version === row.version) {
    return {
      suggestion: serializeSuggestion(pending, row.version),
      replayed: true,
      usageTokens: null,
    };
  }
  if (pending) {
    await repo.resolveSuggestion(pending.id, "superseded", input.actor);
  }

  // Prepariamo il contesto prima della reservation: soltanto una richiesta che
  // è pronta a chiamare il provider deve consumare uno slot.
  const context = await trustedContext(repo, product, def, row);
  const reservation = await repo.reserveGeneration({
    actor: input.actor,
    productId: product.id,
    fieldKey: def.key,
    baseVersion: row.version,
  });
  if (reservation.code === "RATE_LIMITED") {
    throw new AiServiceError(
      "RATE_LIMITED",
      "Troppe proposte in un minuto. Attendi e riprova.",
    );
  }
  if (reservation.code === "GENERATION_IN_PROGRESS") {
    const reservedSuggestion = reservation.suggestionId
      ? await repo.getSuggestion(reservation.suggestionId)
      : null;
    const replay = reservedSuggestion?.status === "pending"
      ? reservedSuggestion
      : (await repo.listPending(product.id)).find((item) =>
        item.field_key === def.key && item.base_version === row.version
      );
    if (replay) {
      return {
        suggestion: serializeSuggestion(replay, row.version),
        replayed: true,
        usageTokens: null,
      };
    }
    throw new AiServiceError(
      "GENERATION_IN_PROGRESS",
      "Una proposta equivalente è già in preparazione",
    );
  }

  try {
    const provider = await generate(strategy, context);
    const checked = validateSuggestedValue(def, strategy, provider.value);
    if (!checked.ok) {
      throw new AiServiceError("VALIDATION_ERROR", checked.reason);
    }

    const value = checked.value;
    const created = await repo.insertSuggestion({
      sku: product.sku,
      entity_type: product.entity_type === "variation" ? "variant" : "product",
      product_id: product.id,
      field_key: def.key,
      suggestion_text: typeof value === "string" ? value : null,
      suggestion_json: typeof value === "string" ? null : value,
      model: `${provider.provider}/${provider.model}`,
      prompt_hint: strategy.id,
      based_on_value: currentValueOf(row),
      status: "pending",
      created_by: input.actor,
      base_version: row.version,
      prompt_version: strategy.version,
    });
    // La suggestion pending è già la sorgente autoritativa per eventuali
    // replay: un errore di audit non deve trasformare un successo in retry.
    await repo.completeGenerationReservation(
      reservation.reservationId,
      input.actor,
      "completed",
      created.id,
    ).catch(() => undefined);
    return {
      suggestion: serializeSuggestion(created, row.version),
      replayed: false,
      usageTokens: provider.usageTokens,
    };
  } catch (error) {
    await repo.completeGenerationReservation(
      reservation.reservationId,
      input.actor,
      "failed",
    ).catch(() => undefined);
    throw error;
  }
}

async function transitionPendingSuggestion(
  repo: AiRepository,
  suggestion: AiSuggestionRow,
  status: "accepted" | "discarded" | "superseded",
  actor: string,
): Promise<AiSuggestionRow> {
  if (suggestion.status !== "pending") return suggestion;
  const changed = await repo.resolveSuggestion(suggestion.id, status, actor);
  if (changed) {
    suggestion.status = status;
    return suggestion;
  }
  return await repo.getSuggestion(suggestion.id) ?? suggestion;
}

export async function rejectAiSuggestion(
  repo: AiRepository,
  input: { actor: string; suggestionId: string },
): Promise<PublicAiSuggestion> {
  const suggestion = await repo.getSuggestion(input.suggestionId);
  if (!suggestion) {
    throw new AiServiceError("NOT_FOUND", "Proposta AI inesistente");
  }
  const current = await repo.getCurrent(
    suggestion.product_id,
    suggestion.field_key,
  );
  if (suggestion.status === "accepted") {
    throw new AiServiceError(
      "SUGGESTION_RESOLVED",
      "La proposta è già stata accettata",
    );
  }
  if (suggestion.status === "pending") {
    const latest = await transitionPendingSuggestion(
      repo,
      suggestion,
      "discarded",
      input.actor,
    );
    if (latest.status === "accepted") {
      throw new AiServiceError(
        "SUGGESTION_RESOLVED",
        "La proposta è già stata accettata",
      );
    }
    return serializeSuggestion(latest, current?.version ?? 0);
  }
  return serializeSuggestion(suggestion, current?.version ?? 0);
}

export async function acceptAiSuggestion(
  repo: AiRepository,
  input: {
    actor: string;
    suggestionId: string;
    value: unknown;
    expectedVersion: number;
    idempotencyKey: string;
    canaryOnly?: boolean;
  },
): Promise<
  { result: Record<string, unknown>; suggestion: PublicAiSuggestion }
> {
  const suggestion = await repo.getSuggestion(input.suggestionId);
  if (!suggestion) {
    throw new AiServiceError("NOT_FOUND", "Proposta AI inesistente");
  }
  const command: CommandInput = {
    actor: input.actor,
    action: "update_field",
    productId: suggestion.product_id,
    fieldKey: suggestion.field_key,
    value: input.value,
    expectedVersion: input.expectedVersion,
    idempotencyKey: input.idempotencyKey,
  };

  // Il replay esatto precede ogni gate AI mutabile e non richiama la RPC.
  const replay = await repo.reconcileCommand(command);
  if (replay?.ok === false) {
    throw new AiServiceError("IDEMPOTENCY_CONFLICT", String(replay.message));
  }
  if (replay) {
    const replaySuggestion = await transitionPendingSuggestion(
      repo,
      suggestion,
      "accepted",
      input.actor,
    );
    const current = await repo.getCurrent(
      suggestion.product_id,
      suggestion.field_key,
    );
    return {
      result: replay,
      suggestion: serializeSuggestion(replaySuggestion, current?.version ?? 0),
    };
  }

  const { def, row } = await loadEligibleTarget(
    repo,
    suggestion.product_id,
    suggestion.field_key,
  );
  if (input.canaryOnly && !isCanaryField(def)) {
    throw new AiServiceError(
      "AI_NOT_ALLOWED",
      "Campo non abilitato nel canary",
    );
  }
  if (input.expectedVersion !== suggestion.base_version) {
    throw new AiServiceError(
      "VALIDATION_ERROR",
      "expectedVersion diversa dalla base della proposta",
    );
  }

  if (suggestion.status !== "pending") {
    throw new AiServiceError(
      "SUGGESTION_RESOLVED",
      "La proposta è già stata risolta",
    );
  }
  if (row.version !== suggestion.base_version) {
    await transitionPendingSuggestion(
      repo,
      suggestion,
      "superseded",
      input.actor,
    );
    throw new AiServiceError(
      "SUGGESTION_STALE",
      "Il prodotto è cambiato dopo la proposta",
      {
        currentVersion: row.version,
      },
    );
  }

  const validation = validateCommand("update_field", def, row, input.value, {
    expectedVersion: input.expectedVersion,
    allowLockedManual: false,
  });
  if (!validation.ok) {
    const code = validation.code === "FIELD_NOT_EDITABLE"
      ? "FIELD_NOT_EDITABLE"
      : "VALIDATION_ERROR";
    throw new AiServiceError(
      code,
      validation.message ?? "Valore proposto non valido",
    );
  }

  const result = await repo.executeCommand(command);
  if (result?.ok === false) {
    if (result.code === "VERSION_CONFLICT") {
      // Dopo l'ingresso nella RPC un accept concorrente può avere già applicato
      // il valore, ma non avere ancora marcato la suggestion come accepted.
      // Non trasformiamo quindi il pending in superseded in questa finestra:
      // il winner completerà la transizione. Un vero stale resta comunque
      // rifiutato e viene esposto come tale dal confronto delle versioni.
      throw new AiServiceError(
        "SUGGESTION_STALE",
        "Il prodotto è cambiato dopo la proposta",
        {
          currentVersion: result.currentVersion,
        },
      );
    }
    if (result.code === "IDEMPOTENCY_CONFLICT") {
      throw new AiServiceError(
        "IDEMPOTENCY_CONFLICT",
        String(result.message ?? "Conflitto idempotenza"),
      );
    }
    throw new AiServiceError(
      "INTERNAL_ERROR",
      String(result.message ?? "Aggiornamento rifiutato"),
    );
  }

  const acceptedSuggestion = await transitionPendingSuggestion(
    repo,
    suggestion,
    "accepted",
    input.actor,
  );
  return {
    result,
    suggestion: serializeSuggestion(
      acceptedSuggestion,
      (result.version as number | undefined) ?? row.version + 1,
    ),
  };
}
