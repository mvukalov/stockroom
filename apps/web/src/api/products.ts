import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import type { BulkProductsInput, Id, ProductsQuery } from '@stockroom/contract';

import { apiRequest, orThrow } from './client';
import { DASHBOARD_QUERY_KEY } from './dashboard';

/**
 * Prefix of every product list query. The list is the same for every role, so the
 * key leaves out the user id. Exported so mutations can invalidate every list.
 */
export const PRODUCTS_QUERY_KEY = ['products'] as const;

/**
 * The filter options, under their own key: invalidating the lists does not refetch
 * them. The same for every role.
 */
export const PRODUCT_FILTERS_QUERY_KEY = ['product-filters'] as const;

/**
 * One page of products for a parsed `ProductsQuery`. The previous page stays on
 * screen while the next one loads, so paging and sorting never flash a skeleton.
 */
export function useProducts(
  query: ProductsQuery,
  userId: Id | null,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: [...PRODUCTS_QUERY_KEY, query],
    queryFn: async ({ signal }) =>
      orThrow(
        await apiRequest('listProducts', {
          userId,
          // The request takes the URL form of the query; `archived` is a string there.
          query: { ...query, archived: String(query.archived) },
          signal,
        }),
      ),
    enabled: enabled && userId !== null,
    placeholderData: keepPreviousData,
  });
}

/** Category and brand options of the product filters. They change rarely: no polling. */
export function useProductFilters(userId: Id | null) {
  return useQuery({
    queryKey: PRODUCT_FILTERS_QUERY_KEY,
    queryFn: async ({ signal }) =>
      orThrow(await apiRequest('listProductFilters', { userId, signal })),
    enabled: userId !== null,
    // Categories and brands do not change from this screen.
    staleTime: 5 * 60 * 1000,
  });
}

export type BulkProductsVariables = {
  /** The acting user: the server checks the permission against this user. */
  userId: Id | null;
  body: BulkProductsInput;
};

/**
 * Update category or Archive for a set of products. The result is a `Result`: a
 * contract error (FORBIDDEN, NOT_FOUND, CONFLICT) is a value the dialog shows, and
 * only an unexpected failure (network, HTTP 500) puts the mutation in its error
 * state. Both actions are idempotent, so retrying with the same variables is safe.
 */
export function useBulkProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, body }: BulkProductsVariables) =>
      apiRequest('bulkProducts', { userId, body }),
    onSuccess: (result) => {
      if (!result.ok) return;
      // Returned, so the mutation stays pending until the list on screen has
      // refetched. Archiving also changes the dashboard's stock figures.
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY }),
      ]);
    },
  });
}
