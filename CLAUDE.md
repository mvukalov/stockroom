# Stockroom

Inventory and orders management app with event-sourced stock movements. Portfolio project that proves engineering depth (React/TypeScript, state management, architecture, contract-first monorepo). Developer = architect (Martin), Claude = executor.

## Read before working

@context/project-overview.md
@context/coding-standards.md
@context/ai-interaction.md
@context/current-feature.md

Also relevant when the task touches them:

- `context/design-direction.md` and `context/design/tokens.md`: visual rules and tokens
- `context/design/` screenshots: visual reference only (the Lovable prototype used Tailwind; Stockroom uses SCSS Modules)
- `docs/adr/`: accepted decisions. Do not contradict them; propose a new ADR instead
- `context/features/`: specs. A spec is the source of truth for its feature

## Repo layout

```
apps/web                 React 19 + Vite app (@stockroom/web)
apps/api                 phase 2, does not exist yet
packages/contract        Zod schemas + inferred types
packages/domain          pure TS: stock projection, availability, order state machine, permissions
packages/seed            deterministic seed data (fixed faker seed)
context/                 project knowledge and specs
docs/adr/                architecture decision records
.claude/                 skills and agents
```

## Commands

Package manager is pnpm (via Corepack). Run from the repo root.

```
pnpm dev          # web app on localhost
pnpm lint         # oxlint (apps/web)
pnpm typecheck    # tsc across the workspace
pnpm test         # vitest (currently --passWithNoTests; remove the flag once the first test exists)
pnpm build        # typecheck + vite build
pnpm format       # prettier --write (context/ and docs/ are ignored)
```

Quality gate before every commit: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass.

## Critical rules

- English for code, comments, commits, docs, UI. Conversation with Martin is in Croatian.
- Never commit, push, merge or delete files without Martin's explicit approval.
- Commit messages: conventional commits, **no** "Generated with Claude" and **no** Co-Authored-By lines. PR descriptions: hand-written, no Claude footer.
- All work goes through PRs. `main` is protected. Squash merge only, after green CI and approval.
- One branch per feature or fix: `feature/<name>`, `fix/<name>`, plus `chore/`, `docs/` as needed.
- Minimal changes. No unrelated refactors, no "nice to have" features outside the spec.
- Respect boundaries: `packages/domain` has no React, no browser APIs, no I/O. Packages never import from `apps/*`.
- Types come from Zod schemas in `packages/contract`. Never hand-write a duplicate type.
- Stock is a projection of the append-only movement log. Never store or edit stock levels. Availability is derived (ADR-0003).
- Do not copy server data into Redux. TanStack Query owns server state (ADR-0002).
- New libraries come with the first feature that needs them. Ask before adding a dependency not named in `project-overview.md`.
- Docs for libraries newer than your training: use Context7, do not guess APIs.
- After 2-3 failed attempts at the same problem, STOP. Explain what was tried and ask for a decision.

## Skills and agents

- `/feature load|start|test|review|explain|complete`: the feature cycle (`.claude/skills/feature`)
- `/research <name>`: writes only to `docs/` (`.claude/skills/research`)
- `/cleanup check|run`: code health scan (`.claude/skills/cleanup`)
- Agents (`.claude/agents`): `code-scanner`, `ui-reviewer`, `refactor-scanner`. Findings are not automatically true; verify each before acting.

## Context hygiene

One feature per session. At the end, summarise into `context/current-feature.md` History, then `/clear`. Prefer that over `/compact`.
