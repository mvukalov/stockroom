# Feature: App shell

Feature 002, part 3. The frame every screen lives in: routing, left sidebar, top bar with the demo role switcher, and placeholder pages for the five sections. After this feature the app can be opened in the browser, navigated by keyboard and switched between ADMIN, CLERK and VIEWER, so each later screen (Products, Movements, Orders, Dashboard, Audit) only fills in its own page.

Depends on: `001_04-msw-handlers-spec.md` (mock API, `GET /api/users`, `X-User-Id` identity), `002_01-tokens-atoms-spec.md` and `002_02-storybook-spec.md` merged.

Read first: `context/coding-standards.md` (Routing, Styling, Accessibility, Naming), `context/design-direction.md` (sections 2, 7 and 9), `docs/adr/0001-router.md`, `docs/adr/0002-state-management.md`. Visual reference only: `context/design/00-sidebar-collapsed.png` and `01-dashboard-default.png`. Where they disagree with `design-direction.md`, the direction file wins.

## Goals

- [ ] React Router v8 in data mode (`createBrowserRouter`, ADR-0001). Route paths are constants in one file, with a typed helper for the order detail path. Routes: `/` redirects to `/dashboard`; `/dashboard`, `/products`, `/movements`, `/orders`, `/orders/:id`, `/audit`; anything else shows a "Page not found" page inside the shell.
- [ ] Layout: a skip link, a `<nav aria-label="Main">` sidebar, a `<header>` top bar and one `<main>`. Desktop sidebar is 240 px and collapses to an icon-only rail; the collapsed state survives reload.
- [ ] Sidebar items in this order: Dashboard, Products, Movements, Orders, Audit log, each with a Lucide icon. The active item has `aria-current="page"` and a visible non-colour cue. In the collapsed rail every item still has an accessible name.
- [ ] Below 768 px the sidebar is hidden and opens as a modal drawer from a menu button in the top bar. It traps focus, closes on Escape, on backdrop click and on navigation, and returns focus to the menu button.
- [ ] Top bar: page title, a global search field that is visibly a placeholder (disabled, with a text that says it is not available yet, hidden below 768 px), and the role switcher.
- [ ] Role switcher: lists the users from `GET /api/users` as name plus role, shows the current user with `Avatar` and a role `Badge`, and is clearly labelled as a demo control. The chosen user id survives reload; a stored id that is no longer in the list falls back to the first ADMIN. It still works in the `error` scenario (the users endpoint ignores it) and has loading and failed states with a retry.
- [ ] A small typed API client in `apps/web`: calls an endpoint from the contract `ENDPOINTS` map, sends `X-User-Id` of the current user on every request, parses the response with the contract schema, and returns a typed error value for an expected failure (contract error shape) instead of throwing. Only `listUsers` uses it in this feature; later features reuse it.
- [ ] Every page sets `document.title` (`Products · Stockroom`) and, after a route change, moves focus to the page `<h1>` so keyboard and screen reader users land at the top of the new page.
- [ ] Placeholder pages: title row with the `<h1>`, plus a short empty state saying what will live there. The order detail placeholder shows the id from the URL.
- [ ] A route error boundary: an unexpected error shows what happened and a "Back to dashboard" action, inside the shell.
- [ ] Storybook stories with their states for the new shared components (sidebar expanded and collapsed, role switcher with loading, error and each role, top bar). `pnpm build`, `lint`, `typecheck`, `test` and `build-storybook` stay green, and the a11y addon reports no violations on the new stories.
- [ ] Component tests (React Testing Library, roles and labels): nav links and `aria-current`, collapse toggle with `aria-expanded` and persistence, drawer open/close with Escape and focus return, role switcher fallback and header on the next request, not-found page, focus on `<h1>` after navigation, error boundary.

## Decisions

- **Roles are `ADMIN`, `CLERK`, `VIEWER`** (contract `Role`). There is no manager role anywhere in the project.
- **No Redux in this feature.** The selected demo user and the sidebar state are persisted with a small context or hook over `localStorage`, every read and write wrapped in try/catch so the app works without storage. ADR-0002 reserves Redux for event-flow state, and an identity pick is not that. The later `ui` slice may adopt the sidebar state if it needs to.
- **The users list is server state**, so it is read through TanStack Query (ADR-0002), not copied into a store.
- **Identity is the `X-User-Id` header** the mock already checks with `can`. Switching user changes it for later requests. Later features that cache role-dependent data must include the user id in their query keys; this feature only documents that rule in `context/design/` notes or a code comment where the client is defined.
- **Mobile drawer uses the native `<dialog>` with `showModal()`** for focus trap and Escape, not a hand-rolled trap. If jsdom lacks `showModal`, add a minimal shim in `src/test/setup.ts`.
- **Routes in one place.** Constants such as `ROUTES.products`, plus `orderPath(id)`. No path strings in components.
- **Layout widths** (240 px sidebar, collapsed rail) are the only fixed widths and come from layout tokens or Sass variables, not inline numbers. Nothing may scroll the page horizontally at 375 px.

## Does not include

- Real screens: Dashboard, Products, Movements, Orders, Order detail, Audit (each gets its own feature).
- Real login or auth, and a `ROLE_CHANGED` audit event when switching user (there is no mock endpoint for it).
- Global search behaviour, breadcrumbs, a Tooltip component, dark theme, density toggle.
- The Redux store, mutation queue, undo stack and toasts.
- Playwright e2e and axe in e2e (they arrive with the first real flow).
- The VIEWER pass over screens; this feature only makes the current role available. Permission checks still go through `can` from `@stockroom/domain`.

## Notes

- New libraries: `react-router` (v8) and `@tanstack/react-query`. Ask before adding anything else, and check the current official docs for both rather than relying on memory.
- Suggested structure, to be confirmed in the plan: router and providers in `src/app/`, shared layout components in `src/components/organisms/` (`AppShell`, `Sidebar`, `TopBar`, `RoleSwitcher`), pages in `src/pages/`, the API client in `src/api/`. Co-locate `.module.scss`, `.test.tsx` and `.stories.tsx`.
- `main.tsx` keeps the MSW bootstrap exactly as it is; only the rendered root changes. The mock must stay out of `VITE_API_MODE=real` builds.
- `GET /api/users` should not need an identity (verify in the handler); if it does, report it instead of working around it.
- Reuse the atoms and tokens from 002_01 (`Avatar`, `Badge`, `Select`, `Button`, `IconButton`, `Icon`, `VisuallyHidden`). No new colours, spacing or font sizes outside tokens. If an atom is missing something the shell needs, say so in the plan before changing it.
- The "part 2 of 2" line in `002_02-storybook-spec.md` is now stale; leave it, it is merged history.
