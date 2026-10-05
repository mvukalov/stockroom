import {
  CircleCheck,
  CircleX,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';

import type { StockStatus } from '@stockroom/contract';
import { assertNever } from '@stockroom/domain';

import { Badge, type BadgeTone } from '../../atoms/Badge/Badge';
import { STOCK_STATUS_LABELS } from './stockStatusLabels';

type BadgeSpec = { tone: BadgeTone; icon: LucideIcon };

function stockStatusBadge(status: StockStatus): BadgeSpec {
  switch (status) {
    case 'IN_STOCK':
      return { tone: 'success', icon: CircleCheck };
    case 'LOW':
      return { tone: 'warning', icon: TriangleAlert };
    case 'OUT':
      return { tone: 'danger', icon: CircleX };
    default:
      return assertNever(status);
  }
}

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const { tone, icon } = stockStatusBadge(status);
  return (
    <Badge tone={tone} icon={icon}>
      {STOCK_STATUS_LABELS[status]}
    </Badge>
  );
}
