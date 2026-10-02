# Stockroom: Project Overview

> Source of truth for what Stockroom is, how it is built and what is in scope. Decisions live in `docs/adr/`. Update this file whenever a decision changes.

## 1. Purpose

Second portfolio project, next to `summit-drift-storefront`.

- **summit-drift** proves product quality: tests, a11y, performance, deploy.
- **Stockroom** proves **engineering depth**: advanced React patterns, TypeScript generics, state management, architecture, a real backend, Docker and CI/CD.

Target: strong mid-level frontend roles. Every feature exists because job ads ask for it (analysis of 14 ads, Oct 2026).

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
| Routing | React Router v7, library/data mode (not framework mode) | ADR-0001 |
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
Decisions, context files, ADRs, screen list, design direction, Lovable prototypes (screenshots only), manual repo bootstrap (`create-vite`, pnpm workspaces).

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
- `StockMovement` (append-only): id (client-generated UUID), type, productId, locationId, quantity, reason, createdBy, createdAt
- `StockLevel`: projection derived from movements, never edited directly
- `Order` with lines. Status machine: `DRAFT -> CONFIRMED -> PICKED -> SHIPPED`, plus `CANCELLED`
- `User` with role
- `AuditLogEntry`

Pure domain logic (stock calculation, order state machine, permission rules) lives in a framework-free package and is tested in isolation.

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

## 7. Screens (to prototype in Lovable, screenshots only)

Each screen is prototyped with its states: loading, empty, error, permission denied where relevant.

1. Dashboard: KPI cards, low-stock list
2. Products: `DataTable` with filters
3. Stock movements: virtualized history + "new movement" form
4. Orders list
5. Order detail: line items, status transitions
6. Audit log
7. VIEWER view: same screens with disabled actions

## 8. Data strategy

1. **Catalog:** one-time snapshot of DummyJSON products saved as `seed/products.json`. The app never calls DummyJSON at runtime.
2. **Everything else:** generated with `@faker-js/faker` and a fixed seed: suppliers, warehouses, locations, users per role, 12 months of movements, orders.
3. **Volume:** large on purpose, so virtualization and pagination are justified.
4. The same seed feeds MSW (phase 1) and the Prisma seed (phase 2).

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
