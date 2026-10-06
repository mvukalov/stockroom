import {
  ENDPOINTS,
  type CreateMovementInput,
  type StockMovement,
} from '@stockroom/contract';
import {
  assertNever,
  movementAuditEntry,
  movementMatchesQuery,
  validateMovement,
} from '@stockroom/domain';

import { appendMovement, type MockDb } from '../db';
import {
  apiError,
  authorize,
  parseBody,
  parseQuery,
  respond,
  validationError,
} from '../http';
import { paginate, sortBy } from '../listing';
import { auditLookups, toMovementListItem } from '../readModels';
import { route } from '../route';

/** Same id and same client fields: a retry of a movement that was already stored. */
function isSamePayload(
  stored: StockMovement,
  input: CreateMovementInput,
): boolean {
  const { createdBy: _createdBy, createdAt: _createdAt, ...fields } = stored;
  const a: Record<string, unknown> = fields;
  const b: Record<string, unknown> = input;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((key) => a[key] === b[key]);
}

/** Ids that must exist in the store, as field path -> message. */
function unknownReferences(db: MockDb, input: CreateMovementInput) {
  const issues: { path: string[]; message: string }[] = [];
  if (!db.productById.has(input.productId)) {
    issues.push({ path: ['productId'], message: 'Unknown product' });
  }
  if (!db.locationById.has(input.locationId)) {
    issues.push({ path: ['locationId'], message: 'Unknown location' });
  }
  if (
    input.type === 'TRANSFER' &&
    !db.locationById.has(input.destinationLocationId)
  ) {
    issues.push({
      path: ['destinationLocationId'],
      message: 'Unknown location',
    });
  }
  return issues;
}

export const movementHandlers = [
  route('listMovements', ({ request, db }) => {
    const user = authorize(request, db, 'view');
    if (!user.ok) return user.error;
    const query = parseQuery(request, ENDPOINTS.listMovements.query);

    const rows = db.movements.filter((m) => movementMatchesQuery(m, query));
    const sorted = sortBy(rows, query.sort, {
      createdAt: (m) => m.createdAt,
      type: (m) => m.type,
      quantity: (m) => m.quantity,
    });
    const page = paginate(sorted, query);
    return respond(ENDPOINTS.listMovements.response, {
      ...page,
      items: page.items.map((m) => toMovementListItem(db, m)),
    });
  }),

  // Idempotent on the client-generated id (contract: `createMovement`).
  route('createMovement', async ({ request, db }) => {
    const user = authorize(request, db, 'movement.create');
    if (!user.ok) return user.error;
    const body = await parseBody(request, ENDPOINTS.createMovement.body);
    if (!body.ok) return body.error;
    const input = body.value;

    const stored = db.movementById.get(input.id);
    if (stored) {
      return isSamePayload(stored, input)
        ? respond(ENDPOINTS.createMovement.response, stored, 200)
        : apiError({
            code: 'CONFLICT',
            message: `Movement ${input.id} already exists with different values.`,
          });
    }

    const unknown = unknownReferences(db, input);
    if (unknown.length > 0) return validationError(unknown);

    const valid = validateMovement(input, {
      stock: db.stock,
      orders: db.orders,
    });
    if (!valid.ok) {
      const error = valid.error;
      switch (error.code) {
        case 'INSUFFICIENT_STOCK':
          return apiError({
            code: 'INSUFFICIENT_STOCK',
            message:
              error.limit === 'LOCATION_ON_HAND'
                ? `Only ${error.maxQuantity} on hand now.`
                : `Only ${error.maxQuantity} available now.`,
            details: {
              productId: error.productId,
              locationId: error.locationId,
              available: error.maxQuantity,
            },
          });
        case 'REASON_REQUIRED':
          return validationError([
            { path: ['reason'], message: 'A reason is required' },
          ]);
        case 'SAME_LOCATION':
          return validationError([
            {
              path: ['destinationLocationId'],
              message: 'Destination must differ from source',
            },
          ]);
        default:
          return assertNever(error);
      }
    }

    const movement: StockMovement = {
      ...input,
      createdBy: user.value.id,
      createdAt: db.now(),
    };
    appendMovement(db, movement);
    db.auditLog.push(movementAuditEntry(movement, auditLookups(db)));
    return respond(ENDPOINTS.createMovement.response, movement, 201);
  }),
];
