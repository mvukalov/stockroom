# Stockroom: Project Overview

> Source of truth for what Stockroom is, how it is built and what is in scope. Decisions live in `docs/adr/`. Update this file whenever a decision changes.

## 1. Purpose

Stockroom is an inventory and orders management app for a small warehouse. It is built around problems that are hard to get right in a front end: stock derived from an append-only event log, safe optimistic updates with rollback, role-based UI, very large tables, and an API contract shared by the client, the mock and the real backend.

Engineering goals:

- Advanced React patterns, TypeScript generics, clear state management and a framework-free domain layer.
- Tests, accessibility and performance that are measured, not assumed.
- A thin real backend, Docker and CI/CD in later phases, behind the same contract.

The project is developed in the open: decisions are recorded as ADRs in `docs/adr/`, and the AI-assisted workflow is kept in the repository (`context/`, `.claude/`).

## 2. What it is

An inventory and orders management app for a small warehouse. Neutral ERP-style domain, no branding theme.

- **Users:** `ADMIN`, `CLERK`, `VIEWER`.
- **Core idea:** stock levels are not stored numbers. They are a **projection of an append-only log of stock movements** (`RECEIPT`, `ISSUE`, `TRANSFER`, `ADJUSTMENT`). This gives an audit trail, safe optimistic UI with idempotent writes, and a light CQRS/event-sourcing flavour.

Language: English only (UI, content, code, docs, commits).

## 3. Stack (decided)

| Area | Choice | Record |
|---|---|---|
| Language | TypeScript, strict | |
| UI | React 19 + Vite | |
| Monorepo | pnpm workspaces | |
| Routing | React Router v8, library/data mode (not framework mode) | ADR-0001 |
| Server state | TanStack Query | ADR-0002 |
| Client state | Redux Toolkit (event-flow state only) | ADR-0002 |
| Forms and validation | react-hook-form + Zod | |
| Styling | SCSS Modules + design tokens | |
| Components | Atomic design system + Storybook | |
| Mocking (phase 1) | MSW over the shared contract | |
| Fake data | `@faker-js/faker` with a fixed seed | |
| Tests | Vitest, React Testing Library, Playwright + axe, contract tests | |
| CI/CD | GitHub Actions, Lighthouse CI, Docker | |

Not used: Next.js (summit-drift covers it), Tailwind, Angular/Vue.

### Still open (decide via ADR before the phase that needs it)

- Table engine for `DataTable<T>`: headless library vs own implementation (before the DataTable feature)
- Virtualization library (before the virtualized lists feature)
- API framework: Fastify or Hono (before phase 2)
- Auth: sessions or JWT (before phase 2)
- Deploy target: Fly.io or Render, AWS optional (before phase 3)

## 4. Phases

The API contract is defined first and does not change between phases, so the frontend is not rewritten when the real backend arrives.

### Phase 0: Planning
Decisions, context files, ADRs, screen list, design direction, Lovable prototypes (screenshots only, done), manual repo bootstrap (`create-vite`, pnpm workspaces).

### Phase 1: Frontend against a mocked API
- Contract package (Zod schemas shared by client, mock and real API).
- MSW handlers implementing the contract, backed by deterministic seed data.
- UI features (section 6), tests, Storybook.
- **Exit criteria:** every wave-1 feature works end to end on mocks; unit, component, e2e and a11y tests green; deployed as a static demo.

### Phase 2: Thin backend
- Real API in the same repo implementing the same contract.
- Postgres + Prisma seeded with the same data. Auth. Roles enforced server-side.
- **Contract tests run against both MSW and the real API.** Frontend code does not change.
- **Rule:** the backend only does what the frontend needs. No backend-only features.

### Phase 3: Infrastructure
- Docker Compose (app + db), multi-stage image.
- GitHub Actions: lint, typecheck, unit/component tests with coverage threshold, e2e + axe, Lighthouse CI budget, image build, deploy.

### Later (not planned)
Mobile client, real-time updates, Croatian locale.

## 5. Domain model (draft)

- `Product` (from seed): sku, title, category, brand, price, weight, dimensions, minimumOrderQuantity
- `Category`, `Supplier`, `Warehouse`, `Location`
- `StockMovement` (append-only): id (client-generated UUID), type, productId, locationId, destinationLocationId (`TRANSFER` only), quantity, reason, createdBy, createdAt
- `StockLevel`: projection derived from movements, never edited directly
- `Order` with lines. Status machine: `DRAFT -> CONFIRMED -> PICKED -> SHIPPED`, plus `CANCELLED`
- `User` with role
- `AuditLogEntry`: movement created, order status changed, order edited, role changed

Pure domain logic (stock calculation, order state machine, permission rules) lives in a framework-free package and is tested in isolation.

### Domain rules (decided during prototype review, Oct 2026)

These are the rules the prototype settled. The domain package must enforce them and tests must cover them.

**Stock movements**
- The movements list always shows the sign: `RECEIPT` is positive, `ISSUE` is negative, `ADJUSTMENT` can be either. Whether the sign is stored on `quantity` or derived from the type is an implementation detail for the contract; decide it once in `packages/contract` and keep the domain rules identical.
- `TRANSFER` is **one** movement with a source and a destination location, not two linked rows. Its quantity is unsigned and positive, and it is shown without a sign (for example `32` with `A-01-03 -> B-01-04`).
- `ISSUE` and `TRANSFER` cannot exceed the stock available at the source location. An `ADJUSTMENT` cannot take stock below zero. Violations are blocking validation errors (Save is disabled), not warnings.
- `ADJUSTMENT` requires a reason. Other types have an optional reason.
- Movements are immutable and there is no delete. A mistake is corrected with a new `ADJUSTMENT`.
- **Undo is a pre-commit window, not a reversal.** After "Save movement" the row appears in a pending state with a "Saving movement... Undo" toast for 5 seconds. Undo within that window discards the movement without ever sending it. After the window it is committed and can only be corrected by an adjustment.
- If the server rejects a movement (for example stock changed in the meantime), the optimistic row rolls back to a failed row with the cause ("Could not save: only 14 on hand now") and a visible Retry. Retry reuses the same client-generated ID, so it is idempotent.

**Products**
- There is no direct stock editing and no product deletion. Stock is changed with "Create adjustment"; products are removed from use with "Archive". A product with history keeps its movement history.
- Bulk actions on a selection: Update category, Create adjustment, Archive, Export CSV.

**Orders**
- Lines are editable only in `DRAFT`. `CONFIRMED`, `PICKED` and `SHIPPED` are read-only.
- **Confirm is blocked while any line exceeds available stock.** The UI states why ("2 lines exceed available stock. Reduce the quantity or remove the line to confirm.") and marks the affected lines. A confirmed, picked or shipped order can therefore never show a shortage.
- Subtotal, VAT (25 %) and total are always derived from the lines, never stored independently.
- Cancelling is irreversible and goes through a confirmation modal. `CANCELLED` is a terminal state reachable from `DRAFT`, `CONFIRMED` and `PICKED`; nothing follows it.
- Order numbers are `ORD-2026-NNNN` and increase with creation time. Each order has an activity timeline (status changes with user and time).
- Dashboard "Open orders" counts `DRAFT` + `CONFIRMED` + `PICKED`.

**Audit log**
- Read-only. Event types: movement created, order status changed, order edited, role changed. It contains more events than the movements list (movements plus order and user events).
- Audit entries must be consistent with current data: the order status in an event matches the order's real status path, and "order edited" events exist only for orders that were in `DRAFT` when edited.

**Permissions** (pure function `(user, action, resource) -> boolean`)
- `ADMIN`: everything, including creating products.
- `CLERK`: create stock movements, create and edit orders, move orders through the status flow.
- `VIEWER`: read-only. Every mutating control stays visible but is disabled with the explanation "Your role is read-only", plus a "Read-only access" badge in the top bar. Navigation, filters, sorting and Export CSV remain available.
- `CLERK` may cancel orders but may not archive or edit products (ADR-0004).

Stock reservation is decided in ADR-0003 (availability is derived: on hand minus quantities on confirmed and picked orders).

## 6. Scope of phase 1

### Wave 1 (core, must ship)

| Feature | What it proves |
|---|---|
| Contract package + seed + MSW handlers | Contract-first architecture |
| Domain package (stock projection, order state machine, permissions) | Framework-free logic, testing |
| Design tokens + base atoms + Storybook | Reusable component library |
| Generic `DataTable<T>`: sorting, filtering, column config, server-side pagination, URL-synced filters | TypeScript generics |
| Virtualized movement history (tens of thousands of rows) | Rendering performance, measured before/after |
| Create stock movement: react-hook-form + Zod, optimistic update with rollback, undo toast, idempotent writes | Async flows, state management |
| Orders with line items and status state machine | State-machine patterns |
| Role-based UI: permission hook, HOC guard, compound components (`Table.Toolbar`, `Table.Row`), render props for custom cells | Advanced React patterns |
| Dashboard (reduced): KPI cards + low-stock list | Derived state |
| Accessibility: keyboard-navigable tables, `aria-live` for results, focus management | A11y |

### Wave 2 (still phase 1, after wave 1 is green)

- Audit log view (same `DataTable` over movements and order events; cheap)
- Dashboard movement chart (lowest ad demand, last item, first to cut)
- Extra e2e and a11y coverage, Storybook completeness, static deploy polish

### Out of scope

Billing or paywall, multi-tenancy, barcode scanning, mobile app, real-time sync, Angular/Vue, Next.js, backend-only features, i18n beyond English.

## 7. Screens (prototyped in Lovable, screenshots only)

The prototype is done. Screenshots are in `context/design/` (see its `README.md` for naming and known prototype limitations). The Lovable code is throwaway and is not copied into the repo.

1. Dashboard: KPI cards, low-stock list (default, loading, empty, error)
2. Products: `DataTable` with filters, bulk selection (default, loading, empty with active filters, error)
3. Stock movements: virtualized history (default, loading, empty, error)
3b. New movement drawer: empty, validation errors, over stock, submitting (pending), success with Undo, failure with Retry
4. Orders list (default, loading, empty, error)
5. Order detail: Draft with shortages, Draft with stock OK, Confirmed, Picked, Shipped, Cancelled, loading, error, cancel confirmation modal
6. Audit log (default, loading, empty with filters, error, expanded row)
7. Shell: collapsible sidebar, top bar with search and role switcher

Not prototyped, specified by text only: the VIEWER pass (rules above), a narrow-viewport layout, per-tab empty states on Orders, the Dashboard movement chart. Mobile is desktop-first at 375 px minimum per `design-direction.md`.

## 8. Data strategy

1. **Catalog:** one-time snapshot of DummyJSON products saved as `seed/products.json`. The app never calls DummyJSON at runtime.
2. **Everything else:** generated with `@faker-js/faker` and a fixed seed: suppliers, warehouses, locations, users per role, 12 months of movements, orders.
3. **Volume:** large on purpose, so virtualization and pagination are justified. Prototype reference figures: about 194 products, 48,213 movements, 26 orders, 52,964 audit events.
4. The same seed feeds MSW (phase 1) and the Prisma seed (phase 2).
5. **Seed consistency rules** (the prototype showed how easily data contradicts itself):
   - The current moment is fixed in the seed; no timestamp is later than "now".
   - Stock levels are computed from the generated movements, never generated separately, so the dashboard, products, forms and order availability always agree.
   - Order statuses, order lines, totals and audit events are generated from the same source, so every audit event matches the order's real status path.
   - Staff are a small fixed set (one `ADMIN`, one or more `CLERK`, one `VIEWER`). A `VIEWER` never creates movements or edits orders.
   - Money is stored as integer cents and VAT is computed, not stored.

## 9. Architecture rules

- Monorepo: `apps/web`, `apps/api` (phase 2), `packages/contract`, `packages/domain`, `packages/seed`.
- Contract first: Zod schemas are the single source of truth for types, mocks and validation.
- The domain package has no React and no browser APIs.
- Mutations are idempotent: client-generated IDs make retries and optimistic updates safe.
- Permissions are a pure function `(user, action, resource) -> boolean`, reused by UI guards and later by the API.
- URL filters are parsed from `useSearchParams` through a Zod schema from `packages/contract`.
- Every significant decision gets an ADR.

## 10. Evidence to show on GitHub

Green CI badge, coverage threshold that fails the build, Lighthouse budget on every PR, deployed app and Storybook linked in README, all work through PRs and issues, README with decisions and trade-offs, one hard problem measured before/after (table performance with and without virtualization), `context/` and `.claude/` kept in the repo.

## 11. Main risk

Scope. Mitigation: phases with exit criteria, a thin backend, waves inside phase 1, and every phase leaves a usable, deployed state.
