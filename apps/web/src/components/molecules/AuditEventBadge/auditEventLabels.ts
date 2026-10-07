import type { AuditEventType } from '@stockroom/contract';

/** The one wording of each audit event type: the badge, the Event filter and its chip read it. */
export const AUDIT_EVENT_LABELS: Record<AuditEventType, string> = {
  MOVEMENT_CREATED: 'Movement created',
  ORDER_STATUS_CHANGED: 'Order status changed',
  ORDER_EDITED: 'Order edited',
  ROLE_CHANGED: 'Role changed',
};
