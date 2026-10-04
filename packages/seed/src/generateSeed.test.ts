import { beforeAll, describe, expect, it } from 'vitest';

import {
  AuditLogEntry,
  Category,
  Location,
  Order,
  Product,
  StockMovement,
  Supplier,
  User,
  Warehouse,
  type Id,
  type OrderStatus,
} from '@stockroom/contract';
import {
  can,
  canTransition,
  computeAvailability,
  isOpenOrder,
  movementDeltas,
  stockByLocation,
} from '@stockroom/domain';

import { NOW_MS, ORDER_STATUS_MIX } from './constants';
import { generateSeed, type SeedData } from './generateSeed';
import { roleAt } from './staff';

/** FNV-1a, 32 bit: enough to compare two runs. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** The order's status at a moment, read from its timeline. */
function statusAt(order: Order, atMs: number): OrderStatus | null {
  let status: OrderStatus | null = null;
  for (const change of order.timeline) {
    if (Date.parse(change.changedAt) <= atMs) status = change.to;
  }
  return status;
}

let seed: SeedData;
let durationMs: number;

beforeAll(() => {
  const start = Date.now();
  seed = generateSeed();
  durationMs = Date.now() - start;
});

describe('generateSeed', () => {
  it('produces identical output for the same seed', () => {
    expect(hash(JSON.stringify(generateSeed()))).toBe(
      hash(JSON.stringify(seed)),
    );
  });

  it('produces different output for a different seed', () => {
    expect(hash(JSON.stringify(generateSeed({ seed: 1 })))).not.toBe(
      hash(JSON.stringify(seed)),
    );
  });

  it('matches the contract schema for every record', () => {
    const groups = [
      [Category, seed.categories],
      [Supplier, seed.suppliers],
      [Warehouse, seed.warehouses],
      [Location, seed.locations],
      [User, seed.users],
      [Product, seed.products],
      [StockMovement, seed.movements],
      [Order, seed.orders],
      [AuditLogEntry, seed.auditLog],
    ] as const;
    for (const [schema, records] of groups) {
      for (const record of records) {
        const result = schema.safeParse(record);
        if (!result.success) {
          throw new Error(`${JSON.stringify(record)}\n${result.error.message}`);
        }
      }
    }
  });

  it('is close to the prototype volume', () => {
    expect(seed.products).toHaveLength(194);
    expect(seed.orders).toHaveLength(26);
    expect(seed.movements.length).toBeGreaterThanOrEqual(48_000);
    expect(seed.movements.length).toBeLessThan(48_500);
    expect(seed.auditLog.length).toBeGreaterThan(seed.movements.length);
    // Recorded in the PR; generous so a slow CI runner does not flake.
    expect(durationMs).toBeLessThan(5_000);
  });

  it('has no timestamp after NOW', () => {
    const timestamps = [
      ...seed.movements.map((m) => m.createdAt),
      ...seed.orders.flatMap((o) => [
        o.createdAt,
        ...o.timeline.map((c) => c.changedAt),
      ]),
      ...seed.auditLog.map((a) => a.occurredAt),
      ...seed.products.flatMap((p) => (p.archivedAt ? [p.archivedAt] : [])),
    ];
    for (const timestamp of timestamps) {
      expect(Date.parse(timestamp)).toBeLessThanOrEqual(NOW_MS);
    }
    expect(Date.parse(seed.now)).toBe(NOW_MS);
  });

  it('keeps the movement and audit logs in time order', () => {
    const inOrder = (times: readonly string[]) =>
      times.every(
        (t, i) => i === 0 || Date.parse(times[i - 1] ?? t) <= Date.parse(t),
      );
    expect(inOrder(seed.movements.map((m) => m.createdAt))).toBe(true);
    expect(inOrder(seed.auditLog.map((a) => a.occurredAt))).toBe(true);
  });

  it('never takes a location below zero at any point in the history', () => {
    const stock = new Map<string, number>();
    for (const movement of seed.movements) {
      for (const delta of movementDeltas(movement)) {
        const key = `${movement.productId}:${delta.locationId}`;
        const quantity = (stock.get(key) ?? 0) + delta.quantity;
        if (quantity < 0) {
          throw new Error(`Negative stock after movement ${movement.id}`);
        }
        stock.set(key, quantity);
      }
    }
  });

  it('never shows a shortage on a CONFIRMED or PICKED order', () => {
    const stock = stockByLocation(seed.movements);
    for (const product of seed.products) {
      expect(
        computeAvailability(stock, seed.orders, product.id).available,
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it('writes ISSUE movements for exactly the lines of every shipped order', () => {
    for (const order of seed.orders.filter((o) => o.status === 'SHIPPED')) {
      const issued = new Map<Id, number>();
      for (const m of seed.movements) {
        if (m.type === 'ISSUE' && m.reason === `Order ${order.number}`) {
          issued.set(m.productId, (issued.get(m.productId) ?? 0) + m.quantity);
        }
      }
      const ordered = new Map<Id, number>();
      for (const line of order.lines) {
        ordered.set(
          line.productId,
          (ordered.get(line.productId) ?? 0) + line.quantity,
        );
      }
      expect(issued).toEqual(ordered);
    }
  });

  it('matches every ORDER_STATUS_CHANGED entry to the order status path', () => {
    for (const order of seed.orders) {
      const [created, ...changes] = order.timeline;
      expect(created).toMatchObject({ from: null, to: 'DRAFT' });
      let previous: OrderStatus = 'DRAFT';
      for (const change of changes) {
        expect(change.from).toBe(previous);
        expect(canTransition(previous, change.to)).toBe(true);
        previous = change.to;
      }
      expect(previous).toBe(order.status);

      const audited = seed.auditLog.flatMap((entry) =>
        entry.type === 'ORDER_STATUS_CHANGED' && entry.orderId === order.id
          ? [
              {
                from: entry.from,
                to: entry.to,
                changedBy: entry.actorId,
                changedAt: entry.occurredAt,
              },
            ]
          : [],
      );
      expect(audited).toEqual(changes);
    }
  });

  it('records ORDER_EDITED only while the order was in DRAFT', () => {
    const orderById = new Map(seed.orders.map((o) => [o.id, o]));
    const edits = seed.auditLog.filter((e) => e.type === 'ORDER_EDITED');
    expect(edits.length).toBeGreaterThan(0);
    for (const edit of edits) {
      const order = orderById.get(edit.orderId);
      if (!order) throw new Error(`Edit for unknown order ${edit.orderId}`);
      expect(statusAt(order, Date.parse(edit.occurredAt))).toBe('DRAFT');
    }
  });

  it('counts open orders as DRAFT + CONFIRMED + PICKED', () => {
    const open = seed.orders.filter(isOpenOrder);
    expect(open).toHaveLength(
      ORDER_STATUS_MIX.DRAFT +
        ORDER_STATUS_MIX.CONFIRMED +
        ORDER_STATUS_MIX.PICKED,
    );
    for (const status of Object.keys(ORDER_STATUS_MIX) as OrderStatus[]) {
      expect(seed.orders.filter((o) => o.status === status)).toHaveLength(
        ORDER_STATUS_MIX[status],
      );
    }
  });

  it('has no movement or order change by a VIEWER, now or at the time', () => {
    const userById = new Map(seed.users.map((u) => [u.id, u]));
    // The role history is read back from the audit log itself.
    const roleChanges = seed.auditLog.flatMap((entry) =>
      entry.type === 'ROLE_CHANGED'
        ? [
            {
              userId: entry.userId,
              from: entry.from,
              to: entry.to,
              changedBy: entry.actorId,
              changedAt: entry.occurredAt,
            },
          ]
        : [],
    );
    expect(seed.users.some((u) => u.role === 'VIEWER')).toBe(true);

    for (const entry of seed.auditLog) {
      const action =
        entry.type === 'MOVEMENT_CREATED'
          ? 'movement.create'
          : entry.type === 'ORDER_EDITED'
            ? 'order.edit'
            : entry.type === 'ROLE_CHANGED'
              ? 'role.change'
              : entry.to === 'CANCELLED'
                ? 'order.cancel'
                : 'order.transition';
      const user = userById.get(entry.actorId);
      if (!user) throw new Error(`Unknown actor ${entry.actorId}`);
      expect(user.role).not.toBe('VIEWER');
      const role = roleAt(user, roleChanges, Date.parse(entry.occurredAt));
      if (!can({ role }, action)) {
        throw new Error(
          `${user.name} (${role}) may not ${action}: ${entry.id}`,
        );
      }
    }
  });
});
