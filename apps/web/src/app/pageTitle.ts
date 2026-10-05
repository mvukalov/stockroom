import { useMatches, type Params } from 'react-router';

export const APP_NAME = 'Stockroom';

/**
 * `handle` of every page route. `title` is the single source for the top bar title, the
 * page `<h1>` and `document.title`; a function receives the route params.
 *
 * The top bar always shows the route's section. On RouteErrorPage the `<h1>` and the
 * document title say "Something went wrong" instead, so there they differ on purpose.
 */
export type RouteHandle = { title: string | ((params: Params) => string) };

function isRouteHandle(handle: unknown): handle is RouteHandle {
  return (
    typeof handle === 'object' &&
    handle !== null &&
    'title' in handle &&
    (typeof handle.title === 'string' || typeof handle.title === 'function')
  );
}

/** Title of the deepest matched route that has one. */
export function usePageTitle(): string {
  const matches = useMatches();
  for (const match of [...matches].reverse()) {
    if (isRouteHandle(match.handle)) {
      const { title } = match.handle;
      return typeof title === 'string' ? title : title(match.params);
    }
  }
  return APP_NAME;
}
