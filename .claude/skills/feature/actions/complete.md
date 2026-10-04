# Complete Action

Everything here requires my approval at the marked steps. Never merge without it.

1. **Gate:** run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`. If anything fails, stop and report. Do not continue.
2. Show `git status` and a summary of the changes. **Ask for approval to commit.**
3. Commit with a conventional commit message (no AI attribution). Multiple focused commits are fine. Commits and PR descriptions carry no Claude, Co-Authored-By or "Generated with" lines.
4. Push the branch: `git push -u origin <branch>`.
5. Open a PR with `gh pr create --base main`:
   - Title: conventional-commit summary of the feature
   - Body: **What**, **Why** (link to the spec file), **How to test**, **Evidence** (screenshots / Lighthouse numbers if relevant), **Trade-offs / follow-ups**
6. Wait for CI: `gh pr checks --watch`. If the repository has no CI workflow yet, say so and continue with the local gate results as evidence. If a check fails, stop, report the failure and fix it on the branch.
7. When CI is green and the PR body has its **Evidence** links, run the [export](export.md) action while `context/current-feature.md` still has its Goals and Notes. Never stage or commit anything under `process-notes/`.
8. Update `context/current-feature.md` on the branch (main is protected, so this must ride along in the same PR):
   - Append to the END of History: `- **<Feature Name>** - <one-line summary> (PR #<n>)`
   - H1 back to `# Current Feature`, Status: Not Started
   - Clear Goals and Notes (keep the placeholder comments)
   - Commit `chore: update feature history for <feature>` as the last commit of the final batch (together with any pending commits, e.g. a revert after a deliberate red run), then push the batch once.
9. Wait for CI on that push: `gh pr checks --watch`. If the repository has no CI workflow yet, say so and continue with the local gate results as evidence. When green, show the PR URL and the learning doc path. **Ask for approval to merge.**
10. Merge: `gh pr merge --squash --delete-branch`.
11. Sync locally: `git checkout main && git pull`, then `git branch -d <branch>` if the local branch still exists.
12. Suggest: summarize the session and `/clear` before the next feature.
