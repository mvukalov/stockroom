import { describe, expect, it } from 'vitest';

import { formatCents } from './formatCents';

describe('formatCents', () => {
  it.each([
    [0, '€0.00'],
    [1, '€0.01'],
    [5, '€0.05'],
    [99, '€0.99'],
    [460, '€4.60'],
    [1890, '€18.90'],
    [123456, '€1,234.56'],
    [123456789, '€1,234,567.89'],
  ])('formats %i cents as %s', (cents, expected) => {
    expect(formatCents(cents)).toBe(expected);
  });

  it('keeps cents exact where the division is not (10.05, 0.29)', () => {
    expect(formatCents(1005)).toBe('€10.05');
    expect(formatCents(29)).toBe('€0.29');
  });

  it('rounds a fraction of a cent to the nearest cent', () => {
    expect(formatCents(12345.4)).toBe('€123.45');
    expect(formatCents(12345.5)).toBe('€123.46');
  });
});
