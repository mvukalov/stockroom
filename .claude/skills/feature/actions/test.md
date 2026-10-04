# Test Action

1. Read current-feature.md to understand what was implemented.
2. Run `git diff main --name-only` to see what changed.
3. Decide what is worth testing — logic, behaviour and user flows, not lines of code:
   - **Unit (Vitest):** pure functions in `packages/domain`, `packages/contract` and `apps/web/src`, and custom hooks. Happy path, edge cases, error cases.
   - **Component (React Testing Library):** interactive components — query by role/label, interact with `userEvent`, assert what the user sees. Mock the network with MSW, never by mocking fetch inside a component.
   - **E2E (Playwright):** only if the feature adds or changes a user flow. Include an axe accessibility check for new pages.
   - Optimistic updates always get a rollback test.
4. Check which tests already exist; extend them instead of duplicating.
5. Write the missing tests next to the source (`*.test.ts(x)`) or in `e2e/`. When the first test of the project is added, remove `--passWithNoTests` from the web `test` script.
6. Run `pnpm test` (and `pnpm test:e2e` if E2E changed and the script exists). All must pass.
7. Only if coverage is configured: run `pnpm test:coverage` (if the script exists) and report coverage for the files touched by this feature. Flag anything in `packages/domain`, `packages/contract` or `apps/web/src` below 80%.
8. Do not write tests just to raise coverage. Explain briefly what is intentionally not tested.
