import { QueryClient } from '@tanstack/react-query';

/**
 * One retry in the app, so a failed request shows its error state quickly instead of
 * after TanStack's default three retries with backoff. Tests pass `retry: false`.
 */
export function createQueryClient({
  retry = 1,
}: { retry?: number | false } = {}): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry } } });
}
