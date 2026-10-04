import type { Faker } from '@faker-js/faker';

import type {
  Location,
  Order,
  Product,
  StockMovement,
  User,
} from '@stockroom/contract';

import { DAY_MS, HISTORY_START_MS, MOVEMENT_COUNT, NOW_MS } from './constants';
import {
  generateProfiles,
  movementId,
  profileOf,
  randomMovement,
  receiptQuantity,
} from './movementGenerator';
import { applyOrderEvent, planOrders } from './orderGenerator';
import type { RoleChange } from './staff';
import {
  appendMovement,
  pickActor,
  toStockMovement,
  type OrderEdit,
  type SimState,
} from './state';
import { businessTime } from './time';

export type SimulationInput = {
  faker: Faker;
  products: readonly Product[];
  locations: readonly Location[];
  users: readonly User[];
  roleChanges: readonly RoleChange[];
};

export type Simulation = {
  movements: StockMovement[];
  orders: Order[];
  edits: OrderEdit[];
};

/**
 * Replays twelve months in time order. Random movements and order events share one
 * running stock projection, so every movement and every transition is checked by the
 * domain rules against the stock at that moment. Stock itself is never generated.
 */
export function simulate(input: SimulationInput): Simulation {
  const state: SimState = {
    ...input,
    productById: new Map(input.products.map((p) => [p.id, p])),
    locationCodes: new Map(input.locations.map((l) => [l.id, l.code])),
    stock: new Map(),
    movements: [],
    orders: [],
    edits: [],
  };
  const profiles = generateProfiles(state);
  const orderEvents = planOrders(state);
  let n = 0;

  // Opening stock: one receipt per product, half a minute apart, on the first day.
  state.products.forEach((product, i) => {
    const atMs = HISTORY_START_MS + i * 30_000;
    const opening = {
      id: movementId(n++),
      type: 'RECEIPT' as const,
      productId: product.id,
      locationId: profileOf(profiles, product.id).homeLocationId,
      quantity: receiptQuantity(state, product),
      reason: 'Opening stock',
    };
    const actor = pickActor(state, 'movement.create', atMs);
    appendMovement(state, toStockMovement(opening, actor.id, atMs));
  });

  const times = Array.from({ length: MOVEMENT_COUNT - n }, () =>
    businessTime(state.faker, HISTORY_START_MS + DAY_MS, NOW_MS),
  ).sort((a, b) => a - b);

  let next = 0;
  const applyOrderEventsUntil = (atMs: number) => {
    for (
      let event = orderEvents[next];
      event && event.atMs <= atMs;
      event = orderEvents[++next]
    ) {
      applyOrderEvent(state, profiles, event);
    }
  };

  for (const atMs of times) {
    applyOrderEventsUntil(atMs);
    const movement = randomMovement(state, profiles, movementId(n++), atMs);
    const actor = pickActor(state, 'movement.create', atMs);
    appendMovement(state, toStockMovement(movement, actor.id, atMs));
  }
  applyOrderEventsUntil(NOW_MS);

  return {
    movements: state.movements,
    orders: state.orders,
    edits: state.edits,
  };
}
