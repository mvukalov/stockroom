# Feature: Products

Draft: the number is provisional; renumber to the next free number when this spec is loaded.

Feature 005, part 2 of 2. The Products screen on top of `DataTable<T>`: URL-synced filters, status badges, bulk selection with bulk actions, and the loading, empty and error states from the prototype.

Depends on: `002_05-data-table-spec.md`, feature 001 (contract, domain, seed, MSW handlers), the app shell (shell, router, permission hook).

Read first: `context/project-overview.md` (domain rules, permissions), ADR-0003, ADR-0004, `context/design/tokens.md`, screenshots `context/design/02-products-*.png`.

## Goals

### Contract and mock additions

- [ ] `GET /api/products/filters` returns `{ categories: Category[], brands: string[] }` for the filter menus.
- [ ] `POST /api/products/bulk`, body a discriminated union on `action`: `SET_CATEGORY` (`ids`, `categoryId`) or `ARCHIVE` (`ids`). `ids` has 1 to 100 entries. Response `{ updatedIds }`. Errors: `FORBIDDEN`, `NOT_FOUND` (unknown id or category), `CONFLICT` (archive refused, see Decisions 4).
- [ ] Both are added to `ENDPOINTS` with schema tests, and to the MSW handlers with a mutable in-memory store. Handlers check the role through `can`.

### Screen

- [ ] Route `/products` (path constant). Data through a TanStack Query hook keyed by the parsed `ProductsQuery`; the response is parsed with the contract schema.
- [ ] Columns: SKU (mono), Title, Category, Brand, Price (right, formatted from cents as EUR), On hand (right), Status, row actions. Sort keys match `ProductsQuery`. A placeholder icon is shown instead of an image.
- [ ] Status badge shows icon and text (In stock, Low, Out), never colour alone. A shared `formatCents` helper is unit tested.
- [ ] Filters: search (SKU or title, committed to the URL after a short debounce), Category, Brand, Stock status, and a "Show archived" checkbox. Active filter chips and "Clear filters" come from `DataTable`.
- [ ] Header shows "<total> products" and the description from the prototype. Default page size is 25 (contract default).
- [ ] Bulk bar with "N products selected", clear, and: Update category (opens a dialog with a category select), Archive (confirmation dialog), Export CSV.
- [ ] Row actions menu: Update category and Archive for that one product (same mutations with one id). Already archived rows show an "Archived" badge and no Archive action.
- [ ] Export CSV: client-side from the selected rows of the current page, through a pure `toCsv(rows, columns)` helper (quotes, commas, line breaks, and a leading `=`, `+`, `-` or `@` neutralised). Unit tested.
- [ ] Permissions through `can`: Update category needs `product.update`, Archive needs `product.archive`, Export CSV needs `export`. A denied control stays visible with `aria-disabled` and its `denialReason` as the accessible description. Tests cover ADMIN, CLERK (no update, no archive) and VIEWER.
- [ ] Mutations show a pending state, then invalidate the products query. On error the dialog stays open with the error message and a retry. Both actions are idempotent, so a retry is safe.
- [ ] Tests: hook against MSW (URL to request params), filter and sort changes update the URL, bulk archive and category flows, error with retry, empty with filters, permission cases for all three roles.

## Decisions (proposed, Martin to confirm before load)

1. "New product" is out. The prototype shows the button but no form, and no endpoint exists. It becomes its own small feature if wanted.
2. "Create adjustment" is out here. It needs the New movement drawer feature, which adds it to the bulk bar and the row menu.
3. Thumbnails are not loaded. The prototype uses a generic icon, and this keeps the app from requesting images from DummyJSON at runtime.
4. Archive is refused with `CONFLICT` when any selected product is reserved on a `CONFIRMED` or `PICKED` order (ADR-0003). The whole request fails; nothing is archived partially.
5. Bulk actions on products are not audited in phase 1, because the audit union has no product event.
6. Archived products are hidden by default and shown with the "Show archived" checkbox. There is no unarchive.

## Does not include

- Product create and edit forms, product detail page, unarchive.
- Select-all across pages, virtualization, density toggle.
- Create adjustment (see Decisions 2).

## Notes

- Check at load whether the app shell already provides a typed API client over `ENDPOINTS`; if not, add the smallest one here.
- Contract changes live in `packages/contract` with tests; domain rules (reservation check for archive) reuse `reserved` from `@stockroom/domain`.
- Row height and thumbnail size follow the decisions in `design/tokens.md`.
