import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Delays `callback` until `delayMs` have passed without another `run`; only the last
 * call fires. `cancel` drops a pending call, e.g. when the user clears what they
 * were typing. A pending call is dropped on unmount too.
 *
 * A callback rather than a debounced value: the caller commits from the event that
 * caused it, so nothing re-commits a stale value after the source changed elsewhere
 * (e.g. browser Back).
 *
 * The timer calls the `callback` of the latest render, not the one `run` was called
 * in: a callback that writes URL params then applies to the current params, so a
 * filter changed while a call was pending survives it.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestCallback = useRef(callback);

  // After every render, so a timer that fires later sees this render's callback.
  useLayoutEffect(() => {
    latestCallback.current = callback;
  });

  const cancel = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
  }, []);

  const run = useCallback(
    (...args: Args) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = undefined;
        latestCallback.current(...args);
      }, delayMs);
    },
    [delayMs],
  );

  useEffect(() => cancel, [cancel]);

  return { run, cancel };
}
