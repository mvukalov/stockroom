import { useInfiniteQuery } from '@tanstack/react-query';

import type { AuditQuery, Id } from '@stockroom/contract';

import { apiRequest, orThrow } from './client';
import {
  INFINITE_LIST_OPTIONS,
  INFINITE_LIST_PAGE_SIZE,
  type WithoutPaging,
} from './infiniteList';

/**
 * Prefix of every audit log query. The log is the same for every role, so the key
 * leaves out the user id. Exported for the mutations that add events (a movement, an
 * order cancel): they reset it, so the next visit loads only its first page again.
 */
export const AUDIT_QUERY_KEY = ['audit'] as const;

/**
 * An infinite query refetches every loaded page one after another (ADR-0006). Events
 * are only added through this app, and every mutation that adds one resets the log,
 * so the cache stays fresh for five minutes and a revisit within that time shows it
 * without a request.
 */
const AUDIT_STALE_TIME_MS = 5 * 60 * 1000;

/** The filters and sort of the log; `page` and `pageSize` mean nothing to it. */
export type AuditListQuery = WithoutPaging<AuditQuery>;

/**
 * The audit log for a set of filters and a sort, loaded in pages of 100 as the user
 * scrolls. A new filter or sort is a new query: it starts at the first page, and the
 * previous rows stay on screen until that page arrives.
 */
export function useAudit(
  query: AuditListQuery,
  userId: Id | null,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: [...AUDIT_QUERY_KEY, query],
    queryFn: async ({ pageParam, signal }) =>
      orThrow(
        await apiRequest('listAudit', {
          userId,
          query: {
            ...query,
            page: pageParam,
            pageSize: INFINITE_LIST_PAGE_SIZE,
          },
          signal,
        }),
      ),
    ...INFINITE_LIST_OPTIONS,
    enabled: enabled && userId !== null,
    staleTime: AUDIT_STALE_TIME_MS,
  });
}
