import { expect, type Locator, type Page } from '@playwright/test';

/** The reason of a disabled control that is shown now (a closed one is `hidden`). */
export const shownReason = (page: Page) => page.getByRole('tooltip');

type Box = { x: number; y: number; width: number; height: number };

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Element has no box');
  return box;
}

const overlap = (a: Box, b: Box) =>
  Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0.5 &&
  Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0.5;

/**
 * The one reason on screen belongs to `control`, is inside the viewport, does not
 * cover its control and is painted in full: the middle of each of its edges and
 * its centre hit the reason itself, which a clipping scroll region, dialog or
 * anything drawn over it would prevent.
 */
export async function expectReasonPlaced(
  page: Page,
  control: Locator,
): Promise<void> {
  const reason = shownReason(page);
  await expect(reason).toHaveCount(1);
  await expect(reason).toBeVisible();
  const text = (await reason.innerText()).trim();
  expect(text).not.toBe('');
  await expect(control).toHaveAccessibleDescription(text);

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('No viewport');
  const box = await boxOf(reason);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);

  expect(overlap(box, await boxOf(control))).toBe(false);

  const painted = await reason.evaluate((element) => {
    const { left, right, top, bottom } = element.getBoundingClientRect();
    const midX = (left + right) / 2;
    const midY = (top + bottom) / 2;
    return [
      [midX, midY],
      [left + 2, midY],
      [right - 2, midY],
      [midX, top + 2],
      [midX, bottom - 2],
    ].every(([x, y]) =>
      element.contains(document.elementFromPoint(x ?? 0, y ?? 0)),
    );
  });
  expect(painted).toBe(true);
}
