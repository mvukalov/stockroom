import {
  ArrowLeftRight,
  PackageMinus,
  PackagePlus,
  PencilLine,
  type LucideIcon,
} from 'lucide-react';

import type { MovementType } from '@stockroom/contract';
import { assertNever } from '@stockroom/domain';

import { Badge, type BadgeTone } from '../../atoms/Badge/Badge';

type BadgeSpec = { tone: BadgeTone; icon: LucideIcon; label: string };

function movementTypeBadge(type: MovementType): BadgeSpec {
  switch (type) {
    case 'RECEIPT':
      return { tone: 'success', icon: PackagePlus, label: 'Receipt' };
    case 'ISSUE':
      return { tone: 'danger', icon: PackageMinus, label: 'Issue' };
    case 'TRANSFER':
      return { tone: 'info', icon: ArrowLeftRight, label: 'Transfer' };
    case 'ADJUSTMENT':
      return { tone: 'warning', icon: PencilLine, label: 'Adjustment' };
    default:
      return assertNever(type);
  }
}

export function MovementTypeBadge({ type }: { type: MovementType }) {
  const { tone, icon, label } = movementTypeBadge(type);
  return (
    <Badge tone={tone} icon={icon}>
      {label}
    </Badge>
  );
}
