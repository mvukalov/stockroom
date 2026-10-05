import { useQuery } from '@tanstack/react-query';

import type { Id } from '@stockroom/contract';

import { apiRequest, orThrow } from './client';

/**
 * The dashboard is the same for every role, so the key leaves out the user id.
 * Exported so mutations that change stock or orders can invalidate it.
 */
export const DASHBOARD_QUERY_KEY = ['dashboard'] as const;

/** Waits for the acting user: every request carries `X-User-Id`. */
export function useDashboard(userId: Id | null) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: async ({ signal }) =>
      orThrow(await apiRequest('getDashboard', { userId, signal })),
    enabled: userId !== null,
  });
}
