# Feature: Contract, seed and mock API

Foundation for everything else in phase 1. Defines the API contract once (Zod), generates deterministic data, and serves it through MSW so the frontend never knows whether the API is real.

Read first: `context/project-overview.md` (domain rules, data strategy), `context/coding-standards.md`, ADR-0003 (availability), ADR-0002 (state).

## Phases (one PR each, in this order)

1. **Contract** (`packages/contract`): schemas, inferred types, query and error shapes. No data, no handlers.
2. **Domain core** (`packages/domain`): a separate spec, written next. It supplies `computeOnHand`, `computeAvailability`, the order state machine and `can(user, action, resource)`. The seed and the handlers import these; they must not re-implement them.
3. **Seed** (`packages/seed`): deterministic data that follows the consistency rules.
4. **MSW handlers** (`apps/web/src/mocks`): the mock API over the contract, with latency and failure scenarios.

Phases 1 and 2 can be built in either order after this spec is approved; phases 3 and 4 need both.

## Goals

### Phase 1: contract

- [ ] Entities as Zod schemas with `z.infer` types, ids as UUID strings: `User` (role `ADMIN|CLERK|VIEWER`), `Category`, `Supplier`, `Warehouse`, `Location` (code like `A-01-03`), `Product`, `StockMovement`, `Order`, `OrderLine`, `OrderStatusChange`, `AuditLogEntry`.
- [ ] `Product`: sku, title, categoryId, brand, supplierId, `priceCents` (integer), weight, dimensions, `minimumOrderQuantity`, `reorderLevel`, `thumbnailUrl`, `archivedAt` (nullable).
- [ ] `StockMovement` is a discriminated union on `type`:
  - common: `id` (client-generated), `productId`, `quantity` (positive integer), `reason` (nullable), `createdBy`, `createdAt`
  - `RECEIPT`, `ISSUE`: `locationId`
  - `ADJUSTMENT`: `locationId`, `direction` (`INCREASE|DECREASE`), `reason` required
  - `TRANSFER`: `locationId` (source), `destinationLocationId`, must differ from source
- [ ] `CreateMovementInput` = movement without `createdBy` and `createdAt` (the server sets them).
- [ ] `Order` with `number` (`ORD-2026-NNNN`), `status` (`DRAFT|CONFIRMED|PICKED|SHIPPED|CANCELLED`), customer, lines, timeline. The API response includes `subtotalCents`, `vatCents`, `totalCents` computed by one shared function (VAT 25 %, rounding rule documented in the code); they are never stored.
- [ ] `AuditLogEntry` is a discriminated union: `MOVEMENT_CREATED`, `ORDER_STATUS_CHANGED`, `ORDER_EDITED`, `ROLE_CHANGED`.
- [ ] Availability read model: `ProductAvailability { productId, onHand, reserved, available }` (ADR-0003). The client never calculates it.
- [ ] Lists use `Page<T> = { items, total, page, pageSize }`. Each list has a query schema usable for URL parsing (invalid values fall back to defaults): products (search, category, stock status, archived, sort, page), movements (type, product, location, user, date range, sort, page), orders (status, search, sort, page), audit (event type, user, date range, page).
- [ ] `ApiError { code, message, details? }` with codes `VALIDATION_FAILED`, `FORBIDDEN`, `NOT_FOUND`, `INSUFFICIENT_STOCK`, `INVALID_TRANSITION`, `CONFLICT`. The `INSUFFICIENT_STOCK` details carry the current available quantity so the UI can show "only 14 on hand now".
- [ ] Endpoint map as a typed constant (path, method, request and response schema) so MSW, the client and later the real API share it:

| Method | Path | Notes |
|---|---|---|
| GET | `/api/users` | demo role switcher |
| GET | `/api/dashboard` | KPI fields and low-stock list as in `context/design/01-dashboard-default.png` |
| GET | `/api/products` | paged, filtered; includes availability |
| GET | `/api/movements` | paged, filtered |
| POST | `/api/movements` | idempotent on the client `id` |
| GET | `/api/orders` | paged, filtered |
| GET | `/api/orders/:id` | lines, totals, timeline |
| PATCH | `/api/orders/:id` | edit lines, `DRAFT` only |
| POST | `/api/orders/:id/transition` | `{ to: status }` |
| GET | `/api/audit` | paged, filtered |

- [ ] Schema tests: valid and invalid cases for every union member, TRANSFER with equal locations, ADJUSTMENT without reason, non-positive quantity.

### Phase 3: seed

- [ ] Catalog from a one-time snapshot of DummyJSON saved as `packages/seed/data/products.json`. The snapshot is fetched once by hand (Martin approves the download); the app never calls DummyJSON.
- [ ] Everything else from `@faker-js/faker` with a fixed seed: categories, suppliers, one or two warehouses with locations, staff (one `ADMIN`, one or more `CLERK`, one `VIEWER`), 12 months of movements, orders with lines, order timelines, audit entries.
- [ ] A fixed `NOW`. No timestamp is after it.
- [ ] Order of generation: movements first; stock is computed from them with the domain functions, never generated separately; no location ever goes negative; orders and their timelines next; audit entries last, derived from movements and order timelines.
- [ ] Orders reserve against available stock at the time they were confirmed; a `CONFIRMED`/`PICKED` order never shows a shortage.
- [ ] A `VIEWER` never creates a movement or edits an order.
- [ ] Money in integer cents; totals computed, not stored.
- [ ] Volume near the prototype: about 194 products, 48,000 movements, 26 orders, 52,000 audit entries. Generation must be deterministic and finish in a reasonable time in the browser (measure it and record the number in the PR).
- [ ] Consistency tests (these are the point of this phase):
  - same seed produces identical output (hash)
  - no negative stock at any location, at any point in the movement history
  - no timestamp after `NOW`
  - every `ORDER_STATUS_CHANGED` entry matches the order's real status path
  - `ORDER_EDITED` exists only for orders that were in `DRAFT`
  - dashboard "open orders" equals `DRAFT + CONFIRMED + PICKED`
  - no `VIEWER`-authored movements

### Phase 4: MSW handlers

- [ ] Handlers for every endpoint in the map, backed by an in-memory store initialised from the seed. Requests and responses are parsed with the contract in the handlers; a mismatch fails loudly in development.
- [ ] Current user comes from an `X-User-Id` header (set by the demo role switcher). Authorization uses `can(...)` from the domain package, not a copy.
- [ ] `POST /api/movements`: validates input, checks availability with the domain function, returns `201` for a new `id`, `200` with the stored movement for a repeat of the same `id` and payload, `409 CONFLICT` for the same `id` with a different payload, `409 INSUFFICIENT_STOCK` when stock is not enough.
- [ ] Order transitions follow the domain state machine; `CONFIRMED` is refused while any line exceeds availability; `CANCELLED` is reachable from `DRAFT`, `CONFIRMED` and `PICKED`.
- [ ] Every mutation appends the matching audit entry.
- [ ] Simulated latency (configurable, default 150-400 ms, deterministic from the request, not random per call).
- [ ] Scenario switch for the states the design shows: `normal`, `slow`, `empty`, `error`, selectable in development through a URL parameter (`?mock=error`) and a small dev-only panel is **not** part of this feature. Handlers read the scenario from one place.
- [ ] Contract tests run against the handlers (Vitest with MSW in Node): every endpoint's response parses with its schema; idempotency, insufficient stock, forbidden for `VIEWER`, invalid transition.
- [ ] MSW starts only in development and in the static demo build, never in a future real-API build.

## Decisions in this spec (confirm or change before `/feature load`)

1. Plain REST over JSON with `page`/`pageSize` pagination and totals (not cursors). It matches "Showing 1-50 of 12,430" and the numbered pagination in the design.
2. `quantity` is always a positive integer; the sign is derived from `type` (and `direction` for `ADJUSTMENT`). This keeps `TRANSFER` unsigned as decided in the overview.
3. Ids are UUID strings everywhere. Order numbers are a separate display field.
4. Movements, orders and audit entries are generated at startup from the seed (not committed as large JSON). Only the product catalog snapshot is committed.
5. Demo identity through the `X-User-Id` header; real auth is a phase 2 ADR.

## Does not include

- Domain logic itself (separate spec); the seed and handlers only call it.
- Any UI, hooks, TanStack Query setup or Redux.
- Bulk product actions (update category, archive, export CSV), product create/edit endpoints, CSV export. They come with the Products feature.
- Role-changed audit events being created by any endpoint (they exist in the seed only).
- The real backend, Prisma, auth.

## Notes

- No new libraries beyond: `zod` (contract), `@faker-js/faker` (seed), `msw` (web). Ask before adding anything else.
- Package boundaries: `contract` imports nothing from the workspace; `domain` imports `contract`; `seed` imports `contract` and `domain`; `apps/web` imports all.
- Update `context/project-overview.md` section "Open question: stock reservation" to point at ADR-0003 in the same PR as phase 1 (documentation only).
