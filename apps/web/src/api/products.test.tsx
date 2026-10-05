import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { ProductsQuery } from '@stockroom/contract';

import { createQueryClient } from '../app/queryClient';
import { seedUser, setupMockServer } from '../test/mockServer';
import {
  PRODUCT_FILTERS_QUERY_KEY,
  PRODUCTS_QUERY_KEY,
  useProductFilters,
  useProducts,
} from './products';

const server = setupMockServer();

function setup() {
  const queryClient = createQueryClient({ retry: false });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

/** Search params of every request to `path`, in order. */
function recordRequests(path: string): URLSearchParams[] {
  const seen: URLSearchParams[] = [];
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname === path) seen.push(url.searchParams);
  });
  return seen;
}

describe('useProducts', () => {
  it('requests the parsed query and caches it under the products prefix', async () => {
    const { queryClient, wrapper } = setup();
    const requests = recordRequests('/api/products');
    const query = ProductsQuery.parse({
      search: 'tape',
      sort: '-price',
      pageSize: '10',
    });

    const { result } = renderHook(
      () => useProducts(query, seedUser('VIEWER').id),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Object.fromEntries(requests[0] ?? [])).toEqual({
      search: 'tape',
      sort: '-price',
      pageSize: '10',
      page: '1',
      archived: 'false',
    });
    expect(queryClient.getQueryData([...PRODUCTS_QUERY_KEY, query])).toBe(
      result.current.data,
    );
  });

  it('waits for a user before requesting', () => {
    const { wrapper } = setup();
    const requests = recordRequests('/api/products');

    const { result } = renderHook(
      () => useProducts(ProductsQuery.parse({}), null),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(requests).toHaveLength(0);
  });

  it('keeps the previous page on screen while the next one loads', async () => {
    const { wrapper } = setup();
    const userId = seedUser('ADMIN').id;
    const { result, rerender } = renderHook(
      ({ page }: { page: number }) =>
        useProducts(ProductsQuery.parse({ page: String(page) }), userId),
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

describe('useProductFilters', () => {
  it('loads the options under their own key', async () => {
    const { queryClient, wrapper } = setup();

    const { result } = renderHook(
      () => useProductFilters(seedUser('CLERK').id),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.categories.length).toBeGreaterThan(0);
    expect(result.current.data?.brands.length).toBeGreaterThan(0);
    expect(queryClient.getQueryData(PRODUCT_FILTERS_QUERY_KEY)).toBe(
      result.current.data,
    );
  });

  it('is not refetched when the product lists are invalidated', async () => {
    const { queryClient, wrapper } = setup();
    const requests = recordRequests('/api/products/filters');
    const { result } = renderHook(
      () => useProductFilters(seedUser('ADMIN').id),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });

    expect(result.current.isFetching).toBe(false);
    expect(requests).toHaveLength(1);
  });

  it('waits for a user before requesting', () => {
    const { wrapper } = setup();
    const requests = recordRequests('/api/products/filters');

    const { result } = renderHook(() => useProductFilters(null), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(requests).toHaveLength(0);
  });
});
