# Feature: Products bulk actions

Feature 003, part 2. Turns the read-only Products list into a working screen: row selection, a bulk bar, per-row actions, Update category, Archive and Export CSV. It adds `POST /api/products/bulk` to the contract and the mock, and it is the first feature with mutations, so it sets the pattern later mutations follow: confirmation dialog, pending state, error with retry, cache invalidation and permission-guarded controls that stay visible.

Depends on: `003_01-products-list-spec.md` merged, plus `002_05-data-table-spec.md` (selection, `Table.BulkBar`), `001_02-domain-core-spec.md` (`can`, `denialReason`) and `docs/adr/0003-stock-reservation.md`, `docs/adr/0004-clerk-permissions.md`.

Read first: `context/coding-standards.md` (React, Accessibility, Testing), `context/design-direction.md` (sections 5, 7, 9), ADR-0003, ADR-0004, `packages/domain/src/permissions.ts`, `packages/contract/src/errors.ts` and `endpoints.ts`, `apps/web/src/mocks/handlers/movements.ts` (mutation handler pattern), `apps/web/src/api/client.ts`, `002_05-data-table-spec.md` (selection, `BulkBar`). Visual reference only: `context/design/02-products-*.png`.

## Goals

### Contract and mock

- [ ] `POST /api/products/bulk` with a body that is a discriminated union on `action`: `SET_CATEGORY` (`ids`, `categoryId`) or `ARCHIVE` (`ids`). `ids` has 1 to 100 unique entries. Response `{ updatedIds: Id[] }`. New schemas in `packages/contract`, entry `bulkProducts` in `ENDPOINTS`, schema tests (including empty, duplicate and 101 ids).
- [ ] Errors use the existing contract error shapes: `FORBIDDEN` (role), `NOT_FOUND` (an unknown id or an unknown category), `CONFLICT` (archive refused, see Decisions 3) and the usual validation error. Check the shapes at load; if a shape cannot carry the message in Decisions 3, say so in the plan instead of inventing a new one.
- [ ] MSW handler with a mutable in-memory store: `SET_CATEGORY` changes `categoryId`, `ARCHIVE` sets `archivedAt`. The role is checked through `can` (`product.update` for `SET_CATEGORY`, `product.archive` for `ARCHIVE`), before anything else. The request is all-or-nothing: if any id fails, nothing changes. Both actions are idempotent (archiving an archived product or setting the current category is not an error and the id is in `updatedIds`).
- [ ] Contract tests over `msw/node`: each action as ADMIN, `FORBIDDEN` as CLERK and VIEWER, unknown id, unknown category, conflict with nothing changed, repeating a request, and the list reflecting the change afterwards.

### Selection and bulk bar

- [ ] `DataTable` gets `selectedIds`, `onSelectedIdsChange`, `getRowLabel` ("Select <title>"). Selection is page-scoped and resets on page, sort, filter and page-size change (the engine already does this). It also clears after a successful bulk action, explicitly through `onSelectedIdsChange([])`.
- [ ] `Table.BulkBar` shows "N products selected" (singular for one), a Clear button, **Update category**, **Archive** and **Export CSV**. The bar announces its appearance and count changes in a polite live region without stealing focus.
- [ ] Permissions through `can` and `denialReason`: Update category needs `product.update`, Archive needs `product.archive`, Export CSV needs `export`. A denied control stays visible, is disabled through the existing `Button` `disabledReason`, and the reason is reachable by keyboard and assistive technology. Today only ADMIN may update or archive; CLERK and VIEWER see both disabled with the reason, and all three roles may export.

### Row actions

- [ ] A trailing column with `id: 'actions'` and a visually hidden header holds a row actions button ("Actions for <title>") that opens a disclosure (same pattern as the Columns menu, not `role="menu"`) with **Update category** and **Archive** for that single product. Same permission rules, same disabled reasons, same dialogs with `ids` of length one. Archived rows have no Archive item and show no actions that make no sense (Update category stays available).
- [ ] The row actions disclosure closes on Escape, on outside click and after choosing an item, and returns focus to its button.

### Dialogs and mutations

- [ ] `useBulkProducts()` mutation hook over `apiRequest('bulkProducts', …)` with the acting user id passed explicitly (the audit and the permission check depend on it). It is a plain TanStack mutation; on success it invalidates `PRODUCTS_QUERY_KEY` and `DASHBOARD_QUERY_KEY` (archiving changes the low-stock list and the "Products in stock" card). Expected contract errors (`Result`) become a message shown in the dialog, not a thrown error.
- [ ] **Update category dialog** (native `<dialog>` with `showModal()`, as the drawer): title, the count, a labelled category `Select` (options from `useProductFilters`), Cancel and a primary "Update category". The primary action is disabled until a category is chosen and while pending (label changes to a pending state, no double submit). Focus goes into the dialog, Escape cancels (not while pending), focus returns to the control that opened it.
- [ ] **Archive confirmation dialog:** says how many products will be archived, that they leave active use but keep their history, and that this cannot be undone in the app (there is no unarchive). Cancel is the initial focus; the destructive action is not the default. Same pending, Escape and focus rules.
- [ ] Errors: the dialog stays open, shows an `ErrorBanner` with the message (for `CONFLICT` the message from Decisions 3, for network failure "We couldn't save the change. Check your connection and try again.") and the primary action becomes Retry. Retrying is safe because both actions are idempotent. The dialog never closes on failure.
- [ ] Success: the dialog closes, the selection clears, focus returns to the table (the bulk bar is gone, so focus moves to the table region or the toolbar search, plan's call, but never to `body`), and a polite status message says what happened ("3 products archived", "2 products moved to Garden"). The message is an `<output>` near the table that clears itself on the next user action. No toasts (they arrive with the Redux event-flow feature).

### Export CSV

- [ ] Client-side export of the selected rows on the current page through a pure `toCsv(rows, columns)` helper in `src/utils/`: header row, RFC 4180 quoting (quotes, commas, line breaks), CRLF line endings, a UTF-8 BOM so spreadsheet apps read it correctly, and CSV-injection protection (a cell whose first character is `=`, `+`, `-` or `@` is prefixed with a single quote). Columns: SKU, Title, Category, Brand, Price (decimal EUR, for example `12.50`, not the formatted string), On hand, Status, Archived (`yes`/`no`).
- [ ] A small `downloadCsv(filename, text)` helper builds a `Blob` and clicks a temporary anchor; filename `products-YYYY-MM-DD.csv`. The download itself is not unit tested beyond the helper calling the browser API (mock `URL.createObjectURL`); `toCsv` is tested in depth.
- [ ] Export needs no network and changes nothing, so it is available to every role and does not clear the selection.

### Tests, stories, gate

- [ ] Stories: bulk bar (none, some, all selected; ADMIN and denied), row actions menu (open, denied, archived row), both dialogs (default, pending, error, conflict message). Typed fixtures. The a11y addon reports no violations.
- [ ] Tests (React Testing Library, roles and labels, MSW node server): selection and the indeterminate header checkbox, bar count and live announcement; Update category flow end to end (list reflects the new category); Archive flow end to end (rows leave the list, dashboard query invalidated); archive blocked by a reservation shows the conflict message and nothing changes; failed request keeps the dialog open and Retry succeeds after the scenario switches to `normal`; no double submit while pending; Escape and focus return for dialogs and the row menu; permission matrix for ADMIN, CLERK and VIEWER (visible, disabled, reason available, mutation never sent); `toCsv` for quotes, commas, line breaks, injection characters, a title with a leading `=`, empty rows and non-ASCII text.
- [ ] `pnpm build`, `lint`, `typecheck`, `test` and `build-storybook` stay green. Check each new story at 375 and 1280 px with axe. At 375 px the bulk bar and dialogs must fit without sideways page scroll.

## Decisions

1. **Bulk actions are not audited in phase 1.** The audit union has no product event. Verify at load; if one exists, report it instead of adding a type here.
2. **Archive and Update category are all-or-nothing.** A request either changes every id or none. Partial success would need a per-id result and a different dialog.
3. **Archive is refused with `CONFLICT` when any selected product is reserved** on a `CONFIRMED` or `PICKED` order (ADR-0003; use the same reserved quantity the list read model already computes, do not recompute it). The message names the blocking products by SKU, at most five, then "and N more", and says to cancel or complete those orders first.
4. **A product that is already archived is not an error** for `ARCHIVE`, so retrying after a lost response is safe.
5. **ADMIN is the only role that can update or archive** (ADR-0004), and the denied controls stay visible with their reason. The UI check is a convenience; the handler repeats it.
6. **Success feedback is an `<output>` message, not a toast.**
7. **Limit of 100 ids per request** matches the largest page size, so a full page can always be selected and sent in one request.
8. **No new libraries.**

## Does not include

- "Select all matching" across pages, product create and edit forms, unarchive, product detail page.
- Create adjustment (comes with the New movement drawer feature, which adds it to the bulk bar and row menu).
- Undo, toasts and the Redux event-flow state (ADR-0002); they arrive with their own feature.
- Server-side CSV export of all matching products.

## Notes

- Mutations must carry the acting user: pass `userId` to the mutation, as `apiRequest` already requires.
- Dialogs: share one small `ConfirmDialog` or `Dialog` molecule if the plan finds the two dialogs have the same shell; do not build a generic modal system. Say in the plan what is shared.
- Contract changes live in `packages/contract` with tests; domain rules stay in `@stockroom/domain` and the handler calls them rather than copying them.
- Use the mock scenarios to check the states by hand: `?mock=slow` for pending, `?mock=error` for the failed request, and switch the user in the role switcher to check the three roles.
- Update the "Products" entry in `context/project-overview.md` only if the plan finds a statement that is now wrong; otherwise leave it.
