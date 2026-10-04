import { describe, expect, it } from 'vitest';

import { OrderStatus, StockMovement } from '@stockroom/contract';

import {
  canEditOrder,
  canTransition,
  nextStatuses,
  transitionOrder,
  type TransitionContext,
} from './orderStateMachine';
import { stockByLocation } from './stock';
import {
  LOC_1,
  LOC_2,
  LOC_3,
  LOCATION_CODES,
  NOW,
  order,
  PRODUCT_A,
  PRODUCT_B,
  receipt,
  USER,
} from './testFixtures';

const STATUSES = OrderStatus.options;

const ALLOWED = new Set([
  'DRAFT->CONFIRMED',
  'DRAFT->CANCELLED',
  'CONFIRMED->PICKED',
  'CONFIRMED->CANCELLED',
  'PICKED->SHIPPED',
  'PICKED->CANCELLED',
]);

const pairs = STATUSES.flatMap((from) => STATUSES.map((to) => ({ from, to })));

/** PRODUCT_A: LOC_1 5, LOC_2 20, LOC_3 20 (45). PRODUCT_B: LOC_1 10. */
const stock = stockByLocation([
  receipt(PRODUCT_A, LOC_1, 5),
  receipt(PRODUCT_A, LOC_2, 20),
  receipt(PRODUCT_A, LOC_3, 20),
  receipt(PRODUCT_B, LOC_1, 10),
]);

const ctx = (
  overrides: Partial<TransitionContext> = {},
): TransitionContext => ({
  userId: USER,
  at: NOW,
  stock,
  orders: [],
  locationCodes: LOCATION_CODES,
  ...overrides,
});

describe('canTransition', () => {
  it.each(pairs)('$from -> $to', ({ from, to }) => {
    expect(canTransition(from, to)).toBe(ALLOWED.has(`${from}->${to}`));
  });
});

describe('nextStatuses', () => {
  it.each([
    { from: 'DRAFT', next: ['CONFIRMED', 'CANCELLED'] },
    { from: 'CONFIRMED', next: ['PICKED', 'CANCELLED'] },
    { from: 'PICKED', next: ['SHIPPED', 'CANCELLED'] },
    { from: 'SHIPPED', next: [] },
    { from: 'CANCELLED', next: [] },
  ] as const)('$from -> $next', ({ from, next }) => {
    expect(nextStatuses(from)).toEqual(next);
  });
});

describe('canEditOrder', () => {
  it.each(STATUSES)('%s', (status) => {
    expect(canEditOrder({ status })).toBe(status === 'DRAFT');
  });
});

describe('transitionOrder', () => {
  it.each(pairs.filter(({ from, to }) => !ALLOWED.has(`${from}->${to}`)))(
    'refuses $from -> $to',
    ({ from, to }) => {
      const current = order(from, [{ productId: PRODUCT_B, quantity: 1 }]);
      expect(transitionOrder(current, to, ctx())).toEqual({
        ok: false,
        error: { code: 'INVALID_TRANSITION', from, to },
      });
    },
  );

  it.each(pairs.filter(({ from, to }) => ALLOWED.has(`${from}->${to}`)))(
    'returns the timeline entry for $from -> $to',
    ({ from, to }) => {
      const current = order(from, [{ productId: PRODUCT_B, quantity: 1 }]);
      const result = transitionOrder(current, to, ctx());
      expect(result).toMatchObject({
        ok: true,
        value: {
          status: to,
          timelineEntry: { from, to, changedBy: USER, changedAt: NOW },
        },
      });
    },
  );

  describe('DRAFT -> CONFIRMED', () => {
    // PRODUCT_A has 45 on hand; another order reserves 15, so 30 are available.
    const otherConfirmed = order('CONFIRMED', [
      { productId: PRODUCT_A, quantity: 15 },
    ]);

    it.each([
      { quantity: 30, ok: true, label: 'exactly available' },
      { quantity: 31, ok: false, label: 'one over' },
    ])('$label ($quantity) -> ok: $ok', ({ quantity, ok }) => {
      const draft = order('DRAFT', [{ productId: PRODUCT_A, quantity }]);
      const result = transitionOrder(
        draft,
        'CONFIRMED',
        ctx({ orders: [otherConfirmed, draft] }),
      );
      expect(result.ok).toBe(ok);
    });

    it('lists the affected lines with their available quantity', () => {
      const draft = order('DRAFT', [
        { productId: PRODUCT_A, quantity: 31 },
        { productId: PRODUCT_B, quantity: 10 },
      ]);
      const [lineA] = draft.lines;
      expect(
        transitionOrder(draft, 'CONFIRMED', ctx({ orders: [otherConfirmed] })),
      ).toEqual({
        ok: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          lines: [
            {
              lineId: lineA?.id,
              productId: PRODUCT_A,
              requested: 31,
              available: 30,
            },
          ],
        },
      });
    });

    it('does not count its own lines as reserved', () => {
      const draft = order('DRAFT', [{ productId: PRODUCT_A, quantity: 45 }]);
      // A stale copy of the same order in CONFIRMED must not reserve against itself.
      const staleCopy = { ...draft, status: 'CONFIRMED' as const };
      const result = transitionOrder(
        draft,
        'CONFIRMED',
        ctx({ orders: [staleCopy] }),
      );
      expect(result.ok).toBe(true);
    });

    it('sums lines of the same product', () => {
      const draft = order('DRAFT', [
        { productId: PRODUCT_A, quantity: 20 },
        { productId: PRODUCT_A, quantity: 11 },
      ]);
      const result = transitionOrder(
        draft,
        'CONFIRMED',
        ctx({ orders: [otherConfirmed] }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok && result.error.code === 'INSUFFICIENT_STOCK') {
        expect(result.error.lines).toHaveLength(2);
      }
    });
  });

  describe('PICKED -> SHIPPED', () => {
    const picked = order('PICKED', [
      { productId: PRODUCT_A, quantity: 8, locationId: LOC_1 },
      { productId: PRODUCT_B, quantity: 10, locationId: LOC_1 },
    ]);

    it('returns ISSUE movements split across locations', () => {
      const result = transitionOrder(picked, 'SHIPPED', ctx());
      if (!result.ok) throw new Error('expected ok');
      expect(
        result.value.movements.map(({ productId, locationId, quantity }) => ({
          productId,
          locationId,
          quantity,
        })),
      ).toEqual([
        { productId: PRODUCT_A, locationId: LOC_1, quantity: 5 },
        { productId: PRODUCT_A, locationId: LOC_2, quantity: 3 },
        { productId: PRODUCT_B, locationId: LOC_1, quantity: 10 },
      ]);
    });

    it('returns contract-valid movements by the shipping user at `at`', () => {
      const result = transitionOrder(picked, 'SHIPPED', ctx());
      if (!result.ok) throw new Error('expected ok');
      for (const movement of result.value.movements) {
        expect(StockMovement.safeParse(movement).success).toBe(true);
        expect(movement).toMatchObject({
          type: 'ISSUE',
          createdBy: USER,
          createdAt: NOW,
          reason: `Order ${picked.number}`,
        });
      }
    });

    it('derives the same ids on a retry, unique per line and location', () => {
      const first = transitionOrder(picked, 'SHIPPED', ctx());
      const retry = transitionOrder(picked, 'SHIPPED', ctx());
      if (!first.ok || !retry.ok) throw new Error('expected ok');
      const ids = first.value.movements.map((m) => m.id);
      expect(retry.value.movements.map((m) => m.id)).toEqual(ids);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('lets later lines of the same product see what earlier lines took', () => {
      const twoLines = order('PICKED', [
        { productId: PRODUCT_B, quantity: 6, locationId: LOC_1 },
        { productId: PRODUCT_B, quantity: 5, locationId: LOC_1 },
      ]);
      const result = transitionOrder(twoLines, 'SHIPPED', ctx());
      expect(result).toMatchObject({
        ok: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          lines: [
            { lineId: twoLines.lines[1]?.id, requested: 5, available: 4 },
          ],
        },
      });
    });
  });
});
