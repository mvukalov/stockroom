import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';

import type { Role, User } from '@stockroom/contract';

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
