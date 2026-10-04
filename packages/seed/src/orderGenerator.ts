import type {
  Customer,
  Id,
  Order,
  OrderLine,
  OrderLineChange,
  OrderStatus,
  Product,
} from '@stockroom/contract';
import {
  assertNever,
  computeAvailability,
  deterministicId,
  transitionOrder,
  type LineShortage,
} from '@stockroom/domain';

import {
  DAY_MS,
  FIRST_ORDER_NUMBER,
  HOUR_MS,
  MINUTE_MS,
  NOW_MS,
  ORDER_STATUS_MIX,
  ORDER_WINDOW_DAYS,
  ORDER_YEAR,
} from './constants';
import { profileOf, type ProductProfile } from './movementGenerator';
import { appendMovement, pickActor, type SimState } from './state';
import { businessTime } from './time';

type Transition = Exclude<OrderStatus, 'DRAFT'>;

const CUSTOMER_COUNT = 14;
/** Orders that will be confirmed only use products with at least this much available. */
const MIN_AVAILABLE_FOR_CONFIRM = 12;

export type OrderPlan = {
  id: Id;
  number: string;
  customer: Customer;
  /** Statuses after DRAFT, in order. The last one is the final status. */
  path: Transition[];
  /** The first order that stays DRAFT gets a line above available, for the "Draft with shortages" screen. */
  withShortage: boolean;
  /** Lines created so far; the next line id is derived from it. */
  lineCount: number;
};

export type OrderEvent =
  | { kind: 'CREATE'; atMs: number; plan: OrderPlan }
  | { kind: 'EDIT'; atMs: number; plan: OrderPlan }
  | { kind: 'TRANSITION'; atMs: number; plan: OrderPlan; to: Transition };

/** How far along the flow a final status is; further along means created earlier. */
const PROGRESS: Record<OrderStatus, number> = {
  DRAFT: 0,
  CONFIRMED: 1,
  CANCELLED: 1.5,
  PICKED: 2,
  SHIPPED: 3,
};

/** The forward flow after DRAFT. */
const FLOW = ['CONFIRMED', 'PICKED', 'SHIPPED'] as const;
type FlowStatus = 'DRAFT' | (typeof FLOW)[number];

/** Statuses after DRAFT up to and including `status`. */
function flowTo(status: FlowStatus): Transition[] {
  return status === 'DRAFT' ? [] : FLOW.slice(0, FLOW.indexOf(status) + 1);
}

function pathTo(status: OrderStatus, cancelledFrom: FlowStatus): Transition[] {
  return status === 'CANCELLED'
    ? [...flowTo(cancelledFrom), 'CANCELLED']
    : flowTo(status);
}

function generateCustomers(state: SimState): Customer[] {
  const { faker } = state;
  return Array.from({ length: CUSTOMER_COUNT }, () => ({
    name: faker.company.name(),
    contactName: faker.datatype.boolean(0.7)
      ? `${faker.person.firstName()} ${faker.person.lastName()}`
      : null,
    addressLine: faker.location.streetAddress(),
    postalCode: faker.location.zipCode(),
    city: faker.location.city(),
    country: faker.location.country(),
  }));
}

/** Every order's events (create, DRAFT edits, transitions), sorted by time. */
export function planOrders(state: SimState): OrderEvent[] {
  const { faker } = state;
  const customers = generateCustomers(state);

  const statuses = Object.entries(ORDER_STATUS_MIX)
    .flatMap(([status, count]) =>
      Array.from({ length: count }, () => status as OrderStatus),
    )
    .map((status) => ({
      status,
      key: PROGRESS[status] + faker.number.float({ min: 0, max: 2.5 }),
    }))
    .sort((a, b) => b.key - a.key)
    .map(({ status }) => status);

  const createdTimes = statuses
    .map(() =>
      businessTime(
        faker,
        NOW_MS - ORDER_WINDOW_DAYS * DAY_MS,
        NOW_MS - 3 * HOUR_MS,
      ),
    )
    .sort((a, b) => a - b);

  const events: OrderEvent[] = [];
  let shortageAssigned = false;

  statuses.forEach((status, i) => {
    const createdMs = createdTimes[i] ?? NOW_MS;
    const cancelledFrom = faker.helpers.arrayElement<FlowStatus>([
      'DRAFT',
      'CONFIRMED',
      'PICKED',
    ]);
    const withShortage = status === 'DRAFT' && !shortageAssigned;
    shortageAssigned ||= withShortage;
    const plan: OrderPlan = {
      id: deterministicId(`order:${i}`),
      number: `ORD-${ORDER_YEAR}-${String(FIRST_ORDER_NUMBER + i).padStart(4, '0')}`,
      customer: faker.helpers.arrayElement(customers),
      path: pathTo(status, cancelledFrom),
      withShortage,
      lineCount: 0,
    };

    // Transitions 4-36 hours apart, squeezed to end before NOW when the order is recent.
    let atMs = createdMs;
    const transitionTimes = plan.path.map(() => {
      atMs += faker.number.int({ min: 4 * HOUR_MS, max: 36 * HOUR_MS });
      return atMs;
    });
    const limitMs = NOW_MS - 15 * MINUTE_MS;
    const lastMs = transitionTimes.at(-1) ?? createdMs;
    const scale =
      lastMs > limitMs ? (limitMs - createdMs) / (lastMs - createdMs) : 1;
    const scaled = transitionTimes.map((t) =>
      Math.round(createdMs + (t - createdMs) * scale),
    );

    // DRAFT edits fall between creation and the first transition (or NOW).
    const draftEndMs = scaled[0] ?? limitMs;
    const editTimes = Array.from(
      { length: faker.number.int({ min: 0, max: 2 }) },
      () => faker.number.float({ min: 0.15, max: 0.85 }),
    )
      .sort((a, b) => a - b)
      .map((f) => Math.round(createdMs + (draftEndMs - createdMs) * f));

    events.push({ kind: 'CREATE', atMs: createdMs, plan });
    for (const editMs of editTimes) {
      events.push({ kind: 'EDIT', atMs: editMs, plan });
    }
    plan.path.forEach((to, step) => {
      events.push({
        kind: 'TRANSITION',
        atMs: scaled[step] ?? limitMs,
        plan,
        to,
      });
    });
  });

  // Stable sort: events of one order at the same moment keep their order.
  return events.sort((a, b) => a.atMs - b.atMs);
}

function available(state: SimState, productId: Id): number {
  const { available: value } = computeAvailability(
    state.stock,
    state.orders,
    productId,
  );
  return Math.max(0, value);
}

/** The location with the most stock (ties by code), else the product's home location. */
function pickLocation(
  state: SimState,
  profiles: ReadonlyMap<Id, ProductProfile>,
  productId: Id,
): Id {
  let best: { id: Id; quantity: number; code: string } | null = null;
  for (const [id, quantity] of state.stock.get(productId) ?? []) {
    const code = state.locationCodes.get(id) ?? id;
    if (
      quantity > 0 &&
      (!best ||
        quantity > best.quantity ||
        (quantity === best.quantity && code < best.code))
    ) {
      best = { id, quantity, code };
    }
  }
  return best?.id ?? profileOf(profiles, productId).homeLocationId;
}

function lineQuantity(state: SimState, plan: OrderPlan, productId: Id): number {
  if (!plan.path.includes('CONFIRMED')) {
    return state.faker.number.int({ min: 1, max: 20 });
  }
  const max = Math.min(30, Math.floor(available(state, productId) / 3));
  return state.faker.number.int({ min: 1, max: Math.max(1, max) });
}

function candidateProducts(
  state: SimState,
  plan: OrderPlan,
  exclude: ReadonlySet<Id>,
): Product[] {
  const minAvailable = plan.path.includes('CONFIRMED')
    ? MIN_AVAILABLE_FOR_CONFIRM
    : 1;
  return state.products.filter(
    (p) =>
      p.archivedAt === null &&
      !exclude.has(p.id) &&
      available(state, p.id) >= minAvailable,
  );
}

function newLine(
  state: SimState,
  profiles: ReadonlyMap<Id, ProductProfile>,
  plan: OrderPlan,
  product: Product,
  quantity: number,
): OrderLine {
  plan.lineCount += 1;
  return {
    id: deterministicId(`order-line:${plan.id}:${plan.lineCount}`),
    productId: product.id,
    locationId: pickLocation(state, profiles, product.id),
    quantity,
    unitPriceCents: product.priceCents,
  };
}

function currentOrder(state: SimState, plan: OrderPlan): Order {
  const order = state.orders.find((o) => o.id === plan.id);
  if (!order) throw new Error(`Seed: ${plan.number} used before it exists`);
  return order;
}

function replaceOrder(state: SimState, order: Order) {
  const index = state.orders.findIndex((o) => o.id === order.id);
  state.orders[index] = order;
}

function titleOf(state: SimState, productId: Id): string {
  return state.productById.get(productId)?.title ?? productId;
}

function createOrder(
  state: SimState,
  profiles: ReadonlyMap<Id, ProductProfile>,
  plan: OrderPlan,
  atMs: number,
) {
  const { faker } = state;
  const candidates = candidateProducts(state, plan, new Set());
  if (candidates.length === 0) {
    throw new Error(`Seed: no products available for ${plan.number}`);
  }
  const products = faker.helpers.arrayElements(
    candidates,
    Math.min(candidates.length, faker.number.int({ min: 1, max: 8 })),
  );
  const lines = products.map((product, i) => {
    const quantity =
      plan.withShortage && i === 0
        ? available(state, product.id) + faker.number.int({ min: 5, max: 15 })
        : lineQuantity(state, plan, product.id);
    return newLine(state, profiles, plan, product, quantity);
  });

  const actor = pickActor(state, 'order.create', atMs);
  const createdAt = new Date(atMs).toISOString();
  state.orders.push({
    id: plan.id,
    number: plan.number,
    status: 'DRAFT',
    customer: plan.customer,
    lines,
    timeline: [
      { from: null, to: 'DRAFT', changedBy: actor.id, changedAt: createdAt },
    ],
    createdBy: actor.id,
    createdAt,
  });
}

function recordEdit(
  state: SimState,
  order: Order,
  lines: OrderLine[],
  changes: OrderLineChange[],
  atMs: number,
) {
  replaceOrder(state, { ...order, lines });
  state.edits.push({
    orderId: order.id,
    editedBy: pickActor(state, 'order.edit', atMs).id,
    editedAt: new Date(atMs).toISOString(),
    changes,
  });
}

/** One DRAFT edit: change a quantity, add a line or remove one. */
function editOrder(
  state: SimState,
  profiles: ReadonlyMap<Id, ProductProfile>,
  plan: OrderPlan,
  atMs: number,
) {
  const { faker } = state;
  const order = currentOrder(state, plan);
  const kind = faker.helpers.weightedArrayElement([
    { weight: 3, value: 'QUANTITY' as const },
    { weight: 1, value: 'ADD' as const },
    ...(order.lines.length > 1
      ? [{ weight: 1, value: 'REMOVE' as const }]
      : []),
  ]);

  if (kind === 'ADD') {
    const inOrder = new Set(order.lines.map((l) => l.productId));
    const candidates = candidateProducts(state, plan, inOrder);
    if (candidates.length > 0) {
      const product = faker.helpers.arrayElement(candidates);
      const quantity = lineQuantity(state, plan, product.id);
      const line = newLine(state, profiles, plan, product, quantity);
      recordEdit(
        state,
        order,
        [...order.lines, line],
        [
          {
            productId: product.id,
            productTitle: product.title,
            quantityBefore: null,
            quantityAfter: quantity,
          },
        ],
        atMs,
      );
      return;
    }
  }

  const line = faker.helpers.arrayElement(order.lines);
  const change = {
    productId: line.productId,
    productTitle: titleOf(state, line.productId),
    quantityBefore: line.quantity,
  };

  if (kind === 'REMOVE') {
    recordEdit(
      state,
      order,
      order.lines.filter((l) => l.id !== line.id),
      [{ ...change, quantityAfter: null }],
      atMs,
    );
    return;
  }

  const drawn = lineQuantity(state, plan, line.productId);
  const quantity = drawn === line.quantity ? drawn + 1 : drawn;
  recordEdit(
    state,
    order,
    order.lines.map((l) => (l.id === line.id ? { ...l, quantity } : l)),
    [{ ...change, quantityAfter: quantity }],
    atMs,
  );
}

/**
 * Stock moved since the order was drafted, so confirm was blocked. The clerk reduces the
 * short lines to what is available (or removes them) just before confirming, as the UI asks.
 */
function resolveShortages(
  state: SimState,
  order: Order,
  shortages: readonly LineShortage[],
  atMs: number,
) {
  const remaining = new Map(
    shortages.map((s) => [s.productId, Math.max(0, s.available)]),
  );
  const changes: OrderLineChange[] = [];
  const lines: OrderLine[] = [];
  for (const line of order.lines) {
    const left = remaining.get(line.productId);
    if (left === undefined || line.quantity <= left) {
      lines.push(line);
      if (left !== undefined)
        remaining.set(line.productId, left - line.quantity);
      continue;
    }
    remaining.set(line.productId, 0);
    changes.push({
      productId: line.productId,
      productTitle: titleOf(state, line.productId),
      quantityBefore: line.quantity,
      quantityAfter: left > 0 ? left : null,
    });
    if (left > 0) lines.push({ ...line, quantity: left });
  }
  if (lines.length === 0) {
    throw new Error(`Seed: ${order.number} lost every line to shortages`);
  }
  recordEdit(state, order, lines, changes, atMs);
}

function transition(
  state: SimState,
  plan: OrderPlan,
  to: Transition,
  atMs: number,
) {
  const actor = pickActor(
    state,
    to === 'CANCELLED' ? 'order.cancel' : 'order.transition',
    atMs,
  );
  const run = () =>
    transitionOrder(currentOrder(state, plan), to, {
      userId: actor.id,
      at: new Date(atMs).toISOString(),
      stock: state.stock,
      orders: state.orders,
      locationCodes: state.locationCodes,
    });

  let result = run();
  if (
    !result.ok &&
    result.error.code === 'INSUFFICIENT_STOCK' &&
    to === 'CONFIRMED'
  ) {
    resolveShortages(
      state,
      currentOrder(state, plan),
      result.error.lines,
      atMs - MINUTE_MS,
    );
    result = run();
  }
  if (!result.ok) {
    throw new Error(
      `Seed: ${plan.number} -> ${to} failed: ${JSON.stringify(result.error)}`,
    );
  }

  for (const movement of result.value.movements) {
    appendMovement(state, movement);
  }
  const order = currentOrder(state, plan);
  replaceOrder(state, {
    ...order,
    status: result.value.status,
    timeline: [...order.timeline, result.value.timelineEntry],
  });
}

export function applyOrderEvent(
  state: SimState,
  profiles: ReadonlyMap<Id, ProductProfile>,
  event: OrderEvent,
) {
  switch (event.kind) {
    case 'CREATE':
      return createOrder(state, profiles, event.plan, event.atMs);
    case 'EDIT':
      return editOrder(state, profiles, event.plan, event.atMs);
    case 'TRANSITION':
      return transition(state, event.plan, event.to, event.atMs);
    default:
      return assertNever(event);
  }
}
