# Export Action

Write a private learning document for the current feature: what was built, why, how it was verified, and how to explain it in a job interview. The document is for the developer's own learning. It is **never committed**.

## When

- Called automatically by `complete` after CI on the PR is green and the PR description has its Evidence links, **before** asking about the merge.
- Can also be run manually (`/feature export`) at any time while the feature branch exists.

## Output

- Folder: `process-notes/` at the repo root. It is listed in `.gitignore` and `.prettierignore`, so it stays local and is never pushed to GitHub. If either entry is missing, stop and tell the user before writing anything.
- File: `process-notes/<name>.md` (or `process-notes/<name>-phase-N.md` for a phase), where `<name>` matches the spec file name (e.g. `contract-seed-msw-phase-1.md`).
- If the file exists, ask before overwriting it.
- Language: **Croatian** for the prose (the document is for the developer). Code, file paths, commands, commit messages and technical identifiers stay as they are, in English.

## Steps

1. Gather sources (read, don't guess):
   - the spec (`context/features/<name>-spec.md`)
   - `context/current-feature.md` (goals, notes, decisions)
   - `git log --oneline main..HEAD` and `git diff --stat main...HEAD`
   - the full diff for the important files (`git diff main...HEAD -- <file>`)
   - the PR (`gh pr view --json number,title,url,body`) and its CI runs (`gh pr checks`, run URLs from the PR's Evidence)
   - research docs linked from the spec or notes (`docs/*.md`)
2. Fill `../templates/learning-doc.md` section by section. Every section is required; if one truly doesn't apply, write one line saying why.
3. **Files section:** list **every** file from `git diff --stat main...HEAD`, grouped (added / modified / deleted), each with one sentence on why it was added or changed. Don't skip config, docs or generated files. Group generated files into one line (e.g. `pnpm-lock.yaml`: generated, never edited by hand).
4. **Code examples:** include the key snippets (not whole files). Choose what a reviewer or interviewer would ask about: the central logic, a non-obvious decision, a test that proves behaviour. Explain important lines right below each snippet.
5. **Interview questions:** 8–12 realistic questions with short, first-person answers grounded in what this feature actually did. End with one common trap (a thing that sounds right but is wrong).
6. Write for someone who has never used the technology: define every term the first time it appears (the glossary section helps).
7. Show the user the file path and a short outline when done. Do **not** `git add` the file.

## Rules

- Facts only from the sources above. If something wasn't verified (e.g. an assumption from research), say so in the document.
- No secrets or tokens in the document (the project has none, keep it that way).
- Never stage or commit anything under `process-notes/`.
