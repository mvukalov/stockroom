# Feature: Orders list

Feature 005, part 1. The Orders screen as a read-only, paged list: orders are looked up by status, customer, number or date, not scrolled through, so this list uses `DataTable<T, S>` with numbered pages (the virtualized list stays for Movements and the later Audit log). It adds the columns, the status badge, filters with URL-synced state and every list state. There are no mutations here: the order detail and cancelling an order are `005_02`.

Depends on: `003_01-products-list-spec.md` (page pattern: connected page, presentational view, filter toolbar, debounce, filter options hook), `002_05-data-table-spec.md` (`DataTable`, `useTableSearchParams`), `002_04-dashboard-spec.md` (`ErrorBanner`, `EmptyState`), `004_01-movements-list-spec.md` (`formatDateTime`, date range filter with the from-later-than-to check), and `001_01` to `001_04` (contract, mock API).

Read first: `context/coding-standards.md` (React, Routing, Accessibility, Testing), `context/design-direction.md` (sections 5, 7, 9), `docs/adr/0003-stock-reservation.md` (order statuses and what reserves stock), `docs/adr/0005-table-engine.md`, `packages/contract/src/order.ts`, `queries.ts` and `endpoints.ts`, `apps/web/src/mocks/handlers/` (the orders handler), `apps/web/src/pages/products/` (the pattern to follow), `apps/web/src/api/products.ts`. Visual reference only: `context/design/04-orders-*.png` if present. The differences listed under "Decisions" win over the screenshots.

## Goals

### Contract and mock (verify first, change only what is missing)

- [ ] Check `GET /api/orders` and `OrdersQuery`: which filters (status, search, from, to, customer), which sort keys, the defaults, the list item shape (id, order number, customer, status, total, item count, created date). The plan states what the screen needs that is missing and proposes the smallest contract change, as with `GET /api/locations` in `004_01`. If a filter the screen needs (for example the customer) has no endpoint for its options, say so in the plan instead of working around it in the UI.
- [ ] Any new endpoint or schema comes with its `ENDPOINTS` entry, a schema test, an MSW handler (needs `view`, honours the mock scenarios) and a contract test. No change to what already works.

### Data hooks

- [ ] `useOrders(query, userId)` in `src/api/orders.ts`, keyed by the parsed `OrdersQuery`, with `apiRequest` and `orThrow`. `ORDERS_QUERY_KEY = ['orders']` is exported as the prefix, so the later detail and cancel features can invalidate every list. The list is the same for every role, so the key has no user id. `placeholderData: keepPreviousData`, so paging and sorting never flash a skeleton.
- [ ] Filter options (only if the plan finds a filter that needs them) through a hook with its own key outside `ORDERS_QUERY_KEY`, no polling.

### Screen

- [ ] `/orders` replaces the placeholder. Connected page (URL state through `useTableSearchParams(OrdersQuery, { filterKeys })`, hooks, state selection) and a presentational view (props only). Stories and most tests target the view.
- [ ] Header: the shell's `PageHeader` with the title and a line "<total> orders" (from `data.total`, `en-GB` number format, hidden before the first data arrives) and a short description. No primary button: there is no create-order feature in this phase.
- [ ] Columns: order number (a link to the order's detail route, in the mono font), customer, status, items (count, end-aligned, tabular), total (end-aligned, tabular, through the existing `formatCents`), created (through the existing `formatDateTime`). Sort keys match `OrdersQuery`; the order number and the customer are not hideable, the rest are. No actions column in this feature.
- [ ] The order number link goes to `/orders/:id`. The detail screen is the next feature, so until then that route shows the shell's placeholder page with the title "Order"; the plan confirms the route exists, and adds the placeholder route if it does not. The link has the order number as its accessible name and the whole row is not a click target (a link in the cell only).
- [ ] Status column uses a new `OrderStatusBadge` over the contract enum (icon and text, never colour alone), built like the other domain badges. Labels come from one shared constant, not typed twice, and are also used by the status filter.
- [ ] Filters in `Table.Toolbar`: a search input (order number or customer, whichever the contract supports), Status `Select`, From and To date inputs that reject `from` later than `to` with a visible message and send no such request (reuse the Movements pattern), plus any filter the contract supports and the plan names. Every control has a visible label or an accessible name. Search keeps local text and commits to the URL after a 300 ms debounce with `replace: true`, like Products.
- [ ] Active filter chips and "Clear filters" built from the parsed query (the chip shows the label, not the raw value; raw value as a fallback while options load or if they failed). If filter options fail to load, those selects are disabled with a visible reason and a Retry, and the list still works.
- [ ] States, all through `DataTable`, `ErrorBanner` and `EmptyState`: **loading** (skeleton rows, count hidden), **refetching** (progress bar, rows stay), **error** (`ErrorBanner` "We couldn't load orders. Check your connection and try again." and Retry; a failed refetch with data on screen shows the banner above the stale rows), **empty** (no filters: "No orders yet"), **empty with filters** ("No orders match these filters" and Clear filters) and **page out of range** (the table's own state).
- [ ] Page title and focus handling follow the shell: `handle.title` is "Orders". Works for all three roles with no mutating controls. Correct at 375 px: the toolbar wraps, the table scrolls inside its own `ScrollRegion`, the page does not scroll sideways.
- [ ] The Dashboard: check which Dashboard cards or lists link to Orders. If a link can use `status` exactly (the list is exactly the orders with one status), point it there; if one `status` value cannot express the Dashboard's list, leave the link as it is. Say which it is in the plan.

### Tests and stories

- [ ] Stories for the presentational view: data, loading, refetching, error, empty, empty with filters, out-of-range page, filter options failed (if there are options), every status, wide data, date range error. Typed fixtures, no MSW. The a11y addon reports no violations.
- [ ] Tests (React Testing Library, roles and labels, MSW node server): URL to request params for each filter, sort and page size; changing a filter, the sort or the page size resets the page to 1; a hand-edited URL with invalid values falls back to defaults; search debounce commits once and replaces the history entry; From later than To shows the message and sends no request; chips and "Clear filters" keep `?mock=` and sort; `?mock=empty`, `?mock=error` then Retry, `?mock=slow` shows skeleton rows; the order number link points to the detail route; a VIEWER sees the same content. Unit tests for `OrderStatusBadge` labels and any new pure helper; hook tests for `useOrders`.
- [ ] `pnpm build`, `lint`, `typecheck`, `test` and `build-storybook` stay green. Check each story at 375 and 1280 px with axe.

## Decisions

1. **Numbered pages, not virtualization.** Orders are found by filters and search, not scrolled through; the total and page numbers are useful here, and page-based loading is what `DataTable` already does. The second virtualized list is the Audit log, after which ADR-0006's revisit condition is reviewed.
2. **The list is read-only, with no actions column.** Cancelling an order and the detail view are `005_02`.
3. **Money and dates use the existing helpers** (`formatCents`, `formatDateTime`); no new formatting code.
4. **No selection, no bulk bar, no CSV export, no column visibility persistence** on this list.
5. **No row-wide click target.** The order number link is the way into the detail, for keyboard and screen reader users.
6. **No new libraries.**

## Does not include

- Order detail, cancel, picking, status changes, creating or editing orders (`005_02` and later).
- Virtualization or infinite loading of the orders list, density toggle, mobile card layout.
- Reserved quantity or stock information on the list (ADR-0003 keeps availability a read model).

## Notes

- Contract changes live in `packages/contract` with tests. The mock handler reads from `db`; do not copy data into new structures.
- Follow the Products page structure (`pages/products/`) and name the equivalents in the plan; say what is shared with Movements (date range filter) and extract only what both use.
- Use the mock scenarios to check the states by hand: `?mock=slow`, `?mock=empty`, `?mock=error`, and `?page=999` for the out-of-range state.
- Update the "Orders" entry in `context/project-overview.md` only if the plan finds a statement that is now wrong.
