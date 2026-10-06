import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import type { Id, MovementsQuery } from '@stockroom/contract';

import { apiRequest, orThrow } from './client';

/**
 * Prefix of every movement list query. The list is the same for every role, so the
 * key leaves out the user id. Exported for the New movement drawer, which resets the
 * list to its first page after a movement is added (ADR-0006).
 */
export const MOVEMENTS_QUERY_KEY = ['movements'] as const;

/** Rows per request: the largest page size the contract allows. */
export const MOVEMENTS_PAGE_SIZE = 100;

/**
 * An infinite query refetches every loaded page one after another, so a refetch after
 * a long scroll is dozens of requests. Movements only change through this app (the
 * drawer resets the query itself), so the cache stays fresh for five minutes and a
 * revisit within that time shows it without a request.
 */
const MOVEMENTS_STALE_TIME_MS = 5 * 60 * 1000;

/** The filters and sort of the list; `page` and `pageSize` mean nothing to it. */
export type MovementsListQuery = Omit<MovementsQuery, 'page' | 'pageSize'>;

export function movementsListQuery(query: MovementsQuery): MovementsListQuery {
  const { page: _page, pageSize: _pageSize, ...listQuery } = query;
  return listQuery;
}

/**
 * The movement history for a set of filters and a sort, loaded in pages of 100 as
 * the user scrolls. A new filter or sort is a new query: it starts at the first page,
 * and the previous rows stay on screen until that page arrives.
 */
export function useMovements(
  query: MovementsListQuery,
  userId: Id | null,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: [...MOVEMENTS_QUERY_KEY, query],
    queryFn: async ({ pageParam, signal }) =>
      orThrow(
        await apiRequest('listMovements', {
          userId,
          query: { ...query, page: pageParam, pageSize: MOVEMENTS_PAGE_SIZE },
          signal,
        }),
      ),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    enabled: enabled && userId !== null,
    placeholderData: keepPreviousData,
    staleTime: MOVEMENTS_STALE_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
