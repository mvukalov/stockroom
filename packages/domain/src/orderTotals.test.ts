import { describe, expect, it } from 'vitest';

import { computeOrderTotals } from './orderTotals';

const line = (quantity: number, unitPriceCents: number) => ({
  quantity,
  unitPriceCents,
});

describe('computeOrderTotals', () => {
  it.each([
    { name: 'no lines', lines: [], subtotal: 0, vat: 0 },
    { name: 'one line', lines: [line(3, 1000)], subtotal: 3000, vat: 750 },
    {
      name: 'several lines',
      lines: [line(2, 1299), line(1, 4550), line(10, 85)],
      subtotal: 7998,
      vat: 2000, // 1999.5 -> 2000
    },
    {
      name: 'quarter cent rounds down',
      lines: [line(1, 1)],
      subtotal: 1,
      vat: 0,
    },
    { name: 'half cent rounds up', lines: [line(1, 2)], subtotal: 2, vat: 1 },
    {
      name: 'three quarters rounds up',
      lines: [line(1, 3)],
      subtotal: 3,
      vat: 1,
    },
    { name: '1.5 cents rounds up', lines: [line(3, 2)], subtotal: 6, vat: 2 },
  ])('$name', ({ lines, subtotal, vat }) => {
    expect(computeOrderTotals(lines)).toEqual({
      subtotalCents: subtotal,
      vatCents: vat,
      totalCents: subtotal + vat,
    });
  });

  it('rounds once on the subtotal, not per line', () => {
    // Per line: 0.5 + 0.5 would round to 1 + 1 = 2. On the subtotal: 1.0 = 1.
    expect(computeOrderTotals([line(1, 2), line(1, 2)]).vatCents).toBe(1);
  });

  it('returns integers only', () => {
    const totals = computeOrderTotals([line(7, 333), line(3, 1)]);
    for (const value of Object.values(totals)) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});
