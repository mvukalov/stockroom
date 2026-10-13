import { expect, test, type Page } from '@playwright/test';

import {
  bodyRows,
  heading,
  loadedTable,
  openFirstOrder,
  productsTable,
  ROLE_LABELS,
  ROUTES,
  switchRole,
  virtualTable,
  type RoleLabel,
} from './support/app';
import { expectNoAxeViolations } from './support/axe';

/**
 * axe in a real browser on every route, at both viewports (the `mobile` project
 * runs this file too). Screens with permission-guarded controls are scanned once
 * per role, with those controls on screen; the others as ADMIN.
 */

type Screen = {
  name: string;
  /** Has controls a permission guards, so every role is scanned. */
  guarded: boolean;
  /** Opens the screen as `role` and waits until its content is there. */
  open: (page: Page, role: RoleLabel) => Promise<void>;
};

const SCREENS: readonly Screen[] = [
  {
    name: 'Dashboard',
    guarded: false,
    open: async (page, role) => {
      await page.goto(ROUTES.dashboard);
      await switchRole(page, role);
      await expect(heading(page, 'Dashboard')).toBeVisible();
      await expect(page.getByText('Loading dashboard')).toHaveCount(0);
    },
  },
  {
    name: 'Products',
    guarded: true,
    open: async (page, role) => {
      await page.goto(ROUTES.products);
      await switchRole(page, role);
      // The bulk bar and the row menu hold the guarded controls.
      const row = bodyRows(await productsTable(page)).first();
      await row.getByRole('checkbox').check();
      await row.getByRole('button', { name: /^Actions for / }).click();
      await expect(row.getByRole('button', { name: 'Archive' })).toBeVisible();
    },
  },
  {
    name: 'Movements',
    guarded: true,
    open: async (page, role) => {
      await page.goto(ROUTES.movements);
      await switchRole(page, role);
      await virtualTable(page, 'Stock movements');
    },
  },
  {
    name: 'Orders',
    guarded: false,
    open: async (page, role) => {
      await page.goto(ROUTES.orders);
      await switchRole(page, role);
      const table = await loadedTable(page, 'Orders');
      await expect(table.getByRole('link').first()).toBeVisible();
    },
  },
  {
    name: 'Order detail',
    guarded: true,
    open: async (page, role) => {
      // Confirmed: the state machine allows a cancel, so only the role decides.
      await openFirstOrder(page, 'CONFIRMED');
      await switchRole(page, role);
      await expect(
        page.getByRole('table', { name: 'Order lines' }),
      ).toBeVisible();
    },
  },
  {
    name: 'Audit log',
    guarded: false,
    open: async (page, role) => {
      await page.goto(ROUTES.audit);
      await switchRole(page, role);
      await virtualTable(page, 'Audit events');
    },
  },
];

/** The list screens and what their `?mock=empty` state says. */
const LISTS = [
  {
    name: 'Products',
    path: ROUTES.products,
    table: 'Products',
    empty: 'No products yet',
  },
  {
    name: 'Movements',
    path: ROUTES.movements,
    table: 'Stock movements',
    empty: 'No movements yet',
  },
  {
    name: 'Orders',
    path: ROUTES.orders,
    table: 'Orders',
    empty: 'No orders yet',
  },
  {
    name: 'Audit log',
    path: ROUTES.audit,
    table: 'Audit events',
    empty: 'No audit events yet',
  },
] as const;

test.describe('axe', { tag: '@mobile' }, () => {
  for (const screen of SCREENS) {
    for (const role of screen.guarded ? ROLE_LABELS : (['Admin'] as const)) {
      test(`${screen.name} as ${role}`, async ({ page }) => {
        await screen.open(page, role);
        await expectNoAxeViolations(page);
      });
    }
  }

  for (const list of LISTS) {
    test(`${list.name} while loading`, async ({ page }) => {
      await page.goto(`${list.path}?mock=slow`);
      await expect(
        page.getByRole('table', { name: list.table }),
      ).toHaveAttribute('aria-busy', 'true');
      await expectNoAxeViolations(page);
    });

    test(`${list.name} when empty`, async ({ page }) => {
      await page.goto(`${list.path}?mock=empty`);
      await expect(page.getByText(list.empty)).toBeVisible();
      await expectNoAxeViolations(page);
    });

    test(`${list.name} after a failed load`, async ({ page }) => {
      await page.goto(`${list.path}?mock=error`);
      await expect(
        page.getByRole('main').getByRole('button', { name: 'Retry' }).first(),
      ).toBeVisible();
      await expectNoAxeViolations(page);
    });
  }
});

test.describe(
  'no horizontal page scroll at 375 px',
  // @narrow: left out of the desktop project.
  { tag: ['@mobile', '@narrow'] },
  () => {
    for (const screen of SCREENS) {
      test(screen.name, async ({ page }) => {
        await screen.open(page, 'Admin');
        const widths = await page.evaluate(() => ({
          document: document.documentElement.scrollWidth,
          viewport: window.innerWidth,
        }));
        expect(widths.document).toBe(widths.viewport);
      });
    }
  },
);
