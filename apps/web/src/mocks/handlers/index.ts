import { auditHandlers } from './audit';
import { catalogHandlers } from './catalog';
import { movementHandlers } from './movements';
import { orderHandlers } from './orders';

/** One handler per endpoint in `ENDPOINTS`. */
export const handlers = [
  ...catalogHandlers,
  ...movementHandlers,
  ...orderHandlers,
  ...auditHandlers,
];
