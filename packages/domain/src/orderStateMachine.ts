import type {
  Id,
  IsoDateTime,
  Order,
  OrderStatus,
  OrderStatusChange,
  StockMovement,
} from '@stockroom/contract';

import { deterministicId } from './deterministicId';
import { assertNever, err, ok, type Result } from './result';
import {
  allocateIssue,
  computeAvailability,
  type StockByLocation,
} from './stock';

/** Allowed edges. SHIPPED and CANCELLED are terminal. */
export const ORDER_TRANSITIONS: Readonly<
  Record<OrderStatus, readonly OrderStatus[]>
> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PICKED', 'CANCELLED'],
  PICKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function nextStatuses(from: OrderStatus): readonly OrderStatus[] {
  return ORDER_TRANSITIONS[from];
}

/** Lines are editable only in DRAFT. */
export function canEditOrder(order: Pick<Order, 'status'>): boolean {
  return order.status === 'DRAFT';
}

/** Counted as "Open orders" on the dashboard: DRAFT, CONFIRMED and PICKED. */
export function isOpenOrder(order: Pick<Order, 'status'>): boolean {
  switch (order.status) {
    case 'DRAFT':
    case 'CONFIRMED':
    case 'PICKED':
      return true;
    case 'SHIPPED':
    case 'CANCELLED':
      return false;
    default:
      return assertNever(order.status);
  }
}

export type TransitionContext = {
  userId: Id;
  at: IsoDateTime;
  stock: StockByLocation;
  /** All orders, for reservations. The order being transitioned is ignored. */
  orders: readonly Order[];
  /** Location id -> code, for the deterministic split when shipping. */
  locationCodes: ReadonlyMap<Id, string>;
};

export type LineShortage = {
  lineId: Id;
  productId: Id;
  requested: number;
  /** What the product can cover: `available` on confirm, on hand on ship. */
  available: number;
};

export type TransitionError =
  | { code: 'INVALID_TRANSITION'; from: OrderStatus; to: OrderStatus }
  | { code: 'INSUFFICIENT_STOCK'; lines: LineShortage[] };

export type TransitionOutcome = {
  status: OrderStatus;
  timelineEntry: OrderStatusChange;
  /** ISSUE movements to write with the status change. Empty unless shipping. */
  movements: StockMovement[];
};

/**
 * Lines whose product demand exceeds `available`. Lines of the same product are summed,
 * so each of them is reported when together they exceed it.
 */
function confirmShortages(
  order: Order,
  ctx: TransitionContext,
): LineShortage[] {
  const otherOrders = ctx.orders.filter((other) => other.id !== order.id);
  const demand = new Map<Id, number>();
  for (const line of order.lines) {
    demand.set(
      line.productId,
      (demand.get(line.productId) ?? 0) + line.quantity,
    );
  }

  const shortages: LineShortage[] = [];
  for (const line of order.lines) {
    const { available } = computeAvailability(
      ctx.stock,
      otherOrders,
      line.productId,
    );
    if ((demand.get(line.productId) ?? 0) > available) {
      shortages.push({
        lineId: line.id,
        productId: line.productId,
        requested: line.quantity,
        available,
      });
    }
  }
  return shortages;
}

/** ISSUE movements for every line, split across locations by `allocateIssue`. */
function shipMovements(
  order: Order,
  ctx: TransitionContext,
): Result<StockMovement[], LineShortage[]> {
  const working = new Map(ctx.stock);
  const movements: StockMovement[] = [];
  const shortages: LineShortage[] = [];

  for (const line of order.lines) {
    const allocation = allocateIssue(working, line.productId, line.quantity, {
      locationCodes: ctx.locationCodes,
      preferredLocationId: line.locationId,
    });
    if (!allocation.ok) {
      shortages.push({
        lineId: line.id,
        productId: line.productId,
        requested: line.quantity,
        available: allocation.error.onHand,
      });
      continue;
    }

    // Later lines of the same product see what earlier lines took.
    const locations = new Map(working.get(line.productId));
    for (const { locationId, quantity } of allocation.value) {
      locations.set(locationId, (locations.get(locationId) ?? 0) - quantity);
      movements.push({
        // Order + line + location: a retried ship produces the same ids (ADR-0003).
        id: deterministicId(`${order.id}:${line.id}:${locationId}`),
        type: 'ISSUE',
        productId: line.productId,
        locationId,
        quantity,
        reason: `Order ${order.number}`,
        createdBy: ctx.userId,
        createdAt: ctx.at,
      });
    }
    working.set(line.productId, locations);
  }

  return shortages.length > 0 ? err(shortages) : ok(movements);
}

export function transitionOrder(
  order: Order,
  to: OrderStatus,
  ctx: TransitionContext,
): Result<TransitionOutcome, TransitionError> {
  const from = order.status;
  if (!canTransition(from, to)) {
    return err({ code: 'INVALID_TRANSITION', from, to });
  }

  const outcome = (movements: StockMovement[]): TransitionOutcome => ({
    status: to,
    timelineEntry: { from, to, changedBy: ctx.userId, changedAt: ctx.at },
    movements,
  });

  switch (to) {
    case 'CONFIRMED': {
      const shortages = confirmShortages(order, ctx);
      if (shortages.length > 0) {
        return err({ code: 'INSUFFICIENT_STOCK', lines: shortages });
      }
      return ok(outcome([]));
    }
    case 'SHIPPED': {
      const movements = shipMovements(order, ctx);
      if (!movements.ok) {
        return err({ code: 'INSUFFICIENT_STOCK', lines: movements.error });
      }
      return ok(outcome(movements.value));
    }
    case 'DRAFT':
    case 'PICKED':
    case 'CANCELLED':
      return ok(outcome([]));
    default:
      return assertNever(to);
  }
}
