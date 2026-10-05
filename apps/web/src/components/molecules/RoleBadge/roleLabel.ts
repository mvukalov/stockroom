import type { Role } from '@stockroom/contract';
import { assertNever } from '@stockroom/domain';

export function roleLabel(role: Role): string {
  switch (role) {
    case 'ADMIN':
      return 'Admin';
    case 'CLERK':
      return 'Clerk';
    case 'VIEWER':
      return 'Viewer';
    default:
      return assertNever(role);
  }
}
