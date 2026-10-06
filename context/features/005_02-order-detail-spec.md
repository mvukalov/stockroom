# Feature: Order detail and cancel

Feature 005, part 2. The order detail screen at `/orders/:id` (header, status, customer, order lines, totals) and the one action this phase has on an order: **Cancel**. It replaces the placeholder route that `005_01` left, adds `GET /api/orders/:id` and the cancel endpoint if the contract lacks them, and is the first feature to use the CLERK permission from ADR-0004 (a CLERK may cancel orders, a VIEWER may not). It reuses the confirmation dialog pattern from Products archive and the toast queue from `004_02`.

Depends on: `005_01-orders-list-spec.md` merged (`OrderStatusBadge`, `useOrders`, `ORDERS_QUERY_KEY`, the `/orders/:id` placeholder route), `003_02-products-bulk-actions-spec.md` (confirmation dialog, pending state, error with Retry, permission-guarded controls that stay visible), `004_02-new-movement-drawer-spec.md` (toast queue and the `Toast` message pattern), `docs/adr/0003-stock-reservation.md`, `docs/adr/0004-clerk-permissions.md`, `001_02-domain-core-spec.md` (`can`, `denialReason`, order rules).

Read first: `context/coding-standards.md` (React, Routing, Accessibility, Testing), `context/design-direction.md` (sections 5, 7, 9), ADR-0003 and ADR-0004, `packages/contract/src/order.ts`, `errors.ts` and `endpoints.ts`, `packages/domain/src/` (order status rules, `can`, `PERMISSIONS`), `apps/web/src/mocks/handlers/` (orders handler and a mutation handler as pattern), `apps/web/src/pages/products/` (the archive dialog), `apps/web/src/api/orders.ts`. Visual reference only: `context/design/04-orders-*.png` if present. The differences listed under "Decisions" win over the screenshots.

## Goals

### Contract and mock (verify first, change only what is missing)

- [ ] Check what exists for `GET /api/orders/:id` (an order with its lines and the fields the screen needs) and for cancelling (`POST /api/orders/:id/cancel` or an equivalent action). The plan states what is missing and proposes the smallest contract change: new schemas in `packages/contract`, `ENDPOINTS` entries, schema tests. The `:id` route must not collide with other order routes. Use existing error shapes (`FORBIDDEN`, `NOT_FOUND`, `CONFLICT`); do not invent a new one.
- [ ] MSW handlers: the detail handler needs `view` and honours the mock scenarios; the cancel handler checks the role through `can` first, then the order's status through the domain rule (the handler calls it, it does not copy it), changes the status in the mutable store, and is **idempotent**: cancelling an already cancelled order returns it unchanged and is not an error. A status that cannot be cancelled returns `CONFLICT` with a message that names the status.
- [ ] Contract tests over `msw/node`: detail of an existing order, `NOT_FOUND` for an unknown id, cancel as ADMIN and CLERK, `FORBIDDEN` as VIEWER, `CONFLICT` for a status that cannot be cancelled with nothing changed, repeating the cancel, and the list, the dashboard's open-orders figure and the products' availability reflecting the cancellation afterwards.

### Data hooks

- [ ] `useOrder(id, userId)` keyed under `ORDERS_QUERY_KEY` with the id (so a list invalidation also refreshes an open detail), using `apiRequest` and `orThrow`. No user id in the key, as with the list. A hook for the 404 case must not retry.
- [ ] `useCancelOrder()`, a plain TanStack mutation with the acting user passed explicitly. On success it invalidates `ORDERS_QUERY_KEY`, `PRODUCTS_QUERY_KEY` (cancelling releases reserved stock, so availability changes) and `DASHBOARD_QUERY_KEY`. Expected contract errors (`Result`) become a message in the dialog, not a thrown error.

### Screen

- [ ] `/orders/:id` replaces the placeholder. Connected page (reads the id from the route, calls the hooks, picks the state) and a presentational view (props only). Stories and most tests target the view. The id is validated; a malformed id shows the same "not found" state as an unknown one.
- [ ] `handle.title` follows the shell and shows the order number once loaded (the plan says how the title is set while loading). The heading, the status badge (`OrderStatusBadge`) and the **Cancel order** button are in the page header.
- [ ] Summary block: customer, status, created date and time (`formatDateTime`), the order number in the mono font, item count and total (`formatCents`). Labels are visible text, not colour or position alone.
- [ ] Order lines in a real `<table>` with `<caption>`, `th scope="col"`: product (title, SKU below in the mono font), quantity (end-aligned, tabular), unit price, line total (both through `formatCents`, end-aligned, tabular). A footer row with the total. The table scrolls inside its own `ScrollRegion` at 375 px, the page does not scroll sideways. No virtualization (an order has a handful of lines).
- [ ] Reservation information per ADR-0003: for an order whose status reserves stock, say so in one line ("Stock for these items is reserved while the order is Confirmed or Picked") and, if the contract carries it, show per line whether the stock is reserved. Do not recompute reservation in the UI, and do not show it if the contract cannot provide it (say so in the plan).
- [ ] A "Back to orders" link at the top returns to the list with its filters and page when the user came from the list (the plan chooses how: for example router location state), and to `/orders` otherwise.
- [ ] Product titles in the lines link to nothing in this phase (there is no product detail page); they are plain text.
- [ ] States: **loading** (skeleton in the final layout, visually hidden "Loading order" status, `aria-busy`), **error** (`ErrorBanner` "We couldn't load this order. Check your connection and try again." with Retry), **not found** (`EmptyState` "Order not found" with a link back to the orders list), **refetching** (a quiet progress indicator, content stays).

### Cancel

- [ ] **Permissions through `can` and `denialReason`.** The Cancel button stays visible. It is disabled through `Button` `disabledReason` for a VIEWER (the reason from `denialReason`) and for a status the domain rule says cannot be cancelled (reason names the status, for example "A shipped order cannot be cancelled"). The reason is reachable by keyboard and assistive technology. ADMIN and CLERK may cancel (ADR-0004); confirm against `permissions.ts` and report any difference instead of deciding it here.
- [ ] **Confirmation dialog** (native `<dialog>` with `showModal()`, the shell shared with Products archive; say in the plan what is reused): says which order (number and customer), that its reserved stock will be released, and that cancelling cannot be undone in the app (there is no un-cancel). The initial focus is the safe button, **Keep order**; the destructive action is **Cancel order**, not the default. Pending state: no double submit, the label changes, Escape does not close it while pending.
- [ ] Errors: the dialog stays open, shows an `ErrorBanner` with the message (for `CONFLICT` the message naming the status, for a network failure "We couldn't cancel the order. Check your connection and try again.") and the primary action becomes Retry (safe because cancelling is idempotent). The dialog never closes on failure.
- [ ] Success: the dialog closes, the page shows the new status (the data is invalidated and refetched, no optimistic update here: a wrong "Cancelled" is worse than a short wait), focus returns to the page heading (the Cancel button is now disabled), and a toast from the existing queue says "Order <number> cancelled". The toast has **no Undo**, because cancelling is not reversible.

### Tests, stories, gate

- [ ] Stories for the presentational view: each status (the cancel button state differs), loading, error, not found, refetching, long customer name, many lines, an order that reserves stock, VIEWER (denied) and a status that cannot be cancelled; the dialog (default, pending, error, conflict). Typed fixtures, no MSW. The a11y addon reports no violations.
- [ ] Tests (React Testing Library, roles and labels, MSW node server, a fresh Redux store per test): detail renders customer, lines and totals from the URL id; unknown and malformed ids show not found; `?mock=slow` shows the skeleton, `?mock=error` shows the banner and Retry succeeds after the scenario switches to `normal`; Back to orders keeps the list filters; cancel flow end to end (dialog, new status, toast, list and dashboard reflect it); failed cancel keeps the dialog open and Retry succeeds; cancelling twice is not an error; no double submit while pending; Escape and focus return; initial focus on Keep order; permission matrix for ADMIN, CLERK and VIEWER (visible, disabled, reason available, request never sent for a VIEWER); a non-cancellable status disables the button with its reason; the pure function that builds the reservation line, if there is one.
- [ ] `pnpm build`, `lint`, `typecheck`, `test` and `build-storybook` stay green. Check each new story at 375 and 1280 px with axe. By hand: `?mock=slow`, `?mock=error`, the three roles, and an order id that does not exist.

## Decisions

1. **Cancel is the only action in this phase.** Confirming, picking and shipping an order (and the stock movements they cause) are not part of the portfolio's phase 1 scope unless a later spec adds them.
2. **Cancel is pessimistic, not optimistic.** The status changes only after the server confirms. The toast has no Undo because there is no un-cancel.
3. **Cancelling is idempotent**, so Retry after a lost response is safe, and a repeated request returns the order unchanged.
4. **Reservation is shown only if the contract provides it** and is never recomputed in the UI (ADR-0003 keeps availability a read model).
5. **Permissions follow ADR-0004:** the denied control stays visible with its reason; the handler repeats the check.
6. **No product links, no edit, no print view, no order history or audit timeline** on this screen.
7. **No new libraries.**

## Does not include

- Confirm, pick, ship or any other status change; creating or editing orders; editing lines.
- Order history or audit timeline (it belongs with the Audit log feature), print or export of an order.
- A product detail page, "View movements" for a product.

## Notes

- Contract changes live in `packages/contract` with tests; order rules stay in `@stockroom/domain` and the handler calls them rather than copying them.
- Reuse, do not rewrite: `ErrorBanner`, `EmptyState`, `Dialog` or the confirmation shell from Products archive, `Button` with `disabledReason`, `OrderStatusBadge`, `formatCents`, `formatDateTime`, the toast queue, `ScrollRegion`.
- If the placeholder route's current title (`Order <id>`) is replaced, say how in the plan, and check the shell's focus and title handling for a page whose title depends on loaded data.
- Use the mock scenarios to check the states by hand: `?mock=slow`, `?mock=error`, and an unknown id for not found.
- Update the "Orders" entry in `context/project-overview.md` only if the plan finds a statement that is now wrong.
