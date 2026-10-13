import { expect, type Locator, type Page } from '@playwright/test';

/** Presses `key` (Tab by default) until `target` has focus, as a keyboard user gets there. */
export async function tabTo(
  page: Page,
  target: Locator,
  { key = 'Tab', max = 30 }: { key?: 'Tab' | 'Shift+Tab'; max?: number } = {},
): Promise<void> {
  for (let presses = 0; presses < max; presses += 1) {
    await page.keyboard.press(key);
    if (
      await target.evaluate((element) => element === document.activeElement)
    ) {
      return;
    }
  }
  throw new Error(`Not reached with ${max} presses of ${key}`);
}

/** `target` has focus and draws the focus ring (an outline, from the global rule). */
export async function expectFocusRing(target: Locator): Promise<void> {
  await expect(target).toBeFocused();
  const outline = await target.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
  expect(outline.style).not.toBe('none');
  expect(outline.width).toBeGreaterThan(0);
}
