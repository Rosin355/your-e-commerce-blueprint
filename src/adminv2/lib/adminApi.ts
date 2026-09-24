// F6 — Unico canale dati dell'Admin: la Edge Function product-admin-api.
// Il browser non interroga mai direttamente le tabelle del catalogo.
import { supabase } from '@/integrations/supabase/client';
import { AdminApiError } from './AdminApiError';
export { AdminApiError } from './AdminApiError';

export type EntityType = 'simple' | 'variable' | 'variation';

export interface AdminContext {
  roles: string[];
  writesEnabled: boolean;
  writeMode?: 'canary' | 'full';
  canWrite: boolean;
  allowedActions?: string[];
  editableFieldKeys?: string[];
  canaryManualOnly?: boolean;
  readOnlyReason: string;
}

/** F7 — comandi ammessi in fase di collaudo. */
export type FieldCommandAction = 'update_field' | 'confirm_legacy_value' | 'reject_legacy_value';

export interface DashboardStats {
  products: { total: number; simple: number; variable: number; variation: number };
  values: { toReview: number; publishBlocked: number };
  quality: { toClassify: number; incomplete: number; errors: number };
  lastBaseline: {
    label: string;
    status: string;
    rows: number;
    createdAt: string;
    appliedAt: string | null;
  } | null;
}

export interface ProductSummary {
  productId: string;
  sku: string;
  title: string | null;
  entityType: EntityType;
  parentProductId: string | null;
  parentSku: string | null;
  mainImage: string | null;
  categoryEffective: string | null;
  reviewPendingCount: number;
  blockedCount: number;
  contentStatus: string;
  shopifyStatus: string;
  updatedAt: string;
}

export interface AdminField {
  key: string;
  label: string;
  group: string;
  editorType: string;
  dataType: string;
  value: unknown;
  baselineValue: unknown;
  sourceState: 'linked_snapshot' | 'unlinked_baseline' | 'original_absent';
  sourceSnapshotId: string | null;
  origin: string | null;
  reviewStatus: string | null;
  publishBlocked: boolean;
  protectedOnReimport: boolean;
  aiAllowed: boolean;
  manualOnly: boolean;
  required: boolean;
  appliesTo: 'product' | 'variant' | 'both';
  validationRules: Record<string, unknown>;
  publishable: boolean;
  editable: boolean;
  locked: boolean;
  version: number | null;
  helpText: string | null;
  capabilities: FieldCapabilities;
}

export type FieldCapabilityReason =
  | 'allowed'
  | 'writes_disabled'
  | 'role_forbidden'
  | 'not_applicable'
  | 'definition_readonly'
  | 'canary_field_not_allowed'
  | 'current_value_missing'
  | 'current_value_locked'
  | 'legacy_review_not_required'
  | 'phase_2c';

export interface FieldCapabilities {
  definitionEditable: boolean;
  manualOnly: boolean;
  isLocked: boolean;
  protectedOnReimport: boolean;
  aiAllowed: boolean;
  appliesTo: 'product' | 'variant' | 'both';
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

export interface AdminSection {
  key: string;
  label: string;
  fields: AdminField[];
}

export interface ProductDetail {
  product: {
    productId: string;
    sku: string;
    entityType: EntityType;
    parentProductId: string | null;
    parentSku: string | null;
    isActive: boolean;
    updatedAt: string;
  };
  sections: AdminSection[];
  history: HistoryEntry[];
}

export interface HistoryEntry {
  id: string;
  field_key: string;
  change_type: string;
  actor_label: string | null;
  created_at: string;
}

const MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: 'Sessione scaduta. Effettua di nuovo l’accesso.',
  FORBIDDEN: 'Il tuo account non ha accesso a questa sezione.',
  NOT_FOUND: 'Elemento non trovato.',
  WRITES_DISABLED: 'Le modifiche non sono ancora abilitate.',
  VERSION_CONFLICT:
    'Questo campo è stato modificato altrove nel frattempo. Ricarica la pagina e riprova.',
  IDEMPOTENCY_CONFLICT: 'Richiesta duplicata con contenuto diverso. Ricarica la pagina e riprova.',
  FIELD_NOT_EDITABLE: 'Questo campo non è modificabile.',
  REVIEW_STATE_INVALID: 'Il valore non è più in attesa di verifica.',
  INTERNAL_ERROR: 'Si è verificato un problema. Riprova tra qualche istante.',
};

export async function callAdminApi<T = unknown>(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new AdminApiError('UNAUTHENTICATED', MESSAGES.UNAUTHENTICATED);

  const { data, error } = await supabase.functions.invoke('product-admin-api', {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });

  if (signal?.aborted) throw new DOMException('Richiesta annullata', 'AbortError');

  if (error) {
    // La Edge Function restituisce il codice applicativo nel corpo anche con status != 200.
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const payload = await ctx.json();
        const code = payload?.error?.code ?? 'INTERNAL_ERROR';
        throw new AdminApiError(
          code,
          MESSAGES[code] ?? payload?.error?.message ?? MESSAGES.INTERNAL_ERROR,
          payload?.error?.details,
        );
      } catch (parsed) {
        if (parsed instanceof AdminApiError) throw parsed;
      }
    }
    throw new AdminApiError('INTERNAL_ERROR', MESSAGES.INTERNAL_ERROR);
  }

  if (data && (data as { ok?: boolean }).ok === false) {
    const code = (data as { error?: { code?: string } }).error?.code ?? 'INTERNAL_ERROR';
    const details = (data as { error?: { details?: Record<string, unknown> } }).error?.details;
    throw new AdminApiError(code, MESSAGES[code] ?? MESSAGES.INTERNAL_ERROR, details);
  }

  return data as T;
}

/** F7 — invio di un singolo comando campo; la chiave rende l'invio ripetibile senza duplicati. */
export async function sendFieldCommand(input: {
  action: FieldCommandAction;
  productId: string;
  fieldKey: string;
  value?: unknown;
  expectedVersion: number;
}): Promise<{ ok: boolean; code?: string; result?: Record<string, unknown> }> {
  return callAdminApi({
    action: input.action,
    productId: input.productId,
    fieldKey: input.fieldKey,
    value: input.value ?? null,
    expectedVersion: input.expectedVersion,
    idempotencyKey: crypto.randomUUID(),
  });
}
