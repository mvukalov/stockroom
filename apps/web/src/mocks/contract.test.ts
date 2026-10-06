// @vitest-environment jsdom
// The handlers use relative paths, as in the browser; jsdom gives them an origin to match.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  ApiError,
  ENDPOINTS,
  REASON_MAX_LENGTH,
  USER_ID_HEADER,
  type CreateMovementInput,
  type Id,
  type Order,
  type OrderStatus,
  type Product,
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
import { archiveConflictMessage } from './handlers/catalog';
import { latencyMs, respond } from './http';
import { compareNames } from './listing';
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

/** Any location other than `locationId`. */
function otherLocation(locationId: Id): Id {
  const other = getDb().locations.find((l) => l.id !== locationId);
  if (!other) throw new Error('Seed has one location only');
  return other.id;
}

/** The product's on hand as `GET /api/products` lists it. */
async function listedOnHand(sku: string): Promise<number> {
  const page = ENDPOINTS.listProducts.response.parse(
    (await call(`/api/products?search=${encodeURIComponent(sku)}`)).body,
  );
  const item = page.items.find((p) => p.sku === sku);
  if (!item) throw new Error(`Product ${sku} is not listed`);
  return item.onHand;
}

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
    ['listProductFilters', '/api/products/filters'],
    ['listLocations', '/api/locations'],
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

describe('GET /api/locations', () => {
  it('lists every location once, in code order', async () => {
    const db = getDb();
    const locations = ENDPOINTS.listLocations.response.parse(
      (await call('/api/locations')).body,
    );

    const codes = locations.map((l) => l.code);
    expect(codes).toEqual(db.locations.map((l) => l.code).sort());
    expect(new Set(locations.map((l) => l.id)).size).toBe(db.locations.length);
  });

  it('lets VIEWER read and forbids requests without a known user', async () => {
    expect((await call('/api/locations', { as: 'VIEWER' })).status).toBe(200);
    expectError(await call('/api/locations', { as: null }), 403, 'FORBIDDEN');
  });
});

describe('GET /api/products/filters', () => {
  it('lists every category and each brand once, in name order', async () => {
    const db = getDb();
    const filters = ENDPOINTS.listProductFilters.response.parse(
      (await call('/api/products/filters')).body,
    );

    expect(filters.brands).toEqual(
      [...new Set(db.products.map((p) => p.brand))].sort(compareNames),
    );
    expect(filters.categories).toEqual(
      [...db.categories].sort((a, b) => compareNames(a.name, b.name)),
    );
  });

  it('orders brands ignoring case, accents and code-unit order', async () => {
    const db = getDb();
    const template = db.products[0];
    if (!template) throw new Error('Seed has no product');
    // A plain lowercase compare puts "Ébène" after "zeta" (é sorts after z).
    db.products = ['zeta', 'Ébène', 'eagle', 'Ecru'].map((brand) => ({
      ...template,
      id: newId(),
      brand,
    }));

    const filters = ENDPOINTS.listProductFilters.response.parse(
      (await call('/api/products/filters')).body,
    );
    expect(filters.brands).toEqual(['eagle', 'Ébène', 'Ecru', 'zeta']);
  });

  it('includes a brand that only an archived product has', async () => {
    const db = getDb();
    const archived = db.products.find((p) => p.archivedAt !== null);
    if (!archived) throw new Error('Seed has no archived product');
    // The seed has no such brand, so the store gets one.
    db.products = [
      ...db.products,
      { ...archived, id: newId(), brand: 'Archived Only Brand' },
    ];
    const filters = ENDPOINTS.listProductFilters.response.parse(
      (await call('/api/products/filters')).body,
    );
    expect(filters.brands).toContain('Archived Only Brand');
  });

  it('is read by every role and refused without a known user', async () => {
    expect((await call('/api/products/filters', { as: 'VIEWER' })).status).toBe(
      200,
    );
    expectError(
      await call('/api/products/filters', { as: null }),
      403,
      'FORBIDDEN',
    );
  });
});

describe('POST /api/products/bulk', () => {
  const BULK = '/api/products/bulk';

  /** Active products nothing reserves, so archiving them is allowed. */
  function archivable(count: number): Product[] {
    const db = getDb();
    const found = db.products
      .filter(
        (p) => p.archivedAt === null && availabilityOf(db, p.id).reserved === 0,
      )
      .slice(0, count);
    if (found.length < count)
      throw new Error(`Seed has fewer than ${count} archivable products`);
    return found;
  }

  function reservedProduct(): Product {
    const db = getDb();
    const product = db.products.find(
      (p) => p.archivedAt === null && availabilityOf(db, p.id).reserved > 0,
    );
    if (!product) throw new Error('Seed has no reserved product');
    return product;
  }

  /** A category none of `products` is in. */
  function otherCategory(products: readonly Product[]) {
    const category = getDb().categories.find(
      (c) => !products.some((p) => p.categoryId === c.id),
    );
    if (!category) throw new Error('Seed has no spare category');
    return category;
  }

  const stored = (id: Id) => getDb().productById.get(id);

  async function listed(search: string, archived = false) {
    const result = await call(
      `/api/products?search=${encodeURIComponent(search)}&archived=${archived}`,
    );
    return ENDPOINTS.listProducts.response.parse(result.body).items;
  }

  it('moves products to another category as ADMIN and the list shows it', async () => {
    const products = archivable(2);
    const category = otherCategory(products);
    const ids = products.map((p) => p.id);

    const result = await call(BULK, {
      method: 'POST',
      body: { action: 'SET_CATEGORY', ids, categoryId: category.id },
    });

    expect(result.status).toBe(200);
    expect(ENDPOINTS.bulkProducts.response.parse(result.body)).toEqual({
      updatedIds: ids,
    });
    for (const product of products) {
      expect(stored(product.id)?.categoryId).toBe(category.id);
      const [row] = await listed(product.sku);
      expect(row?.categoryName).toBe(category.name);
    }
  });

  it('archives products as ADMIN; the list hides them unless archived ones are asked for', async () => {
    const products = archivable(2);
    const ids = products.map((p) => p.id);

    const result = await call(BULK, {
      method: 'POST',
      body: { action: 'ARCHIVE', ids },
    });

    expect(result.status).toBe(200);
    expect(ENDPOINTS.bulkProducts.response.parse(result.body)).toEqual({
      updatedIds: ids,
    });
    for (const product of products) {
      expect(stored(product.id)?.archivedAt).not.toBeNull();
      expect(await listed(product.sku)).toEqual([]);
      expect((await listed(product.sku, true)).map((p) => p.id)).toEqual([
        product.id,
      ]);
    }
  });

  it.each([
    ['CLERK', 'Only an admin can do this'],
    ['VIEWER', 'Your role is read-only'],
  ] as const)(
    'forbids both actions for %s and changes nothing',
    async (role, reason) => {
      const [product] = archivable(1);
      if (!product) throw new Error('unreachable');
      const category = otherCategory([product]);

      for (const body of [
        { action: 'ARCHIVE', ids: [product.id] },
        { action: 'SET_CATEGORY', ids: [product.id], categoryId: category.id },
      ]) {
        const result = await call(BULK, { method: 'POST', as: role, body });
        expect(expectError(result, 403, 'FORBIDDEN').message).toBe(reason);
      }
      expect(stored(product.id)).toBe(product);
    },
  );

  it('refuses an unknown product with NOT_FOUND and changes none of the others', async () => {
    const [product] = archivable(1);
    if (!product) throw new Error('unreachable');
    const unknown = newId();

    const result = await call(BULK, {
      method: 'POST',
      body: { action: 'ARCHIVE', ids: [product.id, unknown] },
    });

    expect(expectError(result, 404, 'NOT_FOUND').message).toContain(unknown);
    expect(stored(product.id)).toBe(product);
  });

  it('refuses an unknown category with NOT_FOUND and changes nothing', async () => {
    const [product] = archivable(1);
    if (!product) throw new Error('unreachable');

    const result = await call(BULK, {
      method: 'POST',
      body: { action: 'SET_CATEGORY', ids: [product.id], categoryId: newId() },
    });

    expectError(result, 404, 'NOT_FOUND');
    expect(stored(product.id)).toBe(product);
  });

  it('refuses to archive a reserved product with CONFLICT naming it, and archives nothing', async () => {
    const reserved = reservedProduct();
    const [free] = archivable(1);
    if (!free) throw new Error('unreachable');

    const result = await call(BULK, {
      method: 'POST',
      body: { action: 'ARCHIVE', ids: [free.id, reserved.id] },
    });

    expect(expectError(result, 409, 'CONFLICT').message).toBe(
      archiveConflictMessage([reserved.sku]),
    );
    expect(stored(free.id)).toBe(free);
    expect(stored(reserved.id)).toBe(reserved);
  });

  it('answers a repeated request the same way and keeps the first archive date', async () => {
    const products = archivable(2);
    const ids = products.map((p) => p.id);
    const category = otherCategory(products);
    const archive = { action: 'ARCHIVE', ids };
    const move = { action: 'SET_CATEGORY', ids, categoryId: category.id };

    expect((await call(BULK, { method: 'POST', body: move })).status).toBe(200);
    const again = await call(BULK, { method: 'POST', body: move });
    expect(again.status).toBe(200);
    expect(again.body).toEqual({ updatedIds: ids });

    expect((await call(BULK, { method: 'POST', body: archive })).status).toBe(
      200,
    );
    const firstDates = ids.map((id) => stored(id)?.archivedAt);
    const repeat = await call(BULK, { method: 'POST', body: archive });
    expect(repeat.status).toBe(200);
    expect(repeat.body).toEqual({ updatedIds: ids });
    expect(ids.map((id) => stored(id)?.archivedAt)).toEqual(firstDates);
  });

  it('rejects an invalid body with VALIDATION_FAILED', async () => {
    const result = await call(BULK, {
      method: 'POST',
      body: { action: 'ARCHIVE', ids: [] },
    });
    expectError(result, 400, 'VALIDATION_FAILED');
  });

  describe('a body without a readable action', () => {
    async function postRaw(body: string, as: Role | null) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (as !== null) headers[USER_ID_HEADER] = userWith(as).id;
      const response = await fetch(`${BASE}${BULK}`, {
        method: 'POST',
        headers,
        body,
      });
      return {
        status: response.status,
        body: (await response.json()) as unknown,
      };
    }

    it.each(['CLERK', 'VIEWER'] as const)(
      'is VALIDATION_FAILED for %s: only the user is checked',
      async (role) => {
        expectError(await postRaw('{not json', role), 400, 'VALIDATION_FAILED');
        expectError(
          await postRaw(JSON.stringify({ ids: [newId()] }), role),
          400,
          'VALIDATION_FAILED',
        );
        expectError(
          await postRaw(
            JSON.stringify({ action: 'DELETE', ids: [newId()] }),
            role,
          ),
          400,
          'VALIDATION_FAILED',
        );
      },
    );

    it('is FORBIDDEN without a known user', async () => {
      expectError(await postRaw('{not json', null), 403, 'FORBIDDEN');
    });

    it('is FORBIDDEN for CLERK once the action is readable, even when the rest is malformed', async () => {
      expectError(
        await postRaw(
          JSON.stringify({ action: 'ARCHIVE', ids: 'oops' }),
          'CLERK',
        ),
        403,
        'FORBIDDEN',
      );
    });
  });

  // These two run in order: the second proves the first one's change did not leak
  // into the next test's store, nor into the shared seed objects.
  describe('isolation between tests', () => {
    let archivedId: Id | undefined;

    it('archives a product (and leaves the seed object as it was)', async () => {
      const [product] = archivable(1);
      if (!product) throw new Error('unreachable');
      archivedId = product.id;
      const result = await call(BULK, {
        method: 'POST',
        body: { action: 'ARCHIVE', ids: [product.id] },
      });
      expect(result.status).toBe(200);
      expect(stored(product.id)?.archivedAt).not.toBeNull();
      // `product` is the object the store started from: the seed's own.
      expect(product.archivedAt).toBeNull();
    });

    it('starts the next test with that product active again', async () => {
      if (archivedId === undefined)
        throw new Error('The previous test did not run');
      expect(stored(archivedId)?.archivedAt).toBeNull();
      expect(
        getDb().products.find((p) => p.id === archivedId)?.archivedAt,
      ).toBeNull();
    });
  });
});

describe('archiveConflictMessage', () => {
  const tail =
    ': reserved on confirmed or picked orders. Cancel or complete those orders first.';

  it.each([
    [['A'], "Can't archive A"],
    [['A', 'B'], "Can't archive A and B"],
    [['A', 'B', 'C'], "Can't archive A, B and C"],
    [['A', 'B', 'C', 'D', 'E'], "Can't archive A, B, C, D and E"],
    [
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      "Can't archive A, B, C, D, E and 2 more",
    ],
  ])('names %j', (skus, start) => {
    expect(archiveConflictMessage(skus)).toBe(start + tail);
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

  it.each(['locationId', 'destinationLocationId'] as const)(
    'rejects an unknown %s at that field and stores nothing',
    async (field) => {
      const db = getDb();
      const movementsBefore = db.movements.length;
      const { productId, locationId } = wellStocked();
      const body = {
        id: newId(),
        type: 'TRANSFER',
        productId,
        locationId,
        destinationLocationId: otherLocation(locationId),
        quantity: 1,
        reason: null,
        [field]: newId(),
      };
      const error = expectError(
        await call('/api/movements', { method: 'POST', body }),
        400,
        'VALIDATION_FAILED',
      );
      if (error.code !== 'VALIDATION_FAILED') return;
      expect(error.details).toHaveProperty(field);
      expect(db.movements.length).toBe(movementsBefore);
    },
  );

  it('rejects a reason longer than REASON_MAX_LENGTH', async () => {
    const result = await call('/api/movements', {
      method: 'POST',
      body: { ...receiptInput(), reason: 'x'.repeat(REASON_MAX_LENGTH + 1) },
    });
    const error = expectError(result, 400, 'VALIDATION_FAILED');
    if (error.code !== 'VALIDATION_FAILED') return;
    expect(error.details).toHaveProperty('reason');
  });

  it('refuses a transfer above the stock at its source and changes no stock', async () => {
    const db = getDb();
    const { productId, locationId } = wellStocked();
    const stockBefore = structuredClone(db.stock.get(productId));
    const result = await call('/api/movements', {
      method: 'POST',
      as: 'CLERK',
      body: {
        id: newId(),
        type: 'TRANSFER',
        productId,
        locationId,
        destinationLocationId: otherLocation(locationId),
        quantity: 1_000_000,
        reason: null,
      },
    });
    expectError(result, 409, 'INSUFFICIENT_STOCK');
    expect(db.stock.get(productId)).toEqual(stockBefore);
  });

  describe('each type, as CLERK', () => {
    type Case = {
      name: string;
      body: (productId: Id, locationId: Id) => CreateMovementInput;
      /** Change of the product's total on hand. */
      delta: number;
    };
    const cases: Case[] = [
      {
        name: 'RECEIPT',
        body: (productId, locationId) => ({
          id: newId(),
          type: 'RECEIPT',
          productId,
          locationId,
          quantity: 3,
          reason: null,
        }),
        delta: 3,
      },
      {
        name: 'ISSUE',
        body: (productId, locationId) => ({
          id: newId(),
          type: 'ISSUE',
          productId,
          locationId,
          quantity: 1,
          reason: 'Customer pickup',
        }),
        delta: -1,
      },
      {
        name: 'TRANSFER',
        body: (productId, locationId) => ({
          id: newId(),
          type: 'TRANSFER',
          productId,
          locationId,
          destinationLocationId: otherLocation(locationId),
          quantity: 1,
          reason: null,
        }),
        delta: 0,
      },
      {
        name: 'ADJUSTMENT INCREASE',
        body: (productId, locationId) => ({
          id: newId(),
          type: 'ADJUSTMENT',
          direction: 'INCREASE',
          productId,
          locationId,
          quantity: 2,
          reason: 'Stock count',
        }),
        delta: 2,
      },
      {
        name: 'ADJUSTMENT DECREASE',
        body: (productId, locationId) => ({
          id: newId(),
          type: 'ADJUSTMENT',
          direction: 'DECREASE',
          productId,
          locationId,
          quantity: 1,
          reason: 'Damaged',
        }),
        delta: -1,
      },
    ];

    it.each(cases)(
      'stores a $name: newest in the list, product on hand follows',
      async ({ body, delta }) => {
        const { productId, locationId } = wellStocked();
        const product = getDb().productById.get(productId);
        if (!product) throw new Error('Unknown product');
        const onHandBefore = await listedOnHand(product.sku);
        const input = body(productId, locationId);

        const created = await call('/api/movements', {
          method: 'POST',
          as: 'CLERK',
          body: input,
        });

        expect(created.status).toBe(201);
        expect(
          ENDPOINTS.createMovement.response.parse(created.body),
        ).toMatchObject({ ...input, createdBy: userWith('CLERK').id });
        const list = ENDPOINTS.listMovements.response.parse(
          (await call(`/api/movements?productId=${productId}`)).body,
        );
        expect(list.items[0]?.id).toBe(input.id);
        expect(await listedOnHand(product.sku)).toBe(onHandBefore + delta);
      },
    );
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
    expect((await call('/api/products/filters')).status).toBe(500);
    expect((await call('/api/locations')).status).toBe(500);
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
    const filters = ENDPOINTS.listProductFilters.response.parse(
      (await call('/api/products/filters')).body,
    );
    const locations = ENDPOINTS.listLocations.response.parse(
      (await call('/api/locations')).body,
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
    expect(filters).toEqual({ categories: [], brands: [] });
    expect(locations).toEqual([]);
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
