import { describe, expect, it } from 'vitest';

import { Id } from '@stockroom/contract';

import { deterministicId } from './deterministicId';

describe('deterministicId', () => {
  it('returns the same id for the same key', () => {
    expect(deterministicId('order-1:line-1')).toBe(
      deterministicId('order-1:line-1'),
    );
  });

  it('returns a UUID v8 the contract accepts', () => {
    const id = deterministicId('order-1:line-1');
    expect(Id.safeParse(id).success).toBe(true);
    expect(id.charAt(14)).toBe('8');
  });

  it('does not collide across 10,000 similar keys', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10_000; i++) ids.add(deterministicId(`order:${i}`));
    expect(ids.size).toBe(10_000);
  });
});
