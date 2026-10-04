import { HttpResponse, type JsonBodyType } from 'msw';

import {
  ApiError,
  type ApiErrorCode,
  USER_ID_HEADER,
  type User,
} from '@stockroom/contract';
import {
  can,
  deterministicId,
  denialReason,
  err,
  ok,
  type Action,
  type Result,
} from '@stockroom/domain';

import { getMockConfig, SLOW_LATENCY } from './config';
import type { MockDb } from './db';

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_FAILED: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INSUFFICIENT_STOCK: 409,
  INVALID_TRANSITION: 409,
  CONFLICT: 409,
};

type Issue = { path: readonly PropertyKey[]; message: string };

/** Any contract schema; only `safeParse` is needed here. */
type Schema<T> = {
  safeParse(
    data: unknown,
  ):
    | { success: true; data: T }
    | { success: false; error: { message: string; issues: readonly Issue[] } };
};

/**
 * Success response, parsed with the endpoint's response schema. A mismatch is a bug in
 * the mock, so it throws: MSW turns it into a 500 and logs the error in the console.
 */
export function respond<T extends JsonBodyType>(
  schema: Schema<T>,
  body: NoInfer<T>,
  status = 200,
): HttpResponse<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      `Mock response does not match the contract: ${parsed.error.message}`,
    );
  }
  return HttpResponse.json(parsed.data, { status });
}

export function apiError(error: ApiError): HttpResponse<ApiError> {
  return HttpResponse.json(ApiError.parse(error), {
    status: STATUS_BY_CODE[error.code],
  });
}

/** `VALIDATION_FAILED` with field path -> messages, e.g. `{ "lines.0.quantity": [...] }`. */
export function validationError(
  issues: readonly Issue[],
): HttpResponse<ApiError> {
  const details: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || '_';
    (details[key] ??= []).push(issue.message);
  }
  return apiError({
    code: 'VALIDATION_FAILED',
    message: 'The request is not valid.',
    details,
  });
}

export const notFound = (message: string) =>
  apiError({ code: 'NOT_FOUND', message });

/** Request body parsed with a contract schema, or a `VALIDATION_FAILED` response. */
export async function parseBody<T>(
  request: Request,
  schema: Schema<T>,
): Promise<Result<T, HttpResponse<ApiError>>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return err(validationError([{ path: [], message: 'Body must be JSON' }]));
  }
  const parsed = schema.safeParse(json);
  return parsed.success
    ? ok(parsed.data)
    : err(validationError(parsed.error.issues));
}

/** Query string parsed with a contract query schema. Those schemas fall back instead of failing. */
export function parseQuery<T>(
  request: Request,
  schema: { parse(data: unknown): T },
): T {
  const params = new URL(request.url).searchParams;
  return schema.parse(Object.fromEntries(params));
}

/**
 * The acting user from the `X-User-Id` header (demo identity until phase 2), allowed to
 * do `action` by `can` from the domain package.
 */
export function authorize(
  request: Request,
  db: MockDb,
  action: Action,
): Result<User, HttpResponse<ApiError>> {
  const id = request.headers.get(USER_ID_HEADER);
  const user = id === null ? undefined : db.userById.get(id);
  if (!user) {
    return err(
      apiError({
        code: 'FORBIDDEN',
        message: `Unknown user. Send a valid ${USER_ID_HEADER} header.`,
      }),
    );
  }
  if (!can(user, action)) {
    return err(
      apiError({
        code: 'FORBIDDEN',
        message: denialReason(user, action) ?? 'Not allowed',
      }),
    );
  }
  return ok(user);
}

/**
 * Simulated latency, the same for the same request (method, path and query) so a page
 * behaves the same on every reload. `slow` uses `SLOW_LATENCY`, everything else the
 * configured range.
 */
export function latencyMs(request: Request): number {
  const { scenario, latency } = getMockConfig();
  const { minMs, maxMs } = scenario === 'slow' ? SLOW_LATENCY : latency;
  const url = new URL(request.url);
  const hash = parseInt(
    deterministicId(`${request.method} ${url.pathname}${url.search}`).slice(
      0,
      8,
    ),
    16,
  );
  return minMs + (hash % (maxMs - minMs + 1));
}
