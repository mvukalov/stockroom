import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { Id, OrdersQuery } from '@stockroom/contract';

import { apiRequest, orThrow } from './client';

/**
 * Prefix of every order list query. The list is the same for every role, so the key
 * leaves out the user id. Exported so the order detail and cancel can invalidate
 * every list.
 */
export const ORDERS_QUERY_KEY = ['orders'] as const;

/**
 * One page of orders for a parsed `OrdersQuery`. The previous page stays on screen
 * while the next one loads, so paging and sorting never flash a skeleton.
 */
export function useOrders(
  query: OrdersQuery,
  userId: Id | null,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: [...ORDERS_QUERY_KEY, query],
    queryFn: async ({ signal }) =>
      orThrow(await apiRequest('listOrders', { userId, query, signal })),
    enabled: enabled && userId !== null,
    placeholderData: keepPreviousData,
  });
}
