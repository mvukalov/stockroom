import { describe, expect, it } from 'vitest';

import { Role } from '@stockroom/contract';

import {
  ACTIONS,
  can,
  denialReason,
  isReadOnly,
  type Action,
} from './permissions';

// Written out from the spec table, independently of PERMISSIONS.
const EXPECTED: Record<Action, Record<Role, boolean>> = {
  view: { ADMIN: true, CLERK: true, VIEWER: true },
  export: { ADMIN: true, CLERK: true, VIEWER: true },
  'movement.create': { ADMIN: true, CLERK: true, VIEWER: false },
  'order.create': { ADMIN: true, CLERK: true, VIEWER: false },
  'order.edit': { ADMIN: true, CLERK: true, VIEWER: false },
  'order.transition': { ADMIN: true, CLERK: true, VIEWER: false },
  'order.cancel': { ADMIN: true, CLERK: true, VIEWER: false },
  'product.create': { ADMIN: true, CLERK: false, VIEWER: false },
  'product.update': { ADMIN: true, CLERK: false, VIEWER: false },
  'product.archive': { ADMIN: true, CLERK: false, VIEWER: false },
  'role.change': { ADMIN: true, CLERK: false, VIEWER: false },
};

const cases = Role.options.flatMap((role) =>
  ACTIONS.map((action) => ({ role, action, allowed: EXPECTED[action][role] })),
);

describe('can', () => {
  it.each(cases)('$role $action -> $allowed', ({ role, action, allowed }) => {
    expect(can({ role }, action)).toBe(allowed);
  });

  it('lets ADMIN do everything', () => {
    expect(ACTIONS.every((action) => can({ role: 'ADMIN' }, action))).toBe(
      true,
    );
  });
});

describe('denialReason', () => {
  it.each(cases)('$role $action', ({ role, action, allowed }) => {
    const reason = denialReason({ role }, action);
    if (allowed) {
      expect(reason).toBeNull();
    } else if (role === 'VIEWER') {
      expect(reason).toBe('Your role is read-only');
    } else {
      expect(reason).toBe('Only an admin can do this');
    }
  });
});

describe('isReadOnly', () => {
  it.each(Role.options)('%s', (role) => {
    // Read-only means every allowed action is `view` or `export` in the table above.
    const writes = ACTIONS.filter(
      (action) => action !== 'view' && action !== 'export',
    );
    expect(isReadOnly({ role })).toBe(
      writes.every((action) => !EXPECTED[action][role]),
    );
  });

  it('holds for VIEWER only', () => {
    expect(Role.options.filter((role) => isReadOnly({ role }))).toEqual([
      'VIEWER',
    ]);
  });
});
