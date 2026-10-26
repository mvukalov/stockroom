import { waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ENDPOINTS, type Id } from '@stockroom/contract';

import { getDb } from '../mocks/db';
import { holdResponses, seedUser, setupMockServer } from './mockServer';

const server = setupMockServer();

/** Posts a one-unit RECEIPT with its own id; settles with the response or the error. */
function postReceipt(): { id: Id; outcome: Promise<unknown> } {
  const db = getDb();
  const product = db.products.find((p) => p.archivedAt === null);
  const location = db.locations[0];
  if (!product || !location) throw new Error('Seed has no product or location');
  const id = crypto.randomUUID();
  const outcome = fetch(
    `${window.location.origin}${ENDPOINTS.createMovement.path}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': seedUser('ADMIN').id,
      },
      body: JSON.stringify({
        id,
        type: 'RECEIPT',
        productId: product.id,
        locationId: location.id,
        quantity: 1,
        reason: null,
      }),
    },
    // Caught at once, so a request failed by the cleanup is not an unhandled rejection.
  ).catch((error: unknown) => error);
  return { id, outcome };
}

/** The status of an answered request; a request that failed rethrows its error. */
async function statusOf(outcome: Promise<unknown>): Promise<number> {
  const response = await outcome;
  if (!(response instanceof Response)) throw response;
  return response.status;
}

const isStored = (id: Id) => getDb().movements.some((m) => m.id === id);

describe('holdResponses', () => {
  it('holds a request until release, then answers it from the mock', async () => {
    let started = 0;
    server.events.on('request:start', () => (started += 1));
    const held = holdResponses('createMovement');
    let settled = false;
    const { id, outcome } = postReceipt();
    void outcome.then(() => (settled = true));

    await waitFor(() => expect(started).toBe(1));
    expect(settled).toBe(false);
    expect(isStored(id)).toBe(false);

    held.release();
    expect(await statusOf(outcome)).toBe(201);
    expect(isStored(id)).toBe(true);
  });

  // The next two run in order: the first ends with its request still held.
  let leftHeld: { id: Id; outcome: Promise<unknown> } | undefined;

  it('ends a test with a request still held', () => {
    holdResponses('createMovement');
    leftHeld = postReceipt();
  });

  it('fails a request left held as a network error once its test ends, without storing it', async () => {
    if (!leftHeld) throw new Error('The previous test did not run');
    expect(await leftHeld.outcome).toBeInstanceOf(TypeError);
    expect(isStored(leftHeld.id)).toBe(false);

    // The hold ended with its test: a new request is answered at once.
    const { id, outcome } = postReceipt();
    expect(await statusOf(outcome)).toBe(201);
    expect(isStored(id)).toBe(true);
  });
});
