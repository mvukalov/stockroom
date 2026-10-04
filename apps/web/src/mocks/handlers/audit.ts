import { ENDPOINTS, type AuditLogEntry, type Id } from '@stockroom/contract';
import { assertNever } from '@stockroom/domain';

import { authorize, parseQuery, respond } from '../http';
import { inDateRange, paginate, sortBy } from '../listing';
import { route } from '../route';

/** What `entityId` matches: the movement and its product, the order, or the user. */
function entityIds(entry: AuditLogEntry): Id[] {
  switch (entry.type) {
    case 'MOVEMENT_CREATED':
      return [entry.movement.id, entry.movement.productId];
    case 'ORDER_STATUS_CHANGED':
    case 'ORDER_EDITED':
      return [entry.orderId];
    case 'ROLE_CHANGED':
      return [entry.userId];
    default:
      return assertNever(entry);
  }
}

export const auditHandlers = [
  route('listAudit', ({ request, db }) => {
    const user = authorize(request, db, 'view');
    if (!user.ok) return user.error;
    const query = parseQuery(request, ENDPOINTS.listAudit.query);

    const rows = db.auditLog.filter(
      (e) =>
        (query.type === undefined || e.type === query.type) &&
        (query.actorId === undefined || e.actorId === query.actorId) &&
        (query.entityId === undefined ||
          entityIds(e).includes(query.entityId)) &&
        inDateRange(e.occurredAt, query),
    );
    const actorName = (id: Id) =>
      (db.userById.get(id)?.name ?? id).toLowerCase();
    const sorted = sortBy(rows, query.sort, {
      occurredAt: (e) => e.occurredAt,
      actor: (e) => actorName(e.actorId),
      type: (e) => e.type,
    });
    return respond(ENDPOINTS.listAudit.response, paginate(sorted, query));
  }),
];
