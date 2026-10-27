# Fix: Layout shift on the Products page

Feature 008, part 2. The deployed demo scores a Cumulative Layout Shift of **0.781** on `/products` (Lighthouse, mobile preset, on the production build; Orders is 0.05 to 0.07, which is fine). Anything above 0.1 counts as poor, and a visitor who runs Lighthouse on the live link sees this number. This fix finds what moves on that page, makes the layout stable from the first paint, and adds a check so it cannot come back. It changes no behaviour and no data.

Depends on: `008_01-deploy-spec.md` merged (production URL `https://stockroom-web-five.vercel.app`, Lighthouse results recorded in its PR and History), `003_01-products-list-spec.md`, `002_05-data-table-spec.md`, `docs/adr/0005-table-engine.md`.

Read first: `context/coding-standards.md` (Accessibility, Performance, Testing), `context/design-direction.md` (sections on tables, skeletons, typography), `apps/web/src/components/organisms/DataTable/` (skeleton rows, toolbar, pagination, `ProgressBar`), `apps/web/src/pages/products/` (the header "<total> products" line, filter toolbar, chips), the font setup (`index.html`, the font imports, `font-display`), `docs/deploy.md` (how to run Lighthouse on the preview).

## Goals

### Find the cause first (the plan's evidence)

- [ ] **Measure before changing anything.** Run Lighthouse on the production build locally (`pnpm build && pnpm preview`, mobile preset) at least 5 times on `/products` and report the median CLS. Then record which elements shift: Lighthouse's "Avoid large layout shifts" list, and a Chrome performance trace or a `PerformanceObserver` for `layout-shift` entries with their `sources`, so each shift is tied to an element and a moment (first paint, fonts loaded, the worker ready, first data arriving, the toolbar options arriving).
- [ ] The plan lists each shift with its size and cause. Expected suspects, to be confirmed or rejected from the data, not assumed: skeleton rows with a different height or count than the loaded rows; the "<total> products" line, hidden until the data arrives and then pushing the table down; the filter toolbar or chips appearing after the options load; the progress bar taking space when it appears; web fonts swapping in (Inter and JetBrains Mono, `font-display`) and changing text width and height; the pagination footer appearing late; the demo note or the sidebar.
- [ ] Say why Products is bad and Orders is fine. Whatever differs between the two pages is evidence.

### Fix

- [ ] Remove each confirmed cause at its source, in the shared component where the cause is shared (for example `DataTable` skeleton rows using the same row height and the same page-size count as the loaded state; space reserved for the header count and the pagination footer; the progress bar overlaid or given reserved space rather than inserted), and not with per-page tweaks. If the cause is font loading, fix it with the smallest change that stops the shift (a preloaded font file, `font-display` choice, a metrics-matched fallback with `size-adjust`), and show the CLS before and after for that change alone.
- [ ] No fixed pixel heights that break at other widths or font sizes: reserved space uses the existing tokens (`--table-row-height` and similar) and works at 375 and 1280 px and at 200 % zoom.
- [ ] All other list screens (Movements, Orders, Audit log) and the Dashboard and Order detail get the same measurement and stay under 0.1. If one of them has the same cause, it is fixed by the same change; if it has a different cause, it is reported and fixed only when small.
- [ ] No change to what the user sees once data has loaded, no change to loading semantics (`aria-busy`, the visually hidden "Loading" status, `keepPreviousData` behaviour). Stories and tests still describe the same states.

### Prevent regressions

- [ ] An e2e check (Playwright, against the local production preview, desktop and mobile) that records `layout-shift` entries without recent input during load of `/products`, `/orders`, `/movements` and `/audit`, and fails above a threshold of **0.1** (the "good" limit). It runs in `pnpm e2e`; whether it also joins the `@smoke` subset against the live URL is decided in the plan, with the reason (a real-network run is noisier than a local one). The test must fail on the old code (show it, by checking out the previous layout or reintroducing one cause) and pass on the fix.
- [ ] Stories and the a11y addon stay clean; the existing e2e and axe checks stay green.

### Evidence

- [ ] Before and after table in the PR: CLS median of 5 Lighthouse runs on `/products` (and the other list pages), each shift's cause and size, and which change removed it.
- [ ] After merge and deploy, Lighthouse on the production URL for `/products` and `/orders`, reported with CLS, TBT and the Performance score. TBT is **not** a goal of this fix, but its number is recorded so the README work has a baseline.

### Tests, gate

- [ ] `pnpm build`, `lint`, `typecheck`, `test`, `build-storybook` and `pnpm e2e` stay green. If `pnpm test` fails on one of the known flaky tests (see `fix/flaky-tests-under-load` in the notes), re-run and say which test and how many runs it took, without touching it.

## Decisions

1. **Measure first, fix what the data shows.** The suspects above are hypotheses; the plan must be built from the trace.
2. **Fix in the shared component** when the cause is shared; no per-page workarounds.
3. **Threshold 0.1** (the "good" limit) is the rule for list screens, enforced by a test.
4. **TBT and bundle size are out of scope** here (seed generation in the browser and the 928 kB mock chunk are a separate decision); this fix only records the numbers.
5. **No new libraries.**

## Does not include

- TBT, bundle splitting, lazy loading of the mock worker or the seed, caching strategy, image work (`og:image` and README screenshots are `008_03`).
- Redesigning the skeleton or the table; changing page sizes or defaults.
- The flaky-test follow-up (`fix/flaky-tests-under-load`).

## Notes

- Branch name: `fix/products-layout-shift`.
- Lighthouse on this project uses the mobile preset with simulated throttling; always report the number of runs and the median, because single runs vary.
- If the cause is outside the components (for example the MSW worker start delaying the first render so the shell paints twice), stop and report before changing the startup sequence.
