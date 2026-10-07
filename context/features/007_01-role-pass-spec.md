# Feature: Role pass (ADMIN, CLERK, VIEWER)

Feature 007, part 1. Every screen is built and every mutation exists, so this feature checks the one thing that cuts across all of them: what each role can see and do. It adds a permission matrix test that is derived from `@stockroom/domain` instead of typed by hand, a server-side check that no mutating endpoint is missing its role guard, tests for switching roles while the app is open, and the fixes for whatever gaps these checks find. It adds no screen and no endpoint.

Depends on: all of `003_02`, `004_02`, `005_02`, `006_01` merged (the mutating features), `001_02-domain-core-spec.md` (`can`, `denialReason`, `PERMISSIONS`), `docs/adr/0004-clerk-permissions.md`, `002_03-app-shell-spec.md` (the role switcher, `X-User-Id`).

Read first: `context/coding-standards.md` (Accessibility, Testing), `packages/domain/src/permissions.ts` and its tests, `packages/contract/src/endpoints.ts`, `apps/web/src/mocks/handlers/` (every handler that mutates), `apps/web/src/mocks/contract.test.ts`, the controls guarded by `can` in `apps/web/src/pages/` and `apps/web/src/app/` (find them with a search for `can(` and `denialReason`), and the existing per-page tests that already check a VIEWER (they stay; this feature adds the cross-cutting layer).

## Goals

### Inventory (first, as the plan's evidence)

- [ ] Produce the inventory as a table in the plan, from the code: every permission in `PERMISSIONS` with the roles that hold it, every UI control guarded by it (with its screen), and every mutating endpoint with the permission its handler checks. Each row is verified against the code, not copied from an ADR. Any permission without a UI control, any control without a `can` check, and any mutating endpoint whose handler does not check a permission are listed as findings.
- [ ] The inventory also lists what is deliberately open to everyone (read screens, Export CSV, Copy ID) and why, so the matrix test knows they are not omissions.

### Server side

- [ ] A contract-level test over `msw/node` that, for every mutating endpoint in `ENDPOINTS` and for every role, calls it with a valid body and asserts: roles that hold the permission succeed (or fail only with a business error, not `FORBIDDEN`), roles that do not get `FORBIDDEN` with nothing changed in the store. The list of mutating endpoints comes from `ENDPOINTS` (by method), so adding a mutating endpoint without a permission row makes the test fail instead of silently passing.
- [ ] The permission check happens before validation of business rules in every handler (a role without permission never learns whether the record exists). A test proves it for each mutating endpoint with an unknown id.

### Client side matrix

- [ ] One matrix test file for the web app that renders each screen that has a guarded control, once per role, and checks the controls against `can`: ADMIN, CLERK and VIEWER each see the controls visible; a denied control is disabled through `Button` `disabledReason`, its reason (from `denialReason`) is reachable by keyboard and assistive technology, and activating it sends no request (an MSW request spy proves it). The expected values are computed from `can(role, permission)`, never written as literals, so a change in `PERMISSIONS` changes the expectation and not the test.
- [ ] Screens and controls covered: Products (Update category, Archive, Create adjustment; bulk bar and row actions), Movements (New movement), Order detail (Cancel order). Anything else the inventory finds is added.
- [ ] Read access: every route is reachable by every role through its URL and shows its content (the `view` permission), and a role never sees a mutating control that it cannot use as an enabled control. Navigation items follow the same rule.

### Switching roles in a running app

- [ ] Switching the role in the role switcher updates every guarded control immediately, without a reload, and without refetching role-independent data (list queries have no user id in their keys). A test switches ADMIN to VIEWER and back on Products with a selection active, and checks the bulk bar, the row menu and the count.
- [ ] An open drawer or dialog during a role switch: the plan states what happens and a test proves it. The rule is that a role that lost the permission can never submit (the primary action becomes disabled with its reason, or the dialog closes with a visible message), and the server's `FORBIDDEN` is still handled with a message if a request goes out anyway.
- [ ] A toast already on screen (for example an Undo) after a role switch: the Undo is subject to the same rule, and a test covers a VIEWER receiving `FORBIDDEN` on Undo with the message shown.
- [ ] The acting user in every request is the selected user (`X-User-Id`), including requests started by a toast action after a switch; a test checks which user id the Undo request carries and the plan states which is intended.

### Fix what the checks find

- [ ] Each gap from the inventory and the tests is fixed in this feature when the fix is small and local (a missing `can` check, a missing handler guard, a control that is hidden instead of disabled, a missing reason), and reported separately, with the proposed fix, when it is not (a missing permission, a rule that needs an ADR). The report lists every gap, fixed or not.
- [ ] Known open item: the success toast of Products "Update category" and "Archive" is sent from a `mutate` callback that does not run if the user left the page while the request was pending. Fix it the same way as in Order detail (mutation-level `onSuccess`), with a test, if the inventory confirms it. This is the only fix here that is not about roles; it is included because it is a few lines in a file this feature touches anyway.

### Accessibility check by role

- [ ] axe on the Products, Movements and Order detail stories and live screens for the VIEWER (disabled controls with reasons are the new states), at 375 and 1280 px. The disabled-with-reason pattern must have an accessible name and description on every guarded control, with no `title`-only reasons.
- [ ] By hand, as the PR's evidence: the three roles through Products, Movements, Orders, Order detail and Audit log with the role switcher, noting anything that looks wrong.

### Tests, gate

- [ ] The matrix and the server-side test run in `pnpm test`; no new libraries, no e2e framework (that is the next feature). Existing per-page role tests stay unchanged.
- [ ] `pnpm build`, `lint`, `typecheck`, `test` and `build-storybook` stay green.

## Decisions

1. **Expectations come from the domain, not from the test.** A matrix typed by hand is a second copy of `PERMISSIONS` that drifts.
2. **Denied controls stay visible and disabled with a reason** (ADR-0004 and the earlier features). Hiding a control is a finding unless the inventory says it is deliberate.
3. **The server check is the real one;** the client check is a convenience, so both are tested and the server test is exhaustive over mutating endpoints.
4. **No permission is added or changed here.** A gap that needs a new permission or a rule change is reported for a decision, not decided in this feature.
5. **No new libraries and no e2e framework.**

## Does not include

- End-to-end tests in a real browser and the Playwright setup (next feature), CI, Docker.
- New screens, endpoints or roles; audit visibility changes (the audit log stays visible to all three roles through `view`, as decided in `006_01`).
- Authentication: the role switcher stays the project's stand-in for it.

## Notes

- Derive, do not duplicate: the roles list, `PERMISSIONS`, `can` and `denialReason` are the single source for the matrix.
- Use the role switcher and the mock scenarios for the manual pass: `?mock=slow`, `?mock=error`, all three roles.
- Update `context/project-overview.md` only if the inventory finds a statement about permissions that is now wrong.
