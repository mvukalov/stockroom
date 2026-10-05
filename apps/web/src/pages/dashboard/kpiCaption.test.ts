import { describe, expect, it } from 'vitest';

import { deltaCaption, lowStockCaption } from './kpiCaption';

describe('deltaCaption', () => {
  it.each([
    [12, '+12 vs last week'],
    [1234, '+1,234 vs last week'],
    [-3, '−3 vs last week'],
    [-1500, '−1,500 vs last week'],
    [0, 'No change vs last week'],
  ])('%i -> %s', (delta, caption) => {
    expect(deltaCaption(delta)).toBe(caption);
  });

  it('uses a true minus sign, not a hyphen', () => {
    expect(deltaCaption(-3)).not.toContain('-');
  });
});

describe('lowStockCaption', () => {
  it.each([
    [6, 2, '2 more than last week'],
    [6, -1, '1 fewer than last week'],
    [6, 0, 'Same as last week'],
    [2500, 1200, '1,200 more than last week'],
    [0, 0, 'No items need attention'],
    [0, -4, 'No items need attention'],
  ])('value %i, delta %i -> %s', (value, deltaVsLastWeek, caption) => {
    expect(lowStockCaption({ value, deltaVsLastWeek })).toBe(caption);
  });
});
