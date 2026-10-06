// F5 — Validazione campi e payload. Modulo puro e testabile.
import type {
  CommandAction,
  CurrentValueRow,
  FieldDefinition,
} from "./admin-v2-types.ts";
import {
  FieldPolicyError,
  isClientCreatableMissingFieldKey,
  isSeasonalField,
  validateConstrainedFieldValue,
} from "./admin-v2-field-policy.ts";

/** Gruppi mai modificabili in F5. */
export const PROTECTED_GROUPS = [
  "inventory",
  "shopify_state",
  "system",
  "other_imported",
];

/** Chiavi mai modificabili in F5 (identità prodotto e derivati). */
export const PROTECTED_KEYS = [
  "sku",
  "woo_product_id",
  "entity_type",
  "parent_sku",
  "handle",
  "product_category_raw",
  "category_effective",
  "raw_unmapped",
];

export interface ValidationResult {
  ok: boolean;
  code?:
    | "FIELD_NOT_EDITABLE"
    | "VALIDATION_ERROR"
    | "REVIEW_STATE_INVALID"
    | "NO_CHANGE";
  message?: string;
}

export function isFieldEditable(def: FieldDefinition): ValidationResult {
  if (!def.visible) {
    return {
      ok: false,
      code: "FIELD_NOT_EDITABLE",
      message: "campo non visibile",
    };
  }
  if (!def.editable) {
    return {
      ok: false,
      code: "FIELD_NOT_EDITABLE",
      message: "campo non modificabile",
    };
  }
  if (PROTECTED_GROUPS.includes(def.field_group)) {
    return {
      ok: false,
      code: "FIELD_NOT_EDITABLE",
      message: `gruppo protetto: ${def.field_group}`,
    };
  }
  if (PROTECTED_KEYS.includes(def.key)) {
    return {
      ok: false,
      code: "FIELD_NOT_EDITABLE",
      message: "campo di identità protetto",
    };
  }
  if (
    def.editor_type === "select" &&
    (!Array.isArray(def.validation_rules?.enum) || def.validation_rules.enum.length === 0)
  ) {
    return {
      ok: false,
      code: "FIELD_NOT_EDITABLE",
      message: "selezione priva di opzioni di dominio verificate",
    };
  }
  return { ok: true };
}

function ruleNumber(
  rules: Record<string, unknown>,
  key: string,
): number | undefined {
  const raw = rules?.[key];
  return typeof raw === "number" ? raw : undefined;
}

export function validateValue(
  def: FieldDefinition,
  value: unknown,
): ValidationResult {
  const rules = def.validation_rules ?? {};

  try {
    const normalized = validateConstrainedFieldValue(def.key, value);
    if (
      isSeasonalField(def.key) &&
      JSON.stringify(normalized) !== JSON.stringify(value)
    ) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "i mesi devono essere unici e nell’ordine da gennaio a dicembre",
      };
    }
  } catch (error) {
    if (error instanceof FieldPolicyError) {
      return { ok: false, code: "VALIDATION_ERROR", message: error.message };
    }
    throw error;
  }

  switch (def.data_type) {
    case "number": {
      if (typeof value !== "number" || Number.isNaN(value)) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "atteso un numero",
        };
      }
      const min = ruleNumber(rules, "min");
      const max = ruleNumber(rules, "max");
      if (min !== undefined && value < min) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: `valore minimo ${min}`,
        };
      }
      if (max !== undefined && value > max) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: `valore massimo ${max}`,
        };
      }
      return { ok: true };
    }
    case "boolean":
      return typeof value === "boolean"
        ? { ok: true }
        : { ok: false, code: "VALIDATION_ERROR", message: "atteso vero/falso" };
    case "array": {
      if (!Array.isArray(value)) {
        return { ok: false, code: "VALIDATION_ERROR", message: "attesa una lista" };
      }
      const allowed = rules?.["enum"];
      if (
        Array.isArray(allowed) &&
        value.some((entry) => typeof entry !== "string" || !allowed.includes(entry))
      ) {
        return { ok: false, code: "VALIDATION_ERROR", message: "uno o più valori non sono ammessi" };
      }
      if (new Set(value.map((entry) => JSON.stringify(entry))).size !== value.length) {
        return { ok: false, code: "VALIDATION_ERROR", message: "valori duplicati non ammessi" };
      }
      return { ok: true };
    }
    case "json":
      if (value === null || typeof value !== "object") {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "atteso un oggetto o una lista",
        };
      }
      if (def.key === "faq") {
        const validFaq = Array.isArray(value) && value.every((entry) => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            return false;
          }
          const item = entry as Record<string, unknown>;
          const keys = Object.keys(item).sort();
          return keys.length === 2 && keys[0] === "answer" &&
            keys[1] === "question" &&
            typeof item.question === "string" &&
            item.question.trim().length > 0 &&
            typeof item.answer === "string" && item.answer.trim().length > 0;
        });
        if (!validFaq) {
          return {
            ok: false,
            code: "VALIDATION_ERROR",
            message: "FAQ attese come lista di domanda e risposta",
          };
        }
      }
      return { ok: true };
    default: {
      if (typeof value !== "string") {
        return { ok: false, code: "VALIDATION_ERROR", message: "atteso testo" };
      }
      if (value.trim().length === 0) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "stringa vuota non ammessa: usa clear_field",
        };
      }
      const minLength = ruleNumber(rules, "minLength");
      const maxLength = ruleNumber(rules, "maxLength");
      if (minLength !== undefined && value.length < minLength) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: `minimo ${minLength} caratteri`,
        };
      }
      if (maxLength !== undefined && value.length > maxLength) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: `massimo ${maxLength} caratteri`,
        };
      }
      const pattern = rules?.["pattern"];
      if (typeof pattern === "string" && !new RegExp(pattern).test(value)) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "formato non valido",
        };
      }
      const allowed = rules?.["enum"];
      if (
        Array.isArray(allowed) && allowed.length && !allowed.includes(value)
      ) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "valore non ammesso",
        };
      }
      return { ok: true };
    }
  }
}

export function currentValueOf(row: CurrentValueRow): unknown {
  if (row.value_json !== null && row.value_json !== undefined) {
    return row.value_json;
  }
  if (row.value_number !== null && row.value_number !== undefined) {
    return row.value_number;
  }
  return row.value_text;
}

export function isNoChange(row: CurrentValueRow, next: unknown): boolean {
  const current = currentValueOf(row);
  return JSON.stringify(current ?? null) === JSON.stringify(next ?? null);
}

/** Validazione completa di un command prima di chiamare la funzione atomica. */
export function validateCommand(
  action: CommandAction,
  def: FieldDefinition,
  row: CurrentValueRow | undefined,
  value: unknown,
  opts: {
    confirm?: boolean;
    expectedVersion?: number;
    allowLockedManual?: boolean;
  } = {},
): ValidationResult {
  if (action === "sync_field") {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "la sincronizzazione usa il flusso Shopify dedicato",
    };
  }
  const editable = isFieldEditable(def);
  if (!editable.ok) return editable;

  if (typeof opts.expectedVersion !== "number" || opts.expectedVersion < 0) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "expectedVersion mancante",
    };
  }

  if (!row) {
    if (opts.expectedVersion !== 0) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "la creazione richiede expectedVersion=0",
      };
    }
    const manualCreateAllowed = def.manual_only &&
      opts.allowLockedManual === true;
    const clientCreateAllowed = !def.manual_only &&
      isClientCreatableMissingFieldKey(def.key);
    if (
      action !== "update_field" ||
      (!manualCreateAllowed && !clientCreateAllowed)
    ) {
      return {
        ok: false,
        code: "FIELD_NOT_EDITABLE",
        message: "valore corrente inesistente",
      };
    }
    return validateValue(def, value);
  }

  if (opts.expectedVersion < 1) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "expectedVersion non valida",
    };
  }

  // Rispecchia il gate effettivo della RPC atomica: l'unica azione ammessa
  // su una riga locked è la conferma esplicita di un valore legacy.
  if (
    row.is_locked && action !== "confirm_legacy_value" &&
    !(def.manual_only && opts.allowLockedManual === true &&
      (action === "update_field" || action === "clear_field"))
  ) {
    return {
      ok: false,
      code: "FIELD_NOT_EDITABLE",
      message: "valore bloccato",
    };
  }

  if (action === "update_field") {
    const valid = validateValue(def, value);
    if (!valid.ok) return valid;
    if (isNoChange(row, value)) {
      return { ok: false, code: "NO_CHANGE", message: "nessuna modifica" };
    }
    return { ok: true };
  }

  if (action === "clear_field") {
    if (def.required) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "campo obbligatorio: non svuotabile",
      };
    }
    if (opts.confirm !== true) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "conferma esplicita mancante",
      };
    }
    if (currentValueOf(row) === null || currentValueOf(row) === undefined) {
      return { ok: false, code: "NO_CHANGE", message: "campo già vuoto" };
    }
    return { ok: true };
  }

  // confirm_legacy_value / reject_legacy_value
  if (row.review_status !== "legacy_unverified") {
    return {
      ok: false,
      code: "REVIEW_STATE_INVALID",
      message: "il valore non è in stato legacy_unverified",
    };
  }
  return { ok: true };
}

export function normalizePageSize(
  raw: unknown,
  max = 50,
  fallback = 25,
): number {
  const n = typeof raw === "number" ? Math.floor(raw) : fallback;
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}
