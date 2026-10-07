import { keepPreviousData } from '@tanstack/react-query';

import type { Page } from '@stockroom/contract';

/** Rows per request of an infinite list: the largest page size the contract allows. */
export const INFINITE_LIST_PAGE_SIZE = 100;

/** The filters and sort of a list query; `page` and `pageSize` mean nothing to an infinite list. */
export type WithoutPaging<Q> = Omit<Q, 'page' | 'pageSize'>;

export function withoutPaging<Q extends { page: number; pageSize: number }>(
  query: Q,
): WithoutPaging<Q> {
  const { page: _page, pageSize: _pageSize, ...listQuery } = query;
  return listQuery;
}

/**
 * What every infinitely loading list shares (ADR-0006): it starts at page 1 and asks
 * for the next page while the server has more rows. A new filter or sort is a new
 * query, and the previous rows stay on screen until its first page arrives. It never
 * refetches on focus or reconnect: a refetch of an infinite query requests every
 * loaded page one after another. Each list sets its own key, request and stale time.
 */
export const INFINITE_LIST_OPTIONS = {
  initialPageParam: 1,
  getNextPageParam: (last: Page<unknown>): number | undefined =>
    last.page * last.pageSize < last.total ? last.page + 1 : undefined,
  placeholderData: keepPreviousData,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};
