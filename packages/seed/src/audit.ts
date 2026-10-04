import type {
  AuditLogEntry,
  Id,
  Order,
  Product,
  StockMovement,
  User,
} from '@stockroom/contract';
import {
  deterministicId,
  movementAuditEntry,
  orderEditedAuditEntry,
  statusChangeAuditEntry,
} from '@stockroom/domain';

import type { RoleChange } from './staff';
import type { OrderEdit } from './state';

export type AuditSources = {
  movements: readonly StockMovement[];
  orders: readonly Order[];
  edits: readonly OrderEdit[];
  roleChanges: readonly RoleChange[];
  users: readonly User[];
  products: readonly Product[];
  locationCodes: ReadonlyMap<Id, string>;
};

/**
 * Derived, never generated on its own: one entry per movement, per status change after
 * creation, per DRAFT edit and per role change. Oldest first.
 */
export function buildAuditLog(sources: AuditSources): AuditLogEntry[] {
  const skuById = new Map(sources.products.map((p) => [p.id, p.sku]));
  const userName = new Map(sources.users.map((u) => [u.id, u.name]));
  const orderById = new Map(sources.orders.map((o) => [o.id, o]));
  const codeOf = (id: Id) => sources.locationCodes.get(id) ?? id;
  const entries: AuditLogEntry[] = [];

  const lookups = {
    skuOf: (productId: Id) => skuById.get(productId) ?? productId,
    codeOf,
  };
  for (const movement of sources.movements) {
    entries.push(movementAuditEntry(movement, lookups));
  }

  for (const order of sources.orders) {
    order.timeline.forEach((change, i) => {
      if (change.from === null) return;
      entries.push(
        statusChangeAuditEntry(order, i, { ...change, from: change.from }),
      );
    });
  }

  sources.edits.forEach((edit, i) => {
    const order = orderById.get(edit.orderId);
    if (!order)
      throw new Error(`Seed audit: edit for unknown order ${edit.orderId}`);
    entries.push(orderEditedAuditEntry(order, i, edit));
  });

  sources.roleChanges.forEach((change, i) => {
    const name = userName.get(change.userId) ?? change.userId;
    entries.push({
      id: deterministicId(`audit:role:${i}`),
      type: 'ROLE_CHANGED',
      occurredAt: change.changedAt,
      actorId: change.changedBy,
      summary: `${name}: ${change.from} → ${change.to}`,
      userId: change.userId,
      userName: name,
      from: change.from,
      to: change.to,
    });
  });

  // All timestamps come from `toISOString()`, so string order is time order. Stable sort.
  return entries.sort((a, b) =>
    a.occurredAt < b.occurredAt ? -1 : a.occurredAt > b.occurredAt ? 1 : 0,
  );
}
