import { describe, expect, it } from 'vitest';

import { ApiError } from './errors';

describe('ApiError', () => {
  it('carries the available quantity on INSUFFICIENT_STOCK', () => {
    const error = ApiError.parse({
      code: 'INSUFFICIENT_STOCK',
      message: 'Only 14 on hand now',
      details: {
        productId: '0b6f5c1e-2f4a-4c8e-9a6b-1d2e3f405162',
        locationId: '1c7a6d2f-3a5b-4d9f-8b7c-2e3f40516273',
        available: 14,
      },
    });
    expect(error.code === 'INSUFFICIENT_STOCK' && error.details.available).toBe(
      14,
    );
  });

  it('rejects INSUFFICIENT_STOCK without details', () => {
    expect(
      ApiError.safeParse({ code: 'INSUFFICIENT_STOCK', message: 'No' }).success,
    ).toBe(false);
  });

  it.each([
    'FORBIDDEN',
    'NOT_FOUND',
    'INVALID_TRANSITION',
    'CONFLICT',
    'VALIDATION_FAILED',
  ])('accepts %s without details', (code) => {
    expect(
      ApiError.safeParse({ code, message: 'Something went wrong' }).success,
    ).toBe(true);
  });

  it('accepts field errors on VALIDATION_FAILED', () => {
    const result = ApiError.safeParse({
      code: 'VALIDATION_FAILED',
      message: 'Invalid movement',
      details: { reason: ['Reason is required for an adjustment'] },
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown code', () => {
    expect(ApiError.safeParse({ code: 'TEAPOT', message: 'No' }).success).toBe(
      false,
    );
  });
});
