import {
  ApiError,
  ENDPOINTS,
  USER_ID_HEADER,
  type EndpointBody,
  type EndpointDef,
  type EndpointName,
  type EndpointParams,
  type EndpointQuery,
  type EndpointResponse,
  type Id,
} from '@stockroom/contract';
import { err, ok, type Result } from '@stockroom/domain';

/*
 * Typed client over the contract `ENDPOINTS` map.
 *
 * Identity: every request carries `X-User-Id` of the user who made it. `userId` is an
 * explicit argument, not read from a global, so a request (or a replayed mutation)
 * always carries the user who initiated it.
 *
 * Rule for query hooks: the mock and the real API answer by role, so a query whose
 * data depends on the acting user must include that user id in its query key.
 * Otherwise switching the demo user would show data cached for the previous one.
 */

/** A failure outside the contract: network error, non-contract error body or a response that does not match its schema. */
export class UnexpectedApiError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'UnexpectedApiError';
    this.status = status;
  }
}

type ParamsOption<N extends EndpointName> =
  EndpointParams<N> extends undefined
    ? { params?: never }
    : { params: EndpointParams<N> };

type QueryOption<N extends EndpointName> =
  EndpointQuery<N> extends undefined
    ? { query?: never }
    : { query?: EndpointQuery<N> };

type BodyOption<N extends EndpointName> =
  EndpointBody<N> extends undefined
    ? { body?: never }
    : { body: EndpointBody<N> };

export type RequestOptions<N extends EndpointName> = {
  /** The acting user, sent as `X-User-Id`; `null` before a user is known. */
  userId: Id | null;
  signal?: AbortSignal;
} & ParamsOption<N> &
  QueryOption<N> &
  BodyOption<N>;

type Scalar = string | number | boolean;

function buildUrl(
  path: string,
  params: Record<string, Scalar> | undefined,
  query: Record<string, Scalar | undefined> | undefined,
): URL {
  const filled = path.replace(/:(\w+)/g, (_, name: string) => {
    const value = params?.[name];
    if (value === undefined)
      throw new Error(`Missing path parameter "${name}"`);
    return encodeURIComponent(String(value));
  });
  const url = new URL(filled, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === '') return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Calls one contract endpoint. Success is parsed with the endpoint's response schema;
 * an expected failure (contract `ApiError` body) is returned as a value. Anything else
 * throws `UnexpectedApiError`, and network or abort errors propagate as thrown by fetch.
 */
export async function apiRequest<N extends EndpointName>(
  name: N,
  options: RequestOptions<N>,
): Promise<Result<EndpointResponse<N>, ApiError>> {
  const endpoint: EndpointDef = ENDPOINTS[name];
  // `RequestOptions<N>` is a conditional type TypeScript cannot narrow inside a
  // generic function; callers are already checked against it, so the fields are
  // read here through their widest runtime shape.
  const { userId, signal, params, query, body } = options as {
    userId: Id | null;
    signal?: AbortSignal;
    params?: Record<string, Scalar>;
    query?: Record<string, Scalar | undefined>;
    body?: unknown;
  };

  const headers = new Headers({ Accept: 'application/json' });
  if (userId !== null) headers.set(USER_ID_HEADER, userId);
  if (body !== undefined) headers.set('Content-Type', 'application/json');

  const response = await fetch(buildUrl(endpoint.path, params, query), {
    method: endpoint.method,
    headers,
    body: body === undefined ? null : JSON.stringify(body),
    signal: signal ?? null,
  });
  const json = await readJson(response);

  if (response.ok) {
    const parsed = endpoint.response.safeParse(json);
    if (!parsed.success) {
      throw new UnexpectedApiError(
        `${name}: the response does not match the contract`,
        response.status,
      );
    }
    // `endpoint` is widened to `EndpointDef` above, so the parsed type is restored here.
    return ok(parsed.data as EndpointResponse<N>);
  }

  const failure = ApiError.safeParse(json);
  if (failure.success) return err(failure.data);
  throw new UnexpectedApiError(
    `${name} failed with HTTP ${response.status}`,
    response.status,
  );
}

/** An expected failure turned into an exception, for TanStack Query's error state. */
export class ApiRequestError extends Error {
  readonly error: ApiError;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiRequestError';
    this.error = error;
  }
}

/** For a `queryFn`: a query must throw to enter its error state. */
export function orThrow<T>(result: Result<T, ApiError>): T {
  if (!result.ok) throw new ApiRequestError(result.error);
  return result.value;
}
