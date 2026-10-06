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
import { MOVEMENT_TYPE_LABELS } from './movementTypeLabels';

type BadgeSpec = { tone: BadgeTone; icon: LucideIcon };

function movementTypeBadge(type: MovementType): BadgeSpec {
  switch (type) {
    case 'RECEIPT':
      return { tone: 'success', icon: PackagePlus };
    case 'ISSUE':
      return { tone: 'danger', icon: PackageMinus };
    case 'TRANSFER':
      return { tone: 'info', icon: ArrowLeftRight };
    case 'ADJUSTMENT':
      return { tone: 'warning', icon: PencilLine };
    default:
      return assertNever(type);
  }
}

export function MovementTypeBadge({ type }: { type: MovementType }) {
  const { tone, icon } = movementTypeBadge(type);
  return (
    <Badge tone={tone} icon={icon}>
      {MOVEMENT_TYPE_LABELS[type]}
    </Badge>
  );
}
