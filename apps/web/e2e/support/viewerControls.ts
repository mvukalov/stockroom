import type { Locator, Page } from '@playwright/test';

import {
  bodyRows,
  openAs,
  openFirstOrder,
  productResults,
  productsTable,
  roleSwitcher,
  ROUTES,
  selectFirstProduct,
  switchRole,
  virtualTable,
} from './app';

/** A mutating control as a VIEWER meets it: on screen, disabled, with its reason. */
export type ViewerControl = {
  name: string;
  /** Opens the screen as a VIEWER and brings the control on screen. */
  open: (page: Page) => Promise<{
    control: Locator;
    /** The stop before the control in tab order, to reach it with a real Tab. */
    before: Locator;
  }>;
};

/** One control per mutation a VIEWER cannot start, plus the row menu's copy of Archive. */
export const VIEWER_CONTROLS: readonly ViewerControl[] = [
  {
    name: 'Archive in the Products bulk bar',
    open: async (page) => {
      await openAs(page, 'Viewer', ROUTES.products);
      await selectFirstProduct(page);
      const results = productResults(page);
      return {
        control: results.getByRole('button', { name: 'Archive' }),
        before: results.getByRole('button', { name: 'Create adjustment' }),
      };
    },
  },
  {
    // The last row: a reason clipped by the table scroll region would be cut off here.
    name: 'Archive in the row menu of the last row',
    open: async (page) => {
      await openAs(page, 'Viewer', ROUTES.products);
      const row = bodyRows(await productsTable(page)).last();
      await row.getByRole('button', { name: /^Actions for / }).click();
      return {
        control: row.getByRole('button', { name: 'Archive' }),
        before: row.getByRole('button', { name: 'Create adjustment' }),
      };
    },
  },
  {
    name: 'New movement on Movements',
    open: async (page) => {
      await openAs(page, 'Viewer', ROUTES.movements);
      await virtualTable(page, 'Stock movements');
      return {
        control: page.getByRole('button', { name: 'New movement' }),
        before: roleSwitcher(page),
      };
    },
  },
  {
    // Confirmed: the state machine allows a cancel, so only the role decides.
    name: 'Cancel order on a confirmed order',
    open: async (page) => {
      await openFirstOrder(page, 'CONFIRMED');
      await switchRole(page, 'Viewer');
      return {
        control: page.getByRole('button', { name: 'Cancel order' }),
        before: page.getByRole('link', { name: 'Back to orders' }),
      };
    },
  },
];
