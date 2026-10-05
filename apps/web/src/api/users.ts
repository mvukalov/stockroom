import { useQuery } from '@tanstack/react-query';

import type { Id } from '@stockroom/contract';

import { apiRequest, orThrow } from './client';

/** The user list is the same for every role, so the key leaves out the user id. */
export const USERS_QUERY_KEY = ['users'] as const;

export function useUsers(userId: Id | null) {
  return useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: async ({ signal }) =>
      orThrow(await apiRequest('listUsers', { userId, signal })),
  });
}
