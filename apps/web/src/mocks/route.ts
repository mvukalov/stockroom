import { delay, http, HttpResponse, type PathParams } from 'msw';

import { ENDPOINTS, type EndpointName } from '@stockroom/contract';

import { getMockConfig } from './config';
import { getDb, type MockDb } from './db';
import { latencyMs } from './http';

const METHODS = { GET: http.get, POST: http.post, PATCH: http.patch };

type Resolver = (info: {
  request: Request;
  params: PathParams;
  db: MockDb;
}) => Response | Promise<Response>;

type RouteOptions = {
  /** Still answers in the `error` scenario (the role switcher needs the user list). */
  ignoresErrorScenario?: boolean;
};

/**
 * A handler for one endpoint of the contract map: method and path come from `ENDPOINTS`,
 * then latency and the scenario are applied in one place for every endpoint.
 */
export function route(
  name: EndpointName,
  resolver: Resolver,
  { ignoresErrorScenario = false }: RouteOptions = {},
) {
  const { method, path } = ENDPOINTS[name];
  return METHODS[method](path, async ({ request, params }) => {
    await delay(latencyMs(request));
    if (getMockConfig().scenario === 'error' && !ignoresErrorScenario) {
      return new HttpResponse(null, { status: 500 });
    }
    return resolver({ request, params, db: getDb() });
  });
}
