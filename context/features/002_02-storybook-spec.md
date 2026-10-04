# Feature: Storybook

Feature 002, part 2 of 2. Storybook for the atoms from `002_01-tokens-atoms`, so the design system can be seen, reviewed and checked for accessibility before any screen exists.

Depends on: `002_01-tokens-atoms-spec.md` merged.

Read first: `context/coding-standards.md` (Styling: every shared component has a story with its states; Accessibility), `context/design-direction.md`.

## Goals

- [ ] Storybook set up for Vite and React in `apps/web`, with the accessibility addon. `pnpm storybook` runs it and `pnpm build-storybook` builds it. The preview loads `tokens.css` and the base styles.
- [ ] A story file next to every atom (`Thing.stories.tsx`) covering all its states:
  - `Button`: every variant, `disabledReason`, long label.
  - `IconButton`, `Select`, `Avatar`, `Skeleton`.
  - `Input`: default, search, invalid with message, disabled.
  - `Checkbox`: unchecked, checked, indeterminate, disabled.
  - `Badge` and the three domain badges: every tone and every enum value.
- [ ] The accessibility addon reports no violations on any story.
- [ ] A "Tokens" docs page showing colour swatches with their contrast ratios, the type scale, spacing and radii, read from the same `tokens.css`.
- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` and `pnpm test` stay green and do not run Storybook.

## Does not include

- Deploying Storybook (README and deploy feature), interaction tests, visual regression.
- Stories for components that do not exist yet; each later feature adds its own.

## Notes

- New libraries: Storybook packages only. Ask before adding anything else, and use Context7 for current setup docs.
- Storybook config lives in `apps/web/.storybook/`.
