// Fase 2B — Capability field-by-field calcolate esclusivamente sul server.
import { canManageLockedManualValues, canWrite, canWriteCanary } from "./permissions.ts";
import { isCanaryField, type WriteMode } from "./commands.ts";
import { isFieldEditable } from "./validation.ts";
import type { AppRole, CurrentValueRow, FieldDefinition } from "./types.ts";

export type ProductEntityType = "simple" | "variable" | "variation";

export type FieldCapabilityReason =
  | "allowed"
  | "writes_disabled"
  | "role_forbidden"
  | "not_applicable"
  | "definition_readonly"
  | "canary_field_not_allowed"
  | "current_value_missing"
  | "current_value_locked"
  | "legacy_review_not_required"
  | "phase_2c";

export interface FieldCapabilities {
  definitionEditable: boolean;
  manualOnly: boolean;
  isLocked: boolean;
  protectedOnReimport: boolean;
  aiAllowed: boolean;
  appliesTo: FieldDefinition["applies_to"];
  applicable: boolean;
  currentValueExists: boolean;
  canUpdate: boolean;
  canConfirmLegacy: boolean;
  canRejectLegacy: boolean;
  canSuggestAi: boolean;
  updateBlockReason: FieldCapabilityReason;
  confirmLegacyBlockReason: FieldCapabilityReason;
  rejectLegacyBlockReason: FieldCapabilityReason;
  aiBlockReason: FieldCapabilityReason;
}

export interface CapabilityContext {
  roles: AppRole[];
  writesEnabled: boolean;
  writeMode: WriteMode;
}

/** Simple e variable/parent usano campi product; solo variation usa campi variant. */
export function appliesToEntity(
  appliesTo: FieldDefinition["applies_to"],
  entityType: ProductEntityType,
): boolean {
  if (appliesTo === "both") return true;
  if (entityType === "variation") return appliesTo === "variant";
  return appliesTo === "product";
}

function writeGate(
  def: FieldDefinition,
  row: CurrentValueRow | undefined,
  entityType: ProductEntityType,
  context: CapabilityContext,
): FieldCapabilityReason {
  if (!context.writesEnabled) return "writes_disabled";

  const roleAllowed = context.writeMode === "canary"
    ? canWriteCanary(context.roles)
    : canWrite(context.roles);
  if (!roleAllowed) return "role_forbidden";

  if (!appliesToEntity(def.applies_to, entityType)) return "not_applicable";
  if (!isFieldEditable(def).ok) return "definition_readonly";
  if (context.writeMode === "canary" && !isCanaryField(def)) {
    return "canary_field_not_allowed";
  }
  return "allowed";
}

export function calculateFieldCapabilities(
  def: FieldDefinition,
  row: CurrentValueRow | undefined,
  entityType: ProductEntityType,
  context: CapabilityContext,
): FieldCapabilities {
  const applicable = appliesToEntity(def.applies_to, entityType);
  const baseReason = writeGate(def, row, entityType, context);
  const locked = row?.is_locked === true;
  const legacyReview = row?.review_status === "legacy_unverified";
  const manualAdmin = def.manual_only && canManageLockedManualValues(context.roles);

  const updateReason = baseReason !== "allowed"
    ? baseReason
    : !row && !manualAdmin
      ? "current_value_missing"
      : locked && !manualAdmin
        ? "current_value_locked"
        : "allowed";

  // La RPC consente confirm_legacy_value anche quando is_locked=true.
  const confirmReason = baseReason !== "allowed"
    ? baseReason
    : !row
      ? "current_value_missing"
    : !legacyReview
      ? "legacy_review_not_required"
      : "allowed";

  // La RPC rifiuta reject_legacy_value sui current value locked.
  const rejectReason = baseReason !== "allowed"
    ? baseReason
    : !row
      ? "current_value_missing"
    : locked
      ? "current_value_locked"
      : !legacyReview
        ? "legacy_review_not_required"
        : "allowed";

  const effectiveAiAllowed = def.ai_allowed && !def.manual_only && applicable;

  return {
    definitionEditable: def.editable,
    manualOnly: def.manual_only,
    isLocked: locked,
    // La protezione è conservativa: una policy del registry non può essere
    // indebolita da un flag false eventualmente presente sulla singola riga.
    protectedOnReimport: def.protected_on_reimport || row?.protected_on_reimport === true,
    aiAllowed: effectiveAiAllowed,
    appliesTo: def.applies_to,
    applicable,
    currentValueExists: !!row,
    canUpdate: updateReason === "allowed",
    canConfirmLegacy: confirmReason === "allowed",
    canRejectLegacy: rejectReason === "allowed",
    canSuggestAi: false,
    updateBlockReason: updateReason,
    confirmLegacyBlockReason: confirmReason,
    rejectLegacyBlockReason: rejectReason,
    aiBlockReason: effectiveAiAllowed ? "phase_2c" : "definition_readonly",
  };
}
