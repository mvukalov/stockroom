import { afterEach, describe, expect, it, vi } from 'vitest';

import { readStorage, writeStorage } from './storage';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('storage', () => {
  it('reads and writes through localStorage', () => {
    writeStorage('key', 'value');
    expect(readStorage('key')).toBe('value');
  });

  it('reads null when getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });

    expect(readStorage('key')).toBeNull();
  });

  it('does not throw when setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });

    expect(() => writeStorage('key', 'value')).not.toThrow();
  });
});
