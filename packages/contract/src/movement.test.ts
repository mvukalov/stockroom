import { describe, expect, it } from 'vitest';

import {
  CreateMovementInput,
  REASON_MAX_LENGTH,
  StockMovement,
} from './movement';

const PRODUCT = '0b6f5c1e-2f4a-4c8e-9a6b-1d2e3f405162';
const LOC_A = '1c7a6d2f-3a5b-4d9f-8b7c-2e3f40516273';
const LOC_B = '2d8b7e3a-4b6c-4e0a-9c8d-3f4051627384';
const USER = '3e9c8f4b-5c7d-4f1b-8d9e-405162738495';

const server = { createdBy: USER, createdAt: '2026-10-03T12:00:00Z' };

const receipt = {
  id: '4fad9a5c-6d8e-4a2c-9eaf-5162738495a6',
  type: 'RECEIPT',
  productId: PRODUCT,
  locationId: LOC_A,
  quantity: 10,
  reason: null,
};
const issue = { ...receipt, type: 'ISSUE', reason: 'Customer pickup' };
const adjustment = {
  ...receipt,
  type: 'ADJUSTMENT',
  direction: 'DECREASE',
  reason: 'Damaged in storage',
};
const transfer = { ...receipt, type: 'TRANSFER', destinationLocationId: LOC_B };

describe('CreateMovementInput', () => {
  it.each([receipt, issue, adjustment, transfer])(
    'accepts a valid $type',
    (input) => {
      expect(CreateMovementInput.safeParse(input).success).toBe(true);
    },
  );

  it.each([0, -5, 1.5])('rejects quantity %s', (quantity) => {
    expect(
      CreateMovementInput.safeParse({ ...receipt, quantity }).success,
    ).toBe(false);
  });

  it('rejects an unknown type', () => {
    expect(
      CreateMovementInput.safeParse({ ...receipt, type: 'RESERVE' }).success,
    ).toBe(false);
  });

  it('rejects a non-UUID id', () => {
    expect(
      CreateMovementInput.safeParse({ ...receipt, id: 'mv_123' }).success,
    ).toBe(false);
  });

  it('rejects RECEIPT without a location', () => {
    const { locationId: _, ...withoutLocation } = receipt;
    expect(CreateMovementInput.safeParse(withoutLocation).success).toBe(false);
  });

  it('rejects ISSUE with an empty reason', () => {
    expect(
      CreateMovementInput.safeParse({ ...issue, reason: '  ' }).success,
    ).toBe(false);
  });

  it('accepts a reason of exactly REASON_MAX_LENGTH characters and rejects a longer one', () => {
    const at = 'x'.repeat(REASON_MAX_LENGTH);
    expect(
      CreateMovementInput.safeParse({ ...adjustment, reason: at }).success,
    ).toBe(true);
    expect(
      CreateMovementInput.safeParse({ ...adjustment, reason: `${at}x` })
        .success,
    ).toBe(false);
  });

  it('counts the reason length after trimming', () => {
    const padded = ` ${'x'.repeat(REASON_MAX_LENGTH)} `;
    expect(
      CreateMovementInput.safeParse({ ...adjustment, reason: padded }).success,
    ).toBe(true);
  });

  it('rejects ADJUSTMENT without a reason', () => {
    expect(
      CreateMovementInput.safeParse({ ...adjustment, reason: null }).success,
    ).toBe(false);
    const { reason: _, ...withoutReason } = adjustment;
    expect(CreateMovementInput.safeParse(withoutReason).success).toBe(false);
  });

  it('rejects ADJUSTMENT without a direction', () => {
    const { direction: _, ...withoutDirection } = adjustment;
    expect(CreateMovementInput.safeParse(withoutDirection).success).toBe(false);
  });

  it('rejects TRANSFER to the same location', () => {
    const result = CreateMovementInput.safeParse({
      ...transfer,
      destinationLocationId: LOC_A,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['destinationLocationId']);
  });

  it('rejects TRANSFER without a destination', () => {
    const { destinationLocationId: _, ...withoutDestination } = transfer;
    expect(CreateMovementInput.safeParse(withoutDestination).success).toBe(
      false,
    );
  });

  it('drops server fields sent by the client', () => {
    const result = CreateMovementInput.parse({ ...receipt, ...server });
    expect(result).not.toHaveProperty('createdBy');
    expect(result).not.toHaveProperty('createdAt');
  });
});

describe('StockMovement', () => {
  it.each([receipt, issue, adjustment, transfer])(
    'accepts a stored $type',
    (input) => {
      expect(StockMovement.safeParse({ ...input, ...server }).success).toBe(
        true,
      );
    },
  );

  it('requires the server fields', () => {
    expect(StockMovement.safeParse(receipt).success).toBe(false);
  });

  it('rejects a non-ISO createdAt', () => {
    const result = StockMovement.safeParse({
      ...receipt,
      ...server,
      createdAt: '3 Oct 2026',
    });
    expect(result.success).toBe(false);
  });

  it('rejects TRANSFER to the same location', () => {
    const result = StockMovement.safeParse({
      ...transfer,
      ...server,
      destinationLocationId: LOC_A,
    });
    expect(result.success).toBe(false);
  });

  it('rejects ADJUSTMENT without a reason', () => {
    const result = StockMovement.safeParse({
      ...adjustment,
      ...server,
      reason: null,
    });
    expect(result.success).toBe(false);
  });
});
