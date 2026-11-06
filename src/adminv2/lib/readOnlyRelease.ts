import type { AdminField } from './adminApi';
import { AdminApiError } from './AdminApiError';

// Immutable release boundary: never enabled through localStorage or a runtime flag.
// Backend flags remain authoritative and are displayed without alteration.
export const ADMIN_READ_ONLY_RELEASE = true;
export const ADMIN_READ_ONLY_VERSION = 'admin-readonly-20261106-r1';
export const READ_ONLY_RELEASE_NOTICE = 'Versione in sola lettura: puoi consultare il catalogo. Modifiche, nuove bozze e sincronizzazione non sono attive.';

const READ_ACTIONS = new Set([
  'get_admin_context', 'get_dashboard_stats', 'list_products', 'get_product', 'get_source_baseline',
]);

export function readOnlyRequest(body: Record<string, unknown>): Record<string, unknown> {
  if (!READ_ACTIONS.has(String(body.action))) {
    throw new AdminApiError('WRITES_DISABLED', READ_ONLY_RELEASE_NOTICE);
  }
  if (body.action !== 'list_products') return body;
  // The currently deployed backend does not support the newer global filters.
  const allowed = ['action', 'search', 'sku', 'gtin', 'entityType', 'reviewRequired', 'publishBlocked', 'cursor', 'pageSize'];
  return Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
}

export function readOnlyField(field: AdminField): AdminField {
  return {
    ...field,
    editable: false,
    capabilities: {
      ...field.capabilities,
      canUpdate: false, canConfirmLegacy: false, canRejectLegacy: false, canSuggestAi: false,
      updateBlockReason: 'writes_disabled', confirmLegacyBlockReason: 'writes_disabled',
      rejectLegacyBlockReason: 'writes_disabled', aiBlockReason: 'writes_disabled',
    },
  };
}
