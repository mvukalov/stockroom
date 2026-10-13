import { describe, expect, it, vi } from 'vitest';

import { claimOpenReason, hasOpenReason } from './openReason';

describe('claimOpenReason', () => {
  it('closes the reason that was open before', () => {
    const closeFirst = vi.fn();
    const closeSecond = vi.fn();
    const releaseFirst = claimOpenReason(closeFirst);

    const releaseSecond = claimOpenReason(closeSecond);

    expect(closeFirst).toHaveBeenCalledTimes(1);
    expect(closeSecond).not.toHaveBeenCalled();
    releaseFirst();
    releaseSecond();
  });

  it('forgets the reason once it is released', () => {
    const close = vi.fn();
    const release = claimOpenReason(close);
    expect(hasOpenReason()).toBe(true);

    release();

    expect(hasOpenReason()).toBe(false);
    // Nothing is left to close when the next one opens.
    claimOpenReason(vi.fn())();
    expect(close).not.toHaveBeenCalled();
  });

  it('keeps the newer reason when the older one is released late', () => {
    const closeSecond = vi.fn();
    const releaseFirst = claimOpenReason(vi.fn());
    const releaseSecond = claimOpenReason(closeSecond);

    releaseFirst();

    expect(hasOpenReason()).toBe(true);
    claimOpenReason(vi.fn())();
    expect(closeSecond).toHaveBeenCalledTimes(1);
    releaseSecond();
    expect(hasOpenReason()).toBe(false);
  });
});
