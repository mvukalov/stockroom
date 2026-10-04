# Current Feature

## Status

Not Started

## Goals

<!-- Goals of the loaded feature as checkable bullets. Filled by /feature load. -->

## Notes

<!-- Constraints, ADRs, does-not-include items, spec path. Filled by /feature load. -->

## History

<!-- Completed features, oldest first. Append only. -->

- **Contract** - Zod API contract in `packages/contract`: entities, movement/audit/error unions, read models, URL query schemas with fallbacks and the typed `ENDPOINTS` map (PR #12)
- **Domain core** - Pure rules in `packages/domain`: stock projection and derived availability, movement validation, issue allocation, order totals and state machine with deterministic shipping movements, permission matrix; table-driven and seeded invariant tests (PR #14)
