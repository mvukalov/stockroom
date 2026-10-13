/**
 * Only one disabled reason is shown at a time, e.g. when one button is focused and
 * another is hovered. This is the one open now, as the way to close it.
 */
let closeCurrent: (() => void) | null = null;

/**
 * Registers the reason that just opened and closes the one before it. Returns the
 * release to call when this reason closes or its button unmounts, so the reference
 * never points at a stale button.
 */
export function claimOpenReason(close: () => void): () => void {
  closeCurrent?.();
  closeCurrent = close;
  return () => {
    if (closeCurrent === close) closeCurrent = null;
  };
}

/** Whether a reason is registered as open. */
export function hasOpenReason(): boolean {
  return closeCurrent !== null;
}
