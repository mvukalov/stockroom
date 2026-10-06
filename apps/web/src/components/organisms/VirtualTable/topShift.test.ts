import { describe, expect, it } from 'vitest';

import { topShift } from './topShift';

const id = (row: string) => row;

describe('topShift', () => {
  it('counts rows added above the first one', () => {
    expect(topShift(['a', 'b'], ['new', 'a', 'b'], id)).toBe(1);
    expect(topShift(['a', 'b'], ['x', 'y', 'a', 'b'], id)).toBe(2);
  });

  it('counts rows removed from the top as negative', () => {
    expect(topShift(['new', 'a', 'b'], ['a', 'b'], id)).toBe(-1);
  });

  it('is 0 for the same first row, a replaced row or unrelated lists', () => {
    expect(topShift(['a', 'b'], ['a', 'b', 'c'], id)).toBe(0);
    expect(topShift(['a', 'b'], ['z', 'y'], id)).toBe(0);
    expect(topShift(undefined, ['a'], id)).toBe(0);
    expect(topShift(['a'], [], id)).toBe(0);
  });

  it('looks no deeper than ten rows', () => {
    const many = Array.from({ length: 11 }, (_, n) => `n${n}`);
    expect(topShift(['a'], [...many.slice(0, 10), 'a'], id)).toBe(10);
    expect(topShift(['a'], [...many, 'a'], id)).toBe(0);
  });
});
