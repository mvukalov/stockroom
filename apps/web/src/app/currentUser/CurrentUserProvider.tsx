import type { ReactNode } from 'react';

import { Id } from '@stockroom/contract';

import { useUsers } from '../../api/users';
import {
  usePersistentState,
  type StorageCodec,
} from '../../hooks/usePersistentState';
import { CurrentUserContext } from './currentUserContext';
import { resolveCurrentUser } from './resolveCurrentUser';

export const DEMO_USER_STORAGE_KEY = 'stockroom.demoUserId';

const userIdCodec: StorageCodec<Id | null> = {
  parse: (raw) => {
    const parsed = Id.safeParse(raw);
    return parsed.success ? parsed.data : null;
  },
  serialize: (id) => id ?? '',
};

/**
 * The demo identity. Only the chosen id is client state (persisted); the user list
 * stays in TanStack Query and the current user is derived from both on render.
 */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = usePersistentState(
    DEMO_USER_STORAGE_KEY,
    userIdCodec,
  );
  const users = useUsers(selectedId);
  const currentUser =
    users.data === undefined
      ? undefined
      : resolveCurrentUser(users.data, selectedId);

  return (
    <CurrentUserContext
      value={{ users, currentUser, selectUser: setSelectedId }}
    >
      {children}
    </CurrentUserContext>
  );
}
