import type { Role, User } from '@stockroom/contract';

/** `view` covers navigation, filters and sorting; `export` is Export CSV. */
export const ACTIONS = [
  'view',
  'export',
  'movement.create',
  'order.create',
  'order.edit',
  'order.transition',
  'order.cancel',
  'product.create',
  'product.update',
  'product.archive',
  'role.change',
] as const;
export type Action = (typeof ACTIONS)[number];

/** Who may do what (project overview, "Permissions"; ADR-0004). */
export const PERMISSIONS: Readonly<Record<Action, readonly Role[]>> = {
  view: ['ADMIN', 'CLERK', 'VIEWER'],
  export: ['ADMIN', 'CLERK', 'VIEWER'],
  'movement.create': ['ADMIN', 'CLERK'],
  'order.create': ['ADMIN', 'CLERK'],
  'order.edit': ['ADMIN', 'CLERK'],
  'order.transition': ['ADMIN', 'CLERK'],
  'order.cancel': ['ADMIN', 'CLERK'],
  'product.create': ['ADMIN'],
  'product.update': ['ADMIN'],
  'product.archive': ['ADMIN'],
  'role.change': ['ADMIN'],
};

export const READ_ONLY_REASON = 'Your role is read-only';
export const ADMIN_ONLY_REASON = 'Only an admin can do this';

export function can(user: Pick<User, 'role'>, action: Action): boolean {
  return PERMISSIONS[action].includes(user.role);
}

/** Actions that only read: they change no data. */
const READ_ACTIONS: ReadonlySet<Action> = new Set(['view', 'export']);

/**
 * True when the user may only read: no action that changes data is allowed. Derived
 * from `PERMISSIONS`, so it follows any change there; it is not a permission itself.
 */
export function isReadOnly(user: Pick<User, 'role'>): boolean {
  return ACTIONS.every(
    (action) => READ_ACTIONS.has(action) || !can(user, action),
  );
}

/** Explanation for a disabled control, or `null` when the action is allowed. */
export function denialReason(
  user: Pick<User, 'role'>,
  action: Action,
): string | null {
  if (can(user, action)) return null;
  return user.role === 'VIEWER' ? READ_ONLY_REASON : ADMIN_ONLY_REASON;
}
