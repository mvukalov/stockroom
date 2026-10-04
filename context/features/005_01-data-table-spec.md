# Feature: DataTable

Draft: the number is provisional; renumber to the next free number when this spec is loaded.

Feature 005, part 1 of 2: `005_01-data-table`, `005_02-products`. A generic, typed `DataTable<T>` in `apps/web` that Products uses first and Movements, Orders and Audit reuse later. It is server-driven: it renders the rows it is given and reports what the user asked for (sort, page, page size, selection); it never sorts, filters or pages data itself. No product-specific code lives here.

Depends on: the tokens and atoms feature (002, with Storybook), the app shell (shell, router, TanStack Query, permission hook), ADR-0005 (table engine, accepted before code).

Read first: `context/project-overview.md` (section 6, DataTable), `context/coding-standards.md` (React, Accessibility, Testing), `context/design-direction.md`, `context/design/tokens.md` (section 3 decisions must be settled), screenshots `context/design/02-products-*.png`.

## Goals

- [ ] ADR-0005 (table engine: headless library vs own implementation) is accepted before any code. The public API below does not expose the engine.
- [ ] Typed column definitions: `ColumnDef<T>` with `id`, `header`, `cell` (render prop receiving the row; default reads a typed accessor), `sortKey` (optional), `align` (`start | end`), `mono`, `hideable`. Sort keys and accessors are checked against the row type; no casts at call sites. A type test (`expectTypeOf`) shows that a wrong key does not compile.
- [ ] Compound parts: `Table.Toolbar` (slot for filters), `Table.BulkBar` (shown while rows are selected), `Table.Pagination`, `Table.Empty`. `DataTable<T>` composes them; custom cells are render props.
- [ ] Controlled sorting: the header is a button with `aria-sort`; a click toggles ascending and descending for that column. The sort value uses the contract format (`field` or `-field`). Columns without `sortKey` render no button.
- [ ] Server-side pagination footer: "Showing 1-10 of 194 products", rows per page (10, 25, 50, 100), "Page 1 of 20", previous and next (disabled at the ends).
- [ ] Row selection: checkbox column and a header checkbox (checked, unchecked, indeterminate) for the rows on the current page, controlled through `selectedIds`.
- [ ] Column visibility menu ("Columns"), local UI state.
- [ ] States, each with a story: loading (skeleton rows in the same layout, `aria-busy`), empty, empty with active filters (message and "Clear filters"), error (what happened, what to do, Retry).
- [ ] Active filter chips with a remove button and "Clear filters". Generic: the caller supplies label, value and `onRemove`.
- [ ] URL-synced state: `useTableSearchParams(schema)` parses `useSearchParams` through a contract query schema (invalid values fall back to defaults) and exposes typed `setFilter`, `setSort`, `setPage`, `setPageSize`. Changing a filter, the sort or the page size resets the page to 1. Typing in search replaces the history entry; other changes push one.
- [ ] Accessibility: a real `<table>` with a visually hidden `<caption>`, `scope="col"`, row checkbox labels ("Select <row label>"), visible focus, full keyboard use. Result count and state changes are announced in a polite `aria-live` region. After paging or sorting, focus stays on the control the user used.
- [ ] Density from tokens: 40 px rows, 13 px cell text, numeric columns right-aligned with tabular numbers.
- [ ] Narrow viewports: the table scrolls horizontally inside its container; the page does not break at 375 px.
- [ ] Tests: React Testing Library for sorting (`aria-sort`, callback value), selection (indeterminate state), pagination bounds, every state and keyboard use; hook tests for URL parsing (including invalid params) and page reset. Stories: default, loading, empty, empty with filters, error, selection, wide data.

## Decisions (proposed, Martin to confirm before load)

1. Server-driven only. Products, Movements, Orders and Audit all page on the server, so client-side sort and filter are not supported.
2. Selection is page-scoped: it is cleared whenever the rows change (page, sort, filter, page size). "Select all matching" across pages is out; it would need server-side id lists.
3. Sorting toggles ascending and descending. There is no "unsorted" state, because every list has a default sort in the contract.
4. Column visibility is not persisted here. Persistent UI state belongs to the Redux slice from ADR-0002 and arrives when a feature needs it.

## Does not include

- Virtualization (the virtualized movement history feature).
- Product columns, filters and bulk actions (005_02).
- Density toggle, mobile card layout, "select all" across pages, column reorder or resize.

## Notes

- New libraries: only what ADR-0005 selects. Ask before adding anything else.
- `DataTable` does no data fetching and knows nothing about products.
- If an atom is missing from the tokens and atoms feature (002) (checkbox, select, skeleton, badge), add it with a story and say so in the PR.
