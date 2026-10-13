import { expect, test } from '@playwright/test';

import { heading, roleSwitcher, ROUTES, virtualTable } from './support/app';
import { expectFocusRing, tabTo } from './support/keyboard';

test('the shell works by keyboard alone, with a visible focus ring at each stop', async ({
  page,
}) => {
  await page.goto(ROUTES.dashboard);
  await expect(heading(page, 'Dashboard')).toBeVisible();
  await expect(roleSwitcher(page)).toBeVisible();

  // Skip link: the first stop, visible once focused, and it moves focus to <main>.
  const skipLink = page.getByRole('link', { name: 'Skip to main content' });
  await page.keyboard.press('Tab');
  await expectFocusRing(skipLink);
  await expect(skipLink).toBeInViewport();
  await page.keyboard.press('Enter');
  await expectFocusRing(page.getByRole('main'));

  // Sidebar: collapse and expand it, then go to Movements.
  const nav = page.getByRole('navigation', { name: 'Main' });
  const sidebarToggle = nav.getByRole('button', { name: 'Sidebar' });
  await tabTo(page, sidebarToggle, { key: 'Shift+Tab' });
  await expectFocusRing(sidebarToggle);
  await page.keyboard.press('Enter');
  await expect(sidebarToggle).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Enter');
  await expect(sidebarToggle).toHaveAttribute('aria-expanded', 'true');

  const movementsLink = nav.getByRole('link', { name: 'Movements' });
  await tabTo(page, movementsLink);
  await expectFocusRing(movementsLink);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(ROUTES.movements);
  await expect(heading(page, 'Movements')).toBeFocused();
  await virtualTable(page, 'Stock movements');

  // Role switcher: the stop before the page. Typing a name picks it on every
  // platform; the arrow keys open the native list on macOS instead.
  const switcher = roleSwitcher(page);
  await tabTo(page, switcher, { key: 'Shift+Tab' });
  await expectFocusRing(switcher);
  const clerk = await switcher
    .getByRole('option', { name: / · Clerk$/ })
    .first()
    .innerText();
  await page.keyboard.type(clerk.slice(0, 4));
  await expect(switcher.getByRole('option', { selected: true })).toHaveText(
    clerk,
  );
  await expect(
    page.getByRole('banner').getByText('Clerk', { exact: true }),
  ).toBeVisible();

  // The page's main action: opens by Enter, and Escape gives the focus back.
  const newMovement = page.getByRole('button', { name: 'New movement' });
  await tabTo(page, newMovement);
  await expectFocusRing(newMovement);
  await page.keyboard.press('Enter');
  const drawer = page.getByRole('dialog', { name: 'New movement' });
  await expect(drawer).toBeVisible();
  await expectFocusRing(drawer.getByRole('radio', { name: 'Receipt' }));
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expectFocusRing(newMovement);
});
