import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { OrdersQuery } from '@stockroom/contract';

import { createQueryClient } from '../app/queryClient';
import { seedUser, setupMockServer } from '../test/mockServer';
import { ORDERS_QUERY_KEY, useOrders } from './orders';

const server = setupMockServer();

function setup() {
  const queryClient = createQueryClient({ retry: false });
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
