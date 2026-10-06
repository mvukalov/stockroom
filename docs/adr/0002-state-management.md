# ADR-0002: Server state and client state

- **Status:** Accepted (Redux Toolkit assumed confirmed on 2026-10-02; flip to Superseded if Martin chooses Zustand)
- **Date:** 2026-10-02

## Context

The brief requires a clear separation of server state and client state. Server state (products, movements, orders, stock levels) is cached remote data. Client state is everything else. With server state handled by a query library, the remaining client state is small, so any client-state library has to justify itself with real work.

Job ads (14 reviewed, Oct 2026) name Redux explicitly in two (a React ad and Orqa) and Flux in a third (q agency, together with CQRS/event sourcing). They list these as examples, not requirements. Evidence is weak.

## Options

1. **Zustand.** Minimal, proportional to the amount of client state. Shows restraint.
2. **Redux Toolkit.** More ad coverage. Risk: looks like cargo cult if it only holds trivial UI state.

## Decision

- **TanStack Query** owns all server state.
- **Redux Toolkit** owns client state that is naturally an event flow:
  - the queue of optimistic mutations (pending, confirmed, rolled back),
  - the undo stack behind the undo toast,
  - UI state that must survive navigation (e.g. table column configuration).
- The order status state machine lives in the `domain` package (pure functions), driven by `useReducer` locally. It is **not** in Redux.
- Rule: no server data is copied into the Redux store.

The justification for Redux in the README and on interviews is the event flow (actions as events, reducers as projections), which mirrors the append-only movement log. It is not "global state".

## Consequences

- Positive: Redux Toolkit in TypeScript, a clear story linking Flux to event sourcing, strong separation of concerns.
- Negative: more boilerplate than Zustand for a small slice of state. Mitigation: keep slices few (`mutationQueue`, `undo`, `ui`).
- Revisit if the Redux slices stay trivial after wave 1. Then replace with Zustand in a new ADR.

## Note (2026-10-06, New movement drawer, spec 004_02)

The first slice is `toasts`: the toast queue and the Undo offer of each toast (shown, Undo started, succeeded or failed, dismissed). It holds client intent only (the message and the reverse movement Undo would send), never server data.

The optimistic movement itself does not go through a Redux `mutationQueue` slice. TanStack Query already holds the mutation: `onMutate` writes the row into the cached movement lists and `onSettled` replaces it or rolls it back, and `useMutationState` tells the list which rows are still saving. A Redux copy of that queue would duplicate state TanStack Query owns, which the rule above forbids. The `mutationQueue` and `ui` slices stay possible, but are added only when a feature needs state TanStack Query does not hold. The revisit condition stands: if `toasts` remains the only slice after wave 1, decide on Zustand in a new ADR.
