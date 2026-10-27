import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  loadedTable,
  productsTable,
  roleSwitcher,
  ROUTES,
  virtualTable,
} from './support/app';

/**
 * Layout stability while a list loads, checked two ways:
 *
 * - Structure: in the first frame with the rows, the table's top edge is where it
 *   was while they loaded (to within 1 px), so the result count above it has its
 *   line from the start. A paged `DataTable` also drew one skeleton row per row it
 *   then shows, so its footer was already pushed down. Both hold at any width,
 *   unlike a position below the fold, which a shift score does not see.
 * - Score: the layout shift score from the first paint until the rows, the filter
 *   options and the demo users are all in, at most 0.1 (the "good" limit for
 *   Cumulative Layout Shift). It is the sum of every shift without recent input,
 *   which is never below Lighthouse's CLS (the largest session window).
 *
 * Both run against the local preview only, not in @smoke: on a real network the
 * order of the responses varies, and a deploy check should not be noisy.
 */
const GOOD_LAYOUT_SHIFT = 0.1;
const POSITION_TOLERANCE_PX = 1;

/**
 * One animation frame of the list's table: whether it is loading, its top edge in
 * document coordinates (`getBoundingClientRect` plus the scroll offset) and how
 * many body rows it has.
 */
type Frame = { busy: boolean; tableTop: number; rows: number };

type Shift = { value: number; sources: string[] };

/** The Layout Instability API entry; TypeScript's DOM types do not have it yet. */
type LayoutShiftEntry = PerformanceEntry & {
  value: number;
  hadRecentInput: boolean;
  sources: { node: Node | null }[];
};

declare global {
  interface Window {
    __layoutShifts: Shift[];
    __frames: Frame[];
  }
}

/** Every layout shift without recent input, from before the page's own scripts run. */
async function recordLayoutShifts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__layoutShifts = [];
    const describe = (node: Node | null) => {
      const element = node instanceof Element ? node : node?.parentElement;
      if (!element) return '(removed)';
      const text = (element.textContent ?? '').trim().slice(0, 40);
      return `<${element.tagName.toLowerCase()}> "${text}"`;
    };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShiftEntry[]) {
        if (entry.hadRecentInput) continue;
        window.__layoutShifts.push({
          value: entry.value,
          sources: entry.sources.map((source) => describe(source.node)),
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

/** The shifts so far, once fonts are in and the last frame has been reported. */
async function layoutShifts(page: Page): Promise<Shift[]> {
  return page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    return window.__layoutShifts;
  });
}

/**
 * Samples the list's table once per animation frame from before the page's own
 * scripts run, so the last frame with skeleton rows and the first with data rows
 * are both seen.
 */
async function recordListFrames(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__frames = [];
    const sample = () => {
      const table = document.querySelector('main table');
      if (table instanceof HTMLTableElement) {
        window.__frames.push({
          busy: table.getAttribute('aria-busy') === 'true',
          tableTop: table.getBoundingClientRect().top + scrollY,
          rows: table.tBodies[0]?.rows.length ?? 0,
        });
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

/** The last frame while the rows loaded and the first frame with them. */
async function loadTransition(
  page: Page,
): Promise<{ loading: Frame; loaded: Frame }> {
  const frames = await page.evaluate(() => window.__frames);
  const index = frames.findIndex(
    (frame, i) => i > 0 && !frame.busy && frames[i - 1]?.busy === true,
  );
  const loading = frames[index - 1];
  const loaded = frames[index];
  if (index === -1 || loading === undefined || loaded === undefined) {
    throw new Error('No frame with the rows still loading was sampled.');
  }
  return { loading, loaded };
}

const enabled = (control: Locator) => expect(control).toBeEnabled();

/**
 * `pagedRows`: a `DataTable` page, whose skeleton has one row per row of the page.
 * The virtualized lists have no such count, and their only lower edge is the
 * scroll region's bottom: it grows to its maximum height when the rows arrive,
 * but nothing sits below it, so nothing moves and CLS does not count it.
 */
const LISTS = [
  {
    name: 'Products',
    path: ROUTES.products,
    pagedRows: true,
    loaded: async (page: Page) => {
      await productsTable(page);
      await enabled(page.getByRole('combobox', { name: 'Category' }));
    },
  },
  {
    name: 'Orders',
    path: ROUTES.orders,
    pagedRows: true,
    loaded: async (page: Page) => {
      const table = await loadedTable(page, 'Orders');
      await expect(table.getByRole('link').first()).toBeVisible();
    },
  },
  {
    name: 'Movements',
    path: ROUTES.movements,
    pagedRows: false,
    loaded: async (page: Page) => {
      await virtualTable(page, 'Stock movements');
      await enabled(page.getByRole('combobox', { name: 'Location' }));
      await enabled(page.getByRole('combobox', { name: 'Created by' }));
    },
  },
  {
    name: 'Audit log',
    path: ROUTES.audit,
    pagedRows: false,
    loaded: async (page: Page) => {
      await virtualTable(page, 'Audit events');
      await enabled(page.getByRole('combobox', { name: 'Actor' }));
    },
  },
] as const;

test.describe('layout shift while loading', { tag: '@mobile' }, () => {
  for (const list of LISTS) {
    test(`${list.name}: the table keeps its place when the rows arrive`, async ({
      page,
    }) => {
      await recordListFrames(page);
      await page.goto(list.path);
      await list.loaded(page);

      const { loading, loaded } = await loadTransition(page);
      expect(
        Math.abs(loaded.tableTop - loading.tableTop),
        `table top: ${loading.tableTop} while loading, ${loaded.tableTop} with the rows`,
      ).toBeLessThanOrEqual(POSITION_TOLERANCE_PX);
      if (list.pagedRows) {
        expect(loaded.rows, 'rows on the first page').toBeGreaterThan(0);
        expect(loading.rows, 'skeleton rows while loading').toBe(loaded.rows);
      }
    });

    test(`${list.name} stays under ${GOOD_LAYOUT_SHIFT}`, async ({ page }) => {
      await recordLayoutShifts(page);
      await page.goto(list.path);
      await list.loaded(page);
      await expect(roleSwitcher(page)).toBeVisible();

      const shifts = await layoutShifts(page);
      const score = shifts.reduce((sum, shift) => sum + shift.value, 0);
      expect(
        score,
        `Layout shifts on ${list.path}:\n${shifts
          .map(
            (shift) => `${shift.value.toFixed(4)} ${shift.sources.join(', ')}`,
          )
          .join('\n')}`,
      ).toBeLessThanOrEqual(GOOD_LAYOUT_SHIFT);
    });
  }
});
