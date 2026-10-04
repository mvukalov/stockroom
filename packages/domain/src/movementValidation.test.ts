import { describe, expect, it } from 'vitest';

import type { CreateMovementInput } from '@stockroom/contract';

import { validateMovement, type MovementState } from './movementValidation';
import { stockByLocation } from './stock';
import { LOC_1, LOC_2, order, PRODUCT_A, receipt } from './testFixtures';

const MOVEMENT_ID = '00000000-0000-4000-8000-000000009999';
const base = { id: MOVEMENT_ID, productId: PRODUCT_A, reason: null };

type InputOf<T extends CreateMovementInput['type']> = Extract<
  CreateMovementInput,
  { type: T }
>;

const issueOf = (quantity: number): InputOf<'ISSUE'> => ({
  ...base,
  type: 'ISSUE',
  locationId: LOC_1,
  quantity,
});
const transferOf = (quantity: number): InputOf<'TRANSFER'> => ({
  ...base,
  type: 'TRANSFER',
  locationId: LOC_1,
  destinationLocationId: LOC_2,
  quantity,
});
const decreaseOf = (
  quantity: number,
  reason = 'Damaged',
): InputOf<'ADJUSTMENT'> => ({
  ...base,
  type: 'ADJUSTMENT',
  direction: 'DECREASE',
  locationId: LOC_1,
  quantity,
  reason,
});

/** LOC_1: 10, LOC_2: 10, product on hand 20. */
const stock = stockByLocation([
  receipt(PRODUCT_A, LOC_1, 10),
  receipt(PRODUCT_A, LOC_2, 10),
]);
const noOrders: MovementState = { stock, orders: [] };
/** 14 reserved, so the product has 6 available. */
const withReservation: MovementState = {
  stock,
  orders: [order('CONFIRMED', [{ productId: PRODUCT_A, quantity: 14 }])],
};

describe('validateMovement', () => {
  it('accepts any RECEIPT and ADJUSTMENT INCREASE', () => {
    const empty: MovementState = { stock: new Map(), orders: [] };
    expect(
      validateMovement(
        { ...base, type: 'RECEIPT', locationId: LOC_1, quantity: 500 },
        empty,
      ).ok,
    ).toBe(true);
    expect(
      validateMovement({ ...decreaseOf(500), direction: 'INCREASE' }, empty).ok,
    ).toBe(true);
  });

  describe.each([
    { name: 'ISSUE', build: issueOf },
    { name: 'ADJUSTMENT DECREASE', build: (q: number) => decreaseOf(q) },
  ])('$name', ({ build }) => {
    it.each([
      {
        state: noOrders,
        quantity: 10,
        ok: true,
        label: 'exactly on hand at location',
      },
      {
        state: noOrders,
        quantity: 11,
        ok: false,
        label: 'one over location on hand',
      },
      {
        state: withReservation,
        quantity: 6,
        ok: true,
        label: 'exactly available',
      },
      {
        state: withReservation,
        quantity: 7,
        ok: false,
        label: 'one over available',
      },
    ])('$label ($quantity) -> ok: $ok', ({ state, quantity, ok }) => {
      expect(validateMovement(build(quantity), state).ok).toBe(ok);
    });

    it('reports the location limit', () => {
      expect(validateMovement(build(11), noOrders)).toEqual({
        ok: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          productId: PRODUCT_A,
          locationId: LOC_1,
          limit: 'LOCATION_ON_HAND',
          maxQuantity: 10,
          requested: 11,
        },
      });
    });

    it('reports the availability limit', () => {
      expect(validateMovement(build(7), withReservation)).toEqual({
        ok: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          productId: PRODUCT_A,
          locationId: LOC_1,
          limit: 'PRODUCT_AVAILABLE',
          maxQuantity: 6,
          requested: 7,
        },
      });
    });

    it('rejects anything when the location is empty', () => {
      const empty: MovementState = { stock: new Map(), orders: [] };
      expect(validateMovement(build(1), empty)).toMatchObject({
        ok: false,
        error: { code: 'INSUFFICIENT_STOCK', maxQuantity: 0 },
      });
    });
  });

  describe('TRANSFER', () => {
    it.each([
      { quantity: 10, ok: true },
      { quantity: 11, ok: false },
    ])('$quantity of 10 at source -> ok: $ok', ({ quantity, ok }) => {
      expect(validateMovement(transferOf(quantity), noOrders).ok).toBe(ok);
    });

    it('is not limited by reservations', () => {
      // Only 6 available for the product, but all 10 at the source can move.
      expect(validateMovement(transferOf(10), withReservation).ok).toBe(true);
    });

    it('rejects the same source and destination', () => {
      expect(
        validateMovement(
          { ...transferOf(1), destinationLocationId: LOC_1 },
          noOrders,
        ),
      ).toEqual({ ok: false, error: { code: 'SAME_LOCATION' } });
    });
  });

  describe('ADJUSTMENT reason', () => {
    it.each(['', '   '])('rejects reason %j', (reason) => {
      expect(validateMovement(decreaseOf(1, reason), noOrders)).toEqual({
        ok: false,
        error: { code: 'REASON_REQUIRED' },
      });
    });

    it('accepts a non-empty reason', () => {
      expect(validateMovement(decreaseOf(1, 'Count'), noOrders).ok).toBe(true);
    });
  });
});
