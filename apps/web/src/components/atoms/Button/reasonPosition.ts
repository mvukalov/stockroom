/** Space kept free between the reason and the viewport edge (px), `--space-2`. */
export const EDGE_PX = 8;

type Anchor = Pick<DOMRect, 'top' | 'bottom' | 'left'>;
type Size = { width: number; height: number };

/**
 * Where a disabled control's reason goes, in viewport coordinates: below the
 * control, or above it when it does not fit below but does above; start edges
 * aligned and kept inside the viewport. The reason box touches the control (its
 * transparent padding is the visible gap), so it never covers the control and the
 * pointer can move onto it without leaving both.
 */
export function reasonPosition(
  anchor: Anchor,
  reason: Size,
  viewport: Size,
): { top: number; left: number } {
  const above = anchor.top - reason.height;
  const fitsBelow = anchor.bottom + reason.height <= viewport.height - EDGE_PX;
  const top = fitsBelow || above < EDGE_PX ? anchor.bottom : above;
  const left = Math.max(
    EDGE_PX,
    Math.min(anchor.left, viewport.width - reason.width - EDGE_PX),
  );
  return { top, left };
}
