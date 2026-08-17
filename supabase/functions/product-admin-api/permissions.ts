// F5 — Autorizzazione server-side. Modulo puro e testabile.
import type { ApiAction, AppRole } from "./types.ts";

export const READ_ACTIONS: ApiAction[] = [
  "list_products",
  "get_product",
  "get_field_definitions",
  "get_product_history",
  "get_source_baseline",
  "validate_field_update",
  "get_admin_context",
  "get_dashboard_stats",
];

export const COMMAND_ACTIONS: ApiAction[] = [
  "update_field",
  "clear_field",
  "confirm_legacy_value",
  "reject_legacy_value",
];

export const ALL_ACTIONS: ApiAction[] = [...READ_ACTIONS, ...COMMAND_ACTIONS];

export function isKnownAction(action: unknown): action is ApiAction {
  return typeof action === "string" && (ALL_ACTIONS as string[]).includes(action);
}

export function isCommandAction(action: ApiAction): boolean {
  return (COMMAND_ACTIONS as string[]).includes(action);
}

/** Ruoli che possono leggere l'Admin prodotti. */
const READ_ROLES: AppRole[] = ["admin", "tech_admin", "editor", "publisher"];

/** Ruoli che possono modificare i valori prodotto. */
const WRITE_ROLES: AppRole[] = ["admin", "tech_admin", "editor"];

export function canRead(roles: AppRole[]): boolean {
  return roles.some((r) => READ_ROLES.includes(r));
}

export function canWrite(roles: AppRole[]): boolean {
  return roles.some((r) => WRITE_ROLES.includes(r));
}

/**
 * Publisher da solo NON scrive in F5 (e non pubblica: la pubblicazione non è in scope).
 * Publisher + editor → può scrivere grazie al ruolo editor.
 */
export function authorizeAction(action: ApiAction, roles: AppRole[]): {
  allowed: boolean;
  reason?: string;
} {
  if (!roles.length) return { allowed: false, reason: "nessun ruolo assegnato" };
  if (!canRead(roles)) return { allowed: false, reason: "ruolo senza accesso Admin prodotti" };
  if (isCommandAction(action) && !canWrite(roles)) {
    return { allowed: false, reason: "ruolo senza permesso di modifica" };
  }
  return { allowed: true };
}
