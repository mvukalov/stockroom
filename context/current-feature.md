# Current Feature

## Status

Not Started

## Goals

<!-- Goals of the loaded feature as checkable bullets. Filled by /feature load. -->

## Notes

<!-- Constraints, ADRs, does-not-include items, spec path. Filled by /feature load. -->

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
- **Products list** - Read-only `/products` on `DataTable`: contract `GET /api/products/filters` (categories and brands, shared `compareNames`), `useProducts` with `keepPreviousData` and `useProductFilters` with its own key and `staleTime`, connected page / presentational view with seven columns (`formatCents`, shared `STOCK_STATUS_LABELS`, Archived badge), URL-synced filters and chips with a raw-id fallback when options fail (Category and Brand disabled with a reason and Retry), debounced search via `useDebouncedCallback` (latest callback, cancelled on external `search` changes, own commits never overwrite typed text), `PageTitle`/`PageHeader` children; stories, RTL tests over MSW with mutation-checked race tests, axe 0 violations at 375 and 1280 px (PR #26)
