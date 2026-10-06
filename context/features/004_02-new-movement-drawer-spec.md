# Feature: New movement drawer

Feature 004, part 2. The first write path for stock: a drawer with a form that records a movement (receipt, issue, transfer or adjustment), with an optimistic update on the Movements list, an Undo toast, and idempotent writes. It adds the "New movement" button to Movements and "Create adjustment" to Products. It is also the first feature to use the Redux event-flow state from ADR-0002 (the toast queue) and the first with a real form (react-hook-form + Zod).

Depends on: `004_01-movements-list-spec.md` merged, `003_02-products-bulk-actions-spec.md` merged (dialog and mutation patterns, `RowActionsMenu`, bulk bar), `docs/adr/0002-*.md` (TanStack Query for server state, Redux only for event-flow state), `docs/adr/0003-stock-reservation.md`, `docs/adr/0004-clerk-permissions.md`, `docs/adr/0006-virtualization.md` (a new movement resets the infinite query to its first page, it does not refetch every page).

Read first: `context/coding-standards.md` (React, Accessibility, Testing, forms), `context/design-direction.md` (sections 5, 7, 9), `packages/contract/src/movement.ts`, `errors.ts`, `endpoints.ts`, `packages/domain/src/` (stock rules, `can`, `denialReason`, `PERMISSIONS`), `apps/web/src/mocks/handlers/movements.ts` (the existing mutation handler, if any), `apps/web/src/api/movements.ts`, `apps/web/src/components/molecules/Dialog` and `pages/products/` (how the dialogs and mutations were built). Visual reference only: `context/design/03-movements-*.png`. The differences listed under "Decisions" win over the screenshots.

## Goals

### Contract and mock (verify first, change only what is missing)

- [ ] Check what `POST /api/movements` already accepts and returns. The plan states, before any code, which of these are missing and proposes the smallest contract change: a client-generated idempotency key in the body (for example `clientRequestId`, a UUID), the four movement shapes (RECEIPT, ISSUE, TRANSFER, ADJUSTMENT with direction INCREASE or DECREASE), `reason` rules (required for ADJUSTMENT, optional otherwise, length limit), and the error codes the form needs (`FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, and one for insufficient stock; use an existing code if one fits, do not invent a new error shape).
- [ ] MSW handler: checks the role through `can` first, validates through the contract schema, applies the stock rule from `@stockroom/domain` (the handler calls it, it does not copy it), writes to the mutable store so the list, the Products `onHand` and the Dashboard reflect it. **Idempotent:** a repeated `clientRequestId` returns the original movement and changes nothing. It honours the mock scenarios (`slow`, `error`).
- [ ] Contract tests over `msw/node`: each of the four types, `FORBIDDEN` for VIEWER, unknown product or location, insufficient stock with nothing changed, same `clientRequestId` twice creating one movement, and the list and the product's on hand reflecting the change.

### Form and drawer

- [ ] A right-side drawer on the native `<dialog>` with `showModal()` (reuse the `Dialog` shell if it fits, say in the plan what is shared; no generic modal system). Title "New movement". Focus goes to the first field, Escape closes (not while pending), focus returns to the control that opened it, the page behind does not scroll, and at 375 px the drawer is full width with no sideways scroll.
- [ ] `react-hook-form` with a Zod schema from `packages/contract` (the same schema the server uses, plus form-only rules such as "from and to differ" built on top of it, not copied). One form, fields depend on the type:
  - **Type**: radio group of the four types (a native radio group, visible labels).
  - **Product**: required. A search-then-pick control (a text input that searches products through the existing `useProducts` with a 300 ms debounce, and a result list of buttons, then a chosen-product summary with a Change button). Not an ARIA combobox: it is a smaller, safer pattern. No new library.
  - **Location** (RECEIPT, ISSUE, ADJUSTMENT) or **From** and **To** (TRANSFER, which must differ): selects from `useLocations`.
  - **Direction** (ADJUSTMENT only): Increase or Decrease, radio group.
  - **Quantity**: required, positive whole number, entered as a number (the sign comes from the type and direction through the existing `signedQuantity`, never typed).
  - **Reason**: required for ADJUSTMENT, optional otherwise, with a character counter.
- [ ] Validation: errors appear on blur and on submit, each linked to its field with `aria-describedby`, an error summary at the top of the form on a failed submit that takes focus and links to the fields. Submit is not disabled for invalid data (the user must be able to find out why); it is disabled only while pending.
- [ ] When the product and location are chosen, the form shows the current on-hand quantity at that location if the contract can provide it (check at load; if it cannot without a contract change, say so in the plan and show nothing instead of inventing a number). A quantity above the available stock for ISSUE, DECREASE and TRANSFER is reported by the server error, and the message is shown next to the Quantity field.
- [ ] Prefill: opened from Products "Create adjustment", the form opens with type ADJUSTMENT and the product already chosen. Opened from the Movements button, it opens empty with type RECEIPT.
- [ ] Unsaved input: closing a dirty form with Escape or Close asks nothing in this phase, but the draft survives an accidental close until the page is left (kept in component state of the host, not in storage); the plan states what it does.

### Mutation, optimistic update, rollback

- [ ] `useCreateMovement()` over `apiRequest('createMovement', …)` with the acting user passed explicitly. The `clientRequestId` is generated once when the form opens and reused for every retry of that submit, so a retry after a lost response cannot create a second movement. A new one is generated after success or when the form is reset.
- [ ] **Optimistic update on the Movements list:** when the new movement matches the active filters and the sort is the default (`-createdAt`), a row marked as saving is inserted at the top of the first page and `total` grows by one, immediately on submit. When it does not match, nothing is inserted (the success message says so: "Saved. It is hidden by your current filters."). On error the inserted row and the count roll back exactly (the cache snapshot is restored) and the drawer stays open with the error. On success the infinite query is reset to its first page (ADR-0006), not refetched page by page.
- [ ] On settle, `PRODUCTS_QUERY_KEY` and `DASHBOARD_QUERY_KEY` are invalidated (on hand, availability and low-stock change).
- [ ] The saving row is visibly and accessibly marked ("Saving", text, not colour only) and has no Copy ID until it has a real id. It never makes the virtualized list jump.
- [ ] Errors: expected contract errors (`Result`) show in the drawer in an `ErrorBanner` or at the field they belong to; a network failure shows "We couldn't save the movement. Check your connection and try again." and the primary action becomes Retry (safe because of the idempotency key). The drawer never closes on failure.

### Undo and toasts (Redux event-flow)

- [ ] A toast queue in a small Redux slice (ADR-0002: Redux only for this event-flow state; nothing server-side goes into the store). The plan lists the exact new dependencies (`@reduxjs/toolkit`, `react-redux`, `react-hook-form` and its resolver, if not installed) and Martin confirms before anything is installed. The store is created once in the app shell, tests get a fresh store per test.
- [ ] Toast behaviour: a polite live region (`role="status"`), at most three visible, newest last, auto-dismiss after 10 seconds, **paused while hovered or focused** and never dismissed while an action button has focus, dismiss button, Escape dismisses the focused toast. No toast steals focus. They sit above the page content without covering the drawer's actions, and fit at 375 px.
- [ ] Success shows a toast "Receipt saved: +14 × <product title> at A-01-03" (the sentence is built from the movement type through one pure, tested function) with an **Undo** button.
- [ ] **Undo is a compensating movement, not a deletion** (movements are append-only, and the Movements screen already says to correct a mistake with an ADJUSTMENT). Undo posts the reverse: a RECEIPT is reversed by an ADJUSTMENT DECREASE, an ISSUE by an ADJUSTMENT INCREASE, a TRANSFER by a TRANSFER back (to to from), an ADJUSTMENT by an ADJUSTMENT in the opposite direction; the same quantity and location, reason "Undo of <short id>". One pure, tested function builds the reverse. Undo has its own idempotency key and is offered once per toast. If the reverse is refused (for example the stock has been used since), the toast says why and offers no second Undo.
- [ ] Undo is optimistic in the same way as the create (the reverse row appears, rolls back on error).

### Entry points and permissions

- [ ] Movements page header: a primary **New movement** button. Products row actions and the bulk bar get **Create adjustment**. In the bulk bar it is enabled only when exactly one product is selected and otherwise disabled with the reason "Select one product to adjust its stock" (adjusting several products in one go is a different form and is not part of this feature).
- [ ] Permissions through `can` and `denialReason` (check which permission covers movement creation in `PERMISSIONS`; the plan names it). A denied control stays visible and disabled through `Button` `disabledReason`, as on Products. The handler repeats the check. Expected: ADMIN and CLERK may create, VIEWER may not; confirm against ADR-0004 and `permissions.ts` and report any difference instead of deciding it here.

### Tests, stories, gate

- [ ] Stories: drawer empty, each type's fields, validation errors with the summary, pending, server error, insufficient stock at the field, product picker (searching, results, chosen), toast (single, three, with Undo, undo failed). Typed fixtures, no MSW. The a11y addon reports no violations.
- [ ] Tests (React Testing Library, roles and labels, MSW node server, a fresh Redux store per test): fields change with the type; validation messages and the error summary focus; successful create appears at the top of the list with the saving mark and then the real row, count +1, on hand updated on Products; a movement hidden by filters is not inserted; failed create rolls back the row and count exactly and keeps the form data; Retry after switching `?mock=error` to `normal` creates exactly one movement (same `clientRequestId`); no double submit while pending; Undo creates the reverse for each of the four types and the net stock returns to the start; Undo refused shows the reason and no second Undo; toast pause on hover and focus, Escape, three at most, live region; Escape and focus return for the drawer; Create adjustment prefill from the row menu and from the bulk bar with one selected, disabled with the reason otherwise; permission matrix for ADMIN, CLERK and VIEWER (visible, disabled, reason available, request never sent); the pure functions (reverse movement, toast sentence, `signedQuantity` reuse).
- [ ] `pnpm build`, `lint`, `typecheck`, `test` and `build-storybook` stay green. Check each new story at 375 and 1280 px with axe. By hand: `?mock=slow` (pending), `?mock=error` (rollback), the three roles, and a scrolled-down Movements list while creating (no jump).

## Decisions

1. **The Undo is a reversing movement.** The history stays append-only and honest; a "delayed send with cancel" would lose the movement if the tab closes in the window, and deleting is not allowed by the model.
2. **Idempotency key from the client**, generated when the form opens and reused for retries and not for a different submit. The server returns the original movement for a repeated key.
3. **Optimistic insert only when the new movement would really appear** (matching filters, default sort). Otherwise there is no fake row.
4. **Toasts live in Redux, server data does not.** The store holds the toast queue only (ADR-0002).
5. **Product picker is search-then-pick, not a combobox.** Smaller and safer; a combobox is a later decision if needed.
6. **Create adjustment from the bulk bar works for exactly one product.** Multi-product adjustment is out of scope.
7. **Dependencies:** `react-hook-form` and its Zod resolver, `@reduxjs/toolkit` and `react-redux` are expected and are the only additions allowed. The plan lists exact versions and Martin confirms. Anything else, ask first.
8. **No edit and no delete of movements**, ever. No draft persistence in storage.

## Does not include

- Editing or deleting a movement, bulk or multi-product movements, CSV import.
- Showing a product's movements from Products ("View movements"), text search on Movements.
- Mobile card layout, density toggle, jumping to an arbitrary position in the history.
- The Orders-driven movements (reservation, picking) and anything audit-related beyond what the handler already does.

## Notes

- Contract changes live in `packages/contract` with tests; stock rules stay in `@stockroom/domain` and the handler calls them.
- Reuse, do not rewrite: `Dialog`, `ErrorBanner`, `Button` with `disabledReason`, `RowActionsMenu`, `Table.BulkBar`, `useLocations`, `useUsers`, `useProducts`, `signedQuantity`, `shortId`, `MOVEMENTS_QUERY_KEY`.
- Verify the react-hook-form, Redux Toolkit and `@tanstack/react-query` optimistic-update documentation before writing code (as the ADR says for the virtualizer); the details of cache snapshot and rollback with `useInfiniteQuery` data shape (`pages` and `pageParams`) are where mistakes happen.
- The plan must say how the optimistic row is shaped (a movement with a temporary id) and how the virtualized list's `aria-rowcount` and `aria-rowindex` stay correct when it is inserted and replaced.
- This is the project's showcase mutation: prefer a small, well-tested flow over a clever one.
