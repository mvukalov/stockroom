import type { PathParams } from 'msw';

import {
  ENDPOINTS,
  OrderStatus,
  type Order,
  type OrderLine,
  type OrderStatus as Status,
} from '@stockroom/contract';
import {
  assertNever,
  canEditOrder,
  diffOrderLines,
  movementAuditEntry,
  orderEditedAuditEntry,
  statusChangeAuditEntry,
  transitionOrder,
  type LineShortage,
  type TransitionError,
} from '@stockroom/domain';

import { appendMovement, type MockDb } from '../db';
import {
  apiError,
  authorize,
  notFound,
  parseBody,
  parseQuery,
  respond,
  validationError,
} from '../http';
import { inDateRange, matchesText, paginate, sortBy } from '../listing';
import {
  auditLookups,
  titleOf,
  toOrderDetail,
  toOrderSummary,
} from '../readModels';
import { route } from '../route';

/** The order named by the `:id` path parameter, or `null` when the id is not a known order. */
function findOrder(db: MockDb, params: PathParams): Order | null {
  const parsed = ENDPOINTS.getOrder.params.safeParse(params);
  if (!parsed.success) return null;
  return db.orders.find((o) => o.id === parsed.data.id) ?? null;
}

function replaceOrder(db: MockDb, order: Order): void {
  db.orders = db.orders.map((o) => (o.id === order.id ? order : o));
}

const lines = (n: number) => `${n} line${n === 1 ? '' : 's'}`;

function shortageError(
  to: Status,
  order: Order,
  shortages: readonly LineShortage[],
) {
  // Details carry the first short line; the order detail marks all of them.
  const first = shortages[0];
  const line = order.lines.find((l) => l.id === first?.lineId);
  if (!first || !line) {
    throw new Error('Domain reported a shortage without a matching line');
  }
  const count = lines(shortages.length);
  return apiError({
    code: 'INSUFFICIENT_STOCK',
    message:
      to === 'CONFIRMED'
        ? `${count} exceed available stock. Reduce the quantity or remove the line to confirm.`
        : `${count} exceed the stock on hand.`,
    details: {
      productId: first.productId,
      locationId: line.locationId,
      available: Math.max(0, first.available),
    },
  });
}

function transitionError(order: Order, to: Status, error: TransitionError) {
  switch (error.code) {
    case 'INVALID_TRANSITION':
      return apiError({
        code: 'INVALID_TRANSITION',
        message: `Order ${order.number} cannot move from ${error.from} to ${error.to}.`,
      });
    case 'INSUFFICIENT_STOCK':
      return shortageError(to, order, error.lines);
    default:
      return assertNever(error);
  }
}

export const orderHandlers = [
  route('listOrders', ({ request, db }) => {
    const user = authorize(request, db, 'view');
    if (!user.ok) return user.error;
    const query = parseQuery(request, ENDPOINTS.listOrders.query);

    // Status counts ignore the status filter, so every tab shows its count.
    const matching = db.orders.filter(
      (o) =>
        matchesText(query.search, o.number, o.customer.name) &&
        inDateRange(o.createdAt, query),
    );
    const statusCounts = Object.fromEntries(
      OrderStatus.options.map((status) => [
        status,
        matching.filter((o) => o.status === status).length,
      ]),
    ) as Record<Status, number>;

    const rows = matching
      .filter((o) => query.status === undefined || o.status === query.status)
      .map(toOrderSummary);
    const sorted = sortBy(rows, query.sort, {
      number: (o) => o.number,
      customer: (o) => o.customerName.toLowerCase(),
      createdAt: (o) => o.createdAt,
      lineCount: (o) => o.lineCount,
      total: (o) => o.totalCents,
      status: (o) => OrderStatus.options.indexOf(o.status),
    });
    return respond(ENDPOINTS.listOrders.response, {
      ...paginate(sorted, query),
      statusCounts,
    });
  }),

  route('getOrder', ({ request, params, db }) => {
    const user = authorize(request, db, 'view');
    if (!user.ok) return user.error;
    const order = findOrder(db, params);
    if (!order) return notFound('Order not found.');
    return respond(ENDPOINTS.getOrder.response, toOrderDetail(db, order));
  }),

  // Replaces all lines; DRAFT only. Prices are snapshots: kept for existing lines,
  // taken from the product for new ones.
  route('updateOrderLines', async ({ request, params, db }) => {
    const user = authorize(request, db, 'order.edit');
    if (!user.ok) return user.error;
    const order = findOrder(db, params);
    if (!order) return notFound('Order not found.');
    const body = await parseBody(request, ENDPOINTS.updateOrderLines.body);
    if (!body.ok) return body.error;

    if (!canEditOrder(order)) {
      return apiError({
        code: 'CONFLICT',
        message: `Order ${order.number} is ${order.status}. Lines can be edited only in DRAFT.`,
      });
    }

    const existing = new Map(order.lines.map((l) => [l.id, l]));
    const issues: { path: (string | number)[]; message: string }[] = [];
    body.value.lines.forEach((line, i) => {
      if (!db.productById.has(line.productId)) {
        issues.push({
          path: ['lines', i, 'productId'],
          message: 'Unknown product',
        });
      }
      if (!db.locationById.has(line.locationId)) {
        issues.push({
          path: ['lines', i, 'locationId'],
          message: 'Unknown location',
        });
      }
      if (line.id !== undefined && !existing.has(line.id)) {
        issues.push({ path: ['lines', i, 'id'], message: 'Unknown line' });
      }
    });
    if (issues.length > 0) return validationError(issues);

    const nextLines: OrderLine[] = body.value.lines.map((line) => {
      const previous =
        line.id === undefined ? undefined : existing.get(line.id);
      const keepsPrice = previous?.productId === line.productId;
      return {
        id: line.id ?? crypto.randomUUID(),
        productId: line.productId,
        locationId: line.locationId,
        quantity: line.quantity,
        unitPriceCents:
          keepsPrice && previous
            ? previous.unitPriceCents
            : (db.productById.get(line.productId)?.priceCents ?? 0),
      };
    });

    const changes = diffOrderLines(order.lines, nextLines, (id) =>
      titleOf(db, id),
    );
    const updated: Order = { ...order, lines: nextLines };
    replaceOrder(db, updated);
    if (changes.length > 0) {
      db.auditLog.push(
        orderEditedAuditEntry(updated, db.orderEditCount, {
          editedBy: user.value.id,
          editedAt: db.now(),
          changes,
        }),
      );
      db.orderEditCount += 1;
    }
    return respond(
      ENDPOINTS.updateOrderLines.response,
      toOrderDetail(db, updated),
    );
  }),

  // The domain state machine decides; shipping also writes the ISSUE movements.
  route('transitionOrder', async ({ request, params, db }) => {
    const body = await parseBody(request, ENDPOINTS.transitionOrder.body);
    const action =
      body.ok && body.value.to === 'CANCELLED'
        ? 'order.cancel'
        : 'order.transition';
    const user = authorize(request, db, action);
    if (!user.ok) return user.error;
    const order = findOrder(db, params);
    if (!order) return notFound('Order not found.');
    if (!body.ok) return body.error;
    const { to } = body.value;

    const result = transitionOrder(order, to, {
      userId: user.value.id,
      at: db.now(),
      stock: db.stock,
      orders: db.orders,
      locationCodes: new Map(db.locations.map((l) => [l.id, l.code])),
    });
    if (!result.ok) return transitionError(order, to, result.error);

    const { status, timelineEntry, movements } = result.value;
    const updated: Order = {
      ...order,
      status,
      timeline: [...order.timeline, timelineEntry],
    };
    replaceOrder(db, updated);
    const lookups = auditLookups(db);
    for (const movement of movements) {
      appendMovement(db, movement);
      db.auditLog.push(movementAuditEntry(movement, lookups));
    }
    db.auditLog.push(
      statusChangeAuditEntry(updated, updated.timeline.length - 1, {
        ...timelineEntry,
        from: order.status,
      }),
    );
    return respond(
      ENDPOINTS.transitionOrder.response,
      toOrderDetail(db, updated),
    );
  }),
];
