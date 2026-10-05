# Stockroom: Coding Standards

## TypeScript

- `strict: true`, plus `noUncheckedIndexedAccess`. No `any`; use `unknown` and narrow. `@ts-expect-error` only with a reason comment.
- Types come from Zod schemas in `packages/contract` (`z.infer`). Never hand-write a type that duplicates a schema.
- Prefer discriminated unions over optional flags (e.g. `StockMovement` by `type`, order status).
- Exhaustive `switch` with a `never` check on unions.
- Generic components (`DataTable<T>`) expose typed column definitions; no casts at call sites.

## Packages and boundaries

- `packages/domain`: pure TypeScript. No React, no browser APIs, no I/O. Deterministic and unit tested.
- `packages/contract`: Zod schemas and inferred types only.
- `packages/seed`: deterministic seed generation (fixed faker seed).
- `apps/web` may import from all packages; packages never import from `apps/*`.
- Permissions are the pure function `(user, action, resource) => boolean` in `domain`. UI guards call it; they never re-implement rules.

## React

- Function components and hooks only.
- Server data via TanStack Query hooks. Never copy server data into Redux or local state.
- Redux Toolkit holds only: mutation queue, undo stack, persistent UI state (see ADR-0002).
- Forms: react-hook-form with a Zod resolver, schemas from the contract.
- Mutations send a client-generated UUID so they are idempotent.
- Optimistic updates always have a rollback path and a test for it.
- Compound components for `Table.*`; render props for custom cells; HOC only for the permission guard.
- Keep components small. Extract a hook when logic is reused or hard to test, not before.
- No `useEffect` for derived data; compute it during render or with `useMemo` when measured.

## Routing

- React Router v8 data mode (ADR-0001). Route paths are constants.
- Table filters, sort and page live in the URL and are parsed with a contract Zod schema. Invalid params fall back to defaults.

## Styling

- SCSS Modules and design tokens (CSS custom properties). No hard-coded colours, spacing or font sizes in components.
- Atomic structure: atoms, molecules, organisms. Every shared component has a Storybook story with its states.
- Mobile-first, no fixed widths that break at 375 px.

## Accessibility

- Semantic HTML first; ARIA only where semantics are missing.
- Everything works by keyboard; visible focus; focus is managed on route change, dialogs and after mutations.
- Result updates use `aria-live`. Disabled actions for VIEWER are communicated, not just greyed out.
- axe runs in Playwright e2e and fails the build on violations.

## Naming and files

- Components `PascalCase.tsx`, hooks `useThing.ts`, utilities `camelCase.ts`, constants `UPPER_SNAKE_CASE`.
- Co-locate: `Thing.tsx`, `Thing.module.scss`, `Thing.test.tsx`, `Thing.stories.tsx`.
- Named exports; default export only where a tool requires it.
- Imports ordered: external, workspace packages, relative.

## Errors

- Validate at the boundary (API responses parsed with the contract; form input with Zod).
- Expected failures are values (typed error results); unexpected ones hit an error boundary.
- User-facing errors say what happened and what to do next. No silent catches.

## Testing

- Vitest for domain and utilities. Domain logic is tested exhaustively (stock projection, order transitions, permissions).
- React Testing Library tests behaviour through roles and labels, not implementation.
- Playwright e2e plus axe for key flows (create movement, order lifecycle, VIEWER restrictions).
- Contract tests run against MSW now and against the real API in phase 2.
- Do not write tests for their own sake; test where there is logic. Coverage gate in CI fails the build below the agreed threshold.

## Performance

- Virtualize long lists. Measure before and after and record numbers (this is README evidence).
- Server-side pagination for large tables.
- No memoization without a measured reason.

## Quality gate (before every commit)

`lint`, `typecheck`, `test`, `build` must all pass.
