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

type BadgeSpec = {
  tone: BadgeTone;
  icon: LucideIcon;
  label: string;
  strikethrough?: boolean;
};

function orderStatusBadge(status: OrderStatus): BadgeSpec {
  switch (status) {
    case 'DRAFT':
      return { tone: 'neutral', icon: CircleDashed, label: 'Draft' };
    case 'CONFIRMED':
      return { tone: 'info', icon: CircleCheck, label: 'Confirmed' };
    case 'PICKED':
      return { tone: 'warning', icon: Package, label: 'Picked' };
    case 'SHIPPED':
      return { tone: 'success', icon: Truck, label: 'Shipped' };
    case 'CANCELLED':
      return {
        tone: 'neutral',
        icon: CircleX,
        label: 'Cancelled',
        strikethrough: true,
      };
    default:
      return assertNever(status);
  }
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { tone, icon, label, strikethrough = false } = orderStatusBadge(status);
  return (
    <Badge tone={tone} icon={icon} strikethrough={strikethrough}>
      {label}
    </Badge>
  );
}
