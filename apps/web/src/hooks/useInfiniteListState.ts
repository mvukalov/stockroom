import type {
  InfiniteData,
  UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { Page } from '@stockroom/contract';

import { formatCount } from '../utils/formatCount';

/** The parts of an infinite list query (`useInfiniteQuery` over `Page<T>`) a list reads. */
export type InfiniteListQuery<T> = Pick<
  UseInfiniteQueryResult<InfiniteData<Page<T>, unknown>>,
  | 'data'
  | 'hasNextPage'
  | 'isFetchingNextPage'
  | 'isPlaceholderData'
  | 'isError'
  | 'isFetchNextPageError'
  | 'fetchNextPage'
  | 'refetch'
>;

/**
 * `list`: the list could not load (Retry reloads it). `more`: the next page failed,
 * the loaded rows stay and Retry asks for that page only.
 */
export type InfiniteListError = {
  scope: 'list' | 'more';
  onRetry: () => void;
};

export type InfiniteListStateOptions = {
  /** Identifies the list (its filters and sort); a new key is a new list. */
  listKey: string;
  /** `false` while the list is not requested (e.g. an invalid date range): no rows, no total. */
  enabled: boolean;
  /**
   * `false` while no request can be sent, e.g. without an acting user (the users
   * failed to load). The loaded rows stay, but Load more asks for nothing: the query
   * is disabled, and asking anyway would send a request without a user, fail, and be
   * asked again as long as the end of the list is in view.
   */
  canFetch: boolean;
  /** The server total as a phrase, e.g. `48,213 movements`. */
  countLabel: (total: number) => string;
};

export type InfiniteListState<T> = {
  /** Every loaded row; `undefined` until the first page arrives (or while disabled). */
  rows: T[] | undefined;
  total: number | undefined;
  hasMore: boolean;
  isLoadingMore: boolean;
  /** A new filter or sort is loading; the previous rows stay until it arrives. */
  isRefreshing: boolean;
  /** Asks for the next page; never cancels a request in flight, so no page is asked for twice. */
  loadMore: () => void;
  error: InfiniteListError | undefined;
  /** "Showing 100 of 48,213 movements", set once a new filter or sort has its rows. */
  announcement: string;
};

/**
 * What a page shows for an infinitely loading list (ADR-0006): the loaded rows and
 * the server total, the next-page and refresh states, an error scoped to the whole
 * list or to the next page, and an announcement of the loaded count that follows a
 * filter or sort change but never a scroll fetch.
 */
export function useInfiniteListState<T>(
  query: InfiniteListQuery<T>,
  { listKey, enabled, canFetch, countLabel }: InfiniteListStateOptions,
): InfiniteListState<T> {
  const rows = enabled
    ? query.data?.pages.flatMap((page) => page.items)
    : undefined;
  const total = enabled ? query.data?.pages[0]?.total : undefined;
  const isRefreshing = query.isPlaceholderData;

  // Adjusting state while rendering, React's pattern for following a changed input
  // without an effect.
  const [announced, setAnnounced] = useState({ key: listKey, text: '' });
  if (
    announced.key !== listKey &&
    rows !== undefined &&
    total !== undefined &&
    !isRefreshing
  ) {
    setAnnounced({
      key: listKey,
      text: `Showing ${formatCount(rows.length)} of ${countLabel(total)}`,
    });
  }

  // `canFetch` as of the last commit. TanStack Query hands the query its new options
  // (and so the request with the user) in an effect of the page, after the effects of
  // the list below it, which may ask for the next page in the same commit. Waiting
  // one commit after `canFetch` turns true keeps that first request from going out
  // with the previous options, i.e. without a user.
  const [canFetchCommitted, setCanFetchCommitted] = useState(canFetch);
  // The second render is the point: it hands the list a Load more that can ask, once
  // the query has its new options. It follows TanStack's effect, an outside system.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => setCanFetchCommitted(canFetch), [canFetch]);

  const loadMore = () => {
    if (canFetch && canFetchCommitted) {
      void query.fetchNextPage({ cancelRefetch: false });
    }
  };

  let error: InfiniteListError | undefined;
  if (query.isFetchNextPageError) error = { scope: 'more', onRetry: loadMore };
  else if (query.isError) {
    error = { scope: 'list', onRetry: () => void query.refetch() };
  }

  return {
    rows,
    total,
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    isRefreshing,
    loadMore,
    error,
    announcement: announced.text,
  };
}
