import { OperationalError, UUID, type ProductDraft } from './admin-operational-core.ts';

export const CANARY_SCOPED_ACTIONS = [
  'update_field', 'confirm_legacy_value', 'reject_legacy_value', 'sync_field',
  'upload_catalog_image', 'save_new_product', 'create_shopify_draft', 'recover_shopify_draft', 'apply_categories',
] as const;

export interface CanaryScope {
  projectRef: string;
  approvalRef: string;
  actorId: string;
  sku: string;
  variantSkus: string[];
  requestKey: string;
  productId: string | null;
  shopifyProductId: string | null;
  actions: string[];
  fieldKeys: string[];
  expiresAt: string;
}

/** Only server configuration can grant a temporary scope. No body/JWT metadata overrides. */
export function parseCanaryScope(raw: string | undefined, now = Date.now()): CanaryScope | null {
  try {
    const s = JSON.parse(raw ?? 'null') as CanaryScope | null;
    if (!s || typeof s !== 'object' || Array.isArray(s)) return null;
    if (Object.keys(s).sort().join(',') !==
      'actions,actorId,approvalRef,expiresAt,fieldKeys,productId,projectRef,requestKey,shopifyProductId,sku,variantSkus') return null;
    const sku = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_.-]{1,80}$/.test(v);
    if (s.projectRef !== 'iekwvvihjwghosqdxrdi' || typeof s.approvalRef !== 'string' ||
      !s.approvalRef.trim() || s.approvalRef.length > 200 ||
      typeof s.actorId !== 'string' || !UUID.test(s.actorId) ||
      typeof s.requestKey !== 'string' || !UUID.test(s.requestKey) || !sku(s.sku)) return null;
    if (s.productId !== null && (typeof s.productId !== 'string' || !UUID.test(s.productId))) return null;
    if (s.shopifyProductId !== null && (typeof s.shopifyProductId !== 'string' ||
      !/^gid:\/\/shopify\/Product\/\d+$/.test(s.shopifyProductId))) return null;
    if (!Array.isArray(s.variantSkus) || !s.variantSkus.length || s.variantSkus.length > 50 ||
      !s.variantSkus.every(sku) || new Set(s.variantSkus.map(v => v.toLowerCase())).size !== s.variantSkus.length) return null;
    if (!Array.isArray(s.actions) || !s.actions.length || !s.actions.every(a =>
      (CANARY_SCOPED_ACTIONS as readonly unknown[]).includes(a)) || new Set(s.actions).size !== s.actions.length) return null;
    if (!Array.isArray(s.fieldKeys) || s.fieldKeys.length > 80 || !s.fieldKeys.every(k =>
      typeof k === 'string' && /^[a-z][a-z0-9_]{0,99}$/.test(k))) return null;
    if (typeof s.expiresAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(s.expiresAt)) return null;
    const expiry = Date.parse(s.expiresAt);
    return Number.isFinite(expiry) && expiry > now && expiry <= now + 86400000 ? s : null;
  } catch { return null; }
}

export function requireCanaryScope(scope: CanaryScope | null, actorId: string, roles: string[], action: string, fieldKey?: string) {
  if (!scope || scope.actorId !== actorId || !roles.some(r => r === 'admin' || r === 'tech_admin') ||
    !scope.actions.includes(action) || (fieldKey !== undefined && !scope.fieldKeys.includes(fieldKey))) {
    throw new OperationalError('FORBIDDEN', 'Canary non approvato per questo account, operazione o campo.');
  }
  return scope;
}

export function requireCanaryDraft(scope: CanaryScope, draft: ProductDraft, requestKey: unknown) {
  const approved = [...scope.variantSkus].sort();
  const actual = draft.variants.map(v => v.sku).sort();
  if (draft.sku !== scope.sku || requestKey !== scope.requestKey ||
    JSON.stringify(actual) !== JSON.stringify(approved)) {
    throw new OperationalError('FORBIDDEN', 'SKU o richiesta diversi dalla bozza approvata.');
  }
}

export function requireCanaryIdentity(scope: CanaryScope, product: { id: string; sku: string }, gid: string | null, status: string | null) {
  if (product.id !== scope.productId || product.sku !== scope.sku ||
    !gid || gid !== scope.shopifyProductId || status !== 'DRAFT') {
    throw new OperationalError('FORBIDDEN', 'Canary consentito soltanto sul prodotto DRAFT esplicitamente approvato.');
  }
}
