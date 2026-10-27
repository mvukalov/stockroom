# Chore: Neutral wording in the repository

Feature 009, part 1. The repository is public and the README links to the ADRs, the specs and the context files. Several of those files still explain decisions or ways of working through job ads, recruiters, interviews and the other portfolio project. They describe the project in terms of something outside it. This chore rewrites those lines so that every file describes the project and its decisions on their own terms. It changes no code, no decision and no behaviour.

Depends on: `008_03-readme-spec.md` merged (PR #41). The list of known places is in `process-notes/follow-ups.md` (section "Wording to clean up") and in the notes of PR #41.

Read first: `process-notes/follow-ups.md`, `docs/adr/` (all files), `CLAUDE.md`, `context/ai-interaction.md`, `context/project-overview.md`, `.claude/skills/feature/actions/explain.md`, `.claude/skills/feature/actions/export.md`, `.claude/skills/feature/templates/learning-doc.md`, `context/features/005_02-order-detail-spec.md`.

## Goals

### Find every place (the plan stops for approval)

- [ ] Run `git grep -n -i` over all tracked files for these terms and report every hit with file, line and the quoted line: `job ad`, `job-ad`, `job market`, `hiring`, `recruiter`, `interview`, `employer`, `portfolio`, `summit-drift`, `second project`, `CV`, `resume`, `career`. Hits that are unrelated to the project's framing (for example a column called `portfolio` in some data, or a dependency name) are listed and marked as "no change".
- [ ] For each real hit the plan proposes the new wording, side by side with the old line. **It stops for approval before changing any file.**

### Rewrite

- [ ] **ADRs.** Accepted ADRs keep their decision, context, alternatives and consequences. Only the market framing is removed or reworded: job-ad counts and quotes, "fewer recruiters know it", "on interviews", "No job-ad review was done for this decision" (ADR-0005, ADR-0006). Do not invent a new reason. If a sentence gave a technical reason, keep it. If a decision rested only on market popularity, say what is true in neutral words (for example that the library is widely used in production React code) and list that ADR for Martin's decision instead of inventing a technical argument.
- [ ] Each edited ADR gets one line at the end of its header or status block: `Editorial revision 2026-10-27: removed references to job-market research; the decision is unchanged.` The date is the day of the commit.
- [ ] `docs/adr/0004-clerk-permissions.md`: the outdated signature `can(user, action, resource)` becomes `can(user, action) => boolean`, the same as in `context/coding-standards.md` and the README. Check the rest of that ADR for the same signature.
- [ ] `summit-drift` mentions in ADRs and docs: remove the reference. Keep the fact only if it is a technical statement ("Next.js is not used"), without the reason "because another project covers it". If no technical reason is left, the plan reports it.
- [ ] `CLAUDE.md` (line about "Portfolio project that proves engineering depth"): describe what the project is, without saying why it exists.
- [ ] `context/ai-interaction.md` ("explain every decision in an interview"): reword to the working rule itself (for example that every decision must be explainable and that every PR is read).
- [ ] `context/features/005_02-order-detail-spec.md` ("the portfolio's phase 1 scope"): "the phase 1 scope".
- [ ] The three feature skill files (`explain.md`, `export.md`, `templates/learning-doc.md`): "interview" and "employer" become neutral review wording ("defend every change in review", "Likely review questions", "What this shows in the repository"). Their structure and steps do not change. The learning-doc template line about "job-ad requirements" is removed or replaced by what the feature covers.
- [ ] The plan checks every other tracked text file the search finds (older specs, `context/`, `docs/`, code comments, `package.json` descriptions) and applies the same rule.

### Check

- [ ] After the rewrite, the same `git grep` returns no hit except those the plan listed as "no change" and Martin accepted. Report the grep before and after.
- [ ] Links: every relative link and every anchor that pointed into a changed file still works (one-off link check, not added to the project). The README is not changed unless a link needs it.
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm build` stay green. No code is touched, so `pnpm test` and `pnpm e2e` are not required; run `pnpm test` once if any file under `apps/` or `packages/` changed (for example a code comment).

## Decisions

1. **Rewrite, do not delete.** Every ADR, spec and context file stays; only the framing changes.
2. **Decisions do not change.** No new reasons are invented. An ADR whose reasoning is left without a technical argument is reported, not patched.
3. **Say it openly.** Edited ADRs carry the one-line editorial revision note.
4. **No history rewrite.** Git history keeps its old text; only the current tree changes.
5. **The workflow files stay.** `CLAUDE.md`, `context/` and `.claude/skills/` are part of how the project is worked on and remain in the repository; only the wording described above changes.
6. **No new libraries and no new scripts.**

## Does not include

- Rewriting git history, removing the workflow files, changing the README, changing any decision or code.
- The title truncation fix at 375 px, `fix/flaky-tests-under-load`, TBT work.

## Notes

- Branch name: `chore/neutral-repo-wording`. It is a docs and chore branch: Claude Code makes the branch and the commits, and **Martin merges it himself**.
- `process-notes/` is gitignored and is not touched.
- No AI attribution in commits.
