# Load Action

Do not commit, push, open a PR or merge in this action. Do not ask me about committing. Committing happens only in `/feature complete`.

1. Check the argument after "load":
   - Single word (no spaces): a spec can be given as `001_01`, `001_01-contract`, `contract`, `002` or `002-name`. The file is `context/features/[NNN_NN-|NNN-]{name}-spec.md` (also look in `context/fixes/`). A bare prefix such as `001_01` matches by prefix. If more than one file matches, list them and ask which one.
   - Multiple words: treat it as an inline feature description and derive goals from it.
   - Empty: error — "load requires a spec name or a feature description".
2. Read the ADRs the spec references (`docs/adr/`). Note any contradiction between the spec and an accepted ADR.
3. If `current-feature.md` already has an active feature (Status is In Progress or In Review), stop and ask before overwriting it.
4. Update current-feature.md:
   - H1: `# Current Feature: <Feature Name>`, using the spec's own title (`# Current Feature: Contract`)
   - Spec file: the repo-relative path of the loaded spec (`context/features/001_01-contract-spec.md`), or `none (inline description)`. Add the `## Spec file` section after Status if it is missing. `/feature complete` uses this exact path.
   - Goals: the spec's requirements as checkable bullets
   - Notes: technical constraints, out-of-scope items, linked research docs and ADRs, any ADR contradiction found in step 2
   - Status: Not Started
5. Show a short summary of the loaded feature, any ADR contradiction and any open questions in the spec.
6. End by telling me the next step: "Next: `/feature start`."
