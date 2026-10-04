# Start Action

Do not commit, push, open a PR or merge in this action, except step 5 (commit the spec when it is not on main yet). Do not ask me about committing. All other committing happens only in `/feature complete`.

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
10. End by telling me the next step: "Next: `/feature complete`. Optional before that: `/feature test` (gap check; start already writes tests for goals that include them), `/feature explain` (so I can explain every decision), `/feature review` (second look at the diff)."

If stuck after 2-3 attempts at the same problem, stop and ask.
