# Feature: Domain core

Pure TypeScript rules for stock, orders and permissions in `packages/domain`. No React, no browser APIs, no I/O, no `Date.now()` or `Math.random()` (time is a parameter). Everything is deterministic and tested in isolation. The seed, the MSW handlers and later the real API call these functions; nobody re-implements them.

Read first: `context/project-overview.md` ("Domain rules"), ADR-0003 (availability), ADR-0004 (permissions), `context/coding-standards.md`. Contract types come from `packages/contract` (see `contract-seed-msw-spec.md`, phase 1, which must be merged first).

## Goals

### Stock

- [ ] `onHand(movements, { productId, locationId? })`: stock from the movement log. `RECEIPT` adds at its location. `ISSUE` subtracts. `ADJUSTMENT` adds or subtracts by `direction`. `TRANSFER` subtracts at the source and adds at the destination (total per product unchanged).
- [ ] `stockByLocation(movements)`: map of product to location to quantity, computed in one pass (the seed and the products list need it for tens of thousands of movements).
- [ ] `reserved(orders, productId)`: sum of line quantities on orders in `CONFIRMED` or `PICKED`. `available = onHand(product) - reserved` (ADR-0003).
- [ ] `validateMovement(input, state)` returns `Result<void, MovementError>`. `MovementError` carries a code and the numbers the UI needs ("only 14 on hand now"):
  - `ISSUE`: quantity must not exceed `onHand` at the location, nor `available` for the product.
  - `TRANSFER`: quantity must not exceed `onHand` at the source location. Reservations do **not** limit a transfer, because it does not change the product total (see Decisions, point 1).
  - `ADJUSTMENT` with `DECREASE`: must not take the location below zero, nor the product below `reserved`.
  - `ADJUSTMENT` requires a non-empty reason. `TRANSFER` source and destination must differ.
- [ ] `allocateIssue(stockByLocation, productId, quantity)`: deterministic split of a shipped quantity across locations (largest on-hand first, ties broken by location code). Used when an order ships.

### Orders

- [ ] `computeOrderTotals(lines)`: `subtotalCents`, `vatCents` (25 % of the subtotal, rounded half up to the cent, once on the subtotal, not per line), `totalCents`. Integer arithmetic only.
- [ ] State machine as data: `DRAFT -> CONFIRMED -> PICKED -> SHIPPED`; `CANCELLED` from `DRAFT`, `CONFIRMED` and `PICKED`; nothing leaves `SHIPPED` or `CANCELLED`. `canTransition(from, to)` and `nextStatuses(from)`.
- [ ] `transitionOrder(order, to, ctx)` returns `Result<TransitionOutcome, TransitionError>`:
  - invalid edge -> `INVALID_TRANSITION`
  - `DRAFT -> CONFIRMED` refused while any line exceeds availability, with the list of affected lines and their available quantities (a line's own draft quantity does not count as reserved)
  - `PICKED -> SHIPPED` returns the `ISSUE` movements to write (via `allocateIssue`, with deterministic ids derived from order id and line id for idempotency)
  - on success returns the new status and the timeline entry (`from`, `to`, `userId`, `at`)
- [ ] `canEditOrder(order)`: lines editable only in `DRAFT`.
- [ ] Exhaustive `switch` with a `never` check wherever statuses or movement types are branched on.

### Permissions

- [ ] `can(user, action, resource?)` as a pure function. Actions are a typed union, not strings. Matrix is data (a table), so a test can enumerate every role and action:

| Action | ADMIN | CLERK | VIEWER |
|---|---|---|---|
| view anything, filter, sort, export CSV | yes | yes | yes |
| `movement.create` | yes | yes | no |
| `order.create`, `order.edit` | yes | yes | no |
| `order.transition` (confirm, pick, ship) | yes | yes | no |
| `order.cancel` | yes | yes | no |
| `product.create` | yes | no | no |
| `product.archive`, `product.update` | yes | no | no |
| `role.change` | yes | no | no |

- [ ] `denialReason(user, action)` returns the text for the disabled-control explanation (VIEWER: "Your role is read-only").

### Tests

- [ ] Table-driven tests for every rule above, including the boundaries (exactly zero, exactly available, one over).
- [ ] Permissions: a test that enumerates all roles times all actions and compares with the matrix.
- [ ] State machine: every pair of statuses is checked; only the allowed edges pass.
- [ ] Invariants over seeded pseudo-random movement sequences (a tiny deterministic generator in the test file, no new library): accepted movements never make any location negative; a `TRANSFER` never changes a product total; `available` never exceeds `onHand`.
- [ ] `computeOrderTotals` against hand-computed cases, including rounding at half a cent.

## Decisions in this spec

1. **ADR-0003 needs one clarification.** It says a manual `ISSUE` or `TRANSFER` cannot exceed *available*. For `TRANSFER` that is wrong: moving stock between locations does not reduce what is on hand, so a reservation must not block it. This spec limits `TRANSFER` by on hand at the source location and `ISSUE` by both location on hand and product availability. Amend ADR-0003 accordingly.
2. `Result<T, E>` is a small discriminated union defined in `domain` (`{ ok: true, value } | { ok: false, error }`), no library.
3. Time is always a parameter (`at`, `now`). Ids for generated movements are derived from inputs, not random.

## Does not include

- React hooks, the permission HOC, or any UI (the role-based UI feature uses `can`).
- The contract schemas (phase 1 of the other spec) and any seed or handler code.
- Persistence or concurrency control. The real API handles the "two confirms at once" case in phase 2.

## Notes

- No new libraries. Property-testing libraries (fast-check) are out unless Martin approves.
- Depends on: contract phase 1 merged (ADR-0004 is accepted).
