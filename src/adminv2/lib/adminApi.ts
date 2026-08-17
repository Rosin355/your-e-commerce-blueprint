// F6 — Unico canale dati dell'Admin: la Edge Function product-admin-api.
// Il browser non interroga mai direttamente le tabelle del catalogo.
import { supabase } from '@/integrations/supabase/client';

export type EntityType = 'simple' | 'variable' | 'variation';

export interface AdminContext {
  roles: string[];
  writesEnabled: boolean;
  canWrite: boolean;
  readOnlyReason: string;
}

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
  origin: string | null;
  reviewStatus: string | null;
  publishBlocked: boolean;
  protectedOnReimport: boolean;
  aiAllowed: boolean;
  manualOnly: boolean;
  publishable: boolean;
  editable: boolean;
  locked: boolean;
  helpText: string | null;
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

export class AdminApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

const MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: 'Sessione scaduta. Effettua di nuovo l’accesso.',
  FORBIDDEN: 'Il tuo account non ha accesso a questa sezione.',
  NOT_FOUND: 'Elemento non trovato.',
  WRITES_DISABLED: 'Le modifiche non sono ancora abilitate.',
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
        throw new AdminApiError(code, MESSAGES[code] ?? payload?.error?.message ?? MESSAGES.INTERNAL_ERROR);
      } catch (parsed) {
        if (parsed instanceof AdminApiError) throw parsed;
      }
    }
    throw new AdminApiError('INTERNAL_ERROR', MESSAGES.INTERNAL_ERROR);
  }

  if (data && (data as { ok?: boolean }).ok === false) {
    const code = (data as { error?: { code?: string } }).error?.code ?? 'INTERNAL_ERROR';
    throw new AdminApiError(code, MESSAGES[code] ?? MESSAGES.INTERNAL_ERROR);
  }

  return data as T;
}
