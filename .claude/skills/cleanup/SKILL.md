---
name: cleanup
description: Code health scan. check reports findings only; run lets Martin pick numbered findings to fix.
argument-hint: check | run
disable-model-invocation: true
---

# /cleanup

## check

Run the `code-scanner` and `refactor-scanner` agents on the current code (`apps/` and `packages/`). Merge their findings into one list sorted by severity. Verify each finding against the code and drop false positives. Report only. Change nothing.

## run

1. Do a `check`, but number the findings (1, 2, 3, ...), each with severity, file and line, and a one-line fix.
2. Ask Martin which numbers to fix. Do nothing until he answers.
3. Fix only the chosen ones on a `chore/cleanup-<topic>` or `fix/<name>` branch, minimal changes, following the normal quality gate and PR flow. Never commit without approval.

Known intentional decisions (do not flag): see `context/coding-standards.md` and `docs/adr/`.
