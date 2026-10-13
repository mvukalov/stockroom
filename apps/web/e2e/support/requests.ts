import type { Page } from '@playwright/test';

/** `METHOD /api/path` of every API request the page sends from now on. */
export function recordApiRequests(page: Page): string[] {
  const requests: string[] = [];
  page.on('request', (request) => {
    const { pathname } = new URL(request.url());
    if (pathname.startsWith('/api/')) {
      requests.push(`${request.method()} ${pathname}`);
    }
  });
  return requests;
}

export const writesIn = (requests: readonly string[]) =>
  requests.filter((request) => !request.startsWith('GET '));

/**
 * Resolves once every request the page has sent so far is in the recorded list.
 * Requests are reported in the order they start, so a marker request sent now
 * closes the list. This is how "nothing was sent" is asserted without a sleep.
 */
export async function requestsSettled(page: Page): Promise<void> {
  const marker = `/e2e-marker-${crypto.randomUUID()}`;
  await Promise.all([
    page.waitForRequest((request) => request.url().endsWith(marker)),
    page.evaluate((url) => void fetch(url).catch(() => undefined), marker),
  ]);
}
