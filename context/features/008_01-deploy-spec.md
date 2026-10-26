# Feature: Deploy the demo

Feature 008, part 1. Stockroom is feature-complete for phase 1, and the mock API (MSW) runs in the browser, so the app can be hosted as a static site with no backend. This feature prepares the repository for that, makes the production build behave correctly on a real host (service worker, deep links, base path), and produces the live link that the README and the GitHub repository description will use. The hosting account and the DNS or project settings are Martin's; this feature prepares everything the repository needs and checks the result.

Depends on: `007_03-e2e-spec.md` merged (the e2e suite runs against `vite preview` and will be reused against the deployed URL), `002_03-app-shell-spec.md` (routing, `?mock=` scenarios, role switcher), `docs/testing.md`.

Read first: `apps/web/vite.config.ts`, `apps/web/index.html`, `apps/web/src/main.tsx` and the mock bootstrap (how and when the service worker starts, which worker file it registers, from which path), `apps/web/public/`, `apps/web/playwright.config.ts`, the root `package.json` scripts, `.gitignore`, `context/project-overview.md`.

## Goals

### Decision first (plan stops for approval)

- [ ] The plan compares the realistic static hosts for this project (at least Vercel, Netlify, GitHub Pages) on: single-page-app fallback (deep links such as `/orders/:id` must not return 404), serving the MSW worker file from the site root with the right headers, automatic deploys from `main`, preview deploys for pull requests, whether a deploy needs a GitHub Actions workflow (CI is phase 3; a host's own Git integration is preferred over adding a workflow here), custom domain and cost. It recommends one and **stops for Martin's approval** before adding any host-specific file.

### Production build correctness

- [ ] The production build starts the mock service worker in production, with the worker file at the path the host serves it from, and the app does not render before the worker is ready (no first-load request that bypasses the mock). The plan states how this works today and what changes, if anything. A failure to register the worker shows a visible error state instead of a blank app or failing requests.
- [ ] Deep links and reloads work for every route (`/`, `/products`, `/movements`, `/orders`, `/orders/:id`, `/audit`) including with query strings (`?mock=slow`, filters, `?role=`-style state if it exists), through the host's SPA fallback rule, committed as a config file for the chosen host.
- [ ] If the site is served from a sub-path (GitHub Pages project site), the base path is configured once (Vite `base`, router basename, worker path) and tested; on a root domain nothing changes. The plan says which case applies.
- [ ] Cache headers: hashed assets are cacheable long-term, `index.html` and the worker file are not cached aggressively, so a new deploy is picked up. Stated in the host config, with the reason in a comment.
- [ ] Page metadata: a proper `<title>`, meta description, favicon, theme colour and Open Graph tags (title, description, a preview image if the project already has a screenshot; no new design work). No tracking scripts, no cookies.
- [ ] The demo is honest about being a demo: the plan checks whether the app already says that its data is mock data and resets on reload, and proposes the smallest addition if it does not (for example one line in the About or footer area). It does not add a banner that covers content.

### Verification

- [ ] The existing e2e suite can run against a deployed URL: `playwright.config.ts` takes an optional base URL from an environment variable and skips starting the local server when it is set. A documented command (in `docs/testing.md`) runs a small smoke subset (every route loads and has no axe violations, one role switch, one mutation flow) against the live site. The full suite stays local.
- [ ] Manual evidence in the PR: the live URL opened in a clean browser profile and on a phone-width viewport; each route by direct URL and by reload; all three roles; `?mock=slow`, `?mock=empty`, `?mock=error`; the service worker visible as active; no console errors; the Lighthouse scores for performance, accessibility, best practices and SEO on the deployed Products page (reported, not gated).

### Repository hygiene

- [ ] The plan lists, for Martin to apply (or to approve running through `gh`), the GitHub repository description (one sentence), website URL (the live link) and topics (for example `react`, `typescript`, `vite`, `msw`, `zod`, `tanstack-query`, `pnpm-monorepo`). Nothing public is changed without approval.
- [ ] `context/project-overview.md` gets the live link and the deploy method only if it has a place for them; the README is the next feature (`008_02`) and is not written here.

### Tests, gate

- [ ] `pnpm build`, `lint`, `typecheck`, `test` and `build-storybook` stay green; `pnpm e2e` stays green against the local preview.
- [ ] A short "Deploying" section in `docs/testing.md` or a new `docs/deploy.md` (the plan chooses) explains how a deploy happens, how to roll back, and how to run the smoke check.

## Decisions

1. **Static hosting only.** The mock API runs in the browser; no server, no database, no secrets.
2. **Prefer the host's Git integration over a GitHub Actions workflow.** CI and Docker are phase 3.
3. **Martin owns the account and the settings.** The feature prepares files and checks results; it never creates accounts, enters credentials or changes public settings without approval.
4. **Honest demo.** Visitors can tell the data is mock data.
5. **No new libraries** (a Lighthouse run uses the browser's own tool or a one-off `npx` that is not added to the project).

## Does not include

- The README and the measurement document (`008_02`), a custom domain, analytics, error tracking, CI workflows, Docker, a backend.
- Server-side rendering, prerendering, PWA or offline support.

## Notes

- Keep host-specific config in one file at the repository root or in `apps/web` (as the host requires) and mention it in the PR.
- If the service worker fails only in production (path, scope or headers), stop and report the cause before working around it.
- If the chosen host needs a build setting that cannot be committed (an environment variable, the monorepo root and build command), list it for Martin to enter in the host's dashboard.
