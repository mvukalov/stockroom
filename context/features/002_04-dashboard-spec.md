# Feature: Dashboard

Feature 002, part 4. The first real screen: four KPI cards and the list of low-stock products, read from `GET /api/dashboard`. It is deliberately small, because its second job is to set the pattern every later data screen follows: a connected page that fetches with TanStack Query, and a presentational view that renders the four states (loading, error, empty, data). The shared pieces built here (`KpiCard`, `ErrorBanner`, `EmptyState`) are reused by Products, Movements, Orders and Audit.

Depends on: `002_03-app-shell-spec.md` merged (router, API client, `PageHeader`, current user), `001_04-msw-handlers-spec.md` (`getDashboard`, scenarios).

Read first: `context/coding-standards.md` (React, Styling, Accessibility), `context/design-direction.md` (sections 4, 5, 7, 9), `docs/adr/0002-state-management.md`, `packages/contract/src/dashboard.ts`. Visual reference only: `context/design/01-dashboard-default.png`, `-loading`, `-empty`, `-error`. The differences listed under "Decisions" win over the screenshots.

## Goals

- [ ] `useDashboard` hook over the existing API client and the contract `getDashboard` endpoint. The query key is exported as a constant (`DASHBOARD_QUERY_KEY`) so later mutations (movements, order transitions) can invalidate it. The response is parsed by the contract schema; no hand-written types.
- [ ] `/dashboard` replaces the placeholder: the shell's `PageHeader`, a row of four KPI cards (Products in stock, Low-stock items, Open orders, Movements this week), and a "Low-stock items" section.
- [ ] `KpiCard`: label, large value (tabular figures), a caption line, optional `warning` tone with an icon. Markup associates the label with the value, so a screen reader hears "Low-stock items, 6, 2 more than last week". The `warning` tone is used on the Low-stock card whenever its value is above 0, and never carries meaning by colour alone (icon and text are always present).
- [ ] Caption text follows fixed rules, written as a small pure function with unit tests:
  - Products in stock and Movements this week: `+12 vs last week`, `-3 vs last week` (true minus sign), `No change vs last week`.
  - Low-stock items: `2 more than last week`, `1 fewer than last week`, `Same as last week`; when the value is 0 the caption is `No items need attention` whatever the delta.
  - Open orders: `Draft, confirmed and picked` (the contract has no "due today" figure, so none is shown).
  - Numbers use `Intl.NumberFormat('en-GB')` (thousands separators).
- [ ] Low-stock section: a real `<table>` with a caption, `th scope="col"`, columns Product (title, with the SKU below in the mono font), On hand, Minimum, Status. On hand and Minimum are right-aligned with tabular figures; Status uses the existing `StockStatusBadge`. Rows keep the server order (most urgent first). At most 10 rows are shown (`LOW_STOCK_PREVIEW_LIMIT`); the section header shows the total ("6 items"), a line "Showing 10 of 27" appears when rows are cut, and a "View all products" link goes to `ROUTES.products`.
- [ ] Loading: skeleton cards and skeleton rows with the final layout (no layout jump), the region has `aria-busy="true"` and a visually hidden "Loading dashboard" status. Skeleton is shown only while there is no data yet; a background refetch keeps the old numbers on screen.
- [ ] Error: an `ErrorBanner` with the message "We couldn't load the dashboard. Check your connection and try again." and a Retry button that refetches. The banner is announced (`role="alert"`). If a refetch fails while data is on screen, the banner appears above the stale data instead of replacing it.
- [ ] Empty: when `lowStock` is empty, the section shows an `EmptyState` ("Nothing is running low" / "No product is at or below its minimum stock level."). The KPI cards still show their values (zeros in the mock `empty` scenario).
- [ ] The page works for all three roles and has no mutating controls. It must be correct at 375 px: KPI cards re-flow (2 by 2 when narrow, 4 across when the content area is wide, decided by the container width, not the viewport), the table scrolls horizontally inside its own container, nothing scrolls the page sideways.
- [ ] Stories with their states: `KpiCard` (default, warning, zero value, negative delta, loading), `ErrorBanner`, `EmptyState`, and the presentational dashboard view (data, loading, error, empty, more than 10 low-stock rows). The a11y addon reports no violations.
- [ ] Tests (React Testing Library, roles and labels, MSW node server): data state with the four KPIs and the table; the 10-row cut and the "Showing 10 of N" line; `empty` scenario; `error` scenario then Retry succeeds after switching to `normal`; loading state shows skeletons and `aria-busy`; the caption function for every branch; a VIEWER sees the same content.
- [ ] `pnpm build`, `lint`, `typecheck`, `test` and `build-storybook` stay green.

## Decisions

- **Pattern:** a connected page component (calls `useDashboard`, picks the state) and a presentational view (props only: data or status). Stories and most tests target the view, as with `RoleSwitcher`. Later screens copy this shape.
- **`ErrorBanner` and `EmptyState` are generic** (title or message, optional description, optional action, icon) because design-direction section 7 requires them on every data screen. Nothing in them mentions the dashboard.
- **Differences from the prototype screenshots, on purpose:**
  - No "Location" column: the contract returns one row per product (total on hand across locations).
  - No "Create receipt" row action: the movement form does not exist yet. The Movements feature adds it, and it will be disabled with a reason for VIEWER like every other mutating control.
  - No "3 due today" caption: the contract has no such figure, and the UI does not invent data.
  - No colour on the deltas (no green/red): "2 more low-stock items" is bad news and "12 more products" is good news, so colour would need per-card semantics. The text and the sign carry the meaning.
- **Query key:** the dashboard is the same for every role, so its key does not include the user id (same reasoning as the users list). If it ever becomes role-dependent, the key must include the user id.
- **No polling and no auto-refresh interval;** default TanStack Query behaviour (refetch on window focus) is enough. A fixed `staleTime` is not needed.
- **"View all products" links to the plain products route.** A pre-filtered "low stock" link is added by the Products feature once that filter exists.
- **No chart.** The movement chart is wave 2 and the first thing to cut.

## Does not include

- Row actions in the low-stock list (Create receipt, Create adjustment), links from KPI cards to filtered lists, a product detail link.
- Per-location breakdown, the movement chart, date range selection, polling.
- A generic `DataTable`: the low-stock list is a plain semantic table. The table engine ADR and `DataTable` come with the Products feature.
- Playwright e2e and axe in e2e (arrive with the first real flow).

## Notes

- No new libraries. Icons come from Lucide, as before.
- Suggested structure, to be confirmed in the plan: `KpiCard`, `ErrorBanner`, `EmptyState` in `src/components/molecules/`; the dashboard view and its sub-parts under `src/pages/dashboard/` (or the existing `pages/` convention if the plan argues for it); the hook next to `users.ts` in `src/api/`. Co-locate `.module.scss`, `.test.tsx` and `.stories.tsx`.
- Reuse the atoms and tokens (`Badge`, `Skeleton`, `VisuallyHidden`, `Icon`, `Button`, `StockStatusBadge`). No new colours, spacing or font sizes outside tokens. The warning tone must use the existing semantic warning pair, which is already covered by the contrast test; if the card needs a pair that is not in `contrast.ts`, add it there.
- Use the mock scenarios to check the states by hand: `?mock=slow` for loading, `?mock=empty`, `?mock=error`.
- If a number from `/api/dashboard` looks wrong against the Products or Orders data, report it instead of adjusting it in the UI; the read model lives in `apps/web/src/mocks/readModels.ts`.
