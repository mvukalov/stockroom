# Feature: Products list

Feature 003, part 1. The Products screen as a read-only list: the first real user of `DataTable<T, S>`. It adds the filters endpoint, the products query hook, columns, filters with URL-synced state and every list state (loading, error, empty, empty with filters, out-of-range page). There are no mutations here: selection, the bulk bar, row actions and CSV export arrive in `003_02-products-bulk-actions-spec.md`.

Depends on: `002_05-data-table-spec.md` (`DataTable`, `useTableSearchParams`, `ScrollRegion`), `002_04-dashboard-spec.md` (`ErrorBanner`, `EmptyState`, query-hook pattern), `002_03-app-shell-spec.md` (router, `apiRequest`, current user), `001_01-contract-spec.md` and `001_04-msw-handlers-spec.md` merged.

Read first: `context/coding-standards.md` (React, Routing, Accessibility, Testing), `context/design-direction.md` (sections 5, 7, 9), `docs/adr/0003-stock-reservation.md`, `docs/adr/0005-table-engine.md`, `packages/contract/src/queries.ts`, `catalog.ts` and `endpoints.ts`, `apps/web/src/mocks/handlers/catalog.ts`, `apps/web/src/api/dashboard.ts` (hook pattern). Visual reference only: `context/design/02-products-*.png`. The differences listed under "Decisions" win over the screenshots.

## Goals

### Contract and mock

- [ ] `GET /api/products/filters` returns `{ categories: Category[], brands: string[] }` (brands unique, sorted case-insensitively, taken from all products including archived). New schema in `packages/contract`, new entry `listProductFilters` in `ENDPOINTS`, schema test, MSW handler (needs `view`, honours the mock scenarios like the other handlers) and a contract test in `apps/web/src/mocks/contract.test.ts` style.
- [ ] No change to `ProductsQuery` or `GET /api/products`. If something the screen needs is missing, report it in the plan instead of working around it in the UI.

### Data hooks

- [ ] `useProducts(query, userId)` in `src/api/products.ts`, keyed by the parsed `ProductsQuery`, using `apiRequest` and `orThrow`. `PRODUCTS_QUERY_KEY = ['products']` is exported as the prefix, so later mutations can invalidate every list. The list is the same for every role, so the key has no user id (same reasoning as the dashboard). The previous page is kept while the next one loads (`placeholderData: keepPreviousData`), so paging and sorting never flash a skeleton.
- [ ] `useProductFilters(userId)` with its own key (`['product-filters']`, not under `PRODUCTS_QUERY_KEY`, so a list invalidation does not refetch it). Filter options change rarely: no polling.

### Screen

- [ ] `/products` replaces the placeholder. Connected page (reads URL state through `useTableSearchParams(ProductsQuery, { filterKeys })`, calls the hooks, picks the state) and a presentational view (props only). Stories and most tests target the view, as on the Dashboard.
- [ ] `filterKeys` are `search`, `categoryId`, `brand`, `stockStatus` and `archived`. Default sort and page size come from the contract (`title`, 25).
- [ ] Header: the shell's `PageHeader` with the title, and a line "<total> products" (from `data.total`, `en-GB` number format; not shown before the first data arrives). The short description from the prototype goes under the title.
- [ ] Columns: SKU (mono), Title, Category, Brand, Price (end-aligned, tabular), On hand (end-aligned, tabular), Status. Sort keys match `ProductsQuery`. SKU and Title are not hideable; the rest are. No image and no thumbnail column.
- [ ] Status column uses the existing `StockStatusBadge` (icon and text, never colour alone). Archived rows (visible only with "Show archived") also show an "Archived" `Badge` next to the title, and the row text stays at full contrast (the badge carries the meaning, no greying out).
- [ ] `formatCents(cents)` helper: `Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' })` over `cents / 100`. Pure, unit tested (zero, small values, thousands separator, rounding).
- [ ] Filters in `Table.Toolbar`: a search input (SKU or title), Category `Select`, Brand `Select`, Stock status `Select` (In stock, Low, Out) and a "Show archived" checkbox. Every control has a visible label or an accessible name. Select options come from `useProductFilters` and the stock status labels come from one shared constant, not typed twice.
- [ ] Search: the input keeps its own local text and commits to the URL after a 300 ms debounce with `setFilter('search', value, { replace: true })`, so typing does not fill the history. The table never debounces (spec 002_05, decision 6); the debounce lives in the page or a small `useDebouncedValue` hook with its own test. Browser Back after a search restores the previous committed value into the input.
- [ ] Active filter chips and "Clear filters" are built from the parsed query: the category chip shows the category name, not the id. If the filter options have not loaded or failed, the three selects are disabled with a short visible reason and a Retry, the chips fall back to the raw value, and the list itself still works.
- [ ] States on the real screen: **loading** (no data yet: skeleton rows through `DataTable`, header count hidden), **refetching** (progress bar, rows stay), **error** (`ErrorBanner` with "We couldn't load products. Check your connection and try again." and Retry; a failed refetch with data on screen shows the banner above the stale rows), **empty catalogue** (no filters active: "No products yet"), **empty with filters** ("No products match these filters" and Clear filters) and **page out of range** (the table's own "This page is empty" state). All come from `DataTable` and the shared `ErrorBanner` and `EmptyState`.
- [ ] Page title and focus handling follow the shell: `handle.title` is "Products".
- [ ] Works for all three roles with no mutating controls. Correct at 375 px: the toolbar wraps, the table scrolls inside its own `ScrollRegion`, the page does not scroll sideways.
- [ ] The Dashboard "View all products" link stays as it is, unless the plan shows that the Dashboard low-stock list is exactly the products with `stockStatus=LOW`. The low-stock list may include `OUT` products; one `stockStatus` value cannot express "LOW or OUT", so do not change the link in that case. Say which it is in the plan.

### Tests and stories

- [ ] Stories for the presentational view: data, loading, refetching, error, empty catalogue, empty with filters, out-of-range page, filter options failed, archived rows visible, wide data. Typed fixtures, no MSW. The a11y addon reports no violations.
- [ ] Tests (React Testing Library, roles and labels, MSW node server): URL to request params for each filter, sort and page size; changing a filter, the sort or the page size resets the page to 1; a hand-edited URL with invalid values falls back to defaults and still renders; search debounce (fake timers) commits once and replaces the history entry; chips and "Clear filters" keep `?mock=` and sort; `?mock=empty`, `?mock=error` then Retry succeeds after switching to `normal`, `?mock=slow` shows skeleton rows; archived rows show the badge only when requested; a VIEWER sees the same content. Unit tests for `formatCents`; hook tests for the two hooks.
- [ ] `pnpm build`, `lint`, `typecheck`, `test` and `build-storybook` stay green. Check each story at 375 and 1280 px with axe.

## Decisions

1. **The list is read-only.** Selection, the bulk bar, row actions, dialogs and CSV export are the next spec. The `DataTable` is used here without `selectedIds`, so the checkbox column does not appear yet.
2. **On hand is the only stock number shown.** `available` and `reserved` are in the response but the prototype shows one number, and ADR-0003 keeps availability a read model. Showing availability on the list is a later decision.
3. **No thumbnails.** The contract carries `thumbnailUrl`, but the screen does not load it, so the app never requests images from DummyJSON at runtime.
4. **"New product" and "Create adjustment" are out.** The prototype shows the first without a form or endpoint; the second needs the movement drawer feature, which adds it to the bulk bar and row menu.
5. **Archived products are hidden by default.** "Show archived" adds them to the active ones (current handler behaviour). There is no unarchive.
6. **The filters endpoint is separate from the list.** It is small, cacheable and not tied to the current page or filters.
7. **No new libraries.** Debounce is a few lines with `setTimeout`.

## Does not include

- Selection, bulk actions, row actions menu, dialogs, CSV export (`003_02`).
- Product create and edit forms, product detail page, unarchive.
- Virtualization, density toggle, persisted column visibility, select-all across pages.
- Filtering by supplier, price range or stock quantity.

## Notes

- Confirm in the plan which file holds the products page view (`src/pages/products/` is expected, following `pages/dashboard/`), and that the old placeholder test, if any, is replaced.
- Contract additions live in `packages/contract` with tests. The `filters` route must be registered so it does not collide with a future `/api/products/:id`.
- The mock handler reads from `db.products` and `db.categories`; do not copy data into new structures.
- Use the mock scenarios to check the states by hand: `?mock=slow`, `?mock=empty`, `?mock=error`, and `?page=999` for the out-of-range state.
- This spec replaces the provisional `005_02-products-spec.md`; delete that file in the same docs PR.
