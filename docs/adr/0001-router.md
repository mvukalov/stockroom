# ADR-0001: Router

- **Status:** Accepted
- **Date:** 2026-10-02

## Context

Stockroom needs client-side routing with URL-synced table filters (sorting, filters, pagination). The two serious options are React Router and TanStack Router. Job ads were reviewed (14 ads, Oct 2026): React Router is named explicitly in one ad ("React Router (or equivalent)"). No ad names TanStack Router. The evidence is small and should not be overstated.

## Options

1. **TanStack Router.** Fully type-safe routes and search params. Fewer recruiters know it.
2. **React Router v7.** The most widely recognised router and the only one named in an ad. Search params are untyped by default.

## Decision

Use **React Router v7 in library/data mode** (`createBrowserRouter`), not framework mode. Framework mode is close to a full-stack framework, and Next.js is deliberately avoided because summit-drift already covers it.

Typed search params are recovered without a second router: filters are read from `useSearchParams` and parsed through a Zod schema defined in `packages/contract`. The same schema validates the query on the (later) real API.

## Consequences

- Positive: the most recognisable choice, one fewer thing to explain, typed filters through the existing contract.
- Negative: no compile-time check of route paths and params. Mitigation: route path constants and small typed helpers in `apps/web`.
- Revisit only if route-level type safety becomes a real source of bugs.
