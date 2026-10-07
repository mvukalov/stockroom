import { describe, expect, it } from 'vitest';

import {
  ApiError,
  ENDPOINTS,
  Role,
  USER_ID_HEADER,
  type EndpointName,
  type Id,
  type Order,
  type OrderStatus,
  type Product,
} from '@stockroom/contract';
import { can, denialReason, type Action } from '@stockroom/domain';

import { seedUser, setupMockServer } from '../test/mockServer';
import { getDb } from './db';
import { availabilityOf } from './readModels';

/**
 * The server side of the role pass: every mutating endpoint, every role. Who may do
 * what comes from `can` and `denialReason`, never from this file, so a change in
 * `PERMISSIONS` changes the expectation and not the test.
 */

setupMockServer();

/** Endpoints whose method is not GET: the ones a role can be refused. */
type MutatingEndpoint = {
  [N in EndpointName]: (typeof ENDPOINTS)[N]['method'] extends 'GET'
    ? never
    : N;
}[EndpointName];

type Call = {
  /** `:id` in the endpoint path is replaced with this id. */
  id?: Id;
  body: unknown;
};

type MutationCase = {
  name: string;
  /** The permission the handler checks for this request. */
  action: Action;
  /** State the request needs, prepared as ADMIN before the store is compared. */
  setup?: () => Promise<void>;
  /** A request that succeeds for a role that holds `action`. */
  valid: () => Call;
  /** The same request naming a record that does not exist. */
  unknown: () => Call;
  /** What a role that holds `action` gets for `unknown`. */
  unknownCode: ApiError['code'];
};

const newId = (): Id => crypto.randomUUID();

function orderWith(status: OrderStatus): Order {
  const order = getDb().orders.find((o) => o.status === status);
  if (!order) throw new Error(`Seed has no ${status} order`);
  return order;
}

/** An active product nothing reserves, so archiving it is allowed. */
function archivable(): Product {
  const db = getDb();
  const product = db.products.find(
    (p) => p.archivedAt === null && availabilityOf(db, p.id).reserved === 0,
  );
  if (!product) throw new Error('Seed has no archivable product');
  return product;
}

function otherCategoryId(product: Product): Id {
  const category = getDb().categories.find((c) => c.id !== product.categoryId);
  if (!category) throw new Error('Seed has one category');
  return category.id;
}

/** The product and location with the most stock that is also available. */
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

/** A draft with one line of 1 from `wellStocked`, so Confirm fits availability. */
let confirmable: Order | undefined;
async function prepareConfirmable(): Promise<void> {
  const order = orderWith('DRAFT');
  const { productId, locationId } = wellStocked();
  const result = await send('updateOrderLines', 'ADMIN', {
    id: order.id,
    body: { lines: [{ productId, locationId, quantity: 1 }] },
  });
  if (result.status !== 200) throw new Error('Draft could not be prepared');
  confirmable = order;
}

const CASES: Record<MutatingEndpoint, readonly MutationCase[]> = {
  bulkProducts: [
    {
      name: 'SET_CATEGORY',
      action: 'product.update',
      valid: () => {
        const product = archivable();
        return {
          body: {
            action: 'SET_CATEGORY',
            ids: [product.id],
            categoryId: otherCategoryId(product),
          },
        };
      },
      unknown: () => ({
        body: {
          action: 'SET_CATEGORY',
          ids: [newId()],
          categoryId: otherCategoryId(archivable()),
        },
      }),
      unknownCode: 'NOT_FOUND',
    },
    {
      name: 'ARCHIVE',
      action: 'product.archive',
      valid: () => ({ body: { action: 'ARCHIVE', ids: [archivable().id] } }),
      unknown: () => ({ body: { action: 'ARCHIVE', ids: [newId()] } }),
      unknownCode: 'NOT_FOUND',
    },
  ],
  createMovement: [
    {
      name: 'RECEIPT',
      action: 'movement.create',
      valid: () => {
        const { productId, locationId } = wellStocked();
        return {
          body: {
            id: newId(),
            type: 'RECEIPT',
            productId,
            locationId,
            quantity: 5,
            reason: null,
          },
        };
      },
      unknown: () => ({
        body: {
          id: newId(),
          type: 'RECEIPT',
          productId: newId(),
          locationId: wellStocked().locationId,
          quantity: 5,
          reason: null,
        },
      }),
      unknownCode: 'VALIDATION_FAILED',
    },
  ],
  updateOrderLines: [
    {
      name: 'edit a draft',
      action: 'order.edit',
      valid: () => {
        const order = orderWith('DRAFT');
        const [first, ...rest] = order.lines;
        if (!first) throw new Error('Draft without lines');
        return {
          id: order.id,
          body: {
            lines: [{ ...first, quantity: first.quantity + 1 }, ...rest],
          },
        };
      },
      unknown: () => ({
        id: newId(),
        body: { lines: orderWith('DRAFT').lines },
      }),
      unknownCode: 'NOT_FOUND',
    },
  ],
  transitionOrder: [
    {
      name: 'to CANCELLED',
      action: 'order.cancel',
      valid: () => ({
        id: orderWith('CONFIRMED').id,
        body: { to: 'CANCELLED' },
      }),
      unknown: () => ({ id: newId(), body: { to: 'CANCELLED' } }),
      unknownCode: 'NOT_FOUND',
    },
    {
      name: 'to CONFIRMED',
      action: 'order.transition',
      setup: prepareConfirmable,
      valid: () => {
        if (!confirmable) throw new Error('Run setup first');
        return { id: confirmable.id, body: { to: 'CONFIRMED' } };
      },
      unknown: () => ({ id: newId(), body: { to: 'CONFIRMED' } }),
      unknownCode: 'NOT_FOUND',
    },
  ],
};

async function send(endpoint: MutatingEndpoint, role: Role, call: Call) {
  const { method, path } = ENDPOINTS[endpoint];
  const url = call.id === undefined ? path : path.replace(':id', call.id);
  const response = await fetch(`${window.location.origin}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      [USER_ID_HEADER]: seedUser(role).id,
    },
    body: JSON.stringify(call.body),
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text === '' ? null : (JSON.parse(text) as unknown),
  };
}

/** Everything a mutation can change, as a value to compare. */
function storeSnapshot() {
  const db = getDb();
  return structuredClone({
    products: db.products,
    orders: db.orders,
    movements: db.movements.length,
    stock: db.stock,
    auditLog: db.auditLog.length,
    orderEditCount: db.orderEditCount,
  });
}

const ROWS = Object.entries(CASES).flatMap(([endpoint, cases]) =>
  cases.map((mutation) => ({
    endpoint: endpoint as MutatingEndpoint,
    mutation,
  })),
);

const ROLE_ROWS = ROWS.flatMap((row) =>
  Role.options.map((role) => ({
    ...row,
    role,
    allowed: can({ role }, row.mutation.action),
  })),
);

describe('mutating endpoints', () => {
  it('has a permission case for every endpoint that is not a GET', () => {
    const mutating = Object.entries(ENDPOINTS)
      .filter(([, endpoint]) => endpoint.method !== 'GET')
      .map(([name]) => name)
      .sort();
    expect(Object.keys(CASES).sort()).toEqual(mutating);
    for (const cases of Object.values(CASES)) {
      expect(cases.length).toBeGreaterThan(0);
    }
  });

  it.each(ROLE_ROWS)(
    '$endpoint $mutation.name as $role: allowed is $allowed',
    async ({ endpoint, mutation, role, allowed }) => {
      await mutation.setup?.();
      const before = storeSnapshot();

      const result = await send(endpoint, role, mutation.valid());

      if (allowed) {
        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(storeSnapshot()).not.toEqual(before);
      } else {
        expect(result.status).toBe(403);
        expect(ApiError.parse(result.body)).toEqual({
          code: 'FORBIDDEN',
          message: denialReason({ role }, mutation.action),
        });
        expect(storeSnapshot()).toEqual(before);
      }
    },
  );

  it.each(ROLE_ROWS)(
    '$endpoint $mutation.name with an unknown id as $role: the role is checked first',
    async ({ endpoint, mutation, role, allowed }) => {
      const before = storeSnapshot();

      const result = await send(endpoint, role, mutation.unknown());
      const error = ApiError.parse(result.body);

      if (allowed) {
        expect(error.code).toBe(mutation.unknownCode);
      } else {
        // The same answer as for a record that exists: the role learns nothing.
        expect(result.status).toBe(403);
        expect(error).toEqual({
          code: 'FORBIDDEN',
          message: denialReason({ role }, mutation.action),
        });
      }
      expect(storeSnapshot()).toEqual(before);
    },
  );
});
