import { expect, test, type Page } from '@playwright/test';

import {
  heading,
  openFirstOrder,
  ROLE_LABELS,
  ROUTES,
  switchRole,
} from './support/app';

/**
 * The top bar on every route and for every role. Below 768 px the repeated page
 * title is not shown and the role switcher must fit; from 768 px the title is shown
 * in full (the role switcher and its read-only badge give way first).
 */

type Screen = {
  /** The title the route gives the top bar. */
  title: string;
  open: (page: Page) => Promise<void>;
};

const byPath =
  (path: string, title: string): Screen['open'] =>
  async (page) => {
    await page.goto(path);
    await expect(heading(page, title)).toBeVisible();
  };

const SCREENS: readonly Screen[] = [
  { title: 'Dashboard', open: byPath(ROUTES.dashboard, 'Dashboard') },
  { title: 'Products', open: byPath(ROUTES.products, 'Products') },
  { title: 'Movements', open: byPath(ROUTES.movements, 'Movements') },
  { title: 'Orders', open: byPath(ROUTES.orders, 'Orders') },
  {
    // The <h1> is the order number; the top bar keeps the route title.
    title: 'Order detail',
    open: async (page) => {
      await openFirstOrder(page, 'CONFIRMED');
    },
  },
  { title: 'Audit log', open: byPath(ROUTES.audit, 'Audit log') },
];

const topBarTitle = (page: Page, title: string) =>
  page.getByRole('banner').getByText(title, { exact: true });

test.describe(
  'top bar fits at 375 and 320 px',
  // @narrow: left out of the desktop project.
  { tag: ['@mobile', '@narrow'] },
  () => {
    for (const screen of SCREENS) {
      for (const role of ROLE_LABELS) {
        test(`${screen.title} as ${role}`, async ({ page }) => {
          await screen.open(page);
          await switchRole(page, role);
          for (const width of [375, 320]) {
            await page.setViewportSize({ width, height: 812 });
            await expect(topBarTitle(page, screen.title)).toBeHidden();
            // The top bar and everything in it that takes up space.
            const layout = await page.getByRole('banner').evaluate((topBar) => {
              const parts = [topBar, ...topBar.querySelectorAll('*')].filter(
                (part) => part.getBoundingClientRect().width > 0,
              );
              return {
                document: document.documentElement.scrollWidth,
                viewport: window.innerWidth,
                left: Math.min(
                  ...parts.map((part) => part.getBoundingClientRect().left),
                ),
                right: Math.max(
                  ...parts.map((part) => part.getBoundingClientRect().right),
                ),
              };
            });
            expect(layout.document, `page scroll at ${width} px`).toBe(
              layout.viewport,
            );
            expect(layout.left, `top bar at ${width} px`).toBeGreaterThanOrEqual(0);
            expect(layout.right, `top bar at ${width} px`).toBeLessThanOrEqual(
              layout.viewport,
            );
          }
        });
      }
    }
  },
);

test.describe('top bar title is not cut from 768 px', () => {
  for (const screen of SCREENS) {
    for (const role of ROLE_LABELS) {
      test(`${screen.title} as ${role}`, async ({ page }) => {
        await screen.open(page);
        await switchRole(page, role);
        for (const width of [768, 1024]) {
          await page.setViewportSize({ width, height: 800 });
          const title = topBarTitle(page, screen.title);
          await expect(title).toBeVisible();
          const size = await title.evaluate((element) => ({
            scroll: element.scrollWidth,
            client: element.clientWidth,
          }));
          expect(size.scroll, `title at ${width} px`).toBeLessThanOrEqual(
            size.client,
          );
        }
      });
    }
  }
});
