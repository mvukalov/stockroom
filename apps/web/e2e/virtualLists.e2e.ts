import { expect, test, type Locator } from '@playwright/test';

import { ROUTES, virtualTable } from './support/app';
import { recordApiRequests, requestsSettled } from './support/requests';

/**
 * The two virtualized, infinitely loading lists in a real scroll container:
 * jsdom has no layout, so its tests stub the container size.
 */

const LISTS = [
  {
    name: 'Movements',
    path: ROUTES.movements,
    table: 'Stock movements',
    request: 'GET /api/movements',
  },
  {
    name: 'Audit log',
    path: ROUTES.audit,
    table: 'Audit events',
    request: 'GET /api/audit',
  },
] as const;

/** Pages hold 100 rows; the header is row 1, so the first page ends at 101. */
const LAST_ROW_OF_FIRST_PAGE = 101;

const rowIndex = async (row: Locator) =>
  Number(await row.getAttribute('aria-rowindex'));

for (const list of LISTS) {
  test.describe(list.name, () => {
    test('renders a window of rows and loads the next page once at the end', async ({
      page,
    }) => {
      await page.goto(list.path);
      const table = await virtualTable(page, list.table);
      const rows = table.getByRole('row');
      const total = Number(await table.getAttribute('aria-rowcount'));
      expect(total).toBeGreaterThan(10_000);
      expect(await rows.count()).toBeLessThan(60);
      await requestsSettled(page);
      const requests = recordApiRequests(page);

      // The scroll container is a keyboard stop; End goes to the last loaded row.
      await page.getByRole('group', { name: list.table }).focus();
      await page.keyboard.press('End');

      // Rows of the second page are rendered below the last row of the first.
      await expect
        .poll(() => rowIndex(rows.last()))
        .toBeGreaterThan(LAST_ROW_OF_FIRST_PAGE);
      expect(await rows.count()).toBeLessThan(60);
      await requestsSettled(page);
      expect(requests).toEqual([list.request]);
    });

    test('keeps the focused Copy ID button while its row scrolls out', async ({
      page,
    }) => {
      await page.goto(list.path);
      const table = await virtualTable(page, list.table);
      const rows = table.getByRole('row');
      const first = rows.nth(1).getByRole('button', { name: /^Copy ID / });
      const name = await first.getAttribute('aria-label');
      if (!name) throw new Error('Copy ID button without a name');
      const copyId = table.getByRole('button', { name });
      await copyId.focus();

      await page.getByRole('group', { name: list.table }).hover();
      await page.mouse.wheel(0, 2400);

      // The window moved on: the first row is rendered only because it has focus.
      await expect.poll(() => rowIndex(rows.nth(2))).toBeGreaterThan(20);
      await expect(copyId).toBeFocused();
      await expect(copyId).not.toBeInViewport();
    });

    test('shows the loading state on the slow mock, then the rows', async ({
      page,
    }) => {
      test.slow();
      await page.goto(`${list.path}?mock=slow`);
      const table = page.getByRole('table', { name: list.table });
      await expect(table).toHaveAttribute('aria-busy', 'true');
      await expect(table.getByRole('row')).toHaveCount(1);

      await expect(
        table.getByRole('button', { name: /^Copy ID / }).first(),
      ).toBeVisible({ timeout: 20_000 });
      await expect(table).not.toHaveAttribute('aria-busy');
    });

    test('shows the error on the error mock, and Retry asks again', async ({
      page,
    }) => {
      await page.goto(`${list.path}?mock=error`);
      const error = page.getByRole('main').getByRole('alert');
      const retry = error.getByRole('button', { name: 'Retry' });
      await expect(retry).toBeVisible();
      await requestsSettled(page);
      const requests = recordApiRequests(page);

      await retry.click();

      // The mock keeps failing: a new request goes out and the error comes back.
      await expect.poll(() => requests).toContain(list.request);
      await expect(retry).toBeVisible();
      await expect(error).toBeVisible();
    });
  });
}
