import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { Id, ProductsQuery } from '@stockroom/contract';

import { apiRequest, orThrow } from './client';

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
export function useProducts(query: ProductsQuery, userId: Id | null) {
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
    enabled: userId !== null,
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
