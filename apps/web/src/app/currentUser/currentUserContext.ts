import type { UseQueryResult } from '@tanstack/react-query';
import { createContext, useContext } from 'react';

import type { Id, User } from '@stockroom/contract';

export type CurrentUserContextValue = {
  /** The demo users (server state, from TanStack Query). */
  users: UseQueryResult<User[]>;
  /** `undefined` until the users are loaded, or when the list is empty. */
  currentUser: User | undefined;
  selectUser: (id: Id) => void;
};

export const CurrentUserContext = createContext<CurrentUserContextValue | null>(
  null,
);

export function useCurrentUser(): CurrentUserContextValue {
  const value = useContext(CurrentUserContext);
  if (value === null) {
    throw new Error('useCurrentUser must be used inside CurrentUserProvider');
  }
  return value;
}
