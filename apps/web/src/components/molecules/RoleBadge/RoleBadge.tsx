import { Eye, ShieldCheck, UserPen, type LucideIcon } from 'lucide-react';

import type { Role } from '@stockroom/contract';
import { assertNever } from '@stockroom/domain';

import { Badge, type BadgeTone } from '../../atoms/Badge/Badge';
import { roleLabel } from './roleLabel';

function roleBadge(role: Role): { tone: BadgeTone; icon: LucideIcon } {
  switch (role) {
    case 'ADMIN':
      return { tone: 'info', icon: ShieldCheck };
    case 'CLERK':
      return { tone: 'success', icon: UserPen };
    case 'VIEWER':
      return { tone: 'neutral', icon: Eye };
    default:
      return assertNever(role);
  }
}

export function RoleBadge({ role }: { role: Role }) {
  const { tone, icon } = roleBadge(role);
  return (
    <Badge tone={tone} icon={icon}>
      {roleLabel(role)}
    </Badge>
  );
}
