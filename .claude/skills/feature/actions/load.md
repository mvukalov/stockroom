# Load Action

1. Check the argument after "load":
   - Single word (no spaces): look for `context/features/{name}-spec.md` first, then `context/fixes/{name}-spec.md`. An optional numeric prefix is also accepted (`NNN-{name}-spec.md`, glob `[0-9][0-9][0-9]-{name}-spec.md`). If more than one file matches, list them and ask which one.
   - Name followed by `phase N` (`load <name> phase N`): find the spec as above and load only the goals of phase N. If the spec has no phase N, list its phases and ask.
   - Multiple words otherwise: treat it as an inline feature description and derive goals from it.
   - Empty: error — "load requires a spec name or a feature description".
2. If the spec is split into phases and no phase was named, list the phases and ask which one to load.
3. Read the ADRs the spec references (`docs/adr/`). Note any contradiction between the spec and an accepted ADR.
4. If `current-feature.md` already has an active feature (Status is In Progress or In Review), stop and ask before overwriting it.
5. Update current-feature.md:
   - H1: `# Current Feature: <Feature Name>`, with the phase when one was loaded (`# Current Feature: Contract (phase 1)`)
   - Goals: the spec's requirements (only the loaded phase's, if any) as checkable bullets
   - Notes: technical constraints, out-of-scope items, linked research docs and ADRs, any ADR contradiction found in step 3
   - Status: Not Started
6. Show a short summary of the loaded feature, any ADR contradiction and any open questions in the spec.
