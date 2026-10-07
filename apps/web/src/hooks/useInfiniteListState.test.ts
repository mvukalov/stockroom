import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Page } from '@stockroom/contract';

import {
  useInfiniteListState,
  type InfiniteListQuery,
  type InfiniteListStateOptions,
} from './useInfiniteListState';

type Row = { id: string };

function page(ids: string[], pageNumber: number, total: number): Page<Row> {
  return {
    items: ids.map((id) => ({ id })),
    total,
    page: pageNumber,
    pageSize: 100,
  };
}

function listQuery(
  overrides: Partial<InfiniteListQuery<Row>> = {},
): InfiniteListQuery<Row> {
  return {
    data: {
      pages: [page(['a', 'b'], 1, 5), page(['c'], 2, 5)],
      pageParams: [1, 2],
    },
    hasNextPage: true,
    isFetchingNextPage: false,
    isPlaceholderData: false,
    isError: false,
    isFetchNextPageError: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
    ...overrides,
    // A stand-in for a query result: `vi.fn()` is not typed as TanStack's overloads.
  } as InfiniteListQuery<Row>;
}

const OPTIONS: InfiniteListStateOptions = {
  listKey: 'a',
  enabled: true,
  canFetch: true,
  countLabel: (total) => `${total} rows`,
};

function render(query: InfiniteListQuery<Row>, options = OPTIONS) {
  return renderHook(
    (props: { query: InfiniteListQuery<Row>; options: typeof options }) =>
      useInfiniteListState(props.query, props.options),
    { initialProps: { query, options } },
  );
}

describe('useInfiniteListState', () => {
  it('flattens the loaded pages and reads the total from the first', () => {
    const { result } = render(listQuery());
    expect(result.current.rows?.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(result.current.total).toBe(5);
    expect(result.current.hasMore).toBe(true);
  });

  it('has no rows and no total while disabled', () => {
    const { result } = render(listQuery(), { ...OPTIONS, enabled: false });
    expect(result.current.rows).toBeUndefined();
    expect(result.current.total).toBeUndefined();
  });

  it('asks for the next page without cancelling a request in flight', () => {
    const query = listQuery();
    const { result } = render(query);
    result.current.loadMore();
    expect(query.fetchNextPage).toHaveBeenCalledWith({ cancelRefetch: false });
  });

  it('asks for nothing while no request can be sent (no acting user)', () => {
    const query = listQuery();
    const { result } = render(query, { ...OPTIONS, canFetch: false });
    result.current.loadMore();
    expect(query.fetchNextPage).not.toHaveBeenCalled();
    expect(result.current.rows).toHaveLength(3);
  });

  it('scopes a failed next page to "more" and retries only that page', () => {
    const query = listQuery({ isError: true, isFetchNextPageError: true });
    const { result } = render(query);
    expect(result.current.error?.scope).toBe('more');
    result.current.error?.onRetry();
    expect(query.fetchNextPage).toHaveBeenCalledWith({ cancelRefetch: false });
    expect(query.refetch).not.toHaveBeenCalled();
  });

  it('scopes a failed list to "list" and retries the whole query', () => {
    const query = listQuery({ data: undefined, isError: true });
    const { result } = render(query);
    expect(result.current.error?.scope).toBe('list');
    result.current.error?.onRetry();
    expect(query.refetch).toHaveBeenCalled();
  });

  it('announces the count after a new list arrives, never after a scroll fetch', () => {
    const { result, rerender } = render(listQuery());
    // The first list is announced by the page's loading status, not here.
    expect(result.current.announcement).toBe('');

    const next = { ...OPTIONS, listKey: 'b' };
    rerender({ query: listQuery({ isPlaceholderData: true }), options: next });
    expect(result.current.announcement).toBe('');

    rerender({ query: listQuery(), options: next });
    expect(result.current.announcement).toBe('Showing 3 of 5 rows');

    const morePages = listQuery({
      data: {
        pages: [
          page(['a', 'b'], 1, 5),
          page(['c'], 2, 5),
          page(['d', 'e'], 3, 5),
        ],
        pageParams: [1, 2, 3],
      },
    });
    rerender({ query: morePages, options: next });
    expect(result.current.announcement).toBe('Showing 3 of 5 rows');
  });
});
