---
name: feature
description: Manage the current feature lifecycle - load a spec, start a branch, test, review, explain, or complete via pull request
argument-hint: load <spec>|start|test|review|explain|export|complete
disable-model-invocation: true
---

# Feature Workflow

Manages a feature from spec to merged pull request.

## Working File

@context/current-feature.md

### File Structure

- `# Current Feature` — H1 with the feature name when active (`# Current Feature: Cart Drawer`)
- `## Status` — Not Started | In Progress | In Review | Complete
- `## Goals` — checkable bullet points of what success looks like
- `## Notes` — constraints, decisions, links to specs and research docs
- `## History` — completed features, oldest first (append only)

## Task

Execute the requested action: $ARGUMENTS

| Action     | Description                                                         |
| ---------- | ------------------------------------------------------------------- |
| `load`     | Load a feature spec (or inline description) into current-feature.md |
| `start`    | Create the branch and implement the goals                           |
| `test`     | Write and run unit, component and E2E tests for the feature         |
| `review`   | Check goals, quality, scope and tests against `git diff main`       |
| `explain`  | Explain what changed and how it fits together                       |
| `export`   | Write a private learning doc to `process-notes/` (never committed)  |
| `complete` | Commit, push, open a PR, merge after approval, clean up             |

See [actions/](actions/) for detailed instructions.

If no action is provided, explain the available options.
