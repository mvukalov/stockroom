---
name: research
description: Run a research task from context/research/<name>.md and write findings to docs/. Never touches code or git.
argument-hint: <research-name>
disable-model-invocation: true
---

# /research

1. Read `context/research/$ARGUMENTS.md`. Expected sections: Output, Research, Include, Sources. If the file is missing, list `context/research/` and stop.
2. Research using the listed sources. Use Context7 for library documentation and web search for comparisons. Prefer primary sources and current versions; note the version and date of each claim.
3. Write the result only to the path given under Output, inside `docs/`. Structure it so it can become an ADR: context, options, trade-offs, recommendation.
4. Do not edit code, do not touch git, do not install packages.
5. Finish with a short summary and the path of the file. Mark anything uncertain as such.

The decision is Martin's. Recommend, do not decide.
