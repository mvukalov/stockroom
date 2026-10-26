import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const LOCAL_URL = `http://localhost:${PORT}`;
/** A deployed site to test instead of the local build (see docs/deploy.md). */
const DEPLOYED_URL = process.env.E2E_BASE_URL;
const BASE_URL = DEPLOYED_URL ?? LOCAL_URL;
const isCI = Boolean(process.env.CI);

// The suite runs against the production build, the same bundle and MSW service
// worker the static demo serves. Locally a preview already on the port is reused,
// so stop it after changing the app or the suite tests the old build. With
// E2E_BASE_URL set nothing is built or served: the tests open that site.
export default defineConfig({
  testDir: './e2e',
  // Not `*.spec.ts` or `*.test.ts`: Vitest collects those, and e2e stays out of `pnpm test`.
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  // The `slow` and `error` mock scenarios answer after several seconds.
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'off',
  },
  projects: [
    {
      name: 'desktop',
      grepInvert: /@narrow/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      // Only what the layout changes: tests tagged @mobile (@narrow ones run here only).
      name: 'mobile',
      grep: /@mobile/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 812 },
      },
    },
  ],
  ...(DEPLOYED_URL === undefined && {
    webServer: {
      command: `pnpm build && pnpm preview --port ${PORT} --strictPort`,
      url: LOCAL_URL,
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
  }),
});
