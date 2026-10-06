# Stockroom: AI Interaction

Developer = architect, Claude = executor. Martin decides what is built and why; Claude implements within the constraints.

## Roles

- **Martin:** decisions, requirements, architecture, approval of every change, commit, push and merge. Must be able to explain every decision in an interview, so reads every PR.
- **Claude Code:** research, implementation, tests, build, lint, git (see Git rules below), review.
- **Claude in chat:** advice, specs, reviews, UI/UX feedback. Does not write to the repo.

## Communication

- Code, comments, commits, docs: English. Conversation with Martin: Croatian.
- Be concise. State what changed and why; do not narrate every step.
- If requirements are ambiguous, ask before building.
- Plan first, implement second, for anything non-trivial. Show the plan and wait for approval.

## Workflow

Per feature: `/feature load <spec>`, `/feature start`, manual or browser test, `/feature test`, `/feature review`, fix, `/feature explain` if needed, `/feature complete`. One feature per session; summarise into `current-feature.md`, then `/clear`.

Specs live in `context/features/`; large features are split into phases. The spec is the source of truth.

## Git

- One branch per feature or fix: `feature/<name>`, `fix/<name>`.
- Conventional commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`.
- `feature/` and `fix/` branches: committing, pushing and merging happen only inside `/feature complete`. Approving its step 2 is Martin's approval for the whole sequence. `/feature load` records the spec path as "Spec file"; if that file is still untracked, complete lists it as `Spec (docs): <path>` and commits it with the feature. Any other untracked file is only a warning and is committed only if Martin approves it by name.
- `chore/` and `docs/` branches (changes outside a loaded feature): commit, push and open the PR only after Martin's explicit approval of the diff, and never merge them; Martin merges those.
- Never commit before lint, typecheck, tests and build pass.
- No "Generated with Claude" or co-author lines in commit messages.
- All work goes through PRs: description with what, why, how to test, and a screenshot or Lighthouse result where relevant. Squash merge only, after green CI (or the local gate when no CI exists), then delete the branch.

## Rules for code changes

- Minimal changes. Do not touch unrelated code.
- No refactors or "nice to have" features that are not in the spec.
- Follow existing patterns; consistency beats preference.
- Ask before large refactors or architectural changes. Architectural changes need an ADR.
- Never delete files without asking.
- Respect package boundaries (`domain` stays free of React and browser APIs).

## When stuck

After 2-3 failed attempts, stop. Explain the problem, what was tried and why it failed, and ask for a decision. No random fixes.

## Research

For unfamiliar or complex areas: research, then plan, then implement. Use Context7 for current library docs; do not assume APIs for recent versions. Research tasks write only to `docs/`.

## Review

Periodic review for security, performance, logic and consistency with patterns. Findings are not automatically true: verify each one before acting. Sub-agents are used only for larger or specialised work.

## Context hygiene

Check `/context` regularly. Do not let it approach the limit mid-fix. Prefer a summary plus `/clear` over `/compact`.
