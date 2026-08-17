// F6 — Hook di lettura: cache, retry, debounce e paginazione a cursore.
import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  AdminApiError,
  callAdminApi,
  type AdminContext,
  type DashboardStats,
  type ProductDetail,
  type ProductSummary,
} from '../lib/adminApi';

const retry = (failureCount: number, error: unknown) => {
  if (error instanceof AdminApiError) {
    if (['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND'].includes(error.code)) return false;
  }
  return failureCount < 2;
};

export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function useAdminContext() {
  return useQuery({
    queryKey: ['admin', 'context'],
    queryFn: () => callAdminApi<{ ok: true } & AdminContext>({ action: 'get_admin_context' }),
    staleTime: 5 * 60_000,
    retry,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const res = await callAdminApi<{ stats: DashboardStats; writesEnabled: boolean }>({
        action: 'get_dashboard_stats',
      });
      return res;
    },
    staleTime: 60_000,
    retry,
  });
}

export interface ProductFilters {
  search?: string;
  sku?: string;
  gtin?: string;
  entityType?: string;
  reviewRequired?: boolean;
  publishBlocked?: boolean;
}

export function useProductList(filters: ProductFilters, cursor: string | null) {
  return useQuery({
    queryKey: ['admin', 'products', filters, cursor],
    queryFn: () =>
      callAdminApi<{ items: ProductSummary[]; nextCursor: string | null }>({
        action: 'list_products',
        ...filters,
        cursor,
        pageSize: 25,
      }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry,
  });
}

export function useProductDetail(productId?: string) {
  return useQuery({
    queryKey: ['admin', 'product', productId],
    queryFn: () => callAdminApi<ProductDetail>({ action: 'get_product', productId }),
    enabled: !!productId,
    staleTime: 30_000,
    retry,
  });
}

export function useSourceBaseline(productId?: string) {
  return useQuery({
    queryKey: ['admin', 'baseline', productId],
    queryFn: () =>
      callAdminApi<{ baseline: { normalized?: Record<string, unknown>; created_at?: string } | null }>({
        action: 'get_source_baseline',
        productId,
      }),
    enabled: !!productId,
    staleTime: 5 * 60_000,
    retry,
  });
}
