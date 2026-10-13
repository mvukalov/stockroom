# Feature: Visible reason for disabled controls

Feature 007, part 2. The Role pass (`007_01`) made every guarded control disabled with a reason that assistive technology can read, but a sighted VIEWER sees a disabled button and no explanation (finding G4). This feature makes the reason visible for everyone: on hover, on keyboard focus and on touch. It changes one shared component pattern and adds no screen, no endpoint and no permission.

Depends on: `007_01-role-pass-spec.md` merged (`roleReason` in the dialogs, the role matrix tests), `002_*` (`Button` with `disabledReason`), `docs/adr/0004-clerk-permissions.md`, `context/design-direction.md` (sections 5 and 9).

Read first: `context/coding-standards.md` (Accessibility, Testing), `apps/web/src/components/` (`Button`, any existing tooltip or popover), every use of `disabledReason` (search for it), `apps/web/src/pages/roleMatrix.test.tsx` and `roleSwitch.test.tsx` (they must keep passing).

## Goals

### Inventory (first, as the plan's evidence)

- [ ] List how `Button` renders `disabledReason` today (attributes, element used, how the reason reaches assistive technology, whether a disabled button can take focus) and every place `disabledReason` is used, with the text it shows. Say whether a tooltip or popover component already exists.
- [ ] State the chosen approach in the plan and why. A native `disabled` button cannot take focus or show hover content reliably, so the plan says whether the pattern moves to `aria-disabled` with the click and Enter/Space blocked, and what that changes for the existing tests.

### Behaviour

- [ ] A disabled control with a reason shows the reason as visible text: on pointer hover, on keyboard focus, and on tap on touch devices. The control can take keyboard focus while disabled, so the reason is reachable without a mouse.
- [ ] The reason satisfies WCAG 1.4.13 (content on hover or focus): dismissible with Escape without moving focus, hoverable (the pointer can move onto it without it vanishing), and persistent until hover or focus leaves or it is dismissed.
- [ ] The reason is linked to the control with `aria-describedby`, the control keeps its accessible name, and the visible text and the described text are the same string. No `title`-only reasons.
- [ ] A disabled control never fires its action: click, Enter and Space do nothing and send no request (the existing request-spy tests prove it for the guarded controls).
- [ ] Looks right at 375 and 1280 px: the reason does not overflow the viewport, is not clipped by the table's scroll region or the dialog, and does not cover the control it describes. Contrast meets the project's rule in both themes.
- [ ] Applies to every use of `disabledReason` through the shared component, with no per-page copies. Where a dialog already shows the reason as inline text (`roleReason`), keep it and do not show the same sentence twice.

### Tests, stories, gate

- [ ] Stories: disabled with reason (hover and focus states), long reason, at the edge of the viewport, inside a dialog, inside a scroll region. The a11y addon reports no violations.
- [ ] Tests (React Testing Library, user-event): the reason appears on hover and on focus, disappears on Escape and on blur, stays while the pointer is over it, is described by `aria-describedby`; activating the control by click, Enter and Space does nothing; a control with no reason is unchanged. The role matrix and role switch tests pass, adjusted only where the disabled mechanism changed, and the plan lists each adjustment.
- [ ] axe at 375 and 1280 px on Products, Movements and Order detail for the VIEWER, with a reason visible.
- [ ] `pnpm build`, `lint`, `typecheck`, `test` and `build-storybook` stay green.

## Decisions

1. **One shared pattern.** The fix lives in `Button` (and one small reason component if needed), never in pages.
2. **Keep disabled controls visible** (ADR-0004); the change is how the reason is shown, not whether the control is shown.
3. **Reason text comes from the domain** (`denialReason`) or the status rule, unchanged.
4. **No new libraries.** If positioning needs more than CSS, the plan says so and asks before adding anything.

## Does not include

- New permissions, wording changes of existing reasons, role switcher changes.
- A general tooltip system for non-disabled controls.
- E2E tests (next feature).

## Notes

- Do not remove the existing accessible description until the visible one is proven by tests.
- Check the manual pass as VIEWER on Products, Movements and Order detail with the keyboard only.
