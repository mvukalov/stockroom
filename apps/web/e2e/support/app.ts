import { expect, type Locator, type Page } from '@playwright/test';

/** What the suite needs to know about the app: its routes, roles and how to wait for a screen. */

export const ROUTES = {
  dashboard: '/dashboard',
  products: '/products',
  movements: '/movements',
  orders: '/orders',
  audit: '/audit',
} as const;

/** Roles as the role switcher words them. */
export type RoleLabel = 'Admin' | 'Clerk' | 'Viewer';
export const ROLE_LABELS: readonly RoleLabel[] = ['Admin', 'Clerk', 'Viewer'];

/** The reason every mutating control gives a VIEWER. */
export const READ_ONLY = 'Your role is read-only';

export const roleSwitcher = (page: Page) =>
  page.getByRole('combobox', { name: 'Demo user' });

/**
 * Picks the first demo user with `role` in the role switcher, as a person would.
 * Every test starts in a new browser context, so the app starts as the default
 * ADMIN with a fresh mock store.
 */
export async function switchRole(page: Page, role: RoleLabel): Promise<void> {
  const switcher = roleSwitcher(page);
  const option = switcher
    .getByRole('option', { name: new RegExp(` · ${role}$`) })
    .first();
  const id = await option.getAttribute('value');
  if (id === null) throw new Error(`No demo user with the role ${role}`);
  await switcher.selectOption(id);
  await expect(switcher).toHaveValue(id);
}

/** Opens `path` and acts as `role` from then on. */
export async function openAs(
  page: Page,
  role: RoleLabel,
  path: string,
): Promise<void> {
  await page.goto(path);
  await switchRole(page, role);
}

export const heading = (page: Page, name: string | RegExp) =>
  page.getByRole('heading', { level: 1, name });

export const notifications = (page: Page) =>
  page.getByRole('status', { name: 'Notifications' });

/** The table called `name`, once it shows data rather than its loading state. */
export async function loadedTable(page: Page, name: string): Promise<Locator> {
  const table = page.getByRole('table', { name });
  await expect(table).not.toHaveAttribute('aria-busy');
  return table;
}

/** Data rows of `table`, without the header row. */
export const bodyRows = (table: Locator) =>
  table.getByRole('rowgroup').nth(1).getByRole('row');

/** The Products table with its first page loaded. */
export async function productsTable(page: Page): Promise<Locator> {
  const table = await loadedTable(page, 'Products');
  await expect(
    bodyRows(table)
      .first()
      .getByRole('button', { name: /^Actions for / }),
  ).toBeVisible();
  return table;
}

/** The Products list region: toolbar, bulk bar, table and pagination. */
export const productResults = (page: Page) =>
  page.getByRole('region', { name: 'Product results' });

/** Selects the first product, which brings up the bulk bar, and returns its row. */
export async function selectFirstProduct(page: Page): Promise<Locator> {
  const row = bodyRows(await productsTable(page)).first();
  await row.getByRole('checkbox').check();
  return row;
}

/** A virtualized list (Movements, Audit log) with its first page loaded. */
export async function virtualTable(page: Page, name: string): Promise<Locator> {
  const table = await loadedTable(page, name);
  await expect(
    table.getByRole('button', { name: /^Copy ID / }).first(),
  ).toBeVisible();
  return table;
}

/**
 * Opens the first order with `status` from the Orders list and returns its number.
 * The list is the way in, so no order id is written into the suite.
 */
export async function openFirstOrder(
  page: Page,
  status: 'DRAFT' | 'CONFIRMED' | 'PICKED' | 'SHIPPED' | 'CANCELLED',
): Promise<string> {
  await page.goto(`${ROUTES.orders}?status=${status}`);
  const table = await loadedTable(page, 'Orders');
  const link = table.getByRole('link').first();
  const number = await link.innerText();
  await link.click();
  await expect(heading(page, number)).toBeVisible();
  return number;
}
