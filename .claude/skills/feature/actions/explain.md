# Explain Action

Purpose: help me understand and defend every change in an interview.

Do not commit, push, open a PR or merge in this action. Do not ask me about committing. Committing happens only in `/feature complete`.

1. Read current-feature.md.
2. Run `git diff main --name-only`.
3. For each created or modified file:
   - path and whether it is new or modified
   - 1–2 sentences on what it does and why it exists
   - key functions, components or patterns used
4. End with:
   - **How it connects:** the data/control flow between these files
   - **Decisions and trade-offs:** what alternatives existed and why this one was chosen
   - **Likely interview questions** about this feature (2–3), with short answers
5. After the output, tell me the next step: "Next: `/feature complete`. Optional: `/feature review`."

## Output Format

## Files Changed

**src/path/file.ts** (new)
What it does and why.

## How It Connects

## Decisions and Trade-offs

## Likely Interview Questions
