import { useQuery } from '@tanstack/react-query';
import { callAdminApi } from './adminApi';
export interface CategoryRecord {
  id: string;
  display_name: string;
  slug: string;
  parent_id: string | null;
  level: number;
  is_active: boolean;
  visible_storefront: boolean;
  productCount: number;
  maps: { shopify_handle: string; map_status: string; last_checked_at: string | null }[];
}
export interface CategoryCatalogue {
  categories: CategoryRecord[];
  products: { id: string; sku: string; categoryIds: string[] }[];
  observedAt: string;
  notice: string;
  missingCanonicalHandles: string[];
  canSaveDraft: boolean;
  canSendDraft: boolean;
  approvedOperationId: string | null;
  canAssign: boolean;
}
export function useCategoryCatalogue() {
  return useQuery({
    queryKey: ['admin', 'category-catalogue'],
    queryFn: () => callAdminApi<CategoryCatalogue>({ action: 'catalog_categories' }),
    retry: false,
    staleTime: 30000,
  });
}
export const OPERATION_LABELS: Record<string, string> = {
  LOCAL_DRAFT: 'Bozza interna — non inviata',
  IN_FLIGHT: 'Invio avviato — verifica richiesta',
  NEEDS_RECONCILIATION: 'Da riconciliare — non reinviare',
  VERIFIED_DRAFT: 'Bozza Shopify verificata — non pubblicata',
};
