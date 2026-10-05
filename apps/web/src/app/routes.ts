import { generatePath } from 'react-router';

import type { Id } from '@stockroom/contract';

/** Every route path of the app. Components link with these, never with path strings. */
export const ROUTES = {
  root: '/',
  dashboard: '/dashboard',
  products: '/products',
  movements: '/movements',
  orders: '/orders',
  orderDetail: '/orders/:id',
  audit: '/audit',
} as const;

export function orderPath(id: Id): string {
  return generatePath(ROUTES.orderDetail, { id });
}
