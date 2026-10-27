# Deploying the demo

The phase 1 demo is a static site. The mock API (MSW) runs in the visitor's browser, so there is no server, database or secret. It is hosted on **Vercel**, deployed by Vercel's Git integration, and live at https://stockroom-web-five.vercel.app. There is no GitHub Actions workflow; CI is phase 3.

All build and routing settings are in [`vercel.json`](../vercel.json) at the repository root. The few settings that cannot be committed are listed under [Project settings](#project-settings).

## Why Vercel

Compared for this project (October 2026):

| | Vercel (Hobby) | Cloudflare Pages | Netlify (Free) | GitHub Pages |
|---|---|---|---|---|
| Deep links (`/orders/:id`) | rewrite, HTTP 200 | automatic SPA mode | redirect rule, HTTP 200 | only a `404.html` copy, which answers HTTP **404** |
| Worker file and own cache headers | yes | yes (`_headers`) | yes | no own headers |
| Deploy from `main`, preview per PR | yes, Git integration | yes | yes | no previews; needs an Actions workflow to build |
| Sub-path | no, root of the domain | no | no | `/stockroom/` for a project site |
| Cost | free for personal, non-commercial use | free | free, but credit-based: each production deploy uses credits | free |

Vercel keeps every build setting in one committed file and comments a preview link on each pull request. Cloudflare Pages was the close second, with two files (`_headers`, `_redirects`) in `apps/web/public`. GitHub Pages was ruled out: it needs a workflow and answers deep links with a 404 status.

The site is served from the root of its domain, so Vite `base`, the router and the worker path stay as they are. The worker URL is already built from `import.meta.env.BASE_URL` (`apps/web/src/mocks/browser.ts`).

## How a deploy happens

- **Production:** every merge to `main` builds and goes live.
- **Preview:** every pushed branch gets its own URL, and Vercel comments it on the pull request.
- **Build:** Vercel installs from the root `pnpm-lock.yaml`, runs `pnpm --filter @stockroom/web build` (`tsc -b && vite build`) and serves `apps/web/dist`.

`installCommand` is deliberately not set in `vercel.json`. An overridden install command makes Vercel pick the oldest pnpm it has. With Corepack on (below), it installs with the version in the root `package.json` `packageManager` field.

## Project settings

These live in the Vercel dashboard, not in the repository. Martin owns the account and enters them.

| Setting | Value | Why |
|---|---|---|
| Git repository | `mvukalov/stockroom` | Git integration, no workflow |
| Root Directory | repository root (default) | `vercel.json` and the lockfile are at the root |
| Framework, build command, output | leave as detected | `vercel.json` overrides them |
| Environment variable | `ENABLE_EXPERIMENTAL_COREPACK=1`, all environments | builds use pnpm 12.9.1 from `packageManager`, the same as locally |
| Node.js version | 24.x | matches local development |
| Production branch | `main` (default) | |
| Deployment Protection | Vercel's default protects previews, not production | a preview needs a Vercel login, or protection off for previews, to be checked in a clean profile |

## Routing and caching

Both are in `vercel.json`. JSON has no comments, so the reasons are here.

- **SPA fallback:** every path except `/assets/…` is rewritten to `/index.html` with status 200. A deep link or reload of `/orders/:id`, `/products?search=…` or `/movements?mock=slow` loads the app, and the router takes it from there. Existing files (`mockServiceWorker.js`, `favicon.svg`) are served as they are, because Vercel checks the file system before rewrites.
- **`/assets/` is left out of the fallback** on purpose. A tab opened before a deploy can still ask for a chunk of the old build. It gets a real 404 instead of `index.html` served as JavaScript.
- **`/assets/*`: `public, max-age=31536000, immutable`.** Vite puts a content hash in every file name there, so a file never changes under the same name.
- **Everything else: `public, max-age=0, must-revalidate`.** This covers `index.html`, every route and `mockServiceWorker.js`. A browser always revalidates them, so a new deploy is picked up on the next load: the new `index.html` references the new hashed assets, and a changed worker script is installed.

## The mock in production

`apps/web/src/main.tsx` starts the MSW worker before React renders, so no request leaves before the mock is ready. The worker logs nothing in production builds (`quiet`).

If the mock does not start, the page shows "The demo could not start" with a Reload button instead of a blank page. That happens when service workers are blocked (in a private window or by browser settings) or when the mock's code fails to load (the connection dropped). The page names both causes; the actual error is logged with `console.error`.

The data is generated from the seed in the browser on every load. The sidebar and the navigation drawer say so: "Demo: mock data in your browser, resets on reload." Only the chosen demo user is kept, in `localStorage`. There are no cookies, analytics or tracking.

## Rolling back

- **Fast:** in the Vercel dashboard, open the project, then **Instant Rollback** on the production deployment tile. On the Hobby plan this goes back to the immediately previous production deployment.
- After a rollback, Vercel stops putting new `main` deploys live. Fix forward with a PR, then use **Undo Rollback** and promote the fixed deployment.
- **Older versions:** revert the commit on `main` through a pull request. The merge deploys the reverted state.

## Checking a deploy

Run the smoke subset of the e2e suite against the site (see [Testing](testing.md#against-a-deployed-site)):

```
E2E_BASE_URL=https://<deployment-url> pnpm e2e --grep @smoke
```

For production:

```
E2E_BASE_URL=https://stockroom-web-five.vercel.app pnpm e2e --grep @smoke
```

It covers:

- every route by direct URL and reload, including filters in the query string, an order detail and a mock scenario
- the worker controlling the page
- `/robots.txt` served as text (the SPA fallback would otherwise answer it with `index.html`, which Lighthouse reports as an invalid robots.txt)
- the cache headers, and the 404 for a missing asset
- axe on every route at 1280 and 375 px
- one role switch
- one mutation (create a movement and undo it)

The run changes nothing outside the test browser, because the mock store lives in the page.

Checked by hand after a deploy:

- a clean browser profile and a 375 px viewport
- each route by URL and by reload
- all three roles
- `?mock=slow`, `?mock=empty`, `?mock=error`
- the service worker active in DevTools > Application
- no console errors
- Lighthouse on `/products`
