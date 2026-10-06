# Complete Action

There is one approval point: step 2. Once I approve it, run steps 3-11 without asking again. That approval covers commit, push, PR, export, History update, merge and local cleanup.

**Stop and ask me instead of continuing** if at any point:

- the quality gate or a CI check fails
- `git status` contains a modified tracked file that does not belong to the feature (untracked files are handled in step 2)
- the merge needs anything beyond a clean squash merge (conflicts, a required review, a blocked or out-of-date branch, admin override)

1. **Gate:** run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`. If anything fails, stop and report. Do not continue.
2. Show `git status` and a summary of the changes as an approval list. Untracked files:
   - **Spec:** read the Spec file path from `context/current-feature.md`. If that exact file is untracked, list it as its own line, `Spec (docs): <path>`; it is part of the commit and the PR. If it is already tracked, or Spec file is `none`, skip this.
   - **Any other untracked file** is never added automatically. List each one as a warning (`Warning, untracked, not included: <path>`). It stays out of the commit unless I approve it by name; approving the list does not include it.

   **Ask for approval to run the rest of complete.**

3. Commit with a conventional commit message (no AI attribution). Multiple focused commits are fine. A spec listed in step 2 goes in its own commit `docs: add <name> spec`. Stage files by path, never `git add -A` or `git add .`. Commits and PR descriptions carry no Claude, Co-Authored-By or "Generated with" lines.
4. Push the branch: `git push -u origin <branch>`.
5. Open a PR with `gh pr create --base main`:
   - Title: conventional-commit summary of the feature
   - Body: **What**, **Why** (link to the spec file), **How to test**, **Evidence** (screenshots / Lighthouse numbers if relevant), **Trade-offs / follow-ups**
   - **Why** contains only the spec link and the goal copied from the spec. Never invent rationale. If the spec states no reason, write only the link.
   - If step 2 listed the spec, add one sentence to the body: "This PR also adds the spec `<path>`."
6. Wait for CI: `gh pr checks --watch`. If the repository has no CI workflow yet, say so and continue with the local gate results as evidence. If a check fails, stop, report the failure and ask me how to proceed.
7. When CI is green and the PR body has its **Evidence** links, run the [export](export.md) action while `context/current-feature.md` still has its Goals and Notes. Never stage or commit anything under `process-notes/`.
8. Update `context/current-feature.md` on the branch (main is protected, so this must ride along in the same PR):
   - Append to the END of History: `- **<Feature Name>** - <one-line summary> (PR #<n>)`
   - H1 back to `# Current Feature`, Status: Not Started
   - Clear Spec file, Goals and Notes (keep the placeholder comments)
   - Commit `chore: update feature history for <feature>` as the last commit of the final batch (together with any pending commits, e.g. a revert after a deliberate red run), then push the batch once.
9. Wait for CI on that push: `gh pr checks --watch`. If the repository has no CI workflow yet, say so and continue with the local gate results as evidence. If a check fails, stop and ask me.
10. Merge: `gh pr merge --squash --delete-branch`. If it does not go through as a clean squash merge, stop and ask me.
11. Sync locally: `git checkout main && git pull`, then `git branch -d <branch>` if the local branch still exists.
12. Show the PR URL and the learning doc path. Suggest: summarize the session and `/clear` before the next feature.
