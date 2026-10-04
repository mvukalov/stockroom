import { describe, expect, it } from 'vitest';

import {
  allocateIssue,
  computeAvailability,
  onHand,
  onHandIn,
  reserved,
  stockByLocation,
} from './stock';
import {
  adjustment,
  issue,
  LOC_1,
  LOC_2,
  LOC_3,
  LOCATION_CODES,
  order,
  PRODUCT_A,
  PRODUCT_B,
  receipt,
  transfer,
} from './testFixtures';

describe('onHand', () => {
  const log = [
    receipt(PRODUCT_A, LOC_1, 50),
    receipt(PRODUCT_A, LOC_2, 20),
    issue(PRODUCT_A, LOC_1, 8),
    adjustment(PRODUCT_A, LOC_2, 'INCREASE', 3),
    adjustment(PRODUCT_A, LOC_1, 'DECREASE', 2),
    transfer(PRODUCT_A, LOC_1, LOC_3, 10),
    receipt(PRODUCT_B, LOC_1, 99),
  ];

  it.each([
    { query: { productId: PRODUCT_A }, expected: 63 },
    { query: { productId: PRODUCT_A, locationId: LOC_1 }, expected: 30 },
    { query: { productId: PRODUCT_A, locationId: LOC_2 }, expected: 23 },
    { query: { productId: PRODUCT_A, locationId: LOC_3 }, expected: 10 },
    { query: { productId: PRODUCT_B }, expected: 99 },
    { query: { productId: PRODUCT_B, locationId: LOC_2 }, expected: 0 },
  ])('$query -> $expected', ({ query, expected }) => {
    expect(onHand(log, query)).toBe(expected);
  });

  it('is zero for an empty log', () => {
    expect(onHand([], { productId: PRODUCT_A })).toBe(0);
  });

  it('a TRANSFER does not change the product total', () => {
    const before = [receipt(PRODUCT_A, LOC_1, 40)];
    const after = [...before, transfer(PRODUCT_A, LOC_1, LOC_2, 40)];
    expect(onHand(after, { productId: PRODUCT_A })).toBe(40);
    expect(onHand(after, { productId: PRODUCT_A, locationId: LOC_1 })).toBe(0);
    expect(onHand(after, { productId: PRODUCT_A, locationId: LOC_2 })).toBe(40);
  });
});

describe('stockByLocation', () => {
  it('matches onHand for every product and location', () => {
    const log = [
      receipt(PRODUCT_A, LOC_1, 50),
      transfer(PRODUCT_A, LOC_1, LOC_2, 15),
      issue(PRODUCT_A, LOC_2, 5),
      receipt(PRODUCT_B, LOC_3, 7),
      adjustment(PRODUCT_B, LOC_3, 'DECREASE', 7),
    ];
    const stock = stockByLocation(log);

    for (const productId of [PRODUCT_A, PRODUCT_B]) {
      expect(onHandIn(stock, { productId })).toBe(onHand(log, { productId }));
      for (const locationId of [LOC_1, LOC_2, LOC_3]) {
        expect(onHandIn(stock, { productId, locationId })).toBe(
          onHand(log, { productId, locationId }),
        );
      }
    }
    expect(stock.get(PRODUCT_A)?.get(LOC_2)).toBe(10);
    expect(stock.get(PRODUCT_B)?.get(LOC_3)).toBe(0);
  });

  it('returns 0 for unknown products and locations', () => {
    const stock = stockByLocation([receipt(PRODUCT_A, LOC_1, 5)]);
    expect(onHandIn(stock, { productId: PRODUCT_B })).toBe(0);
    expect(onHandIn(stock, { productId: PRODUCT_A, locationId: LOC_2 })).toBe(
      0,
    );
  });
});

describe('reserved', () => {
  it.each([
    { status: 'DRAFT', expected: 0 },
    { status: 'CONFIRMED', expected: 7 },
    { status: 'PICKED', expected: 7 },
    { status: 'SHIPPED', expected: 0 },
    { status: 'CANCELLED', expected: 0 },
  ] as const)('$status reserves $expected', ({ status, expected }) => {
    const orders = [
      order(status, [
        { productId: PRODUCT_A, quantity: 4 },
        { productId: PRODUCT_A, quantity: 3 },
        { productId: PRODUCT_B, quantity: 100 },
      ]),
    ];
    expect(reserved(orders, PRODUCT_A)).toBe(expected);
  });

  it('sums across orders', () => {
    const orders = [
      order('CONFIRMED', [{ productId: PRODUCT_A, quantity: 4 }]),
      order('PICKED', [{ productId: PRODUCT_A, quantity: 6 }]),
      order('DRAFT', [{ productId: PRODUCT_A, quantity: 50 }]),
    ];
    expect(reserved(orders, PRODUCT_A)).toBe(10);
  });
});

describe('computeAvailability', () => {
  it('is onHand minus reserved, per product', () => {
    const stock = stockByLocation([
      receipt(PRODUCT_A, LOC_1, 30),
      receipt(PRODUCT_A, LOC_2, 12),
    ]);
    const orders = [
      order('CONFIRMED', [{ productId: PRODUCT_A, quantity: 40 }]),
    ];
    expect(computeAvailability(stock, orders, PRODUCT_A)).toEqual({
      productId: PRODUCT_A,
      onHand: 42,
      reserved: 40,
      available: 2,
    });
  });
});

describe('allocateIssue', () => {
  const stock = stockByLocation([
    receipt(PRODUCT_A, LOC_1, 5),
    receipt(PRODUCT_A, LOC_2, 20),
    receipt(PRODUCT_A, LOC_3, 20),
  ]);
  const options = { locationCodes: LOCATION_CODES };

  it('takes the largest on hand first, ties by location code', () => {
    // LOC_2 (A-01-02) and LOC_3 (B-01-01) both hold 20; A-01-02 sorts first.
    expect(allocateIssue(stock, PRODUCT_A, 30, options)).toEqual({
      ok: true,
      value: [
        { locationId: LOC_2, quantity: 20 },
        { locationId: LOC_3, quantity: 10 },
      ],
    });
  });

  it('takes the preferred location first', () => {
    expect(
      allocateIssue(stock, PRODUCT_A, 8, {
        ...options,
        preferredLocationId: LOC_1,
      }),
    ).toEqual({
      ok: true,
      value: [
        { locationId: LOC_1, quantity: 5 },
        { locationId: LOC_2, quantity: 3 },
      ],
    });
  });

  it('skips an empty preferred location', () => {
    const emptied = stockByLocation([
      receipt(PRODUCT_A, LOC_1, 5),
      issue(PRODUCT_A, LOC_1, 5),
      receipt(PRODUCT_A, LOC_2, 9),
    ]);
    expect(
      allocateIssue(emptied, PRODUCT_A, 4, {
        ...options,
        preferredLocationId: LOC_1,
      }),
    ).toEqual({ ok: true, value: [{ locationId: LOC_2, quantity: 4 }] });
  });

  it.each([
    { quantity: 45, ok: true },
    { quantity: 46, ok: false },
  ])('quantity $quantity of 45 on hand -> ok: $ok', ({ quantity, ok }) => {
    expect(allocateIssue(stock, PRODUCT_A, quantity, options).ok).toBe(ok);
  });

  it('reports the shortage', () => {
    expect(allocateIssue(stock, PRODUCT_A, 46, options)).toEqual({
      ok: false,
      error: {
        code: 'INSUFFICIENT_STOCK',
        productId: PRODUCT_A,
        requested: 46,
        onHand: 45,
      },
    });
  });

  it('fails for a product with no stock', () => {
    expect(allocateIssue(stock, PRODUCT_B, 1, options).ok).toBe(false);
  });
});
