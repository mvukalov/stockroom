import type { AuditLogEntry, Id } from '@stockroom/contract';
import { assertNever } from '@stockroom/domain';

/** The record an audit event concerns, for the Record column. */
export type AuditRecord =
  | { kind: 'movement'; movementId: Id }
  | { kind: 'order'; orderId: Id; orderNumber: string }
  | { kind: 'user'; userId: Id; userName: string };

/** The visible name of each kind of record, before its id, number or name. */
export const AUDIT_RECORD_LABELS: Record<AuditRecord['kind'], string> = {
  movement: 'Movement',
  order: 'Order',
  user: 'User',
};

/**
 * What an event concerns: the movement it recorded, the order whose status or lines
 * changed, or the user whose role changed. A new event type in the contract is a
 * compile error here until it says what it concerns.
 */
export function auditRecord(entry: AuditLogEntry): AuditRecord {
  switch (entry.type) {
    case 'MOVEMENT_CREATED':
      return { kind: 'movement', movementId: entry.movement.id };
    case 'ORDER_STATUS_CHANGED':
    case 'ORDER_EDITED':
      return {
        kind: 'order',
        orderId: entry.orderId,
        orderNumber: entry.orderNumber,
      };
    case 'ROLE_CHANGED':
      return { kind: 'user', userId: entry.userId, userName: entry.userName };
    default:
      return assertNever(entry);
  }
}
