import { describe, expect, it } from 'vitest';

import { movementMatchesQuery } from './movementQuery';
import {
  adjustment,
  LOC_1,
  LOC_2,
  LOC_3,
  NOW,
  PRODUCT_A,
  PRODUCT_B,
  receipt,
  transfer,
  USER,
} from './testFixtures';

const OTHER_USER = '00000000-0000-4000-8000-000000000099';
const DAY = NOW.slice(0, 10);

describe('movementMatchesQuery', () => {
  const movement = receipt(PRODUCT_A, LOC_1, 5);

  it('matches every movement without filters', () => {
    expect(movementMatchesQuery(movement, {})).toBe(true);
  });

  it.each([
    ['type', { type: 'RECEIPT' }, { type: 'ISSUE' }],
    ['product', { productId: PRODUCT_A }, { productId: PRODUCT_B }],
    ['location', { locationId: LOC_1 }, { locationId: LOC_2 }],
    ['user', { userId: USER }, { userId: OTHER_USER }],
  ] as const)('filters by %s', (_, matching, other) => {
    expect(movementMatchesQuery(movement, matching)).toBe(true);
    expect(movementMatchesQuery(movement, other)).toBe(false);
  });

  it('matches a TRANSFER by its source or its destination', () => {
    const moved = transfer(PRODUCT_A, LOC_1, LOC_2, 3);
    expect(movementMatchesQuery(moved, { locationId: LOC_1 })).toBe(true);
    expect(movementMatchesQuery(moved, { locationId: LOC_2 })).toBe(true);
    expect(movementMatchesQuery(moved, { locationId: LOC_3 })).toBe(false);
  });

  it('never matches a destination for other types', () => {
    const adjusted = adjustment(PRODUCT_A, LOC_1, 'INCREASE', 2);
    expect(movementMatchesQuery(adjusted, { locationId: LOC_2 })).toBe(false);
  });

  it('treats from and to as inclusive calendar days', () => {
    expect(movementMatchesQuery(movement, { from: DAY, to: DAY })).toBe(true);
    expect(movementMatchesQuery(movement, { from: '2026-10-04' })).toBe(false);
    expect(movementMatchesQuery(movement, { to: '2026-10-02' })).toBe(false);
  });

  it('needs every filter to match', () => {
    expect(
      movementMatchesQuery(movement, { type: 'RECEIPT', productId: PRODUCT_B }),
    ).toBe(false);
  });
});
