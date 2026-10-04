import { describe, expect, it } from 'vitest';

import type {
  CreateMovementInput,
  Order,
  StockMovement,
} from '@stockroom/contract';

import { validateMovement } from './movementValidation';
import { transitionOrder } from './orderStateMachine';
import { computeAvailability, onHandIn, stockByLocation } from './stock';
import {
  LOC_1,
  LOC_2,
  LOC_3,
  LOCATION_CODES,
  NOW,
  order,
  PRODUCT_A,
  PRODUCT_B,
  USER,
} from './testFixtures';

/** mulberry32: tiny seeded PRNG, so every run replays the same sequence. */
function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PRODUCTS = [PRODUCT_A, PRODUCT_B];
const LOCATIONS = [LOC_1, LOC_2, LOC_3];
const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
const STEPS = 300;

function pick<T>(random: () => number, items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error('pick from an empty list');
  return item;
}

function randomMovement(random: () => number, n: number): CreateMovementInput {
  const base = {
    id: `00000000-0000-4000-9000-${String(n).padStart(12, '0')}`,
    productId: pick(random, PRODUCTS),
    locationId: pick(random, LOCATIONS),
    quantity: 1 + Math.floor(random() * 30),
  };
  const roll = random();
  if (roll < 0.35) return { ...base, type: 'RECEIPT', reason: null };
  if (roll < 0.6) return { ...base, type: 'ISSUE', reason: null };
  if (roll < 0.8) {
    return {
      ...base,
      type: 'TRANSFER',
      destinationLocationId: pick(
        random,
        LOCATIONS.filter((id) => id !== base.locationId),
      ),
      reason: null,
    };
  }
  return {
    ...base,
    type: 'ADJUSTMENT',
    direction: random() < 0.5 ? 'INCREASE' : 'DECREASE',
    reason: 'Stock count',
  };
}

function simulate(seed: number) {
  const random = mulberry32(seed);
  const movements: StockMovement[] = [];
  let orders: Order[] = [];
  const stats = { accepted: 0, rejected: 0, transfers: 0, shipped: 0 };

  const ctx = () => ({
    userId: USER,
    at: NOW,
    stock: stockByLocation(movements),
    orders,
    locationCodes: LOCATION_CODES,
  });
  const replace = (next: Order) => {
    orders = orders.map((o) => (o.id === next.id ? next : o));
  };

  function checkInvariants() {
    const stock = stockByLocation(movements);
    for (const productId of PRODUCTS) {
      for (const locationId of LOCATIONS) {
        expect(
          onHandIn(stock, { productId, locationId }),
        ).toBeGreaterThanOrEqual(0);
      }
      const { onHand, available } = computeAvailability(
        stock,
        orders,
        productId,
      );
      expect(available).toBeGreaterThanOrEqual(0);
      expect(available).toBeLessThanOrEqual(onHand);
    }
  }

  for (let step = 0; step < STEPS; step++) {
    const roll = random();

    if (roll < 0.7) {
      const input = randomMovement(random, step);
      const { stock } = ctx();
      if (!validateMovement(input, { stock, orders }).ok) {
        stats.rejected++;
      } else {
        const total = (s: typeof stock) =>
          onHandIn(s, { productId: input.productId });
        const before = total(stock);
        movements.push({ ...input, createdBy: USER, createdAt: NOW });
        stats.accepted++;
        if (input.type === 'TRANSFER') {
          stats.transfers++;
          expect(total(stockByLocation(movements))).toBe(before);
        }
      }
    } else if (roll < 0.82) {
      const draft = order(
        'DRAFT',
        Array.from({ length: 1 + Math.floor(random() * 2) }, () => ({
          productId: pick(random, PRODUCTS),
          locationId: pick(random, LOCATIONS),
          quantity: 1 + Math.floor(random() * 20),
        })),
      );
      orders = [...orders, draft];
      const result = transitionOrder(draft, 'CONFIRMED', ctx());
      if (result.ok) replace({ ...draft, status: result.value.status });
    } else if (roll < 0.95) {
      const open = orders.filter(
        (o) => o.status === 'CONFIRMED' || o.status === 'PICKED',
      );
      if (open.length > 0) {
        const current = pick(random, open);
        const to = current.status === 'CONFIRMED' ? 'PICKED' : 'SHIPPED';
        const result = transitionOrder(current, to, ctx());
        // A reservation guarantees the stock is still there at shipping.
        expect(result.ok).toBe(true);
        if (result.ok) {
          movements.push(...result.value.movements);
          replace({ ...current, status: result.value.status });
          if (to === 'SHIPPED') stats.shipped++;
        }
      }
    } else {
      const cancellable = orders.filter(
        (o) => o.status !== 'SHIPPED' && o.status !== 'CANCELLED',
      );
      if (cancellable.length > 0) {
        const current = pick(random, cancellable);
        const result = transitionOrder(current, 'CANCELLED', ctx());
        if (result.ok) replace({ ...current, status: result.value.status });
      }
    }

    checkInvariants();
  }

  return stats;
}

describe('invariants over seeded movement sequences', () => {
  it.each(SEEDS)('seed %i', (seed) => {
    const stats = simulate(seed);
    // Guard against a vacuous run: every path must actually be exercised.
    expect(stats.accepted).toBeGreaterThan(0);
    expect(stats.rejected).toBeGreaterThan(0);
  });

  it('exercises transfers and shipping across all seeds', () => {
    const totals = SEEDS.map(simulate).reduce(
      (sum, s) => ({
        transfers: sum.transfers + s.transfers,
        shipped: sum.shipped + s.shipped,
      }),
      { transfers: 0, shipped: 0 },
    );
    expect(totals.transfers).toBeGreaterThan(0);
    expect(totals.shipped).toBeGreaterThan(0);
  });
});
