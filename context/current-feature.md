# Current Feature: Products list

## Status

In Progress

## Goals

### Contract and mock

- [ ] `GET /api/products/filters` returns `{ categories: Category[], brands: string[] }` (brands unique, sorted case-insensitively, from all products including archived): new schema in `packages/contract`, `listProductFilters` in `ENDPOINTS`, schema test, MSW handler (needs `view`, honours mock scenarios), contract test in `mocks/contract.test.ts` style
- [ ] No change to `ProductsQuery` or `GET /api/products`; anything missing is reported in the plan, not worked around in the UI

### Data hooks

- [ ] `useProducts(query, userId)` in `src/api/products.ts`: keyed by parsed `ProductsQuery`, `apiRequest` + `orThrow`, exported `PRODUCTS_QUERY_KEY = ['products']` prefix, no user id in the key, `placeholderData: keepPreviousData`
- [ ] `useProductFilters(userId)` with its own key `['product-filters']` (not under `PRODUCTS_QUERY_KEY`), no polling

### Screen

- [ ] `/products` replaces the placeholder: connected page (`useTableSearchParams(ProductsQuery, { filterKeys })`, hooks, state selection) plus presentational view (props only)
- [ ] `filterKeys`: `search`, `categoryId`, `brand`, `stockStatus`, `archived`; default sort `title` and page size 25 from the contract
- [ ] Header: shell `PageHeader` with title, prototype description under it, "<total> products" (`en-GB`, hidden before first data)
- [ ] Columns: SKU (mono), Title, Category, Brand, Price (end, tabular), On hand (end, tabular), Status; sort keys match `ProductsQuery`; SKU and Title not hideable; no image column
- [ ] Status via `StockStatusBadge`; archived rows show an "Archived" `Badge` next to the title, full-contrast text
- [ ] `formatCents(cents)` with `Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' })`, pure, unit tested (zero, small values, thousands separator, rounding)
- [ ] Toolbar filters: search (SKU or title), Category, Brand, Stock status (In stock, Low, Out) selects, "Show archived" checkbox; every control labelled; options from `useProductFilters`; stock status labels from one shared constant
- [ ] Search: local text, 300 ms debounce, `setFilter('search', value, { replace: true })`; debounce in the page or a tested `useDebouncedValue`; Back restores the previous committed value into the input
- [ ] Chips and "Clear filters" from the parsed query (category chip shows the name); if filter options are loading or failed, the three selects are disabled with a visible reason and Retry, chips fall back to raw values, the list still works
- [ ] States: loading (skeleton rows, count hidden), refetching (progress bar), error (`ErrorBanner` "We couldn't load products. Check your connection and try again." + Retry; banner above stale rows on failed refetch), empty catalogue ("No products yet"), empty with filters ("No products match these filters" + Clear filters), page out of range (table's own state)
- [ ] `handle.title` is "Products"; focus handling follows the shell
- [ ] Same content for all three roles, no mutating controls; at 375 px the toolbar wraps, the table scrolls in its `ScrollRegion`, no horizontal page scroll
- [ ] Dashboard "View all products" link: keep as is unless the low-stock list is exactly `stockStatus=LOW`; state which in the plan

### Tests and stories

- [ ] View stories: data, loading, refetching, error, empty catalogue, empty with filters, out-of-range, filter options failed, archived rows, wide data; typed fixtures, no MSW; a11y addon clean
- [ ] RTL tests over MSW node: URL to request params per filter, sort, page size; filter/sort/page-size change resets page to 1; invalid URL values fall back to defaults; search debounce (fake timers) commits once with replace; chips and Clear filters keep `?mock=` and sort; `?mock=empty`, `?mock=error` then Retry after switching to `normal`, `?mock=slow` skeleton; archived badge only when requested; VIEWER sees the same content. Unit tests for `formatCents`, hook tests for both hooks
- [ ] `pnpm lint`, `typecheck`, `test`, `build`, `build-storybook` green; every story checked with axe at 375 and 1280 px

## Notes

- Spec: `context/features/003_01-products-list-spec.md`. Next part: `003_02-products-bulk-actions-spec.md`.
- ADRs: ADR-0003 (derived availability), ADR-0005 (own `DataTable`). No contradiction. ADR-0003's Context says "the product list shows availability"; the spec (decision 2) shows On hand only and defers availability on the list to a later decision. That is a scope choice, not a conflict with the ADR decision.
- Decisions: read-only list, `DataTable` without `selectedIds`; On hand is the only stock number; no thumbnails (no runtime DummyJSON requests); no "New product" or "Create adjustment"; archived hidden by default, "Show archived" adds them, no unarchive; filters endpoint separate from the list; no new libraries (debounce with `setTimeout`).
- Does not include: selection, bulk actions, row actions, dialogs, CSV export (003_02); product create/edit/detail, unarchive; virtualization, density toggle, persisted column visibility, select-all across pages; supplier, price range or quantity filters.
- The placeholder lives in `apps/web/src/pages/ProductsPage.tsx` (no placeholder test exists). Expected new home: `src/pages/products/`, following `pages/dashboard/`; confirm in the plan.
- Stock status labels currently live inside the `switch` in `StockStatusBadge.tsx`; the "one shared constant" goal means extracting them so the badge and the Select use the same source.
- The `filters` route must be registered so it does not collide with a future `/api/products/:id`. The mock handler reads `db.products` and `db.categories` directly.
- Manual checks: `?mock=slow`, `?mock=empty`, `?mock=error`, `?page=999`.
- The provisional `005_02-products-spec.md` mentioned in the spec is already gone from `context/features/`.

## History

<!-- Completed features, oldest first. Append only. -->

- **Contract** - Zod API contract in `packages/contract`: entities, movement/audit/error unions, read models, URL query schemas with fallbacks and the typed `ENDPOINTS` map (PR #12)
- **Domain core** - Pure rules in `packages/domain`: stock projection and derived availability, movement validation, issue allocation, order totals and state machine with deterministic shipping movements, permission matrix; table-driven and seeded invariant tests (PR #14)
- **Seed** - Deterministic phase 1 data in `packages/seed`: DummyJSON catalog snapshot plus a seeded chronological simulation of movements and orders through the domain rules, derived audit log; consistency tests for determinism, non-negative stock, status paths, DRAFT-only edits and role-at-time permissions (PR #15)
- **MSW handlers** - Mock API in `apps/web/src/mocks` over the contract: in-memory store from the seed, `X-User-Id` identity checked with `can`, idempotent movements, order transitions and audit entries through domain rules (new `stockStatus`, `isOpenOrder`, `diffOrderLines`, audit builders), deterministic latency, `normal`/`slow`/`empty`/`error` scenarios, dropped from `VITE_API_MODE=real` builds; contract tests with `msw/node` (PR #16)
- **Design tokens and atoms** - Visual foundation in `apps/web`: CSS custom property tokens with a reduced-motion override, self-hosted Inter and JetBrains Mono (latin + latin-ext), base styles with a global focus ring, ten accessible atoms (`Button` with `disabledReason`, `IconButton`, `Input`, `Select`, `Checkbox` with callback-ref `indeterminate`, `Badge`, `Skeleton`, `Avatar`, `VisuallyHidden`, `Icon`) and three domain badges over contract enums; contrast test reads `tokens.css`, control border darkened to `#7A8494` for 3:1 on every background (PR #19)
- **Storybook** - Storybook 10.6.1 in `apps/web` with the a11y and docs addons (exact-pinned, telemetry off): stories for every atom and the three domain badges (enum values from the contract), a Foundations/Tokens docs page with swatches, contrast table, type scale, spacing and radii read from `tokens.css`; contrast and token parsing extracted to `src/styles/contrast.ts` and shared with `tokens.test.ts` (`colourTokens` now throws on non-hex colours); manual axe pass over all 48 entries, 0 violations (PR #20)
- **App shell** - React Router v8 data mode (ADR-0001 amended) with route constants, a lazy router singleton and `handle.title` as the one title source for top bar, `<h1>` and `document.title`; shell with skip link, collapsible persisted sidebar, native `<dialog>` drawer below 768 px and focus on the new `<h1>` after navigation; demo role switcher over `GET /api/users` with ADMIN/first-user fallback; typed `apiRequest` over contract `ENDPOINTS` with explicit `X-User-Id`, `Result` for contract errors and `UnexpectedApiError` otherwise; placeholder, not-found and route error pages; stories and RTL tests (PR #21)
- **Dashboard** - First data screen and the connected page / presentational view pattern: `useDashboard` with exported `DASHBOARD_QUERY_KEY`, four KPI cards as `dl`/`dt`/`dd` with caption rules as pure functions (true minus, `en-GB` counts), low-stock table capped at 10 rows with "Showing 10 of N", generic `KpiCard`, `ErrorBanner` and `EmptyState`; skeleton only without data, banner above stale data on a failed refetch, error with users Retry when no current user; container-query KPI grid and a focusable scroll container for the table; stories, RTL tests over MSW, axe 0 violations at 1280 and 375 px (PR #22)
- **DataTable** - Generic server-driven `DataTable<T, S>` in `apps/web` (own engine, ADR-0005): `ColumnDef` with sort keys typed against contract sort fields and accessors against the row (type tests), compound `Table.Toolbar`/`BulkBar`/`Pagination`/`Empty`, `aria-sort` with a polite "Sorted by" announcement, pagination with focusable disabled reasons, page-scoped `useRowSelection` without effects, Columns disclosure, filter chips, loading/refetching (progress bar, full contrast)/empty/filtered/out-of-range/error states; `useTableSearchParams(schema, { filterKeys })` over contract list queries; shared `ScrollRegion` (Dashboard refactored onto it); axe 0 violations at 375 and 1280 px (PR #24)
