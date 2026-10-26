import { expect, test } from '@playwright/test';

import {
  productResults,
  READ_ONLY,
  ROUTES,
  selectFirstProduct,
  switchRole,
} from './support/app';
import { recordApiRequests, requestsSettled } from './support/requests';

const GUARDED = ['Update category', 'Create adjustment', 'Archive'] as const;

test('switching ADMIN to VIEWER and back on Products keeps the selection and refetches nothing @smoke', async ({
  page,
}) => {
  await page.goto(ROUTES.products);
  const results = productResults(page);
  const row = await selectFirstProduct(page);
  // The filter options are the last request of the first load.
  await expect(
    results.getByRole('combobox', { name: 'Category' }),
  ).toBeEnabled();
  await requestsSettled(page);
  const requests = recordApiRequests(page);

  for (const role of ['Viewer', 'Admin'] as const) {
    await switchRole(page, role);

    await expect(results.getByText('1 product selected')).toBeVisible();
    await expect(row.getByRole('checkbox')).toBeChecked();
    await expect(
      page.getByRole('banner').getByText('Read-only access'),
    ).toHaveCount(role === 'Viewer' ? 1 : 0);

    for (const name of GUARDED) {
      const control = results.getByRole('button', { name, exact: true });
      if (role === 'Viewer') {
        await expect(control).toHaveAttribute('aria-disabled', 'true');
        await expect(control).toHaveAccessibleDescription(READ_ONLY);
      } else {
        await expect(control).not.toHaveAttribute('aria-disabled');
      }
    }

    const menuButton = row.getByRole('button', { name: /^Actions for / });
    await menuButton.click();
    for (const name of GUARDED) {
      const item = row.getByRole('button', { name, exact: true });
      if (role === 'Viewer') {
        await expect(item).toHaveAttribute('aria-disabled', 'true');
        await expect(item).toHaveAccessibleDescription(READ_ONLY);
      } else {
        await expect(item).not.toHaveAttribute('aria-disabled');
      }
    }
    await page.keyboard.press('Escape');
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  }

  // Role-independent data: no list, filter or user request after a switch.
  await requestsSettled(page);
  expect(requests).toEqual([]);
});
