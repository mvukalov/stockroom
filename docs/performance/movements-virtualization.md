# Movements list: virtualization before and after

- **Date:** 2026-10-06
- **Feature:** `context/features/004_01-movements-list-spec.md`, decision in `docs/adr/0006-virtualization.md`
- **Harness:** `apps/web/src/pages/movements/MovementsMeasurement.tsx`, stories *Measurement / Movements list / Virtualized* and *Not virtualized*

## What was measured

The same 10,000 loaded movement rows (a deterministic fixture, `fixtureMovements(10_000)`), rendered by the same `VirtualTable` component with the product's eight columns, once with virtualization (what the Movements screen uses) and once without (`virtualize={false}`, a prop used only by the harness). Everything else is identical: markup, styles, cells, scroll container.

| Metric | How |
|---|---|
| Mount to first paint | `performance.mark` in the Mount click handler, then a second mark in the second `requestAnimationFrame` callback after the commit, so the time includes React's render and commit, style, layout and the first paint of the result. React's production build does not call `<Profiler onRender>`, so the Profiler is not used. |
| Elements in the list | `querySelectorAll('*').length` inside the list after mount. |
| Scroll smoothness | A scripted scroll: 300 animation frames, `scrollTop += 120` px each (36,000 px, about 900 rows), with the time between consecutive frames recorded. Reported: frames over 25 ms (1.5 × 16.7 ms, so at least one vsync missed), frames over 50 ms (long frames), p95 and max frame time. |

Each combination ran **5 times on a fresh page load**; the table shows the **median** of the five runs. Before each Mount the page idles for 2.5 s, so the Storybook a11y addon's automatic check of the empty harness has finished.

## Environment

- **Build:** production build of Storybook (`pnpm --filter @stockroom/web build-storybook`), served locally from `apps/web/storybook-static` with `python3 -m http.server`. React production build.
- **Browser:** Chrome 154.0.8037.98, driven by Playwright, viewport 1280 × 800, device pixel ratio 1, page visible and focused, 60 Hz frames (median frame 16.7 ms at idle).
- **Machine:** iMac 2019 (iMac19,2), Intel Core i5-8500 at 3.0 GHz, 6 cores, 16 GB RAM, macOS 15.7.9.
- **Throttling:** none, and 4× CPU slowdown through the Chrome DevTools Protocol (`Emulation.setCPUThrottlingRate`), switched on after the page had loaded and before Mount. No network throttling (the harness makes no requests).
- **Not measured:** a dev-server run (development React). Only the production build is reported.

## Results (median of 5 runs)

| | Virtualized | Not virtualized | Virtualized, 4× CPU | Not virtualized, 4× CPU |
|---|---:|---:|---:|---:|
| Mount to first paint | **28.7 ms** | 4,705.9 ms | **107.3 ms** | 17,484.0 ms |
| Elements in the list | **648** | 274,042 | **648** | 274,042 |
| Scroll frames over 25 ms (of 300) | **0** | 122 | 262 | 300 |
| Scroll frames over 50 ms (of 300) | **0** | 107 | 4 | 299 |
| Scroll frame p95 | **17.6 ms** | 83.4 ms | 34.3 ms | 333.8 ms |
| Scroll frame max | **17.8 ms** | 516.8 ms | 50.7 ms | 2,101.1 ms |

All runs (mount ms; frames over 25 / over 50 ms; p95 / max ms):

- Virtualized: 26.6, 28.7, 30.9, 30.6, 28.3; 0/0 in every run; p95 17.5-17.6, max 17.8.
- Not virtualized: 4,821.6, 4,675.2, 4,705.9, 4,494.7, 4,856.5; 121/103, 121/110, 122/107, 132/108, 157/107; p95 67.8-100.2, max 449.6-634.4.
- Virtualized, 4× CPU: 109.7, 106.0, 111.9, 107.3, 106.7; 281/37, 262/2, 280/11, 249/1, 260/4; p95 34.2-50.4, max 50.1-133.4.
- Not virtualized, 4× CPU: 18,078.0, 18,626.5, 17,098.8, 17,484.0, 17,289.4; 300/299, 299/298, 300/300, 300/299, 300/299; p95 301.8-433.7, max 1,733.6-2,266.7.

## What the numbers show, and what they do not

With virtualization the list keeps about 650 elements in the DOM whatever the number of loaded rows, against 274,042 for 10,000 rows rendered in full (about 27 per row). That is the main effect: the first paint drops from about 4.7 s to under 30 ms (about 160 times faster), and on this machine the scripted scroll held 60 frames per second with no missed frame, while the full table missed about 40 % of its frames and had frames up to half a second.

Under a 4× CPU slowdown, which stands in for a slower laptop, the virtualized list still paints in about 0.1 s, but its scroll runs at about 30 frames per second (p95 34 ms): each frame of this fast scripted scroll (120 px, three new rows per frame) re-renders the rows in view. The full table at 4× is not usable: 17.5 s to the first paint and every scroll frame long. So virtualization removes the cost that grows with the number of loaded rows; it does not make each React render cheaper, and on a slow CPU a fast scroll is smooth only up to about 30 frames per second.

The numbers do not show:

- **Real loading.** The harness renders rows that are already in memory. In the product the rows arrive in pages of 100 as the user scrolls, so a user reaches 10,000 loaded rows only after 100 page requests; the measurement isolates rendering, not the API or TanStack Query.
- **Other machines and browsers.** One desktop machine and one browser; the 4× slowdown is a CPU model, not a real low-end device, and does not slow the GPU.
- **Memory.** Heap size was not recorded.
- **What a user feels while scrolling by hand.** A scripted scroll at a fixed 120 px per frame is faster and more regular than a wheel or trackpad; it compares the two modes, it does not rate the experience.

## Known limits of the virtualized table

These come with rendering only the rows in view, and they apply to the Movements screen as shipped:

- **Find in page.** The browser's find (Cmd/Ctrl+F) only sees rows that are rendered: about 30 rows around the visible ones. A movement further away is not found until it is scrolled into view. The filters (type, location, user, dates) are the way to find movements.
- **Screen reader table navigation.** The table has `aria-rowcount` (all rows the server has, plus the header row) and every rendered row has `aria-rowindex`, so a screen reader announces the real position ("row 4,812 of 48,024"). Table navigation still moves only through rendered rows, and how well a screen reader follows rows that appear while scrolling differs between screen readers and browsers.
- **Keyboard.** Tab moves only through rendered rows, so it cannot reach the Copy ID button of a row that is not rendered. Keyboard users scroll the focused list container instead (it is focusable: arrow keys, Page Up, Page Down, Home, End), and Tab then reaches the buttons of the rows in view. A row that holds focus stays rendered while the list scrolls, so focus is never lost to the page.

## How to repeat it

1. `pnpm --filter @stockroom/web build-storybook`
2. `cd apps/web/storybook-static && python3 -m http.server 6107`
3. In Playwright (Chrome), for each story id `measurement-movements-list--virtualized` and `measurement-movements-list--not-virtualized` and each rate 1 and 4, five times:

```js
async (page) => {
  const client = await page.context().newCDPSession(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`http://localhost:6107/iframe.html?id=${storyId}&viewMode=story`);
  await page.waitForSelector('#storybook-root button');
  await page.waitForTimeout(2500); // the a11y addon's check of the empty harness
  await client.send('Emulation.setCPUThrottlingRate', { rate });
  await page.getByRole('button', { name: 'Mount' }).click();
  await page.waitForFunction(() => window.__movementsMeasurement?.nodes !== undefined);
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Scroll' }).click();
  await page.waitForFunction(() => window.__movementsMeasurement?.frames !== undefined);
  const result = await page.evaluate(() => window.__movementsMeasurement);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  return result;
};
```

The harness also shows its results on the page, so a manual run in any browser works the same way: open the story, click Mount, then Scroll.
