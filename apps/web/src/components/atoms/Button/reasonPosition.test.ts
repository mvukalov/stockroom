import { describe, expect, it } from 'vitest';

import { EDGE_PX, reasonPosition } from './reasonPosition';

const viewport = { width: 375, height: 600 };
const reason = { width: 200, height: 40 };
const anchor = (top: number, left: number, height = 36) => ({
  top,
  bottom: top + height,
  left,
});

describe('reasonPosition', () => {
  it('goes below the control, start edges aligned', () => {
    expect(reasonPosition(anchor(100, 24), reason, viewport)).toEqual({
      top: 136,
      left: 24,
    });
  });

  it('goes above the control when it does not fit below', () => {
    expect(reasonPosition(anchor(540, 24), reason, viewport)).toEqual({
      top: 500,
      left: 24,
    });
  });

  it('stays below when it fits neither below nor above', () => {
    const tall = { width: 200, height: 580 };
    expect(reasonPosition(anchor(100, 24), tall, viewport).top).toBe(136);
  });

  it('never covers the control', () => {
    for (const top of [0, 100, 300, 540, 564]) {
      const control = anchor(top, 24);
      const position = reasonPosition(control, reason, viewport);
      const below = position.top >= control.bottom;
      const above = position.top + reason.height <= control.top;
      expect(below || above).toBe(true);
    }
  });

  it('is kept inside the viewport at the right edge', () => {
    expect(reasonPosition(anchor(100, 330), reason, viewport).left).toBe(
      375 - 200 - EDGE_PX,
    );
  });

  it('is kept inside the viewport at the left edge', () => {
    expect(reasonPosition(anchor(100, -20), reason, viewport).left).toBe(EDGE_PX);
  });
});
