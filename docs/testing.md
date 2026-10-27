# Testing

Run everything from the repo root.

| Command | What it runs |
|---|---|
| `pnpm test` | Vitest across the workspace: domain rules, contract tests over the MSW handlers, component tests (React Testing Library, jsdom). Part of the gate before every commit. |
| `pnpm e2e` | Playwright in Chromium against the production build, with axe. Its own command, so the gate above stays fast. |

## Running e2e

One time, download the browser Playwright drives:

```
pnpm --filter @stockroom/web exec playwright install chromium
```

Then:

```
pnpm e2e
```

This builds `apps/web`, serves the build with `vite preview` on port 4173 and runs the suite against it. The app talks to the same MSW service worker the static demo uses, so no backend is needed.

Useful variants (arguments go straight to Playwright):

```
pnpm e2e --project=desktop        # one viewport
pnpm e2e reason                   # one file
pnpm e2e -g "cancels a confirmed" # one test by title
pnpm e2e --ui                     # interactive runner
```

Every run writes an HTML report to `apps/web/playwright-report/`, passed or failed (open it with `pnpm --filter @stockroom/web exec playwright show-report`). Reports and traces are git-ignored.

If a preview is already running on port 4173, the suite reuses it instead of building. Stop it after changing the app, or the suite tests the old build.

### Against a deployed site

`E2E_BASE_URL` points the suite at a deployed site. Nothing is built or served locally then. Only the smoke subset (tests tagged `@smoke`) is meant for that; the full suite stays local.

```
E2E_BASE_URL=https://<deployment-url> pnpm e2e --grep @smoke
```

The smoke subset:

- every route by direct URL and reload, with filters in the query string, an order detail and `?mock=empty`
- the mock service worker in control of the page
- `/robots.txt` served as text, not as the app
- the host's cache headers, and a 404 for a missing asset (this test is skipped without `E2E_BASE_URL`, since `vite preview` sends no such headers)
- axe on every route at 1280 and 375 px
- one role switch
- one mutation (create a movement and undo it)

It runs against the local preview too (`pnpm e2e --grep @smoke`). How deploys work: [Deploying the demo](deploy.md).

### What the suite covers

Only what a real browser is needed for; logic stays in the Vitest tests.

- **axe, zero violations:** every route at 1280 and 375 px. Screens with permission-guarded controls (Products, Movements, Order detail) once per role; the list screens also while loading, empty and after a failed load.
- **No horizontal page scroll** at 375 px on every route.
- **Top bar** (`e2e/topBar.e2e.ts`), every route and role: at 375 and 320 px the repeated title is hidden, the top bar stays inside the screen and the page does not scroll sideways; at 768 and 1024 px the title is shown in full (`scrollWidth <= clientWidth`).
- **Disabled reasons:** Escape closes the reason first and the native dialog or row menu second; the reason stays inside the viewport, does not cover its control and is not clipped by the table scroll region or the New movement drawer; only one reason is shown at a time.
- **Roles:** switching ADMIN to VIEWER and back on Products without a refetch; the three mutations as the role that may do them (archive, create a movement and undo it, cancel an order); the same three refused for a VIEWER with no mutating request sent.
- **Virtualized lists** (Movements, Audit log): a window of rows, the next page loaded once, focus kept while scrolling, the slow and error mock scenarios.
- **Layout stability while a list loads** (Products, Orders, Movements, Audit log, at both widths): the table top stays within 1 px when the rows arrive, a `DataTable` draws as many skeleton rows as the page then shows, and the layout shift score stays at or below 0.1. Local preview only, not `@smoke`.
- **Keyboard:** skip link, sidebar, role switcher and a page's main action, with a visible focus ring at each stop.
- **Deploy:** deep links and reloads with query strings, the worker in control, `/robots.txt` as text, cache headers against a deployed site, and the startup error when service workers are blocked or the mock's code fails to load.

### How the tests are written

- Two projects: `desktop` (1280 px) runs everything, `mobile` (375 px) runs the tests tagged `@mobile`, where the layout matters.
- `@smoke` marks the subset that also runs against a deployed site.
- Every test starts in a new browser context: the mock store lives in the page, so each test gets fresh seed data and the default ADMIN user. Other roles are picked in the role switcher.
- Locators are roles, labels and text. No CSS selectors and no test ids. One exception: the layout stability check samples the table once per animation frame inside the page, before Playwright locators can act, with `document.querySelector('main table')`, a semantic element rather than a class.
- No fixed waits. "Nothing was sent" is asserted by sending a marker request and checking what was recorded before it (`e2e/support/requests.ts`).
- Files are named `*.e2e.ts`, so Vitest does not collect them.

### Not covered

Firefox and WebKit. Touch behaviour in Safari (a tap opening a disabled reason) stays a manual check.
