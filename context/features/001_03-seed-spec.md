# Feature: Seed

Deterministic data for phase 1, in `packages/seed`. Follows the consistency rules from `context/project-overview.md` section 8. Third of four foundation specs.

Depends on: `001_01-contract-spec.md` and `001_02-domain-core-spec.md` merged. The seed calls the domain functions for stock and availability; it never re-implements them.

## Goals


- [ ] Catalog from a one-time snapshot of DummyJSON saved as `packages/seed/data/products.json`. The snapshot is fetched once by hand (Martin approves the download); the app never calls DummyJSON.
- [ ] Everything else from `@faker-js/faker` with a fixed seed: categories, suppliers, one or two warehouses with locations, staff (one `ADMIN`, one or more `CLERK`, one `VIEWER`), 12 months of movements, orders with lines, order timelines, audit entries.
- [ ] A fixed `NOW`. No timestamp is after it.
- [ ] Order of generation: movements first; stock is computed from them with the domain functions, never generated separately; no location ever goes negative; orders and their timelines next; audit entries last, derived from movements and order timelines.
- [ ] Orders reserve against available stock at the time they were confirmed; a `CONFIRMED`/`PICKED` order never shows a shortage.
- [ ] A `VIEWER` never creates a movement or edits an order.
- [ ] Money in integer cents; totals computed, not stored.
- [ ] Volume near the prototype: about 194 products, 48,000 movements, 26 orders, 52,000 audit entries. Generation must be deterministic and finish in a reasonable time in the browser (measure it and record the number in the PR).
- [ ] Consistency tests (these are the point of this spec):
  - same seed produces identical output (hash)
  - no negative stock at any location, at any point in the movement history
  - no timestamp after `NOW`
  - every `ORDER_STATUS_CHANGED` entry matches the order's real status path
  - `ORDER_EDITED` exists only for orders that were in `DRAFT`
  - dashboard "open orders" equals `DRAFT + CONFIRMED + PICKED`
  - no `VIEWER`-authored movements

## Decisions (confirmed)

- Movements, orders and audit entries are generated at startup from the seed (not committed as large JSON). Only the product catalog snapshot is committed.
- All ids are UUID strings.

## Does not include

- Handlers or any HTTP layer (spec 001_04), UI, Prisma seed (phase 2).

## Notes

- New libraries: `@faker-js/faker` only. Ask before adding anything else.
- `packages/seed` imports `contract` and `domain`; nothing imports `seed` except `apps/web` (through the mock layer) and later the Prisma seed.
- Downloading the DummyJSON snapshot is a manual step that Martin approves.
