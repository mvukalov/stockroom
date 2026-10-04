# Current Feature: Seed

## Status

In Progress

## Goals

<!-- Goals of the loaded feature as checkable bullets. Filled by /feature load. -->

- [x] Catalog from a one-time DummyJSON snapshot saved as `packages/seed/data/products.json`. Fetched once by hand with Martin's approval; the app never calls DummyJSON.
- [x] Everything else from `@faker-js/faker` with a fixed seed: categories, suppliers, one or two warehouses with locations, staff (one `ADMIN`, one or more `CLERK`, one `VIEWER`), 12 months of movements, orders with lines, order timelines, audit entries.
- [x] A fixed `NOW`; no timestamp is after it.
- [x] Generation order: movements first; stock computed from them with domain functions (never generated separately); no location ever goes negative; orders and timelines next; audit entries last, derived from movements and order timelines.
- [x] Orders reserve against available stock at the time they were confirmed; a `CONFIRMED`/`PICKED` order never shows a shortage.
- [x] A `VIEWER` never creates a movement or edits an order.
- [x] Money in integer cents; totals computed, not stored.
- [x] Volume near the prototype: ~194 products, ~48,000 movements, ~26 orders, ~52,000 audit entries. Deterministic, and fast enough in the browser (measure, record the number in the PR).
- [x] Consistency tests:
  - [x] same seed produces identical output (hash)
  - [x] no negative stock at any location, at any point in the movement history
  - [x] no timestamp after `NOW`
  - [x] every `ORDER_STATUS_CHANGED` entry matches the order's real status path
  - [x] `ORDER_EDITED` exists only for orders that were in `DRAFT`
  - [x] dashboard "open orders" equals `DRAFT + CONFIRMED + PICKED`
  - [x] no `VIEWER`-authored movements

## Notes

<!-- Constraints, ADRs, does-not-include items, spec path. Filled by /feature load. -->

- Spec: `context/features/001_03-seed-spec.md`. Rules: `context/project-overview.md` section 8.
- Depends on Contract (PR #12) and Domain core (PR #14), both merged. Seed calls domain functions for stock, availability, allocation, totals and transitions; never re-implements them.
- ADR-0003: availability is derived (`onHand - reserved`, reserved = `CONFIRMED` + `PICKED` lines, per product). Shipping writes `ISSUE` movements with idempotency key order ID + line ID. ADR-0004: CLERK may cancel orders, may not archive or edit products. No contradiction with the spec found.
- Decisions (confirmed): movements, orders and audit entries are generated at startup, not committed as JSON; only the catalog snapshot is committed. All ids are UUID strings.
- New library: `@faker-js/faker` only (named in project-overview). Ask before adding anything else.
- Boundaries: `seed` imports `contract` and `domain`; only `apps/web` (mock layer) and later the Prisma seed import `seed`.
- Does not include: handlers or HTTP layer (001_04), UI, Prisma seed (phase 2).
- Decisions taken at start:
  1. Audit volume: accept ~48.2k (one `MOVEMENT_CREATED` per movement plus order and role events). Record in the PR.
  2. One chronological simulation: movements and order events are processed in time order against a running stock state using domain functions only. Shipping `ISSUE` movements come from `transitionOrder` and are merged into the same log. Random outbound movements that fail `validateMovement` are clamped to `maxQuantity`, or become a `RECEIPT` when it is 0.
  3. `ORDER_EDITED` comes from a generator-internal edit log (0-2 edits per order, only while in `DRAFT`); the order stores its final lines only.
  4. `thumbnailUrl` keeps the DummyJSON CDN URLs (contract requires an absolute URL; the UI may show a generic icon instead).
  5. Staff: 1 `ADMIN`, 2 `CLERK`, 1 `VIEWER`; one clerk was promoted `VIEWER -> CLERK` (one `ROLE_CHANGED`). Movement authors are picked by role at that time; no demotion to `VIEWER`.
  6. Categories come from the snapshot's categories; suppliers are faker, assigned per brand. Ids via `deterministicId` with semantic keys.
  7. Orders: 26, `ORD-2026-0180..0205`, last ~5 weeks, status mix as the prototype (6 Draft, 6 Confirmed, 5 Picked, 4 Shipped, 5 Cancelled). `NOW = 2026-10-03T16:00:00Z`.
- Measured (default seed): 48,023 movements, 48,090 audit entries, 26 orders, 194 products (5 OUT, 5 LOW). Generation ~480 ms in Node (vitest), 327-389 ms in Chromium via Vite dev (plus ~320 ms module import). Node and browser output identical. Robust across seeds 1-30.
- Products without a DummyJSON brand (92 of 194) get one faker house brand per category.
- DummyJSON is consumer goods (some groceries have no brand), unlike the prototype's warehouse supplies. Accepted (decision in project-overview).

## History

<!-- Completed features, oldest first. Append only. -->

- **Contract** - Zod API contract in `packages/contract`: entities, movement/audit/error unions, read models, URL query schemas with fallbacks and the typed `ENDPOINTS` map (PR #12)
- **Domain core** - Pure rules in `packages/domain`: stock projection and derived availability, movement validation, issue allocation, order totals and state machine with deterministic shipping movements, permission matrix; table-driven and seeded invariant tests (PR #14)
