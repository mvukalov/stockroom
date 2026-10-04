---
name: feature
description: Run the Stockroom feature cycle. Subcommands: load <spec>, start, test, review, explain, complete.
argument-hint: load <spec-name> | start | test | review | explain | complete
disable-model-invocation: true
---

# /feature

Drive one feature from spec to merged PR. The spec in `context/features/` is the source of truth. Read `CLAUDE.md` and `context/ai-interaction.md` first. Never commit, push or merge without Martin's explicit approval.

Subcommand is the first word of `$ARGUMENTS`.

## load <spec-name>

1. Read `context/features/<spec-name>-spec.md` (also accept `<spec-name>.md`). If it does not exist, list `context/features/` and stop.
2. Write `context/current-feature.md` in this shape:
   - H1: feature name
   - `Status: Not Started`
   - `Spec:` path to the spec
   - `Goals:` checklist copied from the spec's requirements
   - `Notes:` constraints and "does not include" items from the spec
   - `History:` keep existing entries, oldest first
3. Do not start work. Show a short summary of the goals and ask Martin to confirm.

## start

1. Read `context/current-feature.md`, the spec, and the ADRs it references. If anything is ambiguous, ask before building.
2. Show a short plan (files to add or change, order of goals, risks) and **wait for approval**.
3. After approval: `git switch main && git pull`, then create `feature/<name>` (or `fix/<name>` for fixes).
4. Set `Status: In Progress`.
5. Implement goal by goal. Follow `context/coding-standards.md`. Tick each goal when it is done. Keep changes minimal and inside the spec.
6. Add new dependencies only if the spec names them or Martin approves.
7. If you are stuck after 2-3 attempts at the same problem, stop and ask.

## test

1. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
2. Write or update tests where there is logic: Vitest for domain and utilities, React Testing Library for behaviour (roles and labels), Playwright with axe for key flows. Optimistic updates need a rollback test. Do not write tests for their own sake.
3. For UI work, check the result in a browser at 375, 768 and 1280 px against `context/design/` screenshots and `context/design-direction.md`.
4. Report results as a table. Fix failures that belong to this feature; report unrelated failures instead of fixing them.

## review

Compare the goals in `context/current-feature.md` with `git diff main`. Report:

- ✅ goal met
- ❌ goal missing
- ⚠️ quality issue or bug (file and line)
- 🚫 scope creep (change not asked for by the spec)
- 🧪 logic without test coverage

End with a verdict: ready, or what must change. Verify each finding against the code before reporting it. Do not fix anything unless Martin asks.

## explain

Explain the changes file by file for Martin: what each file does, why it was done that way, and which alternatives were rejected. Written so Martin can defend the decisions in an interview. Name the pattern or concept used where there is one.

## complete

1. Check that all goals are ticked and lint, typecheck, test and build pass. If not, stop and report.
2. Show Martin the file list and a diff summary. **Ask before committing.**
3. Commit with conventional messages (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`). No "Generated with Claude", no Co-Authored-By.
4. Push the branch and open the PR with `gh pr create`. Write the description by hand: What, Why, How to test, and a screenshot or Lighthouse result where relevant. No Claude footer.
5. Wait for green CI and Martin's review. **Merge only on his explicit approval:** `gh pr merge --squash --delete-branch`.
6. `git switch main && git pull`, delete the local branch.
7. Reset `context/current-feature.md` to an empty template and append a short summary (date, feature, PR number, notable decisions) to History. Commit it as `chore:` through a small PR like everything else.
8. Tell Martin the feature is done and suggest `/clear`.
