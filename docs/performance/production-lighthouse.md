# Production Lighthouse: Products and Orders

- **Date:** 2026-10-27
- **Site:** https://stockroom-web-five.vercel.app (production deployment of commit `983a469`, after `context/features/008_02-layout-shift-spec.md`)
- **Routes:** `/products`, `/orders`

## Setup

- **Tool:** Lighthouse 13.5.0, run once with `npx` (not a project dependency), headless Chrome 156.
- **Preset:** mobile form factor (412 px wide), simulated throttling: 150 ms RTT, about 1.6 Mbps down, 4× CPU slowdown.
- **Categories:** Performance, Accessibility, Best Practices, SEO.
- **Runs:** 5 per route, one after the other, each on a fresh load. The table shows the median and the range of the five.
- **Machine:** iMac 2019 (iMac19,2), Intel Core i5-8500 at 3.0 GHz, 6 cores, macOS 15.7.9.

```
npx -y lighthouse@13.5.0 https://stockroom-web-five.vercel.app/products \
  --output=json --output-path=products-1.json \
  --only-categories=performance,accessibility,best-practices,seo \
  --form-factor=mobile --throttling-method=simulate \
  --chrome-flags="--headless=new" --quiet
```

## Results (median of 5 runs, range in brackets)

| | `/products` | `/orders` |
|---|---:|---:|
| Performance | **0.62** (0.58-0.63) | **0.62** (0.62-0.62) |
| Accessibility | 1.00 (1.00-1.00) | 1.00 (1.00-1.00) |
| Best Practices | 1.00 (1.00-1.00) | 1.00 (1.00-1.00) |
| SEO | 1.00 (1.00-1.00) | 1.00 (1.00-1.00) |
| Cumulative Layout Shift | **0.022** (0.022-0.022) | **0.023** (0.023-0.023) |
| Total Blocking Time | **1,700 ms** (1,685-1,850) | **1,679 ms** (1,645-1,716) |

All runs (Performance; CLS; TBT ms):

- `/products`: 0.58, 0.62, 0.63, 0.62, 0.62; 0.022 in every run; 1,850.0, 1,699.5, 1,687.0, 1,712.5, 1,685.0.
- `/orders`: 0.62 in every run; 0.023 in every run; 1,679.5, 1,645.0, 1,654.5, 1,715.5, 1,678.5.

## Total Blocking Time

TBT is what holds the Performance score at 0.62. Nearly all of it is one long task in the mock chunk (`assets/browser-*.js`, 928 kB, 336 kB gzipped as `vite build` reports it), about 1.7 s under the 4× CPU slowdown on both routes. Lighthouse attributes about 1.8 s of script time to that file per load, against 0.3 to 0.4 s for the app bundle.

The mock chunk holds MSW, the seed generator and the product catalog. On the first API request it generates the whole seed (12 months of movements, the orders and the audit log) and builds the in-memory store from it, on the main thread. A real backend would not do this work in the browser. Moving it off the main thread or making it smaller is not done yet.

## Remaining layout shifts

Lighthouse reports three shifts on each route, the same in all five runs. Their moment comes from one extra run per route with the trace saved (not part of the medians above). The times are from that trace, on the real load before Lighthouse simulates the throttling, counted from the document request.

**`/products`** (CLS 0.022)

| Shift | Element | Moment | Cause |
|---:|---|---|---|
| 0.0163 | The table's scroll region moves up 25 px | 1,669 ms | The line "Loading category and brand options…" in the toolbar disappears when the filter options arrive (1,650 ms) |
| 0.0032 | Table header cells (Category and its neighbours) | 1,763 ms | Column widths change when the rows arrive (1,733 ms) |
| 0.0027 | Role switcher in the top bar, 166 to 250 px wide | 1,402 ms | The user list arrives (1,382 ms) and the select takes the width of the longest name |

**`/orders`** (CLS 0.023)

| Shift | Element | Moment | Cause |
|---:|---|---|---|
| 0.0175 | The table with its filters moves down 20 px | 656 ms, 3 ms after the first contentful paint | Web font loaded: Inter arrived (646 ms) just after the first paint and replaced the fallback font |
| 0.0033 | Role switcher in the top bar, 166 to 264 px wide | 1,438 ms | The user list arrives (1,425 ms) |
| 0.0022 | Table header cells (Status and its neighbours) | 1,889 ms | Column widths change when the rows arrive (1,872 ms) |

The font shift depends on whether Inter arrives before the first paint, not on the route. In the traced run it arrived 4 ms before the first paint on `/products` (no shift) and 7 ms before it on `/orders`, so the swap landed just after. On a slower connection it can show on any route. The fonts use `font-display: swap` and are not preloaded.

All six shifts are far below the 0.1 limit for a good CLS, and both routes stay at about 0.02.

## What the numbers do not show

- **Real devices.** The throttling is simulated from one fast load on a desktop machine; it is a model of a mid-range phone, not a measurement on one.
- **Field data.** The demo has no analytics, so there is no data from real visitors.
- **Other routes.** Only `/products` and `/orders` were measured here.
