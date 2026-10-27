# ADR-0001: Router

- **Status:** Accepted
- **Date:** 2026-10-02
- Editorial revision 2026-10-27: removed references to job-market research; the decision is unchanged.

## Context

Stockroom needs client-side routing with URL-synced table filters (sorting, filters, pagination). The two serious options are React Router and TanStack Router.

## Options

1. **TanStack Router.** Fully type-safe routes and search params.
2. **React Router v7.** The most widely used React router. Search params are untyped by default.

## Decision

Use **React Router v7 in library/data mode** (`createBrowserRouter`), not framework mode. Framework mode is close to a full-stack framework, and the project does not use one (Next.js is not used either).

Typed search params are recovered without a second router: filters are read from `useSearchParams` and parsed through a Zod schema defined in `packages/contract`. The same schema validates the query on the (later) real API.

## Consequences

- Positive: the most widely used choice, typed filters through the existing contract.
- Negative: no compile-time check of route paths and params. Mitigation: route path constants and small typed helpers in `apps/web`.
- Revisit only if route-level type safety becomes a real source of bugs.

## Amendment (2026-10-05)

Pinned to the current major, React Router v8, as of 2026-10-05. Data mode is unchanged; `RouterProvider` is imported from `react-router/dom` (the separate `react-router-dom` package was removed in v8).
