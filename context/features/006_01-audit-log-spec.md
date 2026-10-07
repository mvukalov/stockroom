# Feature: Audit log

Feature 006, part 1. The Audit log screen as a read-only, virtualized history of every recorded event (about 53,000 in the seed): who did what, to which record, and when. It is the second list built on `VirtualTable` after Movements, so besides the screen it answers the question ADR-0006 left open: how much of the Movements page was list-specific and how much should be shared. There are no mutations here, and no way to edit or delete an event.

Depends on: `docs/adr/0006-virtualization.md` (accepted; its "Revisit if a second virtualized list shows that the component should absorb more of `DataTable`" is checked in this feature), `004_01-movements-list-spec.md` merged (`VirtualTable`, `useMovements` pattern, `DateRangeFilter`-style date filter, `signedQuantity` is not needed), `005_01-orders-list-spec.md` (`DateRangeFilter`, `useSearchText`, `OrderNumberLink` pattern), `002_04-dashboard-spec.md` (`ErrorBanner`, `EmptyState`), `001_01` to `001_04` (contract, mock API), `docs/adr/0004-clerk-permissions.md`.

Read first: `docs/adr/0005-table-engine.md` and `0006-virtualization.md`, `context/coding-standards.md` (React, Accessibility, Testing, performance rule), `context/design-direction.md` (sections 5, 7, 9), `packages/contract/src/audit.ts`, `queries.ts` and `endpoints.ts`, `packages/domain/src/permissions.ts`, `apps/web/src/mocks/handlers/` (the audit handler), `apps/web/src/components/organisms/VirtualTable/`, `apps/web/src/pages/movements/` and `apps/web/src/api/movements.ts` (the pattern to follow and to compare against). Visual reference only: `context/design/05-audit-*.png` if present. The differences listed under "Decisions" win over the screenshots.

## Goals

### Contract, permission and mock (verify first, change only what is missing)

- [ ] Check `GET /api/audit` and `AuditQuery`: filters (event type, actor, date range, entity), sort keys, defaults, page size limit, the event shape (a discriminated union on type, with the actor, the time and the record it concerns) and the permission that guards it. The plan states what the screen needs that is missing and proposes the smallest contract change, as in `004_01` and `005_01`.
- [ ] Find out which roles may view the audit log (`PERMISSIONS`, ADR-0004). The plan names the permission and the roles. If some roles may not see it, the route and the sidebar entry follow the existing pattern for a denied screen (a visible, explained state, not a blank page and not a silent redirect), and the handler repeats the check. Report any difference from what the spec assumes instead of deciding it here.
- [ ] Options for the filters (event types come from the contract enum; actors from the existing `useUsers`) need no new endpoint. If another filter needs options, say so in the plan.

### Data loading

- [ ] `useAudit(query, userId)` in `src/api/audit.ts` over `useInfiniteQuery`: pages of 100 (or the contract's largest page size), keyed by the parsed `AuditQuery` without `page` and `pageSize`, using `apiRequest` and `orThrow`. `AUDIT_QUERY_KEY = ['audit']` is exported as a prefix. Same rules as Movements: no refetch on window focus, a long stale time with the reason in a comment, the next page requested near the end and never twice, a filter or sort change starts again at the first page and scrolls to the top.
- [ ] Anything the earlier infinite hook does that is not specific to movements (fetching near the end, the "next page failed" state, the guard against double requests, the scroll reset) is shared, not copied: the plan says what is extracted (for example a generic hook and a thin view helper), and `Movements` moves onto it with no change in behaviour. If extracting makes the code harder to read than two copies, the plan says so and keeps two copies, and records why in the ADR note below.

### Virtualized list

- [ ] The list uses `VirtualTable` with the same guarantees as Movements: `<table>` with `<caption>`, `th scope="col"`, `aria-rowcount` from the server total and `aria-rowindex`, sticky header, its own focusable labelled scroll container, no sideways page scroll at 375 px, a focused element inside a row never unmounted by scrolling, end skeleton rows while loading the next page and a quiet "End of history" line. No change to `VirtualTable`'s behaviour; if the plan finds it needs a small generic addition, it says what and why before changing it.
- [ ] A fixed row height (`--table-row-height`); long text is truncated with an ellipsis and a `title`, not wrapped.

### Columns and cells

- [ ] Columns: Date/time (sortable, through `formatDateTime`), Event (the event type as a text label, from one constant over the contract enum, with an icon or text, never colour alone; sortable if the contract allows), Actor (the user's name, with a fallback to a short id if unknown), Record (what the event concerns: for an order a link to `/orders/:id` with its number as the accessible name, for other records plain text; the plan lists each event type and what it shows), Summary (one line built from the event data by one pure, unit-tested function per event type, exhaustively switched on the union), ID (shortened id in the mono font with the same Copy ID behaviour as Movements, reused from `useCopyId` if it fits).
- [ ] The summary function covers every event type in the contract, tested for each. A type the UI does not know yet must be a compile error, not a blank cell (`assertNever`).
- [ ] No row detail, no expandable rows, no raw JSON view in this feature (fixed row height; see Decisions).

### Filters and URL state

- [ ] Filters in a toolbar (reuse the Movements and Orders pattern, do not copy it blindly): Event type (one value, per `AuditQuery`), Actor, From and To (through the existing `DateRangeFilter`, rejecting `from` later than `to` with the visible message and sending no such request), plus any filter the contract supports and the plan names.
- [ ] State lives in the URL through `useTableSearchParams(AuditQuery, { filterKeys })`; `page` and `pageSize` are ignored if present; invalid hand-edited values fall back to the schema defaults. Active filter chips (`FilterChips`) with remove buttons and "Clear filters", labels not raw values (raw as a fallback while options load or if they failed). If the actor options fail to load, that select is disabled with a visible reason and a Retry, and the list still works.

### States

- [ ] **Loading** (first page): skeleton rows in the final layout, a visually hidden "Loading audit log" status, `aria-busy`. **Fetching the next page**: the end skeleton row. **Filter or sort change**: a progress indicator (the shared `ProgressBar`), rows kept visible until the new first page arrives, then the list scrolls to the top.
- [ ] **Error**: `ErrorBanner` ("We couldn't load the audit log. Check your connection and try again.") with Retry; a failed next page keeps the loaded rows and retries only that page. **Empty history** (no filters): "No audit events yet". **Empty with filters**: "No events match your filters" and Clear filters. **Invalid date range**: the same idle state as Orders, with no request sent.
- [ ] Header block: "<total> events" (server `total`, `en-GB` number format, hidden until the first page arrives), a line "Append-only record of every change. Events cannot be edited or deleted." and a polite live region that announces the loaded count when filters or sort change, not on every scroll fetch.
- [ ] **Denied** (a role without the permission, if there is one): an `EmptyState` that says the audit log is not available for the role, with the reason from `denialReason`, and no request is sent.

### Revisit check for ADR-0006

- [ ] After the screen works, update `docs/adr/0006-virtualization.md` with a short, dated "Revisit" note: what Audit shared with Movements as it is, what had to be extracted or copied, and the conclusion on whether `VirtualTable` should absorb more of `DataTable` (for example sorting, filter chips, state parts). Facts from the diff, not opinions. This is the evidence for a possible later ADR, not a new decision in this feature.

### Tests, stories, gate

- [ ] Stories for the presentational view: data, loading, fetching the next page, filter change in progress, error, next-page error, empty, empty with filters, end of history, every event type, denied role, invalid date range, wide data. Typed fixtures, no MSW. The a11y addon reports no violations.
- [ ] Tests (React Testing Library, roles and labels, MSW node server, the scroll-size test helper from `004_01`): first page rendered with `aria-rowcount` and `aria-rowindex`; scrolling near the end requests the next page once and appends rows; only a window of rows in the DOM for a long list; sort and filter changes reset to the first page and the top; URL parsing with invalid values; chips and Clear filters keep `?mock=` and sort; From later than To sends no request; `?mock=empty`, `?mock=error` then Retry, `?mock=slow`; a failed next page keeps the rows; the focused Copy ID button stays mounted when scrolled out; the order link points to the order detail; the permission matrix for ADMIN, CLERK and VIEWER (what each role sees, request never sent when denied); the summary function for every event type; if a generic infinite hook was extracted, its own tests, and the Movements tests pass unchanged apart from imports.
- [ ] `pnpm build`, `lint`, `typecheck`, `test` and `build-storybook` stay green. Check each story at 375 and 1280 px with axe.

## Decisions

1. **Virtualized infinite append, like Movements.** About 53,000 events, found by filters and date, not by page number.
2. **No row detail.** Rows are one fixed-height line; the summary says what happened. A detail view (drawer, raw payload) is a later decision.
3. **Read-only, with no actions column.** An audit log is never edited.
4. **Share only what is truly common.** The plan chooses between extracting a generic infinite-list hook and keeping two copies, and records the reason either way; the ADR-0006 note holds the evidence.
5. **Permissions follow ADR-0004 and `permissions.ts`.** Whatever the contract and the permission table say wins over the assumptions in this spec; report differences.
6. **No new libraries.**

## Does not include

- Row detail, expandable rows, raw JSON view, export, saved filters, live updates.
- Text search over event contents, jumping to an arbitrary position (ADR-0006 option C).
- A new ADR (the revisit note is evidence only), the README, the measurement document (the Movements one stays the project's measured case).

## Notes

- Contract changes live in `packages/contract` with tests. The mock handler reads from `db`; do not copy data into new structures.
- Use the mock scenarios to check the states by hand: `?mock=slow`, `?mock=empty`, `?mock=error`, a very late scroll for the next page, and the three roles in the role switcher.
- Check which sidebar entry and route already exist for the audit log and replace the placeholder; follow the shell's title and focus handling.
- Update the "Audit log" entry in `context/project-overview.md` only if the plan finds a statement that is now wrong.
