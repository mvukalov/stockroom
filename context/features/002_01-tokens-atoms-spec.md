# Feature: Design tokens and atoms

Feature 002, part 1 of 2: `002_01-tokens-atoms`, `002_02-storybook`. The visual foundation of `apps/web`: design tokens as CSS custom properties, base styles, and the small set of accessible atoms that the app shell and the DataTable need. No screens yet.

Depends on: feature 001 (contract types for the domain badges).

Read first: `context/design-direction.md`, `context/design/tokens.md` (reconciled tokens and the five decisions below), `context/coding-standards.md` (Styling, Accessibility, Naming and files).

## Goals

- [ ] Tokens in `apps/web/src/styles/tokens.css` as CSS custom properties with semantic names (a dark theme can be added later): colours from `design-direction.md` plus `--color-nav-active-bg` (`#DBF7F3`) and `--color-nav-active-text` (`#005B54`), the five semantic text/background pairs, font families and the type scale (12, 13, 14, 16, 20, 28), weights, line heights, the 4 px spacing scale, radii, control height, table row height and cell size, one shadow, motion durations. A reduced-motion override sets durations to zero.
- [ ] Base styles in `apps/web/src/styles/`: reset, global body styles, a visible `:focus-visible` ring (2 px, 2 px offset, `--color-focus`) on every interactive element, and a helper for tabular numbers. Imported once in `main.tsx`.
- [ ] Atoms, each in its own folder (`Thing.tsx`, `Thing.module.scss`, `Thing.test.tsx`), named exports, no hard-coded colours or sizes:
  - `Button`: `primary`, `secondary`, `ghost`, `destructive`; 36 px high. `disabledReason` renders `aria-disabled="true"` with `aria-describedby` text instead of the `disabled` attribute, so it stays focusable, explains itself and ignores clicks.
  - `IconButton`: required `label` (accessible name), at least 32 px target.
  - `Input`: text and search variant, `aria-invalid` and `aria-describedby` support, control border colour.
  - `Select`: native `<select>`, styled to match `Input`.
  - `Checkbox`: native input with a required label and an `indeterminate` prop.
  - `Badge`: tones `success`, `warning`, `danger`, `info`, `neutral`; optional icon; optional struck-through label; text is always present.
  - `Skeleton`, `Avatar` (initials), `VisuallyHidden`, `Icon` (one wrapper over the icon set, decorative by default).
- [ ] Domain badges built on `Badge`, mapping contract enums to tone, icon and label from `design-direction.md` section 3: `StockStatusBadge` (In stock, Low, Out), `OrderStatusBadge`, `MovementTypeBadge`. Exhaustive `switch` with a `never` check.
- [ ] A contrast test reads `tokens.css` and checks every documented pair: text and semantic pairs at least 4.5:1, control border and focus ring at least 3:1 on the surfaces they sit on. The helper is a small pure function in the test file.
- [ ] Component tests with React Testing Library by role and name: keyboard use, `disabledReason` (focusable, described, click ignored), `indeterminate` checkbox, badge text present for every domain value.
- [ ] Docs updated: `design-direction.md` states 6 px badges and the decided table values; `design/tokens.md` marks section 3 as decided.

## Decisions (confirmed)

1. Control border is `#7A8494` for inputs, selects and checkboxes. Tables and cards keep the light border.
   Why: the first value, `#8A94A3`, reached only 2.48-2.89:1 on grey surfaces (bg, surface-subtle, hover/selected rows), so it was darkened to reach at least 3:1 on all of them (3.78 / 3.56 / 3.40 / 3.05 on white, bg, surface-subtle, `#E5E7EB`).
2. Table cells use 13 px. It is a token, so a change later does not touch components.
3. Table row height is 40 px, without a thumbnail in the default view.
4. Badges have a 6 px radius, 12 px text, weight 600, 24 px height.
5. The primary button is 36 px high.

## Decisions (proposed, Martin to confirm before load)

1. Native elements (`button`, `input`, `select`, checkbox) styled with SCSS Modules. No headless UI library for these atoms.
2. Tokens are CSS custom properties only. SCSS is used for nesting and mixins, not for token variables.
3. No class-name library; a three-line helper or template strings are enough.

## Does not include

- Storybook and stories (002_02).
- App shell, router, table, drawer, modal, toast, tooltip, combobox, tabs (they arrive with the features that need them).
- Dark theme, density toggle.

## Notes

- New libraries need approval before they are added. Likely candidates: an icon set (for example `lucide-react`) and the two fonts (`@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`), or self-hosted font files without a dependency. Use Context7 for current docs.
- Atoms import nothing from `apps/web` features. Only the domain badges import contract types.
