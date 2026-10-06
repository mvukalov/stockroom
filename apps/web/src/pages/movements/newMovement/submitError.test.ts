import { describe, expect, it } from 'vitest';

import type { ApiError } from '@stockroom/contract';

import { submitErrorOf } from './submitError';

const ID = '6d1b0f8f-2c3d-4e4f-9a5b-6c7d8e9f0a12';

describe('submitErrorOf', () => {
  it('puts a lack of stock at the Quantity field, with what to do', () => {
    expect(
      submitErrorOf({
        code: 'INSUFFICIENT_STOCK',
        message: 'Only 14 on hand now.',
        details: { productId: ID, locationId: ID, available: 14 },
      }),
    ).toEqual({
      kind: 'field',
      field: 'quantity',
      message: 'Only 14 on hand now. Lower the quantity.',
    });
  });

  it('explains a reused id with other values instead of the raw message', () => {
    const error = submitErrorOf({
      code: 'CONFLICT',
      message: `Movement ${ID} already exists with different values.`,
    });
    expect(error.kind).toBe('banner');
    expect(error.message).toBe(
      'This movement was already saved with other values. Close the form and check the list before adding it again.',
    );
    expect(error.message).not.toContain(ID);
  });

  it.each<ApiError>([
    { code: 'FORBIDDEN', message: 'Your role is read-only' },
    { code: 'VALIDATION_FAILED', message: 'Unknown location' },
    { code: 'NOT_FOUND', message: 'Not found' },
    { code: 'INVALID_TRANSITION', message: 'Not allowed' },
  ])('shows $code in the banner with its message', (error) => {
    expect(submitErrorOf(error)).toEqual({
      kind: 'banner',
      message: `Could not save: ${error.message}`,
    });
  });
});
