# Feature: Contract

Feature 001 (foundation of phase 1), part 1 of 4: `001_01-contract`, `001_02-domain-core`, `001_03-seed`, `001_04-msw-handlers`. This one defines the API contract once (Zod) in `packages/contract`. No data, no handlers, no domain logic.

Read first: `context/project-overview.md` (domain rules), `context/coding-standards.md`, ADR-0003 (availability), ADR-0004 (permissions).

## Goals


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

## Decisions (confirmed)

1. Plain REST over JSON with `page`/`pageSize` pagination and totals (not cursors). It matches "Showing 1-50 of 12,430" and the numbered pagination in the design.
2. `quantity` is always a positive integer; the sign is derived from `type` (and `direction` for `ADJUSTMENT`). This keeps `TRANSFER` unsigned as decided in the overview.
3. Ids are UUID strings everywhere. Order numbers are a separate display field.
4. Movements, orders and audit entries are generated at startup from the seed (not committed as large JSON). Only the product catalog snapshot is committed.
5. Demo identity through the `X-User-Id` header; real auth is a phase 2 ADR.

## Does not include

- Domain logic (spec 001_02), seed data (001_03), MSW handlers (001_04).
- Any UI, hooks, TanStack Query setup or Redux.
- Bulk product actions, product create/edit endpoints, CSV export (they come with the Products feature).

## Notes

- No new libraries beyond `zod`. Ask before adding anything else.
- `packages/contract` imports nothing from the workspace.
- Update `context/project-overview.md` is not needed; ADR-0003 and ADR-0004 are already referenced there.
