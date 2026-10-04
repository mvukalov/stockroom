# ADR-0003: Stock reservation for orders

- **Status:** Accepted (proposed by Claude, confirm with Martin; flip to Superseded if a stored reservation is chosen)
- **Date:** 2026-10-04

## Context

The prototype review settled that confirming an order must reserve stock and cancelling must release it. Two screens depend on it: Confirm is blocked while any line exceeds available stock, and the product list shows availability. The movement log is append-only and `StockLevel` is a projection of it, so a reservation must not break that purity.

"Available" needs a precise definition. An order is not a stock movement: nothing leaves the warehouse until it is shipped.

## Options

1. **Derived availability.** `available = onHand - reserved`, where `onHand` is the projection of movements and `reserved` is the sum of line quantities on orders in `CONFIRMED` or `PICKED`. Nothing new is stored.
2. **Reservation movements.** Add `RESERVE` and `RELEASE` movement types to the log. Everything is in one log, but the log now mixes physical facts with intentions, and every cancel writes compensating rows.
3. **Stored reserved column.** A `reserved` number on the stock level, updated on confirm and cancel. Fast to read, but it is exactly the kind of stored, drift-prone value the projection model exists to avoid.

## Decision

Option 1. Availability is derived, never stored.

- `onHand(product, location)`: projection of movements, unchanged.
- `reserved(product)`: sum of line quantities on orders with status `CONFIRMED` or `PICKED`. `DRAFT` and `CANCELLED` reserve nothing. `SHIPPED` reserves nothing because its `ISSUE` movements have been written and are already in `onHand`.
- `available = onHand - reserved`. Reservation is per product, not per location.
- Shipping writes `ISSUE` movements for the order lines in the same transaction as the status change. Idempotency key: order ID plus line ID.
- Cancel and ship need no compensating writes. Status alone changes what `reserved` returns.
- Validation uses `available`:
  - Confirm is blocked while any line exceeds `available`. The line's own draft quantity is not counted as reserved.
  - A manual `ISSUE` or `TRANSFER` cannot exceed `available`. `ADJUSTMENT` cannot take `onHand` below zero, nor below `reserved`.
- The calculation is a pure function in `packages/domain`: `computeAvailability(movements, orders)`. The API reuses it in phase 2.
- `Open question left to a later ADR:` whether CLERK may cancel orders or archive products.

## Consequences

- Positive: the movement log stays a pure record of physical events. No drift, no compensating rows, easy to test with plain fixtures.
- Positive: the order state machine and availability are independent pure functions.
- Negative: reading availability needs a join between movements and open orders. Mitigation: the seed and MSW compute it in memory; in phase 2 Postgres uses a view or query, and the contract returns `onHand`, `reserved` and `available` together so the client never calculates it.
- Negative: two concurrent confirms can both pass the check. Phase 1 mocks ignore this. In phase 2 confirm runs in a transaction that re-checks availability, and the API returns a conflict error the UI shows on the order.
- Revisit if the reservation query becomes a measured bottleneck. Then add a materialized view, not a stored column.
