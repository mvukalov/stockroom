// @vitest-environment jsdom
// The handlers use relative paths, as in the browser; jsdom gives them an origin to match.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  ApiError,
  ENDPOINTS,
  USER_ID_HEADER,
  type CreateMovementInput,
  type Id,
  type Order,
  type OrderStatus,
  type Role,
  type User,
} from '@stockroom/contract';

import {
  DEFAULT_LATENCY,
  resetMockConfig,
  setMockConfig,
  SLOW_LATENCY,
} from './config';
import { getDb, resetDb } from './db';
import { latencyMs, respond } from './http';
import { server } from './node';
import { availabilityOf } from './readModels';

const BASE = window.location.origin;

type CallOptions = {
  method?: 'GET' | 'POST' | 'PATCH';
  as?: Role | null;
  body?: unknown;
};

function userWith(role: Role): User {
  const user = getDb().users.find((u) => u.role === role);
  if (!user) throw new Error(`Seed has no ${role}`);
  return user;
}

async function call(
  path: string,
  { method = 'GET', as = 'ADMIN', body }: CallOptions = {},
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (as !== null) headers[USER_ID_HEADER] = userWith(as).id;
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text === '' ? null : (JSON.parse(text) as unknown),
  };
}

function orderWith(status: OrderStatus): Order {
  const order = getDb().orders.find((o) => o.status === status);
  if (!order) throw new Error(`Seed has no ${status} order`);
  return order;
}

/** The product and location with the most stock, so an issue of 1 always fits. */
function wellStocked() {
  const db = getDb();
  let best = { productId: '', locationId: '', onHand: -1 };
  for (const [productId, locations] of db.stock) {
    for (const [locationId, onHand] of locations) {
      if (onHand > best.onHand && availabilityOf(db, productId).available > 0) {
        best = { productId, locationId, onHand };
      }
    }
  }
  return best;
}

const newId = (): Id => crypto.randomUUID();

function receiptInput(): CreateMovementInput {
  const { productId, locationId } = wellStocked();
  return {
    id: newId(),
    type: 'RECEIPT',
    productId,
    locationId,
    quantity: 5,
    reason: null,
  };
}

const expectError = (
  result: { status: number; body: unknown },
  status: number,
  code: ApiError['code'],
) => {
  expect(result.status).toBe(status);
  const parsed = ApiError.parse(result.body);
  expect(parsed.code).toBe(code);
  return parsed;
};

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  resetMockConfig();
  setMockConfig({ latency: { minMs: 0, maxMs: 0 } });
  resetDb();
});

describe('every endpoint responds with its contract schema', () => {
  it.each([
    ['listUsers', '/api/users'],
    ['getDashboard', '/api/dashboard'],
    ['listProducts', '/api/products?sort=-onHand&pageSize=100'],
    ['listProducts', '/api/products?archived=true&stockStatus=LOW'],
    ['listMovements', '/api/movements?type=TRANSFER&pageSize=100'],
    ['listOrders', '/api/orders?status=DRAFT'],
    ['listAudit', '/api/audit?pageSize=100'],
  ] as const)('%s %s', async (name, path) => {
    const result = await call(path);
    expect(result.status).toBe(200);
    expect(ENDPOINTS[name].response.safeParse(result.body).success).toBe(true);
  });

  it('getOrder', async () => {
    const result = await call(`/api/orders/${orderWith('PICKED').id}`);
    expect(result.status).toBe(200);
    expect(ENDPOINTS.getOrder.response.safeParse(result.body).success).toBe(
      true,
    );
  });

  it('createMovement', async () => {
    const result = await call('/api/movements', {
      method: 'POST',
      body: receiptInput(),
    });
    expect(result.status).toBe(201);
    expect(
      ENDPOINTS.createMovement.response.safeParse(result.body).success,
    ).toBe(true);
  });

  it('updateOrderLines', async () => {
    const order = orderWith('DRAFT');
    const result = await call(`/api/orders/${order.id}`, {
      method: 'PATCH',
      body: { lines: order.lines },
    });
    expect(result.status).toBe(200);
    expect(
      ENDPOINTS.updateOrderLines.response.safeParse(result.body).success,
    ).toBe(true);
  });

  it('transitionOrder', async () => {
    const result = await call(
      `/api/orders/${orderWith('DRAFT').id}/transition`,
      { method: 'POST', body: { to: 'CANCELLED' } },
    );
    expect(result.status).toBe(200);
    expect(
      ENDPOINTS.transitionOrder.response.safeParse(result.body).success,
    ).toBe(true);
  });

  it('falls back to defaults on invalid query values', async () => {
    const result = await call('/api/movements?page=abc&pageSize=7&sort=x');
    const page = ENDPOINTS.listMovements.response.parse(result.body);
    expect(page.page).toBe(1);
    expect(page.pageSize).toBe(50);
  });
});

describe('respond', () => {
  it('throws when a mock response does not match the contract', () => {
    const user = { id: 'not-a-uuid', name: 'Ana', role: 'ADMIN' } as const;
    expect(() => respond(ENDPOINTS.listUsers.response, [user])).toThrow(
      /does not match the contract/,
    );
  });
});

describe('POST /api/movements', () => {
  it('stores a new movement once and returns it again for a retry', async () => {
    const db = getDb();
    const input = receiptInput();
    const movementsBefore = db.movements.length;
    const auditBefore = db.auditLog.length;

    const first = await call('/api/movements', { method: 'POST', body: input });
    const retry = await call('/api/movements', { method: 'POST', body: input });

    expect(first.status).toBe(201);
    expect(retry.status).toBe(200);
    expect(retry.body).toEqual(first.body);
    expect(db.movements.length).toBe(movementsBefore + 1);
    expect(db.auditLog.length).toBe(auditBefore + 1);
    expect(db.auditLog.at(-1)).toMatchObject({
      type: 'MOVEMENT_CREATED',
      movement: { id: input.id },
      actorId: userWith('ADMIN').id,
    });
  });

  it('refuses the same id with a different payload with CONFLICT', async () => {
    const input = receiptInput();
    await call('/api/movements', { method: 'POST', body: input });
    const result = await call('/api/movements', {
      method: 'POST',
      body: { ...input, quantity: input.quantity + 1 },
    });
    expectError(result, 409, 'CONFLICT');
  });

  it('refuses an issue above the stock on hand with INSUFFICIENT_STOCK', async () => {
    const db = getDb();
    const { productId, locationId } = wellStocked();
    const movementsBefore = db.movements.length;
    const result = await call('/api/movements', {
      method: 'POST',
      body: {
        id: newId(),
        type: 'ISSUE',
        productId,
        locationId,
        quantity: 1_000_000,
        reason: null,
      },
    });

    const error = expectError(result, 409, 'INSUFFICIENT_STOCK');
    if (error.code !== 'INSUFFICIENT_STOCK') return;
    expect(error.details).toMatchObject({ productId, locationId });
    expect(error.details.available).toBeLessThan(1_000_000);
    expect(db.movements.length).toBe(movementsBefore);
  });

  it('accepts an issue of exactly the reported maximum', async () => {
    const { productId, locationId } = wellStocked();
    const issue = (quantity: number) =>
      call('/api/movements', {
        method: 'POST',
        body: {
          id: newId(),
          type: 'ISSUE',
          productId,
          locationId,
          quantity,
          reason: null,
        },
      });
    const refused = expectError(
      await issue(1_000_000),
      409,
      'INSUFFICIENT_STOCK',
    );
    if (refused.code !== 'INSUFFICIENT_STOCK') return;
    expect((await issue(refused.details.available)).status).toBe(201);
  });

  it('rejects an invalid body with VALIDATION_FAILED', async () => {
    const result = await call('/api/movements', {
      method: 'POST',
      body: { ...receiptInput(), quantity: 0 },
    });
    const error = expectError(result, 400, 'VALIDATION_FAILED');
    if (error.code !== 'VALIDATION_FAILED') return;
    expect(error.details).toHaveProperty('quantity');
  });

  it('rejects an unknown product with VALIDATION_FAILED', async () => {
    const result = await call('/api/movements', {
      method: 'POST',
      body: { ...receiptInput(), productId: newId() },
    });
    expectError(result, 400, 'VALIDATION_FAILED');
  });
});

describe('permissions', () => {
  it('forbids every mutation for VIEWER and stores nothing', async () => {
    const db = getDb();
    const draft = orderWith('DRAFT');
    const auditBefore = db.auditLog.length;

    const results = await Promise.all([
      call('/api/movements', {
        method: 'POST',
        as: 'VIEWER',
        body: receiptInput(),
      }),
      call(`/api/orders/${draft.id}`, {
        method: 'PATCH',
        as: 'VIEWER',
        body: { lines: draft.lines },
      }),
      call(`/api/orders/${draft.id}/transition`, {
        method: 'POST',
        as: 'VIEWER',
        body: { to: 'CANCELLED' },
      }),
    ]);

    for (const result of results) {
      expect(expectError(result, 403, 'FORBIDDEN').message).toBe(
        'Your role is read-only',
      );
    }
    expect(db.auditLog.length).toBe(auditBefore);
    expect(orderWith('DRAFT').id).toBe(draft.id);
  });

  it('lets VIEWER read', async () => {
    expect((await call('/api/products', { as: 'VIEWER' })).status).toBe(200);
  });

  it('forbids requests without a known user, except the user list', async () => {
    expectError(await call('/api/products', { as: null }), 403, 'FORBIDDEN');
    expect((await call('/api/users', { as: null })).status).toBe(200);
  });

  it('lets CLERK cancel a confirmed order (ADR-0004)', async () => {
    const result = await call(
      `/api/orders/${orderWith('CONFIRMED').id}/transition`,
      { method: 'POST', as: 'CLERK', body: { to: 'CANCELLED' } },
    );
    expect(result.status).toBe(200);
  });
});

describe('order transitions', () => {
  it('refuses a move the state machine does not allow with INVALID_TRANSITION', async () => {
    const order = orderWith('DRAFT');
    const result = await call(`/api/orders/${order.id}/transition`, {
      method: 'POST',
      body: { to: 'SHIPPED' },
    });
    expectError(result, 409, 'INVALID_TRANSITION');
    expect(getDb().orders.find((o) => o.id === order.id)?.status).toBe('DRAFT');
  });

  it('refuses Confirm with INSUFFICIENT_STOCK while a line exceeds availability', async () => {
    const order = orderWith('DRAFT');
    const [first, ...rest] = order.lines;
    if (!first) throw new Error('Draft without lines');
    await call(`/api/orders/${order.id}`, {
      method: 'PATCH',
      body: { lines: [{ ...first, quantity: 1_000_000 }, ...rest] },
    });

    const result = await call(`/api/orders/${order.id}/transition`, {
      method: 'POST',
      body: { to: 'CONFIRMED' },
    });

    const error = expectError(result, 409, 'INSUFFICIENT_STOCK');
    expect(error.message).toMatch(/exceed available stock/);
    if (error.code !== 'INSUFFICIENT_STOCK') return;
    expect(error.details.productId).toBe(first.productId);
    expect(getDb().orders.find((o) => o.id === order.id)?.status).toBe('DRAFT');
  });

  it('confirms a draft within availability and records the status change', async () => {
    const order = orderWith('DRAFT');
    const { productId, locationId } = wellStocked();
    await call(`/api/orders/${order.id}`, {
      method: 'PATCH',
      body: { lines: [{ productId, locationId, quantity: 1 }] },
    });

    const result = await call(`/api/orders/${order.id}/transition`, {
      method: 'POST',
      body: { to: 'CONFIRMED' },
    });

    expect(result.status).toBe(200);
    expect(ENDPOINTS.transitionOrder.response.parse(result.body).status).toBe(
      'CONFIRMED',
    );
    expect(getDb().auditLog.at(-1)).toMatchObject({
      type: 'ORDER_STATUS_CHANGED',
      orderId: order.id,
      from: 'DRAFT',
      to: 'CONFIRMED',
    });
  });

  it('writes ISSUE movements and their audit entries when shipping', async () => {
    const db = getDb();
    const order = orderWith('PICKED');
    const movementsBefore = db.movements.length;

    const result = await call(`/api/orders/${order.id}/transition`, {
      method: 'POST',
      body: { to: 'SHIPPED' },
    });

    expect(result.status).toBe(200);
    const written = db.movements.slice(movementsBefore);
    expect(written.length).toBeGreaterThanOrEqual(order.lines.length);
    expect(written.every((m) => m.type === 'ISSUE')).toBe(true);
    const audit = db.auditLog.slice(-(written.length + 1));
    expect(audit.map((e) => e.type)).toEqual([
      ...written.map(() => 'MOVEMENT_CREATED'),
      'ORDER_STATUS_CHANGED',
    ]);
  });

  it.each(['DRAFT', 'CONFIRMED', 'PICKED'] as const)(
    'cancels from %s',
    async (status) => {
      const result = await call(
        `/api/orders/${orderWith(status).id}/transition`,
        { method: 'POST', body: { to: 'CANCELLED' } },
      );
      expect(result.status).toBe(200);
    },
  );

  it('returns NOT_FOUND for an unknown order', async () => {
    expectError(await call(`/api/orders/${newId()}`), 404, 'NOT_FOUND');
  });
});

describe('PATCH /api/orders/:id', () => {
  it('records an ORDER_EDITED entry with the line changes', async () => {
    const order = orderWith('DRAFT');
    const [first, ...rest] = order.lines;
    if (!first) throw new Error('Draft without lines');

    const result = await call(`/api/orders/${order.id}`, {
      method: 'PATCH',
      body: { lines: [{ ...first, quantity: first.quantity + 1 }, ...rest] },
    });

    expect(result.status).toBe(200);
    expect(getDb().auditLog.at(-1)).toMatchObject({
      type: 'ORDER_EDITED',
      orderId: order.id,
      changes: [
        {
          productId: first.productId,
          quantityBefore: first.quantity,
          quantityAfter: first.quantity + 1,
        },
      ],
    });
  });

  it('writes no audit entry when nothing changed', async () => {
    const order = orderWith('DRAFT');
    const auditBefore = getDb().auditLog.length;
    await call(`/api/orders/${order.id}`, {
      method: 'PATCH',
      body: { lines: order.lines },
    });
    expect(getDb().auditLog.length).toBe(auditBefore);
  });

  it('refuses to edit a confirmed order with CONFLICT', async () => {
    const order = orderWith('CONFIRMED');
    const result = await call(`/api/orders/${order.id}`, {
      method: 'PATCH',
      body: { lines: order.lines },
    });
    expectError(result, 409, 'CONFLICT');
  });
});

describe('scenarios', () => {
  it('error: every endpoint fails with 500 except the user list', async () => {
    setMockConfig({ scenario: 'error' });
    expect((await call('/api/products')).status).toBe(500);
    expect((await call('/api/dashboard')).status).toBe(500);
    expect(
      (await call('/api/movements', { method: 'POST', body: {} })).status,
    ).toBe(500);
    expect((await call('/api/users')).status).toBe(200);
  });

  it('empty: lists are empty, KPIs are zero, users remain', async () => {
    setMockConfig({ scenario: 'empty' });

    const products = ENDPOINTS.listProducts.response.parse(
      (await call('/api/products')).body,
    );
    const movements = ENDPOINTS.listMovements.response.parse(
      (await call('/api/movements')).body,
    );
    const orders = ENDPOINTS.listOrders.response.parse(
      (await call('/api/orders')).body,
    );
    const audit = ENDPOINTS.listAudit.response.parse(
      (await call('/api/audit')).body,
    );
    const dashboard = ENDPOINTS.getDashboard.response.parse(
      (await call('/api/dashboard')).body,
    );
    const users = ENDPOINTS.listUsers.response.parse(
      (await call('/api/users')).body,
    );

    expect([
      products.total,
      movements.total,
      orders.total,
      audit.total,
    ]).toEqual([0, 0, 0, 0]);
    expect(Object.values(orders.statusCounts).every((n) => n === 0)).toBe(true);
    expect(dashboard.openOrders.value).toBe(0);
    expect(dashboard.lowStock).toEqual([]);
    expect(users.length).toBeGreaterThan(0);
  });
});

describe('latency', () => {
  const request = (path: string) => new Request(`${BASE}${path}`);

  it('is the same for the same request', () => {
    resetMockConfig();
    for (const path of ['/api/products?page=2', '/api/orders', '/api/audit']) {
      expect(latencyMs(request(path))).toBe(latencyMs(request(path)));
    }
  });

  it('stays in the configured range and varies between requests', () => {
    resetMockConfig();
    const values = Array.from({ length: 50 }, (_, page) =>
      latencyMs(request(`/api/movements?page=${page + 1}`)),
    );
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(DEFAULT_LATENCY.minMs);
      expect(value).toBeLessThanOrEqual(DEFAULT_LATENCY.maxMs);
    }
    expect(new Set(values).size).toBeGreaterThan(1);
  });

  it('uses the slow range in the slow scenario', () => {
    setMockConfig({ scenario: 'slow' });
    const value = latencyMs(request('/api/products'));
    expect(value).toBeGreaterThanOrEqual(SLOW_LATENCY.minMs);
    expect(value).toBeLessThanOrEqual(SLOW_LATENCY.maxMs);
  });
});
