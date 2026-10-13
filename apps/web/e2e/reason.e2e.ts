import { expect, test } from '@playwright/test';

import {
  bodyRows,
  openAs,
  productResults,
  productsTable,
  READ_ONLY,
  ROUTES,
  selectFirstProduct,
  virtualTable,
} from './support/app';
import { tabTo } from './support/keyboard';
import { expectReasonPlaced, shownReason } from './support/reason';
import { VIEWER_CONTROLS } from './support/viewerControls';

/**
 * The visible reason of a disabled control, where only a real browser can tell:
 * a native `<dialog>` that closes on Escape, real layout and real hit testing.
 */

test.describe('Escape with a reason open', () => {
  test('in a native dialog closes the reason first, then the dialog', async ({
    page,
  }) => {
    await page.goto(ROUTES.products);
    await selectFirstProduct(page);
    const opener = productResults(page).getByRole('button', {
      name: 'Update category',
    });
    await opener.click();
    const dialog = page.getByRole('dialog', { name: 'Update category' });
    // Blocked until a category is chosen.
    const submit = dialog.getByRole('button', { name: 'Update category' });
    await tabTo(page, submit);
    await expect(shownReason(page)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(shownReason(page)).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(submit).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test('in the row menu closes the reason first, then the menu', async ({
    page,
  }) => {
    await openAs(page, 'Viewer', ROUTES.products);
    const row = bodyRows(await productsTable(page)).first();
    const menuButton = row.getByRole('button', { name: /^Actions for / });
    await menuButton.click();
    const item = row.getByRole('button', { name: 'Update category' });
    await tabTo(page, item);
    await expect(shownReason(page)).toHaveText(READ_ONLY);

    await page.keyboard.press('Escape');
    await expect(shownReason(page)).toHaveCount(0);
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    await expect(item).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(item).toBeHidden();
    await expect(menuButton).toBeFocused();
  });
});

test.describe('reason placement', { tag: '@mobile' }, () => {
  for (const { name, open } of VIEWER_CONTROLS) {
    test(`${name}: on hover and on keyboard focus`, async ({ page }) => {
      const { control, before } = await open(page);

      await control.hover();
      await expect(shownReason(page)).toHaveText(READ_ONLY);
      await expectReasonPlaced(page, control);

      await page.mouse.move(0, 0);
      await expect(shownReason(page)).toHaveCount(0);

      await before.focus();
      await page.keyboard.press('Tab');
      await expect(control).toBeFocused();
      await expectReasonPlaced(page, control);
    });
  }

  // A VIEWER cannot open the drawer. Its controls have a reason only while a
  // movement is being saved, so this one runs as a CLERK. The page's clock is
  // stopped before Save: the mock answers after a timer of at least 150 ms, so
  // the save stays pending for as long as the checks take.
  test('New movement drawer while saving: on keyboard focus and on hover', async ({
    page,
  }) => {
    await page.clock.install();
    await openAs(page, 'Clerk', ROUTES.movements);
    const table = await virtualTable(page, 'Stock movements');
    const sku = (
      await bodyRows(table).first().getByRole('cell').nth(2).innerText()
    )
      .split('\n')
      .at(-1);
    if (!sku) throw new Error('No SKU in the first row');

    await page.getByRole('button', { name: 'New movement' }).click();
    const drawer = page.getByRole('dialog', { name: 'New movement' });
    await drawer.getByRole('searchbox', { name: 'Product' }).fill(sku);
    await drawer
      .getByRole('list', { name: 'Matching products' })
      .getByRole('button', { name: sku })
      .click();
    await drawer
      .getByRole('combobox', { name: 'Location' })
      .selectOption({ index: 1 });
    await drawer.getByRole('textbox', { name: 'Quantity' }).fill('1');

    await page.clock.pauseAt(Date.now() + 1000);
    await drawer.getByRole('button', { name: 'Save movement' }).click();

    // TanStack Query reports the pending state through zero-delay timers. One
    // millisecond of clock time runs those and nothing else.
    const saving = drawer.getByRole('button', { name: 'Saving…' });
    await expect(async () => {
      await page.clock.runFor(1);
      await expect(saving).toBeFocused({ timeout: 500 });
    }).toPass();
    const close = drawer.getByRole('button', { name: 'Close' });
    await page.keyboard.press('Shift+Tab');
    await expect(close).toBeFocused();
    await expectReasonPlaced(page, close);

    await saving.hover();
    await expectReasonPlaced(page, saving);

    // The save was only held back: with the clock running it completes.
    await page.clock.resume();
    await expect(drawer).toBeHidden();
  });
});

test('only one reason is shown at a time', async ({ page }) => {
  await openAs(page, 'Viewer', ROUTES.products);
  await selectFirstProduct(page);
  const archive = productResults(page).getByRole('button', { name: 'Archive' });
  // Disabled on the first page, with a reason of its own.
  const previous = page.getByRole('button', { name: 'Previous page' });
  await page.getByRole('combobox', { name: 'Rows per page' }).focus();
  await page.keyboard.press('Tab');
  await expect(previous).toBeFocused();
  const pageReason = await shownReason(page).innerText();
  expect(pageReason).not.toBe(READ_ONLY);

  await archive.hover();
  await expect(shownReason(page)).toHaveCount(1);
  await expect(shownReason(page)).toHaveText(READ_ONLY);
  await expect(previous).toBeFocused();

  // The focused button did not lose focus; Enter shows its reason again.
  await page.mouse.move(0, 0);
  await expect(shownReason(page)).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(shownReason(page)).toHaveText(pageReason);
});
