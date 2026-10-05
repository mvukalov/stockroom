import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ENDPOINTS, USER_ID_HEADER } from '@stockroom/contract';

import { setMockConfig } from '../mocks/config';
import { seedUser, setupMockServer } from '../test/mockServer';
import {
  apiRequest,
  orThrow,
  ApiRequestError,
  UnexpectedApiError,
} from './client';

const server = setupMockServer();

describe('apiRequest', () => {
  it('returns the parsed response and sends X-User-Id', async () => {
    const admin = seedUser('ADMIN');
    const headers: Array<string | null> = [];
    server.events.on('request:start', ({ request }) => {
      headers.push(request.headers.get(USER_ID_HEADER));
    });

    const result = await apiRequest('listUsers', { userId: admin.id });

    expect(result.ok && result.value).toContainEqual(admin);
    expect(headers).toEqual([admin.id]);
  });

  it('sends no identity header when no user is known', async () => {
    const headers: Array<string | null> = [];
    server.events.on('request:start', ({ request }) => {
      headers.push(request.headers.get(USER_ID_HEADER));
    });

    await apiRequest('listUsers', { userId: null });

    expect(headers).toEqual([null]);
  });

  it('returns a contract error as a value instead of throwing', async () => {
    const result = await apiRequest('getDashboard', { userId: null });

    expect(result).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
  });

  it('fills path parameters', async () => {
    const result = await apiRequest('getOrder', {
      userId: seedUser('ADMIN').id,
      params: { id: crypto.randomUUID() },
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });

  it('throws UnexpectedApiError for a failure outside the contract', async () => {
    setMockConfig({ scenario: 'error' });

    await expect(
      apiRequest('getDashboard', { userId: seedUser('ADMIN').id }),
    ).rejects.toBeInstanceOf(UnexpectedApiError);
  });

  it('throws UnexpectedApiError when a success response does not match the schema', async () => {
    server.use(
      http.get(ENDPOINTS.listUsers.path, () =>
        HttpResponse.json([{ id: 'not-a-uuid', name: 'Ana', role: 'OWNER' }]),
      ),
    );

    const error: unknown = await apiRequest('listUsers', {
      userId: null,
    }).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(UnexpectedApiError);
    expect(error).toMatchObject({
      status: 200,
      message: 'listUsers: the response does not match the contract',
    });
  });
});

describe('orThrow', () => {
  it('unwraps a success and throws ApiRequestError for an expected failure', async () => {
    const users = orThrow(await apiRequest('listUsers', { userId: null }));
    expect(users.length).toBeGreaterThan(0);

    const failure = await apiRequest('getDashboard', { userId: null });
    expect(() => orThrow(failure)).toThrow(ApiRequestError);
  });
});
