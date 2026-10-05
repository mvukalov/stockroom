# Feature: DataTable

Feature 002, part 5. A generic, typed `DataTable<T>` in `apps/web` that Products uses first and Movements, Orders and Audit reuse later. It is server-driven: it renders the rows it is given and reports what the user asked for (sort, page, page size, selection); it never sorts, filters or pages data itself. No product-specific code lives here, and there is no real screen in this feature: the table is built and proven in Storybook and tests, and Products (next feature) is its first user.

Depends on: `002_03-app-shell-spec.md` (router, API client) and `002_04-dashboard-spec.md` (`ErrorBanner`, `EmptyState`) merged, `001_01-contract-spec.md` (list queries, `pageSchema`, `PAGE_SIZE_OPTIONS`), and `docs/adr/0005-table-engine.md` accepted.

Read first: `docs/adr/0005-table-engine.md`, `context/coding-standards.md` (TypeScript, React, Routing, Accessibility, Testing), `context/design-direction.md` (sections 5, 7, 9), `packages/contract/src/queries.ts` and `pagination.ts`, `context/project-overview.md` (section 6, DataTable). Visual reference only: `context/design/02-products-*.png`.

## Goals

- [ ] Typed column definitions: `ColumnDef<T>` with `id`, `header`, `cell` (render prop receiving the row; default reads a typed accessor), `sortKey` (optional), `align` (`start | end`), `mono`, `hideable`. Sort keys and accessors are checked against the row type; no casts at call sites. A type test (`expectTypeOf`) shows that a wrong key does not compile. The public API does not expose any engine type (ADR-0005).
- [ ] Required row props: `getRowId` and `getRowLabel` (used for the selection checkbox label, "Select <label>"), a visually hidden `caption`, and an `itemNoun` ("products") used in the count text.
- [ ] Compound parts: `Table.Toolbar` (slot for filters), `Table.BulkBar` (shown while rows are selected), `Table.Pagination`, `Table.Empty`. `DataTable<T>` composes them; custom cells are render props. A column with `id: 'actions'` and a visually hidden header is the pattern for row actions; the table knows nothing about what the actions are.
- [ ] Controlled sorting: the header is a button with `aria-sort`; a click toggles ascending and descending for that column. The sort value uses the contract format (`field` or `-field`). Columns without `sortKey` render no button, and sorting is shown by icon and `aria-sort`, never by colour alone.
- [ ] Server-side pagination footer: "Showing 1-25 of 194 products", rows per page from `PAGE_SIZE_OPTIONS`, "Page 1 of 8", previous and next (disabled at the ends, with the reason available to assistive technology).
- [ ] Row selection: checkbox column and a header checkbox (checked, unchecked, indeterminate) for the rows on the current page, controlled through `selectedIds`. Selected ids never include rows that are not on the current page: after a page, sort, filter or page-size change the selection is empty. The mechanism is the plan's call (for example a `useRowSelection` hook that resets by key), without a `useEffect` that copies state.
- [ ] Column visibility menu ("Columns"), local UI state; columns marked `hideable: false` cannot be hidden.
- [ ] States, each with a story: **loading** (no rows yet: skeleton rows in the same layout, `aria-busy`), **refetching** (rows already on screen: keep them, mark the table `aria-busy` and visually dimmed, no skeleton flash when paging or sorting), **empty**, **empty with active filters** (message and "Clear filters"), **error** (what happened, what to do, Retry). Empty and error use the shared `EmptyState` and `ErrorBanner`.
- [ ] Active filter chips with a remove button and "Clear filters". Generic: the caller supplies label, value and `onRemove`.
- [ ] URL-synced state: `useTableSearchParams(schema)` parses `useSearchParams` through a contract list query schema (such as `ProductsQuery`; invalid values fall back to the schema's defaults) and exposes typed `setFilter`, `setSort`, `setPage`, `setPageSize` and the parsed query. It is generic over any schema whose output has `page`, `pageSize` and `sort`. Changing a filter, the sort or the page size resets the page to 1. Typing in a search filter replaces the history entry; other changes push one.
- [ ] Accessibility: a real `<table>` with `<caption>`, `scope="col"`, labelled row checkboxes, visible focus and full keyboard use (sort buttons, checkboxes, pagination and menus reachable and operable by keyboard). The count and state changes ("Showing 26-50 of 194 products", loading finished, error) are announced in a polite `aria-live` region. After paging or sorting, focus stays on the control the user used, so the pagination controls stay mounted while data is loading.
- [ ] Density from tokens: `--table-row-height` rows, `--font-size-table-cell` text, numeric columns (`align: 'end'`) right-aligned with tabular numbers.
- [ ] Narrow viewports: the table scrolls horizontally inside its own focusable container; the page does not scroll sideways at 375 px.
- [ ] Stories: default, loading, refetching, empty, empty with filters, error, selection (none, some, all), wide data. Stories use typed fixture rows and do not depend on products or on MSW. The a11y addon reports no violations.
- [ ] Tests (React Testing Library, roles and labels): sorting (`aria-sort`, callback value, no button without `sortKey`), selection (indeterminate state, reset when rows change), pagination bounds and page-size options, every state, keyboard use, hideable and non-hideable columns; hook tests for URL parsing (including invalid params) and page reset; a type test for column keys.
- [ ] `pnpm build`, `lint`, `typecheck`, `test` and `build-storybook` stay green.

## Decisions

1. **Own implementation, no table library** (ADR-0005). The public API stays free of engine types, so this can change later.
2. **Server-driven only.** Products, Movements, Orders and Audit all page on the server, so client-side sort and filter are not supported.
3. **Selection is page-scoped.** "Select all matching" across pages is out; it would need server-side id lists.
4. **Sorting toggles ascending and descending.** There is no "unsorted" state, because every list has a default sort in the contract.
5. **Column visibility is not persisted here.** Persistent UI state belongs to the Redux slice from ADR-0002 and arrives when a feature needs it.
6. **The table does not debounce or fetch.** The caller owns data fetching (TanStack Query keyed by the parsed query, keeping the previous page while the next one loads) and any debounce on search input.
7. **The Dashboard low-stock table stays a plain table.** It is not migrated to `DataTable` in this feature.

## Does not include

- Virtualization (its own ADR and the virtualized movements feature).
- Product columns, filters, bulk actions and any real screen (the Products feature).
- Density toggle, mobile card layout, "select all" across pages, column reorder, resize or pinning.
- Persisting column visibility.

## Notes

- No new libraries. Ask before adding anything.
- `DataTable` does no data fetching and knows nothing about products or any other entity.
- Reuse the atoms and shared molecules (`Checkbox` with `hideLabel` and `indeterminate`, `Select`, `Skeleton`, `IconButton`, `Badge`, `ErrorBanner`, `EmptyState`, `VisuallyHidden`). If an atom is missing something, say so in the plan before changing it.
- Suggested structure, to be confirmed in the plan: `src/components/organisms/DataTable/` with the parts co-located, the URL hook next to it or in `src/hooks/`. Co-locate `.module.scss`, `.test.tsx` and `.stories.tsx`.
- Real routing is needed only for the URL hook tests; use `createMemoryRouter` as the other tests do.
