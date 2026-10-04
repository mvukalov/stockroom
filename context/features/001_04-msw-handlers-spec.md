# Feature: MSW handlers

The mock API over the contract, in `apps/web/src/mocks`. Last of four foundation specs.

Depends on: specs 001_01 (contract), 001_02 (domain core) and 001_03 (seed) merged.

## Goals


- [ ] Handlers for every endpoint in the map, backed by an in-memory store initialised from the seed. Requests and responses are parsed with the contract in the handlers; a mismatch fails loudly in development.
- [ ] Current user comes from an `X-User-Id` header (set by the demo role switcher). Authorization uses `can(...)` from the domain package, not a copy.
- [ ] `POST /api/movements`: validates input, checks availability with the domain function, returns `201` for a new `id`, `200` with the stored movement for a repeat of the same `id` and payload, `409 CONFLICT` for the same `id` with a different payload, `409 INSUFFICIENT_STOCK` when stock is not enough.
- [ ] Order transitions follow the domain state machine; `CONFIRMED` is refused while any line exceeds availability; `CANCELLED` is reachable from `DRAFT`, `CONFIRMED` and `PICKED`.
- [ ] Every mutation appends the matching audit entry.
- [ ] Simulated latency (configurable, default 150-400 ms, deterministic from the request, not random per call).
- [ ] Scenario switch for the states the design shows: `normal`, `slow`, `empty`, `error`, selectable in development through a URL parameter (`?mock=error`) and a small dev-only panel is **not** part of this feature. Handlers read the scenario from one place.
- [ ] Contract tests run against the handlers (Vitest with MSW in Node): every endpoint's response parses with its schema; idempotency, insufficient stock, forbidden for `VIEWER`, invalid transition.
- [ ] MSW starts only in development and in the static demo build, never in a future real-API build.

## Decisions (confirmed)

- Plain REST over JSON with `page`/`pageSize` pagination and totals.
- Demo identity through the `X-User-Id` header; real auth is a phase 2 ADR.

## Does not include

- UI, TanStack Query hooks, the Redux mutation queue, a dev panel for scenarios.
- Product create/edit/archive endpoints, bulk actions, CSV export.
- The real backend.

## Notes

- New libraries: `msw` only. Ask before adding anything else.
- Handlers call `can(...)` and the other domain functions; no rule is copied into a handler.
