import { z } from 'zod';

import { AuditLogEntry } from './audit';
import { ProductListItem } from './catalog';
import { DashboardResponse } from './dashboard';
import {
  CreateMovementInput,
  MovementListItem,
  StockMovement,
} from './movement';
import {
  OrderDetail,
  OrdersPage,
  OrderTransitionInput,
  UpdateOrderLinesInput,
} from './order';
import { pageSchema } from './pagination';
import { Id } from './primitives';
import {
  AuditQuery,
  MovementsQuery,
  OrdersQuery,
  ProductsQuery,
} from './queries';
import { User } from './user';

/** Demo identity until real auth (phase 2): the acting user's id is sent in this header. */
export const USER_ID_HEADER = 'X-User-Id';

export type HttpMethod = 'GET' | 'POST' | 'PATCH';

export type EndpointDef = {
  method: HttpMethod;
  /** Path parameters are written as `:name` and described by `params`. */
  path: `/api/${string}`;
  params?: z.ZodType;
  query?: z.ZodType;
  body?: z.ZodType;
  /** Success body. Failures return `ApiError`. */
  response: z.ZodType;
};

const OrderIdParams = z.object({ id: Id });

/** Shared by the MSW handlers, the client and (phase 2) the real API. */
export const ENDPOINTS = {
  listUsers: {
    method: 'GET',
    path: '/api/users',
    response: z.array(User),
  },
  getDashboard: {
    method: 'GET',
    path: '/api/dashboard',
    response: DashboardResponse,
  },
  listProducts: {
    method: 'GET',
    path: '/api/products',
    query: ProductsQuery,
    response: pageSchema(ProductListItem),
  },
  listMovements: {
    method: 'GET',
    path: '/api/movements',
    query: MovementsQuery,
    response: pageSchema(MovementListItem),
  },
  // Idempotent on the client-generated `id`: repeating the same payload returns the
  // stored movement; reusing the id with a different payload returns CONFLICT.
  createMovement: {
    method: 'POST',
    path: '/api/movements',
    body: CreateMovementInput,
    response: StockMovement,
  },
  listOrders: {
    method: 'GET',
    path: '/api/orders',
    query: OrdersQuery,
    response: OrdersPage,
  },
  getOrder: {
    method: 'GET',
    path: '/api/orders/:id',
    params: OrderIdParams,
    response: OrderDetail,
  },
  updateOrderLines: {
    method: 'PATCH',
    path: '/api/orders/:id',
    params: OrderIdParams,
    body: UpdateOrderLinesInput,
    response: OrderDetail,
  },
  transitionOrder: {
    method: 'POST',
    path: '/api/orders/:id/transition',
    params: OrderIdParams,
    body: OrderTransitionInput,
    response: OrderDetail,
  },
  listAudit: {
    method: 'GET',
    path: '/api/audit',
    query: AuditQuery,
    response: pageSchema(AuditLogEntry),
  },
} as const satisfies Record<string, EndpointDef>;

export type EndpointName = keyof typeof ENDPOINTS;
