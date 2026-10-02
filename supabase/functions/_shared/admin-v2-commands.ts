// F5 — Command layer: ogni scrittura passa dalla funzione atomica DB.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import type { CommandAction } from "./admin-v2-types.ts";

export function writesEnabled(): boolean {
  return (Deno.env.get("PRODUCT_ADMIN_WRITES_ENABLED") ?? "false")
    .toLowerCase() === "true";
}

export type WriteMode = "canary" | "full";

/** F7 — modalità di scrittura decisa esclusivamente dal server. */
export function writeMode(): WriteMode {
  return (Deno.env.get("PRODUCT_ADMIN_WRITE_MODE") ?? "canary")
      .toLowerCase() === "full"
    ? "full"
    : "canary";
}

/** F7 — allowlist campi editabili in canary (oltre ai manual_only già configurati). */
export const CANARY_FIELD_KEYS = [
  "title",
  "short_description",
  "description",
  "seo_title",
  "seo_description",
  "optimized_description",
];

/** F7 — command consentiti in canary: nessun clear, nessuna operazione massiva. */
export const CANARY_ACTIONS = [
  "update_field",
  "confirm_legacy_value",
  "reject_legacy_value",
];

export function isCanaryField(
  def: { key: string; manual_only: boolean },
): boolean {
  return CANARY_FIELD_KEYS.includes(def.key) || def.manual_only === true;
}

/**
 * Canonicalizzazione ricorsiva JSON: ordina le chiavi degli oggetti a ogni
 * livello e conserva l'ordine degli array (significativo per FAQ e liste).
 */
export function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        // Comparatore a code point, indipendente dalla locale del runtime.
        .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .map(([key, nested]) => [key, canonicalizeJson(nested)]),
    );
  }
  return value;
}

/** Hash canonico ricorsivo del payload per l'idempotenza. */
export async function payloadHash(
  input: Record<string, unknown>,
): Promise<string> {
  const canonical = JSON.stringify(canonicalizeJson(input));
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface CommandInput {
  actor: string;
  action: CommandAction;
  productId: string;
  fieldKey: string;
  value: unknown;
  expectedVersion: number;
  idempotencyKey: string;
  actorLabel?: string | null;
}

interface ExistingCommand {
  payload_hash: string;
  result_json: Record<string, unknown>;
}

export type CommandReplayResolution =
  | { kind: "new"; payloadHash: string }
  | { kind: "replay"; payloadHash: string; result: Record<string, unknown> }
  | { kind: "conflict"; payloadHash: string };

/** Payload condiviso dal preflight Edge e dalla RPC: deve restare byte-equivalente. */
export function commandPayload(input: CommandInput): Record<string, unknown> {
  return {
    action: input.action,
    productId: input.productId,
    fieldKey: input.fieldKey,
    value: input.value ?? null,
    expectedVersion: input.expectedVersion,
  };
}

export async function commandPayloadHash(input: CommandInput): Promise<string> {
  return payloadHash(commandPayload(input));
}

/**
 * Distingue un replay applicato da un riuso illecito della stessa key.
 * Il result_json persistito è l'esito atomico della RPC, non un valore client.
 */
export function resolveCommandReplay(
  existing: ExistingCommand | null,
  incomingHash: string,
): CommandReplayResolution {
  if (!existing) return { kind: "new", payloadHash: incomingHash };
  if (existing.payload_hash !== incomingHash) {
    return { kind: "conflict", payloadHash: incomingHash };
  }
  return {
    kind: "replay",
    payloadHash: incomingHash,
    result: { ...existing.result_json, replayed: true },
  };
}

/**
 * Lookup read-only prima del version check Edge. La RPC ripete lo stesso gate
 * dentro la transazione, coprendo anche due richieste concorrenti.
 */
export async function lookupCommandReplay(
  db: SupabaseClient,
  input: CommandInput,
  knownHash?: string,
): Promise<CommandReplayResolution> {
  const hash = knownHash ?? await commandPayloadHash(input);
  const { data, error } = await db
    .from("product_admin_command_log")
    .select("payload_hash,result_json")
    .eq("actor", input.actor)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();

  if (error) throw error;
  return resolveCommandReplay((data as ExistingCommand | null) ?? null, hash);
}

/**
 * Converte il lookup in un esito riutilizzabile dai gate Edge pre/post RPC.
 * `null` significa che non esiste una command compatibile e il flusso normale
 * deve proseguire; questa helper non esegue mai write né retry della RPC.
 */
export async function reconcileCommandReplay(
  db: SupabaseClient,
  input: CommandInput,
  knownHash?: string,
): Promise<Record<string, unknown> | null> {
  const replay = await lookupCommandReplay(db, input, knownHash);
  if (replay.kind === "replay") return replay.result;
  if (replay.kind === "conflict") {
    return {
      ok: false,
      code: "IDEMPOTENCY_CONFLICT",
      message: "idempotencyKey già usata con un payload diverso",
    };
  }
  return null;
}

export async function executeCommand(db: SupabaseClient, input: CommandInput) {
  const hash = await commandPayloadHash(input);

  const { data, error } = await db.rpc("admin_update_product_field", {
    p_actor: input.actor,
    p_action: input.action,
    p_product_id: input.productId,
    p_field_key: input.fieldKey,
    p_value: input.value ?? null,
    p_expected_version: input.expectedVersion,
    p_idempotency_key: input.idempotencyKey,
    p_payload_hash: hash,
    p_actor_label: input.actorLabel ?? null,
  });

  if (error) throw error;
  const result = data as Record<string, unknown>;

  // Una request concorrente può aver mancato il lookup iniziale mentre la
  // prima transazione non era ancora committata. Solo dopo un VERSION_CONFLICT
  // rileggiamo una volta il command log; non ritentiamo mai la write.
  if (result?.ok === false && result.code === "VERSION_CONFLICT") {
    const replay = await reconcileCommandReplay(db, input, hash);
    if (replay) return replay;
  }

  return result;
}
