import type { Faker } from '@faker-js/faker';

import type { Id, IsoDateTime, Role, User } from '@stockroom/contract';
import { deterministicId } from '@stockroom/domain';

import { PROMOTION_MS } from './constants';

/** A role change, the source of `ROLE_CHANGED` audit entries. */
export type RoleChange = {
  userId: Id;
  from: Role;
  to: Role;
  changedBy: Id;
  changedAt: IsoDateTime;
};

export type Staff = {
  users: User[];
  /** Oldest first. */
  roleChanges: RoleChange[];
};

/**
 * One ADMIN, two CLERKs and one VIEWER. The second clerk started as a VIEWER and was
 * promoted, so their movements start after the promotion. Nobody is demoted to VIEWER,
 * so the current VIEWER has never created a movement or edited an order.
 */
export function generateStaff(faker: Faker): Staff {
  const user = (key: string, role: Role): User => ({
    id: deterministicId(`user:${key}`),
    name: `${faker.person.firstName()} ${faker.person.lastName()}`,
    role,
  });
  const admin = user('admin', 'ADMIN');
  const clerk = user('clerk-1', 'CLERK');
  const promotedClerk = user('clerk-2', 'CLERK');
  const viewer = user('viewer', 'VIEWER');

  return {
    users: [admin, clerk, promotedClerk, viewer],
    roleChanges: [
      {
        userId: promotedClerk.id,
        from: 'VIEWER',
        to: 'CLERK',
        changedBy: admin.id,
        changedAt: new Date(PROMOTION_MS).toISOString(),
      },
    ],
  };
}

/** The user's role at a point in time, replaying role changes backwards from today. */
export function roleAt(
  user: User,
  roleChanges: readonly RoleChange[],
  atMs: number,
): Role {
  let role = user.role;
  for (let i = roleChanges.length - 1; i >= 0; i--) {
    const change = roleChanges[i];
    if (change?.userId === user.id && Date.parse(change.changedAt) > atMs) {
      role = change.from;
    }
  }
  return role;
}
