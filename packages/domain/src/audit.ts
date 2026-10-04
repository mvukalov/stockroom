import type {
  AuditLogEntry,
  Id,
  IsoDateTime,
  Order,
  OrderLineChange,
  OrderStatus,
  StockMovement,
} from '@stockroom/contract';

import { deterministicId } from './deterministicId';
import { assertNever } from './result';

type EntryOf<T extends AuditLogEntry['type']> = Extract<
  AuditLogEntry,
  { type: T }
>;

/** Display lookups for the summary line. Unknown ids fall back to the id itself. */
export type MovementAuditLookups = {
  skuOf: (productId: Id) => string;
  codeOf: (locationId: Id) => string;
};

const lineCount = (n: number) => `${n} line${n === 1 ? '' : 's'}`;

function movementSummary(
  movement: StockMovement,
  { skuOf, codeOf }: MovementAuditLookups,
): string {
  const sku = skuOf(movement.productId);
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

/** One entry per movement; the id is derived from the movement id. */
export function movementAuditEntry(
  movement: StockMovement,
  lookups: MovementAuditLookups,
): EntryOf<'MOVEMENT_CREATED'> {
  return {
    id: deterministicId(`audit:movement:${movement.id}`),
    type: 'MOVEMENT_CREATED',
    occurredAt: movement.createdAt,
    actorId: movement.createdBy,
    summary: movementSummary(movement, lookups),
    movement,
  };
}

/** A status change after creation; `index` is the change's position in the order timeline. */
export function statusChangeAuditEntry(
  order: Pick<Order, 'id' | 'number'>,
  index: number,
  change: {
    from: OrderStatus;
    to: OrderStatus;
    changedBy: Id;
    changedAt: IsoDateTime;
  },
): EntryOf<'ORDER_STATUS_CHANGED'> {
  return {
    id: deterministicId(`audit:status:${order.id}:${index}`),
    type: 'ORDER_STATUS_CHANGED',
    occurredAt: change.changedAt,
    actorId: change.changedBy,
    summary: `Order ${order.number}: ${change.from} → ${change.to}`,
    orderId: order.id,
    orderNumber: order.number,
    from: change.from,
    to: change.to,
  };
}

/** A DRAFT edit; `index` counts all order edits so far, oldest first. */
export function orderEditedAuditEntry(
  order: Pick<Order, 'id' | 'number'>,
  index: number,
  edit: { editedBy: Id; editedAt: IsoDateTime; changes: OrderLineChange[] },
): EntryOf<'ORDER_EDITED'> {
  return {
    id: deterministicId(`audit:edit:${index}`),
    type: 'ORDER_EDITED',
    occurredAt: edit.editedAt,
    actorId: edit.editedBy,
    summary: `Order ${order.number}: ${lineCount(edit.changes.length)} changed`,
    orderId: order.id,
    orderNumber: order.number,
    changes: edit.changes,
  };
}
