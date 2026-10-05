# Current Feature: DataTable

## Status

In Progress

## Goals

- [x] Typed column definitions: `ColumnDef<T>` with `id`, `header`, `cell` (render prop receiving the row; default reads a typed accessor), `sortKey` (optional), `align` (`start | end`), `mono`, `hideable`. Sort keys and accessors checked against the row type, no casts at call sites; `expectTypeOf` test proves a wrong key does not compile. Public API exposes no engine type (ADR-0005).
- [x] Required row props: `getRowId`, `getRowLabel` ("Select <label>" checkbox label), visually hidden `caption`, `itemNoun` ("products") for the count text.
- [x] Compound parts: `Table.Toolbar`, `Table.BulkBar` (shown while rows are selected), `Table.Pagination`, `Table.Empty`; `DataTable<T>` composes them; custom cells are render props; `id: 'actions'` column with a visually hidden header is the row-actions pattern.
- [x] Controlled sorting: header button with `aria-sort`, click toggles asc/desc, contract sort format (`field` / `-field`), no button without `sortKey`, sort shown by icon + `aria-sort`, never colour alone.
- [x] Server-side pagination footer: "Showing 1-25 of 194 products", rows per page from `PAGE_SIZE_OPTIONS`, "Page 1 of 8", previous/next disabled at the ends with the reason available to assistive technology.
- [x] Page-scoped row selection controlled through `selectedIds`, header checkbox (checked / unchecked / indeterminate); selection empties after page, sort, filter or page-size change, without a `useEffect` that copies state (e.g. `useRowSelection` resetting by key).
- [x] Column visibility menu ("Columns"), local UI state; `hideable: false` columns cannot be hidden.
- [x] States with stories: loading (skeleton rows, `aria-busy`), refetching (keep rows, `aria-busy`, visually marked as busy with a progress indicator, rows keep full contrast, no skeleton flash), empty, empty with active filters ("Clear filters"), error (what happened, what to do, Retry) via shared `EmptyState` / `ErrorBanner`.
- [x] Generic active filter chips (caller supplies label, value, `onRemove`) plus "Clear filters".
- [x] `useTableSearchParams(schema)`: parses `useSearchParams` through a contract list query schema (invalid values fall back to defaults), exposes typed `setFilter`, `setSort`, `setPage`, `setPageSize` and the parsed query; generic over any schema with `page`, `pageSize`, `sort`; filter/sort/page-size change resets page to 1; search typing replaces the history entry, other changes push.
- [x] Accessibility: real `<table>` with `<caption>`, `scope="col"`, labelled row checkboxes, visible focus, full keyboard use; polite `aria-live` for count and state changes; focus stays on the used control after paging/sorting (pagination stays mounted while loading).
- [x] Density from tokens: `--table-row-height`, `--font-size-table-cell`, `align: 'end'` columns right-aligned with tabular numbers.
- [x] Narrow viewports: horizontal scroll inside its own focusable container; no sideways page scroll at 375 px.
- [x] Stories: default, loading, refetching, empty, empty with filters, error, selection (none, some, all), wide data; typed fixture rows, no products, no MSW; a11y addon reports no violations.
- [x] Tests (RTL, roles and labels): sorting, selection (indeterminate, reset when rows change), pagination bounds and page-size options, every state, keyboard use, hideable/non-hideable columns; hook tests for URL parsing (incl. invalid params) and page reset; type test for column keys.
- [x] `pnpm build`, `lint`, `typecheck`, `test` and `build-storybook` stay green.

## Notes

- Spec: `context/features/002_05-data-table-spec.md`. ADRs: ADR-0005 (own table engine, no library, engine-free public API), ADR-0002 (column config persistence belongs to the Redux `ui` slice later; not in this feature), ADR-0001 (router data mode; URL hook tests use `createMemoryRouter`).
- No ADR contradiction found. Spec decision 5 (visibility not persisted) is consistent with ADR-0002: persistence is deferred, not moved elsewhere.
- Server-driven only: the table never sorts, filters, pages, fetches or debounces. Caller owns TanStack Query (keep previous page while loading) and search debounce.
- Selection is page-scoped; sorting toggles asc/desc only (no unsorted state); Dashboard low-stock table stays a plain table.
- Does not include: virtualization, product columns/filters/bulk actions or any real screen, density toggle, mobile card layout, select-all across pages, column reorder/resize/pinning, persisted column visibility.
- No new libraries. Reuse atoms and molecules (`Checkbox` with `hideLabel`/`indeterminate`, `Select`, `Skeleton`, `IconButton`, `Badge`, `ErrorBanner`, `EmptyState`, `VisuallyHidden`); flag any atom change in the plan.
- Suggested location: `src/components/organisms/DataTable/` (parts co-located), URL hook next to it or in `src/hooks/`; confirm in the plan.
- Tokens `--table-row-height` and `--font-size-table-cell` already exist in `tokens.css`.
- Open points for the plan: `sortKey` typing (row keys vs contract sort fields, e.g. `onHand`, `stockStatus`), no menu/popover component exists yet for "Columns", and how `useTableSearchParams` knows which filter is search (replace vs push).
- Plan decisions (approved): `sortKey` typed against the contract sort fields (`ColumnDef<T, S>` with `SortField<S>`), accessors against the row; `hideHeader` added to `ColumnDef` for the actions column; `useTableSearchParams` takes any `{ parse }` schema (no `zod` dependency in `apps/web`), replace is per call (`setFilter('search', v, { replace: true })`), plus `clearFilters`.
- Refetching is marked by a thin indeterminate progress bar on the top edge of the table area (still bar with reduced motion), rows keep full contrast; spec wording updated accordingly. No opacity token.
- Shared `ScrollRegion` molecule (focusable, labelled, `overflow-x: auto`, `position: relative`, the one lint exception); the Dashboard low-stock table uses it too (refactor, no behaviour change). `position: relative` keeps a visually hidden caption from widening the page at 375 px.
- Review fixes (approved): "This page is empty" + "Go to first page" when `items` is empty but `total > 0`; `useTableSearchParams(schema, { filterKeys })` with keys typed against the parsed query, `clearFilters` removes exactly those (invalid values too) and keeps foreign params such as `?mock=slow`; `isolation: isolate` on the table root; "Sorted by <header>, ascending|descending" in the polite live region after a user sort (no "Loading" chatter on refetch); `PageOutOfRange` story.
- Small additions while implementing: `itemNoun` is `{ one, other }` ("1 shipment selected"); filter chips live in `Table.Toolbar` (no separate `FilterChips` file).

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
