// F5 — Command layer: ogni scrittura passa dalla funzione atomica DB.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import type { CommandAction } from "./types.ts";

export function writesEnabled(): boolean {
  return (Deno.env.get("PRODUCT_ADMIN_WRITES_ENABLED") ?? "false").toLowerCase() === "true";
}

export type WriteMode = "canary" | "full";

/** F7 — modalità di scrittura decisa esclusivamente dal server. */
export function writeMode(): WriteMode {
  return (Deno.env.get("PRODUCT_ADMIN_WRITE_MODE") ?? "canary").toLowerCase() === "full"
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
export const CANARY_ACTIONS = ["update_field", "confirm_legacy_value", "reject_legacy_value"];

export function isCanaryField(def: { key: string; manual_only: boolean }): boolean {
  return CANARY_FIELD_KEYS.includes(def.key) || def.manual_only === true;
}

/** Hash canonico del payload per l'idempotenza. */
export async function payloadHash(input: Record<string, unknown>): Promise<string> {
  const canonical = JSON.stringify(input, Object.keys(input).sort());
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
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

export async function executeCommand(db: SupabaseClient, input: CommandInput) {
  const hash = await payloadHash({
    action: input.action,
    productId: input.productId,
    fieldKey: input.fieldKey,
    value: input.value ?? null,
    expectedVersion: input.expectedVersion,
  });

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
  return data as Record<string, unknown>;
}
