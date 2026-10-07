# ADR-0006: Virtualization library and loading strategy for long lists

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

The Movements screen shows the append-only history of every stock change: about 48,000 rows in the seed, and more in a real warehouse. Orders and Audit (about 53,000 events) are the same kind of list. `coding-standards.md` asks to virtualize long lists and to record before and after numbers, and the project overview names the movement history as the project's measured performance problem.

Two decisions are tied together, because the library only matters once the loading strategy is chosen:

1. **How rows reach the browser.** `GET /api/movements` is paged on the server (`page`, `pageSize` up to 100, `total`), and `DataTable<T, S>` (ADR-0005) renders exactly one page. A virtualized list over a page of 100 rows has nothing to virtualize.
2. **Which library renders only the visible rows.**

What the list needs:

- A real table for the user: header, sortable columns, row semantics, a visible count. Virtualization removes rows from the DOM, so the markup must still tell assistive technology how many rows exist and which one it is on (`aria-rowcount`, `aria-rowindex`).
- Fixed row height (`--table-row-height` is a token, and movement rows are one or two lines of text), so no row measuring is needed.
- A focused element inside a row (a button, a link) must not disappear when it scrolls out of the rendered window.
- It works with TanStack Query (ADR-0002) and does not expose its types in our public API.

Facts checked on 2026-10-06 in the npm registry: `@tanstack/react-virtual` 3.14.13 (MIT, peers `react` 16.8 to 19), `react-virtuoso` 4.18.12 (MIT, peers `react` 16 to 19), `react-window` 2.3.3 (MIT, peers `react` 18 and 19). Statements about features below come from each library's own documentation as read on that date; the plan must confirm the exact API in the official docs before writing code. No job-ad review was done for this decision, so there is no market evidence either way; add it here if Martin collects some.

## Options: loading strategy

A. **Numbered pages only (no virtualization).** What Products does. Simple and accessible, and it is the baseline we measure against. It does not show anything about long-list performance: the page never holds more than 100 rows.

B. **Infinite append, virtualized.** `useInfiniteQuery` loads pages of 100 as the user scrolls; the virtualizer renders only the rows in view. The table grows as far as the user scrolls. Filters and sort restart it from the first page.
   - For: fits the contract as it is (no new endpoint), the loaded rows are a plain array, and the before and after story is direct: the same loaded rows, rendered with and without virtualization.
   - Against: the scrollbar reflects only what is loaded, so the user cannot jump to "the oldest movements" (the date filter and the sort cover that). A refetch of an infinite query refetches every loaded page one after another, so it must not run on window focus (see Consequences).

C. **Sparse windowed fetching.** The virtualizer has `total` rows; the scrollbar spans the whole history; the page for the visible index is fetched on demand and unloaded rows show skeleton rows.
   - For: the best scrolling experience, and the strongest technical story.
   - Against: more own code (a sparse page cache keyed by index, request cancellation while scrolling fast, offset drift when a new movement is added while the user scrolls) for a list where nobody needs to scroll to row 31,000. It is the first thing to cut under the project's scope risk.

## Options: library

1. **`@tanstack/react-virtual` (headless).** Renders nothing; the caller owns the markup, so a real `<table>` with sticky header, our `ColumnDef` and our row semantics stay in our code. Works with fixed and measured sizes, has a documented infinite-scroll example with `useInfiniteQuery`, and sits in the same family as TanStack Query. Against: more wiring than a component library (spacer rows or absolute positioning for the table markup, keeping a focused row mounted through its `rangeExtractor`).
2. **`react-virtuoso`.** Has a `TableVirtuoso` component with table markup, sticky header and `endReached` for infinite loading, and measures row heights itself. Least code. Against: it owns the scroll container and the rendered structure, so our accessibility attributes, focus handling and styling go through its slots, and the generics work we want visible in the repo shrinks to configuration.
3. **`react-window`.** Small and fast for fixed-size lists, but it is a list and grid renderer, not a table. A `<table>` with a sticky header would mean working around it.

## Decision

- **Loading strategy: B, infinite append with virtualization**, plus A as a measured baseline (the same rows rendered without virtualization, used only by a story or harness, never in the product UI). Option C is recorded as a possible later improvement, not a requirement.
- **Library: `@tanstack/react-virtual`.** The reasoning is control over the markup. The hard parts of this list are the table semantics and focus behaviour, and a headless library leaves them in our code and in our tests, where they are visible. It also matches the TanStack Query decision, and its infinite-scroll pattern is the one we need.
- The public API of the new list component takes our `ColumnDef<T, S>` and plain props. No virtualizer type is exposed to pages.

## Consequences

- Positive: one new dependency, small and headless; the table markup, `aria-rowcount` and `aria-rowindex`, sticky header and focus rules are ours and tested; the before and after numbers compare like with like.
- Negative: more wiring than a component library, and virtualized tables have known limits: the browser's find-in-page cannot see rows that are not rendered, and screen reader table navigation depends on `aria-rowcount` and `aria-rowindex` being right. The README states these limits next to the numbers instead of hiding them.
- The infinite query must not refetch on window focus, and its stale time is long, because a refetch re-requests every loaded page. Anything that adds a movement later (the New movement drawer) resets the query to its first page instead of refetching all pages.
- The list requires its own component next to `DataTable`; `DataTable` keeps its page-based API (ADR-0005 stays unchanged: virtualization is not one of its revisit conditions). The new component reuses `ColumnDef`, the sort header, the state parts (skeleton rows, `ErrorBanner`, `EmptyState`) and the scroll region where they fit, and the plan says what it reuses.
- Revisit if a list needs to jump to arbitrary positions (option C), or if a second virtualized list (Audit) shows that the component should absorb more of `DataTable`.
- Not decided here: the movement list spec (`004_01`), which holds the exact goals, and the measurement method (decided in that spec's plan, recorded with the numbers).

## Note (2026-10-06, New movement drawer, spec 004_02)

"Resets the query to its first page" is refined: a confirmed new movement stays in place in a list that already shows it (newest first, filters matching), with the same id, so neither a refetch nor a scroll jump follows. Only a list that should hold the movement but could not show it at the top (another sort) keeps its first page alone and is refetched, one request instead of one per loaded page. Rows added or removed above the first row move the scroll position by their height when the list is scrolled, so the rows in view stay still.

## Revisit (2026-10-07, Audit log, spec 006_01)

The second virtualized list. Facts from the diff of that feature:

- **Shared as it was:** `VirtualTable` with no change to its code or props (sticky header, `aria-rowcount`/`aria-rowindex`, focused row kept, end skeletons, reset to the top), `ColumnDef`/`SortHeader` through `VirtualColumnDef`, `FilterChips`, `DateRangeFilter` and `isDateRangeInvalid`, `EmptyState`, `ErrorBanner`, `useTableSearchParams`.
- **Extracted from Movements, which now uses them with its existing tests unchanged (one test added for the fix below):**
  - `api/infiniteList.ts`: the page size of 100, `withoutPaging` and the options every infinite list shares (first page, next page while `page × pageSize < total`, previous rows kept, no refetch on focus or reconnect). Each list keeps its own key, request and stale time.
  - `hooks/useInfiniteListState.ts`: loaded rows and total, the refresh state, the error scoped to the list or to the next page, Load more without cancelling a request in flight, and the announcement after a filter or sort change. This was the only logic the two pages would have repeated line for line.
  - A bug fix in the same hook, which changes Movements too: without an acting user (the users request failed), Load more used to request the next page without a user in a loop. It now asks for nothing while no request can be sent (`canFetch`), and waits one commit after a user is back, because TanStack Query applies the query's new options in an effect of the page, after the list's near-end effect.
  - `OptionsState`/`OptionsNotice` (a molecule now) and `useCopyId`/`copyStatusText` (in `hooks/`), moved out of `pages/movements/`.
  - One generic addition outside `VirtualTable`: an optional `title` on a filter chip, so a shortened value (the Record id) can show the full one.
- **Copied on purpose:** the list card and toolbar layout (`AuditView.module.scss` repeats the card, toolbar, filter and copy status rules of `MovementsView.module.scss`), the view's frame around the table (toolbar row with Clear filters, chips, error banner, the invalid-range state, filtered and unfiltered empty states), the ID cell with Copy ID, and the `useInfiniteQuery` call of each list hook. The frame and the empty states are what `DataTable` provides as `Table.Toolbar` and `Table.Empty`, but those read `DataTable`'s context, so a `VirtualTable` page cannot use them; with two lists the copy is shorter than a new shared part, and it differs in filters and wording.
- **Freshness:** an action that adds an audit event (a movement, an order cancel) calls `resetQueries` on the audit key instead of invalidating it: an inactive log loads only its first page on the next visit instead of every page it had loaded.

Conclusion: a second list needed nothing new from `VirtualTable`. Sorting is already shared through `SortHeader`. The part both virtualized lists rebuilt is the frame `DataTable` has as compound parts (toolbar with Clear filters and chips, filtered empty state). That is the evidence for a later decision to give `VirtualTable` its own toolbar and empty parts if a third virtualized list appears. It is not decided here.
