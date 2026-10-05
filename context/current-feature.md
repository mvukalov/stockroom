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
- **Seed** - Deterministic phase 1 data in `packages/seed`: DummyJSON catalog snapshot plus a seeded chronological simulation of movements and orders through the domain rules, derived audit log; consistency tests for determinism, non-negative stock, status paths, DRAFT-only edits and role-at-time permissions (PR #15)
- **MSW handlers** - Mock API in `apps/web/src/mocks` over the contract: in-memory store from the seed, `X-User-Id` identity checked with `can`, idempotent movements, order transitions and audit entries through domain rules (new `stockStatus`, `isOpenOrder`, `diffOrderLines`, audit builders), deterministic latency, `normal`/`slow`/`empty`/`error` scenarios, dropped from `VITE_API_MODE=real` builds; contract tests with `msw/node` (PR #16)
- **Design tokens and atoms** - Visual foundation in `apps/web`: CSS custom property tokens with a reduced-motion override, self-hosted Inter and JetBrains Mono (latin + latin-ext), base styles with a global focus ring, ten accessible atoms (`Button` with `disabledReason`, `IconButton`, `Input`, `Select`, `Checkbox` with callback-ref `indeterminate`, `Badge`, `Skeleton`, `Avatar`, `VisuallyHidden`, `Icon`) and three domain badges over contract enums; contrast test reads `tokens.css`, control border darkened to `#7A8494` for 3:1 on every background (PR #19)
- **Storybook** - Storybook 10.6.1 in `apps/web` with the a11y and docs addons (exact-pinned, telemetry off): stories for every atom and the three domain badges (enum values from the contract), a Foundations/Tokens docs page with swatches, contrast table, type scale, spacing and radii read from `tokens.css`; contrast and token parsing extracted to `src/styles/contrast.ts` and shared with `tokens.test.ts` (`colourTokens` now throws on non-hex colours); manual axe pass over all 48 entries, 0 violations (PR #20)
