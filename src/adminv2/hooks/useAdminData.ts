// F6 — Hook di lettura: cache, retry, debounce e paginazione a cursore.
import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_READ_ONLY_RELEASE } from '../lib/readOnlyRelease';
import {
  AdminApiError,
  acceptAiSuggestion,
  callAdminApi,
  generateAiSuggestion,
  getAiSuggestions,
  rejectAiSuggestion,
  sendFieldCommand,
  sendFieldSyncCommand,
  type AdminContext,
  type AdminAiSuggestion,
  type DashboardStats,
  type FieldCommandAction,
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
  const { user } = useAuth();
  return useQuery({
    queryKey: ['admin', 'context', user?.id],
    queryFn: () => callAdminApi<{ ok: true } & AdminContext>({ action: 'get_admin_context' }),
    enabled: Boolean(user),
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
  category?: string;
  completeness?: "complete" | "incomplete";
  origin?: "shopify" | "import";
  needsClassification?: boolean;
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
  const { user } = useAuth();
  return useQuery({
    queryKey: ['admin', 'product', productId, user?.id],
    queryFn: () => callAdminApi<ProductDetail>({ action: 'get_product', productId }),
    enabled: !!productId && !!user,
    staleTime: 30_000,
    retry,
  });
}

function useSuggestionCacheKey(productId?: string) {
  const { user } = useAuth();
  return ['admin', 'ai-suggestions', user?.id, productId] as const;
}

export function useAiSuggestions(productId: string | undefined, permitted: boolean) {
  const queryKey = useSuggestionCacheKey(productId);
  return useQuery({
    queryKey,
    queryFn: async () => (await getAiSuggestions(productId!)).suggestions,
    enabled: !ADMIN_READ_ONLY_RELEASE && permitted && Boolean(queryKey[2] && productId),
    retry: false,
  });
}

export function useGenerateAiSuggestion(productId?: string) {
  const queryClient = useQueryClient();
  const queryKey = useSuggestionCacheKey(productId);
  return useMutation({
    retry: false,
    mutationFn: (input: { fieldKey: string; baseVersion: number }) =>
      generateAiSuggestion({ productId: productId!, ...input }),
    onSuccess: async ({ suggestion }) => {
      await queryClient.cancelQueries({ queryKey, exact: true });
      queryClient.setQueryData<AdminAiSuggestion[]>(queryKey, (rows = []) =>
        [suggestion, ...rows.filter(row => row.fieldKey !== suggestion.fieldKey)]);
    },
    onError: () => queryClient.invalidateQueries({ queryKey }),
  });
}

function useRemoveResolvedSuggestion(productId?: string) {
  const queryClient = useQueryClient();
  const queryKey = useSuggestionCacheKey(productId);
  return async (id: string) => {
    await queryClient.cancelQueries({ queryKey, exact: true });
    queryClient.setQueryData<AdminAiSuggestion[]>(queryKey, rows => rows?.filter(row => row.id !== id));
  };
}

export function useRejectAiSuggestion(productId?: string) {
  const remove = useRemoveResolvedSuggestion(productId);
  return useMutation({
    retry: false,
    mutationFn: rejectAiSuggestion,
    onSuccess: ({ suggestion }) => remove(suggestion.id),
  });
}

export function useAcceptAiSuggestion(productId?: string) {
  const queryClient = useQueryClient();
  const remove = useRemoveResolvedSuggestion(productId);
  return useMutation({
    retry: false,
    mutationFn: acceptAiSuggestion,
    onSuccess: async ({ suggestion }) => {
      await remove(suggestion.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
      ]);
    },
  });
}

/** F7 — invio comando su un singolo campo, con aggiornamento della scheda e della cronologia. */
export function useFieldCommand(productId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      action: FieldCommandAction;
      fieldKey: string;
      value?: unknown;
      expectedVersion: number;
      expectedShopifyHash?: string;
    }) => sendFieldCommand({ ...input, productId: productId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

export function useFieldSync(productId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { fieldKey: string; expectedVersion: number; expectedShopifyHash?: string; idempotencyKey?: string }) =>
      sendFieldSyncCommand({ ...input, productId: productId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
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
