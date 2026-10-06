import { useEffect, useRef, useState } from 'react';

import type { Id } from '@stockroom/contract';

/** The outcome of the last Copy ID, shown until it clears itself. */
export type CopyStatus = { id: Id; outcome: 'copied' | 'failed' };

/** How long the outcome stays on screen. */
export const COPY_STATUS_MS = 4000;

/**
 * Copies a movement id with the Clipboard API. The API can be missing (an insecure
 * origin) or refused (permissions); both report `failed` instead of failing silently.
 */
export function useCopyId() {
  const [status, setStatus] = useState<CopyStatus | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const show = (next: CopyStatus) => {
    window.clearTimeout(timer.current);
    setStatus(next);
    timer.current = window.setTimeout(() => setStatus(null), COPY_STATUS_MS);
  };

  const copy = async (id: Id) => {
    // Typed as always present, but missing outside a secure context.
    const clipboard = navigator.clipboard as Clipboard | undefined;
    if (clipboard === undefined) {
      show({ id, outcome: 'failed' });
      return;
    }
    try {
      await clipboard.writeText(id);
      show({ id, outcome: 'copied' });
    } catch {
      // Refused by the browser; the status says so.
      show({ id, outcome: 'failed' });
    }
  };

  return { status, copy };
}
