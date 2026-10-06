import { describe, expect, it } from 'vitest';

import type { StockMovement } from '@stockroom/contract';

import { signedQuantity } from './signedQuantity';

const base = {
  id: '5c0a9e7e-1b2c-4d3e-8f4a-5b6c7d8e9f01',
  productId: '6d1b0f8f-2c3d-4e4f-9a5b-6c7d8e9f0a12',
  locationId: '7e2c1a9a-3d4e-4f5a-8b6c-7d8e9f0a1b23',
  createdBy: '8f3d2b0b-4e5f-4a6b-9c7d-8e9f0a1b2c34',
  createdAt: '2026-10-03T08:45:00Z',
  reason: null,
} as const;

const MOVEMENTS: [string, StockMovement, string, string][] = [
  ['RECEIPT', { ...base, type: 'RECEIPT', quantity: 14 }, 'increase', '+14'],
  ['ISSUE', { ...base, type: 'ISSUE', quantity: 10 }, 'decrease', '−10'],
  [
    'ADJUSTMENT INCREASE',
    {
      ...base,
      type: 'ADJUSTMENT',
      direction: 'INCREASE',
      quantity: 2,
      reason: 'Cycle count correction',
    },
    'increase',
    '+2',
  ],
  [
    'ADJUSTMENT DECREASE',
    {
      ...base,
      type: 'ADJUSTMENT',
      direction: 'DECREASE',
      quantity: 3,
      reason: 'Damaged in storage',
    },
    'decrease',
    '−3',
  ],
  [
    'TRANSFER',
    {
      ...base,
      type: 'TRANSFER',
      quantity: 32,
      destinationLocationId: '9a4e3c1c-5f6a-4b7c-8d8e-9f0a1b2c3d45',
    },
    'none',
    '32',
  ],
];

describe('signedQuantity', () => {
  it.each(MOVEMENTS)('%s', (_, movement, sign, text) => {
    expect(signedQuantity(movement)).toEqual({ sign, text });
  });

  it('uses a true minus sign, not a hyphen', () => {
    const { text } = signedQuantity({ ...base, type: 'ISSUE', quantity: 1 });
    expect(text.codePointAt(0)).toBe(0x2212);
  });

  it('groups thousands', () => {
    expect(
      signedQuantity({ ...base, type: 'RECEIPT', quantity: 12_500 }).text,
    ).toBe('+12,500');
  });
});
