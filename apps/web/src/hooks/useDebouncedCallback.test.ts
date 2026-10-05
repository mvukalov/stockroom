import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedCallback } from './useDebouncedCallback';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup() {
  const callback = vi.fn<(value: string) => void>();
  const { result, unmount } = renderHook(() =>
    useDebouncedCallback(callback, 300),
  );
  return { callback, debounced: () => result.current, unmount };
}

describe('useDebouncedCallback', () => {
  it('calls back once, with the last value, after the delay', () => {
    const { callback, debounced } = setup();

    debounced().run('a');
    vi.advanceTimersByTime(200);
    debounced().run('ab');
    vi.advanceTimersByTime(299);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('ab');
  });

  it('calls back again for a run after the previous one fired', () => {
    const { callback, debounced } = setup();

    debounced().run('a');
    vi.advanceTimersByTime(300);
    debounced().run('ab');
    vi.advanceTimersByTime(300);

    expect(callback.mock.calls).toEqual([['a'], ['ab']]);
  });

  it('calls the callback of the latest render, not the one that scheduled it', () => {
    const first = vi.fn<(value: string) => void>();
    const latest = vi.fn<(value: string) => void>();
    const { result, rerender } = renderHook(
      ({ callback }) => useDebouncedCallback(callback, 300),
      { initialProps: { callback: first } },
    );

    result.current.run('a');
    rerender({ callback: latest });
    vi.advanceTimersByTime(300);

    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledWith('a');
  });

  it('drops a pending call on cancel', () => {
    const { callback, debounced } = setup();

    debounced().run('a');
    debounced().cancel();
    vi.advanceTimersByTime(1000);

    expect(callback).not.toHaveBeenCalled();
  });

  it('drops a pending call on unmount', () => {
    const { callback, debounced, unmount } = setup();

    debounced().run('a');
    unmount();
    vi.advanceTimersByTime(1000);

    expect(callback).not.toHaveBeenCalled();
  });
});
