# ADR-0004: CLERK permissions for cancelling orders and archiving products

- **Status:** Accepted
- **Date:** 2026-10-04

## Context

The prototype review left one permission question open. `CLERK` can create movements, create and edit orders and move them through the status flow. It is undecided whether a `CLERK` may also cancel orders and archive products. Cancelling is irreversible and, for `CONFIRMED` and `PICKED` orders, releases reserved stock (ADR-0003). Archiving removes a product from use but keeps its history.

The permission function is `can(user, action, resource) -> boolean`, shared by UI guards and, in phase 2, the API.

## Options

1. **CLERK may cancel orders and may archive products.** Fewest blocked actions; weakest separation between daily work and catalog control.
2. **CLERK may cancel orders, may not archive products.** Cancelling is part of the order flow a clerk already runs. Archiving changes the catalog, which is an administrative act.
3. **CLERK may do neither.** Strongest control; a clerk must ask an admin to undo a wrong order, which makes the demo of `ADMIN` versus `CLERK` clearer but is unrealistic for a small warehouse.

## Decision

Option 2.

- `order.cancel`: `ADMIN` and `CLERK`. A `CLERK` can cancel orders in `DRAFT`, `CONFIRMED` and `PICKED`, the same states the state machine allows for anyone.
- `product.archive` and `product.update`: `ADMIN` only.
- `VIEWER` can do none of them.

The matrix lives as data in `packages/domain` and a test enumerates every role and action against it.

## Consequences

- Positive: the UI shows a real role difference (`CLERK` has no Archive), which is a good permission-guard demo; day-to-day order handling needs no admin.
- Negative: a clerk who cancels a confirmed order releases reserved stock without a second pair of eyes. Mitigation: the irreversible-action confirmation modal and the audit log entry.
- Revisit if cancel needs a reason or an approval step; that would be a new ADR.
