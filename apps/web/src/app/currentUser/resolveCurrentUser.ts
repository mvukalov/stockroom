import type { Id, User } from '@stockroom/contract';

/**
 * The selected user. When nothing (or an unknown id) is selected: the first ADMIN,
 * then the first user. `undefined` only for an empty list.
 */
export function resolveCurrentUser(
  users: readonly User[],
  selectedId: Id | null,
): User | undefined {
  return (
    users.find((user) => user.id === selectedId) ??
    users.find((user) => user.role === 'ADMIN') ??
    users[0]
  );
}
