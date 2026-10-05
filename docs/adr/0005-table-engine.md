# ADR-0005: Table engine

- **Status:** Accepted
- **Date:** 2026-10-05

## Context

`DataTable<T>` is the generic table behind Products, Movements, Orders and Audit. The project overview left one question open before it is built: use a headless table library, or write the table ourselves.

What the table has to do here is narrower than what table libraries are built for:

- **Everything is server-driven.** Sorting, filtering and paging happen in the API (the contract list queries). The table renders the rows it is given and reports what the user asked for. Client-side sorting, filtering and pagination are not needed.
- **State that remains in the table:** typed column definitions, page-scoped row selection, column visibility, and the accessible markup (a real `<table>`, `aria-sort`, `aria-live` result count, focus behaviour).
- **No engine feature covers the accessibility work.** A headless library renders nothing, so the semantics, keyboard behaviour and announcements are written by hand with either option.
- **The public API must not expose the engine.** The spec defines `ColumnDef<T>` and compound parts (`Table.Toolbar`, `Table.BulkBar`, `Table.Pagination`, `Table.Empty`) over the contract, not over a library's types.
- **Virtualization is a separate decision** (its own ADR before the virtualized movements feature). It does not depend on the table engine: a virtualization library works with plain table markup.

Facts checked on 2026-10-05: `@tanstack/react-table` is at 9.2.5 (MIT, peer `react >=18`). This ADR does not rely on details of its v9 API, which should be read from the official docs if the option is chosen. No job-ad review was done for this decision, unlike ADR-0001 and ADR-0002, so there is no market evidence either way; add it here if Martin collects some.

## Options

1. **Own implementation.** Plain React and TypeScript: `ColumnDef<T>`, a small selection hook, column visibility state, the compound parts.
   - For: no dependency, the table logic that is left is small, full control of markup and accessibility, and the generics work (typed columns and sort keys checked against the row type) is visible in the repo, not hidden in a library.
   - Against: more own code to test; no ready-made engine features if requirements grow.
2. **TanStack Table (headless).** The engine handles column and row models, selection and visibility state.
   - For: the most recognised headless table, pairs with TanStack Query and later TanStack Virtual, manual (server-side) modes exist.
   - Against: v9 is a new major, so less community material and a learning cost. The public API must not expose it, so an adapter from our `ColumnDef<T>` to the library's definitions is needed, and the adapter is about as much code as the logic it replaces. The features it is strongest at (client sorting, filtering, paging, grouping) are explicitly unused here.
3. **A styled grid (AG Grid, MUI DataGrid).**
   - Rejected: ships its own styling and accessibility model, which conflicts with SCSS Modules and the design tokens, adds a large dependency, and replaces the work the project is meant to show.

## Decision

Use **option 1, our own implementation**, behind the public API in the DataTable spec.

The reasoning is proportion: with server-driven data, the engine would manage almost nothing we need, and the adapter needed to keep the public API engine-free costs about as much as writing the remaining logic directly. The accessible markup is hand-written either way.

## Consequences

- Positive: no new dependency for the table, a small and fully tested core, visible TypeScript generics, nothing to migrate when the library's major version changes.
- Negative: selection, visibility and column typing are our code and our tests. A reviewer may ask why TanStack Table was not used; the README and this ADR give the answer (server-driven, adapter cost, proportion).
- Mitigation: the engine is not part of the public API, so it can be replaced later without touching Products, Movements, Orders or Audit.
- Revisit if a feature needs column reordering, resizing, pinning, grouping or client-side data modes. Then adopt TanStack Table behind the same `ColumnDef<T>` API in a new ADR.
- Not decided here: the virtualization library (separate ADR before the virtualized lists feature).
