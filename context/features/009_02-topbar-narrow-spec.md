# Fix: Top bar at narrow widths

Feature 009, part 2. At 375 px the page title in the top bar is cut off on every screen (measured on the production site on 2026-10-27: Dashboard shows "Dash…", Products and Orders are cut too), and on Orders the role switcher shows a cut name ("Isidro Lehner · Ac"). The top bar is the first thing a phone user sees, and the README's mobile screenshot shows the cut title. This fix finds what takes the width, makes the top bar fit at phone widths without cutting the title, and adds a check so it cannot come back. It changes no behaviour and no data.

Depends on: `008_03-readme-spec.md` merged (the measurements are recorded in `process-notes/follow-ups.md`), `002_03-app-shell-spec.md` (top bar, role switcher, drawer navigation), `007_02-disabled-reason-spec.md` (the read-only badge), `007_03-e2e-spec.md`.

Read first: `context/design-direction.md` (top bar, typography, spacing), `context/coding-standards.md` (Accessibility, CSS), `apps/web/src/components/organisms/TopBar/` (`TopBar.tsx`, `TopBar.module.scss`), `apps/web/src/components/organisms/RoleSwitcher/` (`RoleSwitcher.tsx`, `RoleSwitcher.module.scss`), `apps/web/src/components/organisms/AppShell/`, the e2e files that check the shell and horizontal scroll, `process-notes/follow-ups.md`.

## Goals

### Measure first (the plan stops for approval)

- [ ] At 320, 360, 375, 412 and 768 px, and at 200 % text size at 375 px, measure for every route (Dashboard, Products, Movements, Orders, Order detail, Audit log) and for the three roles: the width of each top bar part (menu button, title, search placeholder when shown, role switcher label, select, read-only lock), the title's `scrollWidth` against `clientWidth`, and the select's visible text against its full text. Report the result as a table.
- [ ] The plan names what takes the width and by how much, for example the menu button, the gaps, the role switcher label, the select's `min-width`, the longest title ("Order ORD-2026-0202" style titles on Order detail included).
- [ ] The plan proposes the options with their trade-offs and **stops for approval before changing any file**. The options to weigh, not a decision made in advance: (a) hide the visible role switcher label below the `md` breakpoint and keep it as an accessible name; (b) reduce the select's `min-width` or let it show a shorter text when narrow; (c) hide the repeated title in the top bar below `md`, since the page `<h1>` sits right below it (the top bar title is already marked as repeating the `<h1>`); (d) put the role switcher on its own row below the title on narrow screens. For each: what the user sees at 375 px, what happens at 320 px and at 200 % text size, and the accessibility effect.

### Fix

- [ ] After the fix, below `md` the repeated top bar title is not shown (the page `<h1>` is directly below it); from `md` up it is shown in full for every role and route (decided after the measurement, replacing "at 375 px and wider the top bar title is shown in full on every route"). The role switcher shows enough of the selected name to tell the users apart, with the full name and role still available in the open list. At 320 px and at 200 % text size nothing overlaps or leaves the screen; a title that still cannot fit there may be cut with an ellipsis, as it is now, and the plan says at which width.
- [ ] The role switcher keeps an accessible name and a visible way to tell that it is a demo control, not a login. The read-only lock and its accessible name stay.
- [ ] Keyboard order, focus visibility, the drawer button and the disabled search field behave as before. No fixed pixel widths: use the existing tokens, `rem`, container queries and the existing mixins.
- [ ] No horizontal page scroll at 320 px, and the top bar height does not change when data arrives (the layout stability check from `008_02` stays green).
- [ ] If the chosen option changes how the top bar looks at phone widths, the Storybook stories for `TopBar` and `RoleSwitcher` show a narrow variant, and the README mobile screenshot is retaken afterwards from production (see "After merge").

### Prevent regressions

- [ ] An e2e check (Playwright, project `@mobile`, 375 px; the plan decides whether 320 px joins it) that, for every route, asserts the top bar title is not cut off (`scrollWidth <= clientWidth`) and the page has no horizontal scroll. It must fail on the old code (show it) and pass on the fix. The existing axe checks stay green.

### Evidence and tests

- [ ] Before and after table in the PR: the measurements from the first goal.
- [ ] `pnpm build`, `lint`, `typecheck`, `test`, `build-storybook` and `pnpm e2e` stay green. If `pnpm test` fails on one of the known flaky tests (see `fix/flaky-tests-under-load`), re-run and report which test and how many runs it took, without touching it.

### After merge

- [ ] Retake `docs/images/dashboard-mobile.png` from the production URL (375 px, DPR 2, same method as before), update its alt text, and commit it in a small `docs/` branch, merged by `/feature complete` after Martin approves the diff. Remove the "Small issues found" note about the title from `process-notes/follow-ups.md`.

## Decisions

1. **Measure first, then choose.** The options are weighed from numbers, not from taste.
2. **Fix in the shared components** (`TopBar`, `RoleSwitcher`), not per page.
3. **The role switcher stays recognisable as a demo control** at every width.
4. **No new libraries.**

## Does not include

- Redesigning the top bar or the shell, a working search, changes to the drawer navigation, a font change.
- The layout shifts that were reported in `008_02`, TBT work, `fix/flaky-tests-under-load`.

## Notes

- Branch name: `fix/topbar-narrow-width`.
- The top bar title is plain text that repeats the page `<h1>` (see the comment in `TopBar.tsx`); it is not a landmark or a heading. Hiding it on narrow screens would not remove information that a screen reader user has.
- Use the production URL `https://stockroom-web-five.vercel.app` only for the retaken screenshot after the merge. Never use `stockroom-web.vercel.app`, `stockroom-demo.vercel.app` or `stockroom-app.vercel.app`.
- If the cause is outside the top bar (for example the shell grid giving the header less width than the viewport), stop and report before changing the shell.
