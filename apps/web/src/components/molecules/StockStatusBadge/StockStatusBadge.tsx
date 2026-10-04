import { CircleCheck, CircleX, TriangleAlert, type LucideIcon } from 'lucide-react';

import type { StockStatus } from '@stockroom/contract';
import { assertNever } from '@stockroom/domain';

import { Badge, type BadgeTone } from '../../atoms/Badge/Badge';

type BadgeSpec = { tone: BadgeTone; icon: LucideIcon; label: string };

function stockStatusBadge(status: StockStatus): BadgeSpec {
  switch (status) {
    case 'IN_STOCK':
      return { tone: 'success', icon: CircleCheck, label: 'In stock' };
    case 'LOW':
      return { tone: 'warning', icon: TriangleAlert, label: 'Low' };
    case 'OUT':
      return { tone: 'danger', icon: CircleX, label: 'Out' };
    default:
      return assertNever(status);
  }
}

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const { tone, icon, label } = stockStatusBadge(status);
  return (
    <Badge tone={tone} icon={icon}>
      {label}
    </Badge>
  );
}
