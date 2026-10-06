import { useQuery } from '@tanstack/react-query';

import type { Id } from '@stockroom/contract';

import { apiRequest, orThrow } from './client';

/** The location list is the same for every role, so the key leaves out the user id. */
export const LOCATIONS_QUERY_KEY = ['locations'] as const;

/** Every location, sorted by code. They change rarely: no polling. */
export function useLocations(userId: Id | null) {
  return useQuery({
    queryKey: LOCATIONS_QUERY_KEY,
    queryFn: async ({ signal }) =>
      orThrow(await apiRequest('listLocations', { userId, signal })),
    enabled: userId !== null,
    // Locations do not change from any screen of this app.
    staleTime: 5 * 60 * 1000,
  });
}
