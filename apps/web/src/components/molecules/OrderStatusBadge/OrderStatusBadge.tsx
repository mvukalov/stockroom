import {
  CircleCheck,
  CircleDashed,
  CircleX,
  Package,
  Truck,
  type LucideIcon,
} from 'lucide-react';

import type { OrderStatus } from '@stockroom/contract';
import { assertNever } from '@stockroom/domain';

import { Badge, type BadgeTone } from '../../atoms/Badge/Badge';
import { ORDER_STATUS_LABELS } from './orderStatusLabels';

type BadgeSpec = {
  tone: BadgeTone;
  icon: LucideIcon;
  strikethrough?: boolean;
};

function orderStatusBadge(status: OrderStatus): BadgeSpec {
  switch (status) {
    case 'DRAFT':
      return { tone: 'neutral', icon: CircleDashed };
    case 'CONFIRMED':
      return { tone: 'info', icon: CircleCheck };
    case 'PICKED':
      return { tone: 'warning', icon: Package };
    case 'SHIPPED':
      return { tone: 'success', icon: Truck };
    case 'CANCELLED':
      return {
        tone: 'neutral',
        icon: CircleX,
        strikethrough: true,
      };
    default:
      return assertNever(status);
  }
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { tone, icon, strikethrough = false } = orderStatusBadge(status);
  return (
    <Badge tone={tone} icon={icon} strikethrough={strikethrough}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
