import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { OrdersQuery } from '@stockroom/contract';

import { createQueryClient } from '../app/queryClient';
import { getDb } from '../mocks/db';
import { seedUser, setupMockServer } from '../test/mockServer';
import { DASHBOARD_QUERY_KEY } from './dashboard';
import {
  orderQueryKey,
  ORDERS_QUERY_KEY,
  useCancelOrder,
  useOrder,
  useOrders,
} from './orders';
import { PRODUCTS_QUERY_KEY } from './products';

const server = setupMockServer();

function setup({ retry = false }: { retry?: number | false } = {}) {
  const queryClient = createQueryClient({ retry });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

/** Search params of every request to `/api/orders`, in order. */
function recordRequests(): URLSearchParams[] {
  const seen: URLSearchParams[] = [];
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname === '/api/orders') seen.push(url.searchParams);
  });
  return seen;
}

describe('useOrders', () => {
  it('requests the parsed query and caches it under the orders prefix', async () => {
    const { queryClient, wrapper } = setup();
    const requests = recordRequests();
    const query = OrdersQuery.parse({
      status: 'SHIPPED',
      search: 'ORD',
      from: '2026-01-01',
      to: '2026-12-31',
      sort: '-total',
      pageSize: '25',
    });

    const { result } = renderHook(
      () => useOrders(query, seedUser('VIEWER').id),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Object.fromEntries(requests[0] ?? [])).toEqual({
      status: 'SHIPPED',
      search: 'ORD',
      from: '2026-01-01',
      to: '2026-12-31',
      sort: '-total',
      pageSize: '25',
      page: '1',
    });
    expect(queryClient.getQueryData([...ORDERS_QUERY_KEY, query])).toBe(
      result.current.data,
    );
  });

  it('waits for a user before requesting', () => {
    const { wrapper } = setup();
    const requests = recordRequests();

    const { result } = renderHook(
      () => useOrders(OrdersQuery.parse({}), null),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(requests).toHaveLength(0);
  });

  it('sends nothing while disabled', () => {
    const { wrapper } = setup();
    const requests = recordRequests();

    const { result } = renderHook(
      () =>
        useOrders(OrdersQuery.parse({}), seedUser('ADMIN').id, {
          enabled: false,
        }),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(requests).toHaveLength(0);
  });

  it('keeps the previous page on screen while the next one loads', async () => {
    const { wrapper } = setup();
    const userId = seedUser('CLERK').id;
    const { result, rerender } = renderHook(
      ({ page }: { page: number }) =>
        useOrders(OrdersQuery.parse({ page: String(page) }), userId),
      { wrapper, initialProps: { page: 1 } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const firstPage = result.current.data;

    rerender({ page: 2 });

    expect(result.current.data).toBe(firstPage);
    expect(result.current.isPlaceholderData).toBe(true);
    await waitFor(() => expect(result.current.data?.page).toBe(2));
  });
});

function orderWith(status: 'CONFIRMED' | 'SHIPPED') {
  const order = getDb().orders.find((o) => o.status === status);
  if (!order) throw new Error(`Seed has no ${status} order`);
  return order;
}

/** Paths of every request whose path starts with `/api/orders/`, in order. */
function recordDetailRequests(): string[] {
  const seen: string[] = [];
  server.events.on('request:start', ({ request }) => {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/api/orders/')) seen.push(pathname);
  });
  return seen;
}

describe('useOrder', () => {
  it('loads the order and caches it under the orders prefix', async () => {
    const { queryClient, wrapper } = setup();
    const order = orderWith('CONFIRMED');

    const { result } = renderHook(
      () => useOrder(order.id, seedUser('VIEWER').id),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.number).toBe(order.number);
    expect(queryClient.getQueryData(orderQueryKey(order.id))).toBe(
      result.current.data,
    );
    expect(orderQueryKey(order.id).slice(0, 1)).toEqual(ORDERS_QUERY_KEY);
  });

  it('answers an unknown order with null after one request, even with retries on', async () => {
    const { wrapper } = setup({ retry: 3 });
    const requests = recordDetailRequests();
    const unknownId = crypto.randomUUID();

    const { result } = renderHook(
      () => useOrder(unknownId, seedUser('ADMIN').id),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(requests).toHaveLength(1);
  });

  it('never requests a malformed id or without a user', () => {
    const { wrapper } = setup();
    const requests = recordDetailRequests();

    const malformed = renderHook(() => useOrder(null, seedUser('ADMIN').id), {
      wrapper,
    });
    const noUser = renderHook(() => useOrder(orderWith('CONFIRMED').id, null), {
      wrapper,
    });

    expect(malformed.result.current.fetchStatus).toBe('idle');
    expect(noUser.result.current.fetchStatus).toBe('idle');
    expect(requests).toHaveLength(0);
  });
});

describe('useCancelOrder', () => {
  it('invalidates the orders, the products and the dashboard after a cancel', async () => {
    const { queryClient, wrapper } = setup();
    const order = orderWith('CONFIRMED');
    for (const key of [
      orderQueryKey(order.id),
      PRODUCTS_QUERY_KEY,
      DASHBOARD_QUERY_KEY,
    ]) {
      queryClient.setQueryData(key, 'cached');
    }

    const { result } = renderHook(() => useCancelOrder(), { wrapper });
    await act(() =>
      result.current.mutateAsync({
        userId: seedUser('CLERK').id,
        orderId: order.id,
      }),
    );

    await waitFor(() => expect(result.current.data?.ok).toBe(true));
    for (const key of [
      orderQueryKey(order.id),
      PRODUCTS_QUERY_KEY,
      DASHBOARD_QUERY_KEY,
    ]) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    }
  });

  it('returns a contract error as a value and invalidates nothing', async () => {
    const { queryClient, wrapper } = setup();
    const order = orderWith('SHIPPED');
    queryClient.setQueryData(orderQueryKey(order.id), 'cached');

    const { result } = renderHook(() => useCancelOrder(), { wrapper });
    await act(() =>
      result.current.mutateAsync({
        userId: seedUser('ADMIN').id,
        orderId: order.id,
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      ok: false,
      error: { code: 'INVALID_TRANSITION' },
    });
    expect(
      queryClient.getQueryState(orderQueryKey(order.id))?.isInvalidated,
    ).toBe(false);
  });
});
