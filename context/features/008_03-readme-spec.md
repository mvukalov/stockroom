# Feature: README and link previews

Feature 008, part 3. The demo is live and measured, so the repository front page is next. This feature writes the README, adds the screenshots it needs, puts the production URL where the docs and the page metadata expect it, and adds Open Graph tags so a shared link shows a proper preview. It describes the project as it is: what it does, how it is built, how it was checked, what it does not do. No marketing language and no claims the repository cannot back up.

Depends on: `008_01-deploy-spec.md` and `008_02-layout-shift-spec.md` merged (production URL `https://stockroom-web-five.vercel.app`, Lighthouse and layout results recorded), `007_03-e2e-spec.md` (e2e and axe), `docs/adr/` (ADR 0001 to 0006), `docs/deploy.md`, `docs/testing.md`, `context/project-overview.md`.

Read first: the current `README.md` (if any), `context/project-overview.md`, `docs/deploy.md`, `docs/testing.md`, `docs/adr/`, the root `package.json` scripts, `apps/web/index.html`, `apps/web/public/`, the History and PR notes of `005_*` (virtualized lists and their measurement), `007_03`, `008_01` and `008_02`, `.gitignore`, and whether a `LICENSE` file exists.

## Goals

### Decide first (the plan stops for approval)

- [ ] The plan lists the README outline (section names and one line each), the screenshots to take (screen, role, viewport, scenario), and every number it intends to quote with its source. **It stops for approval before writing the README or taking screenshots.**
- [ ] Licence: if no `LICENSE` file exists, the plan says so and asks which licence Martin wants (or none). It does not add one on its own.

### README

- [ ] **Top of the page:** project name, one sentence on what it is, the live demo link, and one screenshot of the Products screen (desktop). A reader who stops here knows what the project is and can open it.
- [ ] **Honest demo note:** one short paragraph saying the data is generated in the browser by a mock API (MSW), resets on reload, and that there is no backend yet. Phases 2 (backend) and 3 (Docker, CI) are described as not built, not as promised.
- [ ] **What it does:** the screens (Dashboard, Products, Movements, Orders, Order detail, Audit log), the three roles (ADMIN, CLERK, VIEWER) and what each may do, in a short table. Stock is a projection of an append-only movement log; orders and products are stored as current state. Say exactly that and no more (do not call the whole app event-sourced).
- [ ] **Design decisions that matter,** each two or three lines with a link to the ADR or spec that records it: contract-first with Zod (`packages/contract`), permissions in one place (`packages/domain`, ADR 0004), visible reasons for disabled controls, virtualized lists, table engine choice (ADR 0005), mock API in the browser.
- [ ] **Quality, with real numbers:** unit and component tests (Vitest, Testing Library), e2e (Playwright, desktop and mobile), axe on every route, Storybook with the a11y addon. Lighthouse on the live site (mobile preset, 5 runs, median) for `/products` and `/orders`: Performance, Accessibility, Best Practices, SEO, CLS and TBT, with the date and the preset. Say plainly that TBT is high (about 1.7 s) because the mock data is generated in the browser and what the known cause is. Test counts are read from a fresh run at write time and carry a date, or are left out; they are not copied from an old report.
- [ ] **Tech stack** as a short list, no logos or badges walls (at most the badges that report something real; none if CI does not exist).
- [ ] **Run it locally:** prerequisites (Node, pnpm via Corepack), install, `pnpm dev`, `pnpm test`, `pnpm e2e` (with the one-time browser install), `pnpm storybook`, `pnpm build`. Every command is run once from a clean checkout to check it works as written.
- [ ] **Repository layout:** the four packages and what each owns, in a few lines, plus where specs, ADRs and docs live.
- [ ] **Known limitations:** the honest list (mock data only, no auth, no backend, Chromium-only e2e, Safari touch behaviour checked by hand, TBT, the report-only layout shifts from `008_02`). Short, factual.
- [ ] **Tone and content rules:** English, plain, present tense. No wording about job hunting, hiring, "portfolio" or "second project". No AI-tool names or process descriptions of how the project was built. No emojis in headings. No claims without a link or a number behind them.
- [ ] All links work: relative links to files and ADRs resolve, the live link opens. A one-off check (not added to the project) lists any broken link.

### Screenshots

- [ ] Taken with Playwright against the **production URL** (never another host), Chromium, from a fresh context: Products at 1280 px (hero image), and a small set that shows the point of the project, for example Movements (virtualized list), Order detail with a status, a disabled control with its visible reason as VIEWER, and one mobile view at 375 px. The plan fixes the exact list; five images at most.
- [ ] Stored under `docs/images/` (or the folder the plan finds fitting), PNG or WebP, each under about 300 kB, with meaningful alt text in the README. Fonts loaded and loading finished before the shot; no dev tools, no cursor artefacts, no toasts caught half way.
- [ ] A script or documented command that retakes them is **not** added to the project unless the plan proves it is small and useful; a one-off run is fine.

### Link preview and metadata

- [ ] `apps/web/index.html` gets `og:url` (the production URL), `og:image` (absolute URL of an image served from the site) and `twitter:card` with `summary_large_image`, next to the Open Graph tags that already exist.
- [ ] The preview image is a **1200 × 630 px** crop or composition of a real screenshot of the app (no new design work, no mock-ups), placed in `apps/web/public/`, under about 300 kB. It is checked with a crawler-style fetch of the deployed page after the merge (the tags are present in the served HTML and the image URL returns 200 with an image content type).
- [ ] The existing smoke subset still passes against the production URL after the deploy.

### Docs

- [ ] The production URL is added to `docs/deploy.md` and to `context/project-overview.md` (in the places the plan finds). If a line there still describes the project in terms of its purpose for something other than the project itself, it is reworded or removed.
- [ ] The stale wording about `(user, action, resource)` in `context/coding-standards.md`, if it is still there, is corrected to the current `can(...)` signature. Report the change in the PR; skip it if it is already fixed.

### Tests, gate

- [ ] `pnpm build`, `lint`, `typecheck`, `test` and `build-storybook` stay green; `pnpm e2e` stays green locally. The README itself is not tested by code, but the commands it lists were each run.
- [ ] If `pnpm test` hits one of the known flaky tests, re-run and report which one and how many runs it took, without touching it.

## Decisions

1. **Show what is there, say what is not.** Limitations and the unbuilt phases are stated in the README itself.
2. **Numbers have a source and a date.** Anything measured carries the tool, preset, run count and date; anything that changes (test counts) is read fresh or left out.
3. **Real screenshots only.** No generated or mocked images.
4. **No new libraries and no new scripts** in the project for this feature.
5. **No job-market or process wording** in repository files.

## Does not include

- TBT work (lazy seed, bundle splitting), the font preload, `fix/flaky-tests-under-load`, a custom domain, analytics, CI, Docker, a backend, a changelog, a contributing guide.
- A badges wall, a table of contents generator, translations.
- Wording cleanup (job ads, recruiters, interviews, hiring, "portfolio", the other project) in files this feature does not touch. That is a separate chore branch; this feature only lists those lines.

## Notes

- Branch name: `feature/readme-and-metadata`. It touches `index.html` and adds images, so it goes through `/feature complete` like the other features.
- Do not use `stockroom-web.vercel.app`, `stockroom-demo.vercel.app` or `stockroom-app.vercel.app` for anything. They belong to other people.
- If a number the README needs does not exist yet (for example the virtualization measurement is not in any file), the plan says so and the README either cites what exists or leaves the claim out. It does not repeat it from memory.
- Open Graph previews are cached by social platforms; the PR notes mention that a changed image may need a refresh in their own debuggers after the deploy.
