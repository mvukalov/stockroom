import { expect, test, type Page } from '@playwright/test';

import {
  bodyRows,
  heading,
  loadedTable,
  notifications,
  openAs,
  openFirstOrder,
  productResults,
  productsTable,
  READ_ONLY,
  ROUTES,
  switchRole,
  virtualTable,
} from './support/app';
import { shownReason } from './support/reason';
import {
  recordApiRequests,
  requestsSettled,
  writesIn,
} from './support/requests';
import { VIEWER_CONTROLS } from './support/viewerControls';

/**
 * One flow per mutation as the role that may do it, each ending on what the user
 * sees, and the same controls as a VIEWER, who cannot start them. The core flows
 * also find their mutating request in the recorded list: that is what makes "no
 * mutating request" for the VIEWER a real claim.
 */

/** The count in a page header, e.g. 48023 for "48,023 movements". */
async function countOf(page: Page, noun: string): Promise<number> {
  const text = await page
    .getByRole('main')
    .getByText(new RegExp(`^[\\d,]+ ${noun}s?$`))
    .innerText();
  return Number(text.replace(/\D/g, ''));
}

test.describe('core flows', () => {
  test('ADMIN archives two products', async ({ page }) => {
    // Out of stock: nothing of them can be reserved by an order (ADR-0003), and a
    // product with reserved stock cannot be archived.
    await page.goto(`${ROUTES.products}?stockStatus=OUT`);
    const table = await productsTable(page);
    const before = await countOf(page, 'product');
    const skus: string[] = [];
    for (const row of [bodyRows(table).nth(0), bodyRows(table).nth(1)]) {
      await row.getByRole('checkbox').check();
      skus.push(await row.getByRole('cell').nth(1).innerText());
    }
    await expect(
      productResults(page).getByText('2 products selected'),
    ).toBeVisible();

    const requests = recordApiRequests(page);
    await productResults(page).getByRole('button', { name: 'Archive' }).click();
    const dialog = page.getByRole('dialog', { name: 'Archive 2 products?' });
    await dialog.getByRole('button', { name: 'Archive' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('2 products archived')).toBeVisible();
    expect(writesIn(requests)).toEqual(['POST /api/products/bulk']);
    await expect.poll(() => countOf(page, 'product')).toBe(before - 2);
    for (const sku of skus) {
      await expect(table.getByRole('cell', { name: sku })).toHaveCount(0);
    }

    // Archived, not deleted: they are back with "Show archived".
    // The filter lives in the URL, so the box is checked a moment after the
    // click; `check()` would look at once.
    const showArchived = productResults(page).getByRole('checkbox', {
      name: 'Show archived',
    });
    await showArchived.click();
    await expect(showArchived).toBeChecked();
    for (const sku of skus) {
      await expect(
        table.getByRole('row').filter({ hasText: sku }),
      ).toContainText('Archived');
    }
  });

  test('CLERK creates a movement and undoes it from the toast @smoke', async ({
    page,
  }) => {
    await openAs(page, 'Clerk', ROUTES.movements);
    const table = await virtualTable(page, 'Stock movements');
    const before = await countOf(page, 'movement');
    const [title, sku] = (
      await bodyRows(table).first().getByRole('cell').nth(2).innerText()
    ).split('\n');
    if (!title || !sku) throw new Error('No product in the first row');

    await page.getByRole('button', { name: 'New movement' }).click();
    const drawer = page.getByRole('dialog', { name: 'New movement' });
    await drawer.getByRole('searchbox', { name: 'Product' }).fill(sku);
    await drawer
      .getByRole('list', { name: 'Matching products' })
      .getByRole('button', { name: sku })
      .click();
    const location = drawer.getByRole('combobox', { name: 'Location' });
    await location.selectOption({ index: 1 });
    const code = await location
      .getByRole('option', { selected: true })
      .innerText();
    await drawer.getByRole('textbox', { name: 'Quantity' }).fill('7');
    const requests = recordApiRequests(page);
    await drawer.getByRole('button', { name: 'Save movement' }).click();

    await expect(drawer).toBeHidden();
    const saved = `Receipt saved: +7 × ${title} at ${code}`;
    await expect(notifications(page).getByText(saved)).toBeVisible();
    const first = bodyRows(table).first();
    await expect(first).toContainText('Receipt');
    await expect(first).toContainText(sku);
    await expect(first).toContainText('+7');
    await expect.poll(() => countOf(page, 'movement')).toBe(before + 1);
    // Saved, no longer "Saving…": the row has its Copy ID button.
    const copyId = first.getByRole('button', { name: /^Copy ID / });
    await expect(copyId).toBeVisible();
    const id = (await copyId.getAttribute('aria-label'))?.replace(
      'Copy ID ',
      '',
    );
    if (!id) throw new Error('No movement id');
    expect(writesIn(requests)).toEqual(['POST /api/movements']);

    await notifications(page)
      .getByRole('button', { name: /^Undo: / })
      .click();

    // Undo is a reversing movement, not a deletion: both rows stay.
    await expect(
      notifications(page).getByText(
        `Undone. Adjustment saved: −7 × ${title} at ${code}`,
      ),
    ).toBeVisible();
    await expect(first).toContainText('Adjustment');
    await expect(first).toContainText('−7');
    await expect(first).toContainText(`Undo of ${id.slice(0, 8)}`);
    await expect(bodyRows(table).nth(1)).toContainText('+7');
    expect(writesIn(requests)).toEqual([
      'POST /api/movements',
      'POST /api/movements',
    ]);
    await expect.poll(() => countOf(page, 'movement')).toBe(before + 2);
    await expect(
      notifications(page).getByRole('button', { name: /^Undo: / }),
    ).toHaveCount(0);
  });

  test('CLERK cancels a confirmed order', async ({ page }) => {
    const number = await openFirstOrder(page, 'CONFIRMED');
    await switchRole(page, 'Clerk');
    const orderPath = new URL(page.url()).pathname;
    const requests = recordApiRequests(page);

    await page.getByRole('button', { name: 'Cancel order' }).click();
    const dialog = page.getByRole('dialog', {
      name: `Cancel order ${number}?`,
    });
    await expect(
      dialog.getByRole('button', { name: 'Keep order' }),
    ).toBeFocused();
    await dialog.getByRole('button', { name: 'Cancel order' }).click();

    await expect(dialog).toBeHidden();
    await expect(
      notifications(page).getByText(`Order ${number} cancelled`),
    ).toBeVisible();
    await expect(heading(page, number)).toBeFocused();
    expect(writesIn(requests)).toEqual([`POST /api${orderPath}/transition`]);
    const summary = page.getByRole('region', { name: 'Summary' });
    await expect(summary.getByText('Cancelled')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Cancel order' }),
    ).toHaveAccessibleDescription('This order is already cancelled');

    // The list it came from is filtered to Confirmed: the order has left it.
    await page.getByRole('link', { name: 'Back to orders' }).click();
    const table = await loadedTable(page, 'Orders');
    await expect(table.getByRole('link').first()).toBeVisible();
    await expect(table.getByRole('link', { name: number })).toHaveCount(0);
    await page
      .getByRole('combobox', { name: 'Status' })
      .selectOption({ label: 'Cancelled' });
    await expect(
      table.getByRole('row').filter({
        has: page.getByRole('link', { name: number }),
      }),
    ).toContainText('Cancelled');
  });
});

test.describe('a VIEWER cannot use', () => {
  for (const { name, open } of VIEWER_CONTROLS) {
    test(name, async ({ page }) => {
      const { control, before } = await open(page);
      const requests = recordApiRequests(page);

      await expect(control).toBeVisible();
      await expect(control).toHaveAttribute('aria-disabled', 'true');

      // The reason is reachable by keyboard and shown there.
      await before.focus();
      await page.keyboard.press('Tab');
      await expect(control).toBeFocused();
      await expect(shownReason(page)).toHaveText(READ_ONLY);
      await expect(control).toHaveAccessibleDescription(READ_ONLY);

      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');
      // Forced: Playwright waits for an `aria-disabled` control to become enabled.
      // The click itself is a real one, at the control.
      await control.click({ force: true });
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await requestsSettled(page);
      expect(writesIn(requests)).toEqual([]);
    });
  }
});
