# Feature: Movements list

Feature 004, part 1. The Stock movements screen as a read-only, virtualized history: the append-only list of every stock change, loaded as the user scrolls and rendered with only the visible rows in the DOM. It is the project's measured performance problem (before and after numbers go in the README). There is no "New movement" button here: the drawer is the next feature and adds it, and with it the Create adjustment action on Products.

Depends on: `docs/adr/0006-virtualization.md` accepted, `002_05-data-table-spec.md` (`ColumnDef`, `SortHeader`, state parts, `useTableSearchParams`), `003_01-products-list-spec.md` (page pattern: connected page, presentational view, filter toolbar, debounce), `002_04-dashboard-spec.md` (`ErrorBanner`, `EmptyState`), and `001_01` to `001_04` (contract, mock API).

Read first: `docs/adr/0005-table-engine.md` and `0006-virtualization.md`, `context/coding-standards.md` (React, Accessibility, Testing, performance rule), `context/design-direction.md` (sections 5, 7, 9), `packages/contract/src/movement.ts`, `queries.ts` and `endpoints.ts`, `apps/web/src/components/organisms/DataTable/` (what to reuse), `apps/web/src/mocks/handlers/movements.ts`. Visual reference only: `context/design/03-movements-*.png`. The differences listed under "Decisions" win over the screenshots.

## Goals

### Contract and mock

- [ ] `GET /api/locations` returns `Location[]` (id, warehouse id, code), sorted by code, for the Location filter. New entry `listLocations` in `ENDPOINTS`, schema test, MSW handler (needs `view`, honours the mock scenarios) and a contract test. No other contract change: `GET /api/movements` already has the filters and sorts this screen needs.

### Data loading

- [ ] `useMovements(query, userId)` in `src/api/movements.ts` over `useInfiniteQuery`: pages of 100, keyed by the parsed `MovementsQuery` without `page` and `pageSize`, using `apiRequest` and `orThrow`. `MOVEMENTS_QUERY_KEY = ['movements']` is exported as the prefix for the later drawer feature. The next page is requested when the last rendered rows come within a threshold of the end of the loaded rows, never twice for the same page, and never while an earlier request for it is in flight.
- [ ] The infinite query does not refetch on window focus or on mount when the data is still fresh, and its stale time is long (the exact value and why go in a code comment), because a refetch re-requests every loaded page one by one. Changing a filter or the sort starts again at the first page and scrolls the list to the top.
- [ ] `useLocations(userId)` with its own key, no polling. User names come from the existing `useUsers`.

### Virtualized list

- [ ] A list component next to `DataTable` (the plan names it and says what it reuses: `ColumnDef`, `SortHeader`, `ScrollRegion` or its own scroll container, skeleton rows, `ErrorBanner`, `EmptyState`). `DataTable` keeps its page-based API. Rendering uses `@tanstack/react-virtual` with a fixed row height from `--table-row-height`; no virtualizer type is exposed in the component's props.
- [ ] Table semantics survive virtualization: a `<table>` with `<caption>`, `th scope="col"`, `aria-rowcount` set to the total number of rows the server reports (header row included as the plan defines it) and `aria-rowindex` on every rendered row, so assistive technology knows the real position. Spacer rows or an equivalent keep the scroll height equal to the full loaded list.
- [ ] The header stays visible while scrolling (sticky). The list scrolls inside its own focusable, labelled scroll container (as `ScrollRegion`), the page does not scroll sideways at 375 px.
- [ ] A focused element inside a row (the Copy ID button) is never unmounted by scrolling: the row that contains the focus stays rendered until focus leaves it (for example through the virtualizer's range extractor). A test proves it.
- [ ] While the next page loads, a skeleton row (or a few) at the end of the loaded rows shows it, with no layout jump. Reaching the end of the history shows a quiet "End of history" line, not an empty gap.

### Columns and cells

- [ ] Columns: Date/time (sortable), Type (sortable), Product (title, SKU below in the mono font), Location, Quantity (sortable, end-aligned, tabular), Reason, Created by, ID. Sort keys match `MovementsQuery` (`createdAt`, `type`, `quantity`); the others are not sortable. Default sort is the contract's (`-createdAt`).
- [ ] Type shows the existing movement type badge (icon and text, never colour alone); if the badge does not exist yet, add it over the contract enum like the other domain badges.
- [ ] Quantity: `+14` for RECEIPT and ADJUSTMENT/INCREASE, `−10` (true minus sign) for ISSUE and ADJUSTMENT/DECREASE, unsigned for TRANSFER. The sign is derived by one pure, unit-tested function (`signedQuantity`), tested for every type and direction. Colour may reinforce the sign but never carries it alone.
- [ ] Location shows the source code, and `A-01-03 → B-01-04` for TRANSFER (the arrow has an accessible text such as "to"). Reason is `—` when null. Created by is the user's name, with a fallback to a short id if the user is unknown.
- [ ] Date and time use `Intl.DateTimeFormat('en-GB')` ("3 Oct 2026, 08:45") through one helper, unit tested with the time zone pinned so the test result does not depend on the machine.
- [ ] ID shows the shortened id in the mono font and a "Copy ID" icon button with an accessible name that includes the id. Copying uses the Clipboard API; if it is unavailable or refused, the button reports that in its status text instead of failing silently. The success message is announced politely and disappears on its own.

### Filters and URL state

- [ ] Filters in a toolbar (reuse the `ProductsToolbar` pattern, do not copy it blindly): Type (one of the four types, or all), Location, Created by, From date and To date. `MovementsQuery` supports one value per filter, so Type is a single choice. The date inputs reject `from` later than `to` with a visible message and do not send such a request.
- [ ] State lives in the URL through `useTableSearchParams(MovementsQuery, { filterKeys })`. Filters and sort are shareable; `page` and `pageSize` have no meaning for an infinite list and are ignored if present in the URL. Hand-edited invalid values fall back to the schema defaults.
- [ ] Active filter chips with remove buttons and "Clear filters", built from the parsed query (the location chip shows the code, the user chip the name; raw values as a fallback while the options load or if they failed).
- [ ] If the location or user options fail to load, those selects are disabled with a visible reason and a Retry, and the list still works.

### States

- [ ] **Loading** (first page, no rows yet): skeleton rows in the final layout and a visually hidden "Loading movements" status, `aria-busy`. **Fetching the next page**: the end skeleton row only. **Filter or sort change**: a progress indicator with rows kept visible until the new first page arrives, full contrast (as `DataTable`), then the list scrolls to the top.
- [ ] **Error**: `ErrorBanner` ("We couldn't load movements. Check your connection and try again.") with Retry. A failed next page keeps the loaded rows and shows the banner with a Retry that retries that page only.
- [ ] **Empty history** (no filters): "No movements yet". **Empty with filters**: "No movements match your filters" and Clear filters. Both through `EmptyState`.
- [ ] Header block: "<total> movements" (from the server `total`, `en-GB` number format, hidden until the first page arrives), the "Append-only history of every stock change." line, and the note "Movements cannot be edited. To correct a mistake, add an ADJUSTMENT." as a static informational banner.
- [ ] A polite live region announces the loaded count when the filters or the sort change ("Showing 100 of 48,213 movements"), and not on every scroll fetch. The visible count stays in the header.

### Measurement (README evidence)

- [ ] The same list component can render without virtualization through a prop used only by a story or a measurement harness, never by the product UI. With the same fixture of at least 10,000 loaded rows it records, for both modes: DOM node count, time of the first render (React Profiler), and scroll smoothness over a scripted scroll (dropped or long frames). The method is chosen in the plan and is reproducible.
- [ ] Results are written to `docs/performance/movements-virtualization.md` as a before and after table, with the browser, machine and any throttling stated, plus a short paragraph on what the numbers do and do not show. The known limits of virtualized tables (find-in-page, screen reader navigation) are stated there too. The README link comes with the README work, not here.

### Tests, stories, gate

- [ ] Stories for the presentational view: data, loading, fetching the next page, filter change in progress, error, next-page error, empty, empty with filters, end of history, every movement type and direction, wide data; and the measurement stories (virtualized and not). Typed fixtures, no MSW. The a11y addon reports no violations.
- [ ] Tests (React Testing Library, roles and labels, MSW node server; jsdom has no layout, so give the virtualizer an initial size or a small test helper instead of faking `getBoundingClientRect` all over): first page rendered with `aria-rowcount` and `aria-rowindex`; scrolling near the end requests the next page exactly once and appends rows; only a window of rows is in the DOM for a long list; sort and filter changes reset to the first page and the top; URL parsing with invalid values; chips and Clear filters keep `?mock=` and sort; `?mock=empty`, `?mock=error` then Retry, `?mock=slow` shows skeleton rows; a failed next page keeps the rows; the focused Copy ID button stays mounted when scrolled out; `signedQuantity`, date formatting; a VIEWER sees the same content.
- [ ] `pnpm build`, `lint`, `typecheck`, `test` and `build-storybook` stay green. Check each story at 375 and 1280 px with axe.

## Decisions

1. **Infinite append with virtualization** and `@tanstack/react-virtual` (ADR-0006). Page-numbered pagination is the measured baseline only.
2. **No "New movement" button and no row actions.** The drawer feature adds the button and Create adjustment on Products; movements are never edited.
3. **No free-text product or SKU search** (the prototype shows one). `MovementsQuery` has no text search, and adding it is a contract change that belongs to a later decision. A product filter can arrive with the link "View movements" from a product.
4. **No default date range.** The prototype shows the last seven days, but the contract has no default for `from` and `to`, and the screen should not invent one. The user filters by date when needed.
5. **Dates are shown in the browser's time zone,** formatted in one helper, with tests pinned to a fixed zone.
6. **No row selection, no bulk bar, no column visibility menu, no CSV export** on this list.
7. **No new libraries besides `@tanstack/react-virtual`.** Ask before adding anything else.

## Does not include

- The New movement drawer, Create adjustment, Undo, any mutation.
- Text search, product filter, jumping to an arbitrary position in the history (ADR-0006 option C), density toggle, mobile card layout.
- Virtualizing Orders or Audit (they reuse the component in their own features, after this one proves it).
- The README itself; only the measurement document is written here.

## Notes

- The list component is new; `DataTable` is not changed except for small, shared exports the plan names. If reuse needs something in `DataTable` to be exported or split, say so in the plan before changing it.
- Contract changes live in `packages/contract` with tests. The mock handler reads from `db`; do not copy data into new structures.
- Use the mock scenarios to check the states by hand: `?mock=slow`, `?mock=empty`, `?mock=error`, and a very late scroll to check the next-page loading.
- Check the virtualizer's current documentation before writing code (fixed size, range extractor, infinite scroll example); the ADR lists the facts checked on 2026-10-06, not the API details.
- This is the project's showcase list: prefer a small, well-tested component over a clever one.
