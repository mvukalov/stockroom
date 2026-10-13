# Fix: Flaky NewMovement double-submit test

Feature 007, part 4. A small fix, not a feature. The test "sends one request however often Save is pressed" in the New movement tests fails now and then when the machine is under load (seen in 1 of 805 tests in `pnpm test` during the `007_03` review, and in 1 of 4 runs on a clean `main` under the same load). The drawer closes before the assertion runs, so the test checks a state that no longer exists. This fix makes the test deterministic. It changes no application behaviour.

Depends on: `004_02-new-movement-drawer-spec.md` merged (the drawer, the single-submit guard), `007_03-e2e-spec.md` merged (its notes record this flake and the follow-up name).

Read first: `context/coding-standards.md` (Testing), the New movement drawer tests (`apps/web/src/pages/.../NewMovement*.test.tsx`; find them with a search for "however often Save is pressed"), the mock handler for `POST /api/movements` and the latency it adds, `apps/web/src/test/` helpers, `vitest` config (timeouts, pool settings).

## Goals

- [ ] **Reproduce first.** Show the failure on the current code in a loop or under artificial load (for example `vitest run --repeat` on that file with the CPU busy, or several test processes in parallel). The plan states the command and how often it failed. No fix without a reproduction.
- [ ] **Find the cause in the plan.** The expected cause: the test relies on real timers and the mock's 150 to 400 ms latency, so under load the response arrives and the drawer closes before the assertion on the request count or the pending state. The plan confirms or corrects this from the code, not by assumption.
- [ ] **Make the test deterministic** by controlling the response: hold the mocked `POST /api/movements` response on a promise the test resolves (or use fake timers), assert the pending state and that exactly one request was sent while the response is held, then release it and assert the result. No `setTimeout`, no longer timeouts, no retries as the fix.
- [ ] **Check that the guard itself is real.** The test must fail when the single-submit guard is removed (break it on purpose, show the failure, restore it). If it passes without the guard, the test is wrong and the plan says so.
- [ ] **Look for the same pattern elsewhere.** Search the tests for other assertions that depend on the real mock latency while a dialog or drawer can close (Products dialogs, Order detail cancel, Undo toast). List them in the report. Fix only those that are the same kind of flake and small; report the others for a decision.
- [ ] **Evidence:** the loop or load command from the first goal now passes at least 50 runs in a row, and `pnpm test` plus `lint`, `typecheck` and `build` stay green.

## Decisions

1. **The test is wrong, not the app.** Unless the guard-removal check shows a real bug, no application code changes.
2. **Control the response, do not wait for it.** Determinism comes from the test owning the timing.
3. **No new libraries, no change to the mock's real latency** (the demo and the e2e suite rely on it).

## Does not include

- Rewriting the mock latency, changing Vitest pool or timeout settings to hide the flake, or any e2e change.
- Prettier cleanup of old files, the mobile nav drawer e2e test (both are separate notes from `007_03`).

## Notes

- Branch name: `fix/flaky-new-movement-test`.
- If the root cause turns out to be a real race in the drawer (for example the guard resetting too early), stop and report before changing application code.
