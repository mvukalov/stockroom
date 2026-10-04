# Start Action

1. Read current-feature.md. If Goals are empty, error: "Run /feature load first".
2. Make sure the working tree is clean. Two exceptions are allowed:
   - exactly one untracked file: the loaded feature's spec in `context/features/` (or `context/fixes/`);
   - `context/current-feature.md` modified by `/feature load`.
     Anything else (other untracked files, other modifications) blocks: stop and ask.
3. Update `main`: `git checkout main && git pull`.
4. Create and check out the branch, derived from the H1:
   - `feature/<kebab-name>`, or `fix/<kebab-name>` for fixes.
5. Commit the spec before any other change: `git add <spec file>` and commit as `docs: add <name> spec`. (`main` is protected, so specs are committed on the feature branch.) If the spec is already on main, skip this step.
6. Set Status to "In Progress".
7. Present a short implementation plan (files to create/change, order of goals). Always show the plan and wait for my approval before writing code.
8. Implement the goals one by one, following `context/coding-standards.md`. After each goal, run lint and typecheck.
9. When done, list which goals are implemented and what should be checked manually in the browser.

If stuck after 2-3 attempts at the same problem, stop and ask.
