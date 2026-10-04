import type {
  AuditLogEntry,
  Id,
  Order,
  Product,
  StockMovement,
  User,
} from '@stockroom/contract';
import { assertNever, deterministicId } from '@stockroom/domain';

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

const lineCount = (n: number) => `${n} line${n === 1 ? '' : 's'}`;

function movementSummary(
  movement: StockMovement,
  sku: string,
  codeOf: (id: Id) => string,
): string {
  const at = codeOf(movement.locationId);
  switch (movement.type) {
    case 'RECEIPT':
      return `Received ${movement.quantity} × ${sku} at ${at}`;
    case 'ISSUE':
      return `Issued ${movement.quantity} × ${sku} from ${at}`;
    case 'ADJUSTMENT': {
      const sign = movement.direction === 'INCREASE' ? '+' : '−';
      return `Adjusted ${sku} at ${at} by ${sign}${movement.quantity}: ${movement.reason}`;
    }
    case 'TRANSFER':
      return `Transferred ${movement.quantity} × ${sku} ${at} → ${codeOf(movement.destinationLocationId)}`;
    default:
      return assertNever(movement);
  }
}

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

  for (const movement of sources.movements) {
    entries.push({
      id: deterministicId(`audit:movement:${movement.id}`),
      type: 'MOVEMENT_CREATED',
      occurredAt: movement.createdAt,
      actorId: movement.createdBy,
      summary: movementSummary(
        movement,
        skuById.get(movement.productId) ?? movement.productId,
        codeOf,
      ),
      movement,
    });
  }

  for (const order of sources.orders) {
    order.timeline.forEach((change, i) => {
      if (change.from === null) return;
      entries.push({
        id: deterministicId(`audit:status:${order.id}:${i}`),
        type: 'ORDER_STATUS_CHANGED',
        occurredAt: change.changedAt,
        actorId: change.changedBy,
        summary: `Order ${order.number}: ${change.from} → ${change.to}`,
        orderId: order.id,
        orderNumber: order.number,
        from: change.from,
        to: change.to,
      });
    });
  }

  sources.edits.forEach((edit, i) => {
    const order = orderById.get(edit.orderId);
    if (!order)
      throw new Error(`Seed audit: edit for unknown order ${edit.orderId}`);
    entries.push({
      id: deterministicId(`audit:edit:${i}`),
      type: 'ORDER_EDITED',
      occurredAt: edit.editedAt,
      actorId: edit.editedBy,
      summary: `Order ${order.number}: ${lineCount(edit.changes.length)} changed`,
      orderId: order.id,
      orderNumber: order.number,
      changes: edit.changes,
    });
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
