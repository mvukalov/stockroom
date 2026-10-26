import { http, HttpResponse } from 'msw';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  onTestFinished,
} from 'vitest';

import {
  ENDPOINTS,
  type EndpointName,
  type Role,
  type User,
} from '@stockroom/contract';

import { resetMockConfig, setMockConfig } from '../mocks/config';
import { getDb, resetDb } from '../mocks/db';
import { server } from '../mocks/node';

/** Runs the MSW mock for the calling test file: fresh data, no latency, `normal` scenario. */
export function setupMockServer(): typeof server {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  beforeEach(() => {
    resetMockConfig();
    setMockConfig({ latency: { minMs: 0, maxMs: 0 } });
    resetDb();
    // Builds the store here, under the hook timeout. Built lazily by the first request
    // instead, it can block the event loop long enough under parallel load to time out
    // a `findBy*` query.
    getDb();
  });
  afterEach(() => {
    server.resetHandlers();
    server.events.removeAllListeners();
  });
  afterAll(() => server.close());
  return server;
}

export function seedUser(role: Role): User {
  const user = getDb().users.find((u) => u.role === role);
  if (!user) throw new Error(`Seed has no ${role}`);
  return user;
}

const METHODS = { GET: http.get, POST: http.post, PATCH: http.patch };

/**
 * Holds every request to `name` until `release()`, then lets it through to the mock,
 * so a test checks the pending state for as long as it needs instead of racing the
 * latency. Requests still held when the test ends fail as a network error: they never
 * reach the store, leak into the next test or keep the run waiting.
 */
export function holdResponses(name: EndpointName): { release: () => void } {
  const { method, path } = ENDPOINTS[name];
  let open: (through: boolean) => void = () => undefined;
  const gate = new Promise<boolean>((resolve) => {
    open = resolve;
  });
  server.use(
    METHODS[method](path, async () =>
      // Returning nothing falls through to the regular handler.
      (await gate) ? undefined : HttpResponse.error(),
    ),
  );
  // The first call wins: after release() this does nothing.
  onTestFinished(() => open(false));
  return { release: () => open(true) };
}
