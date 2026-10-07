import {
  ArrowRightLeft,
  CirclePlus,
  PencilLine,
  UserCog,
  type LucideIcon,
} from 'lucide-react';

import type { AuditEventType } from '@stockroom/contract';
import { assertNever } from '@stockroom/domain';

import { Badge } from '../../atoms/Badge/Badge';
import { AUDIT_EVENT_LABELS } from './auditEventLabels';

/**
 * The icon of each event type. Every badge is neutral: an event is neither good nor
 * bad, and the label and icon tell the types apart, never colour.
 */
function auditEventIcon(type: AuditEventType): LucideIcon {
  switch (type) {
    case 'MOVEMENT_CREATED':
      return CirclePlus;
    case 'ORDER_STATUS_CHANGED':
      return ArrowRightLeft;
    case 'ORDER_EDITED':
      return PencilLine;
    case 'ROLE_CHANGED':
      return UserCog;
    default:
      return assertNever(type);
  }
}

export function AuditEventBadge({ type }: { type: AuditEventType }) {
  return (
    <Badge tone="neutral" icon={auditEventIcon(type)}>
      {AUDIT_EVENT_LABELS[type]}
    </Badge>
  );
}
