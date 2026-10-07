import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import type { Id, OrderDetail, OrdersQuery } from '@stockroom/contract';

import { apiRequest, orThrow } from './client';
import { DASHBOARD_QUERY_KEY } from './dashboard';
import { PRODUCTS_QUERY_KEY } from './products';

/**
 * Prefix of every order query, lists and details. The data is the same for every
 * role, so the keys leave out the user id. Invalidating the prefix refreshes the
 * lists and any open order detail.
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

/** Key of one order's detail, under the orders prefix. */
export function orderQueryKey(id: Id) {
  return [...ORDERS_QUERY_KEY, 'detail', id] as const;
}

/**
 * One order with its lines and totals. An order that does not exist is the value
 * `null`, not an error: it is an answer, so it is never retried. `id` is `null` for a
 * malformed id, which is never requested.
 */
export function useOrder(id: Id | null, userId: Id | null) {
  return useQuery({
    queryKey: orderQueryKey(id ?? ''),
    queryFn: async ({ signal }) => {
      const result = await apiRequest('getOrder', {
        userId,
        params: { id: id ?? '' },
        signal,
      });
      if (!result.ok && result.error.code === 'NOT_FOUND') return null;
      return orThrow(result);
    },
    enabled: id !== null && userId !== null,
  });
}

export type CancelOrderVariables = {
  /** The acting user: the server checks the permission against this user. */
  userId: Id | null;
  orderId: Id;
};

/**
 * Cancels an order through the status transition. The result is a `Result`: a
 * contract error (FORBIDDEN, NOT_FOUND, INVALID_TRANSITION) is a value the dialog
 * shows, and only an unexpected failure (network, HTTP 500) puts the mutation in its
 * error state. Cancelling is idempotent, so retrying with the same variables is safe.
 *
 * `onCancelled` runs here, in the mutation's own `onSuccess`, not in a `mutate`
 * callback: TanStack skips `mutate` callbacks once the calling component has
 * unmounted, and the user may have left the page while the request was pending.
 */
export function useCancelOrder({
  onCancelled,
}: { onCancelled?: (order: OrderDetail) => void } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, orderId }: CancelOrderVariables) =>
      apiRequest('transitionOrder', {
        userId,
        params: { id: orderId },
        body: { to: 'CANCELLED' },
      }),
    onSuccess: async (result) => {
      if (!result.ok) return;
      // Awaited, so the mutation stays pending until the order on screen has
      // refetched: the dialog closes on the new status, never on a stale one.
      // Cancelling releases reserved stock, so availability and the dashboard change.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY }),
      ]);
      onCancelled?.(result.value);
    },
  });
}
