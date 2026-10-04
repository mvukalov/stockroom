import { setupWorker } from 'msw/browser';

import { scenarioFromSearch, setMockConfig } from './config';
import { handlers } from './handlers';

/** Reads the scenario once from `?mock=`, since client-side navigation drops the parameter. */
export async function startMockWorker(): Promise<void> {
  setMockConfig({ scenario: scenarioFromSearch(window.location.search) });
  const worker = setupWorker(...handlers);
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
    },
  });
}
