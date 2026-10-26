import { expect, test, type Page } from '@playwright/test';

import { heading, loadedTable, ROUTES } from './support/app';

/**
 * What the host has to get right: every route by direct URL and on reload (the SPA
 * fallback), the mock service worker in control, and the cache headers. Locally
 * `vite preview` stands in for the host; `E2E_BASE_URL` points it at a deployed site
 * (docs/deploy.md).
 */

const DEPLOYED = process.env.E2E_BASE_URL !== undefined;

/** Deep links with a filter in the query string, and the filter control that shows it. */
const DEEP_LINKS = [
  {
    path: `${ROUTES.products}?search=phone`,
    title: 'Products',
    control: { role: 'searchbox', name: 'Search products' },
    value: 'phone',
  },
  {
    path: `${ROUTES.movements}?type=RECEIPT`,
    title: 'Movements',
    control: { role: 'combobox', name: 'Type' },
    value: 'RECEIPT',
  },
  {
    path: `${ROUTES.orders}?status=CONFIRMED`,
    title: 'Orders',
    control: { role: 'combobox', name: 'Status' },
    value: 'CONFIRMED',
  },
  {
    path: `${ROUTES.audit}?type=ORDER_STATUS_CHANGED`,
    title: 'Audit log',
    control: { role: 'combobox', name: 'Event' },
    value: 'ORDER_STATUS_CHANGED',
  },
] as const;

test.describe('deployed site', { tag: '@smoke' }, () => {
  test('/ opens the dashboard, also on reload', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(heading(page, 'Dashboard')).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.reload();
    await expect(heading(page, 'Dashboard')).toBeVisible();
  });

  for (const link of DEEP_LINKS) {
    test(`${link.path} opens directly and on reload with its filter`, async ({
      page,
    }) => {
      const response = await page.goto(link.path);
      expect(response?.status()).toBe(200);
      await expect(heading(page, link.title)).toBeVisible();
      const control = page.getByRole(link.control.role, {
        name: link.control.name,
        exact: true,
      });
      await expect(control).toHaveValue(link.value);

      await page.reload();
      await expect(heading(page, link.title)).toBeVisible();
      await expect(control).toHaveValue(link.value);
    });
  }

  test('an order detail opens directly and on reload', async ({ page }) => {
    await page.goto(ROUTES.orders);
    const link = (await loadedTable(page, 'Orders')).getByRole('link').first();
    const number = await link.innerText();
    const path = await link.getAttribute('href');
    if (path === null) throw new Error('The order link has no href');

    // A new page load, as when the link is shared, then a reload.
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(heading(page, number)).toBeVisible();
    await page.reload();
    await expect(heading(page, number)).toBeVisible();
  });

  test('a mock scenario works on a deep link', async ({ page }) => {
    await page.goto(`${ROUTES.orders}?mock=empty`);
    await expect(page.getByText('No orders yet')).toBeVisible();
  });

  test('the mock service worker controls the page', async ({ page }) => {
    await page.goto(ROUTES.dashboard);
    await expect(heading(page, 'Dashboard')).toBeVisible();
    const scriptURL = await page.evaluate(
      () => navigator.serviceWorker.controller?.scriptURL ?? null,
    );
    expect(scriptURL).toBe(new URL('/mockServiceWorker.js', page.url()).href);
  });

  test('/robots.txt is served as text, not as the app', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    expect(robots.headers()['content-type']).toContain('text/plain');
    expect(await robots.text()).toContain('User-agent: *');
  });

  test('cache headers: hashed assets for a year, the rest revalidated', async ({
    request,
  }) => {
    // `vite preview` sends no such headers; only the host config does.
    test.skip(!DEPLOYED, 'Only against a deployed site (E2E_BASE_URL)');

    const html = await request.get('/');
    expect(html.headers()['cache-control']).toContain('max-age=0');
    const deepLink = await request.get(`${ROUTES.orders}/any`);
    expect(deepLink.headers()['cache-control']).toContain('max-age=0');
    const worker = await request.get('/mockServiceWorker.js');
    expect(worker.headers()['cache-control']).toContain('max-age=0');

    const script = /src="(\/assets\/[^"]+\.js)"/.exec(await html.text())?.[1];
    if (script === undefined) throw new Error('No script in index.html');
    const asset = await request.get(script);
    expect(asset.headers()['cache-control']).toContain('immutable');

    // A chunk from an older deploy is a 404, not index.html served as script.
    const missing = await request.get('/assets/missing-chunk.js');
    expect(missing.status()).toBe(404);
  });
});

/** The startup error, the same for either cause. */
async function expectStartupError(page: Page): Promise<void> {
  await expect(heading(page, 'The demo could not start')).toBeVisible();
  await expect(
    page.getByText(
      'It needs a service worker and a working connection. Check that service workers are allowed, then reload.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reload' })).toBeVisible();
}

test.describe('when the mock cannot start', () => {
  test.describe('with service workers blocked', () => {
    test.use({ serviceWorkers: 'block' });

    test('the demo says why instead of a blank page', async ({ page }) => {
      await page.goto(ROUTES.dashboard);
      await expectStartupError(page);
    });
  });

  test('when the mock code fails to load, the demo says why', async ({
    page,
  }) => {
    // The mock is its own chunk (`import('./mocks/browser')` in main.tsx); a dropped
    // connection makes that import fail.
    await page.route(/\/assets\/browser-[^/]+\.js$/, (route) => route.abort());
    await page.goto(ROUTES.dashboard);
    await expectStartupError(page);
  });
});
