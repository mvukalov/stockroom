import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Role } from '@stockroom/contract';

import { RoleBadge } from './RoleBadge';

const LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  CLERK: 'Clerk',
  VIEWER: 'Viewer',
};

describe('RoleBadge', () => {
  it.each(Role.options)('shows a text label for %s', (role) => {
    render(<RoleBadge role={role} />);
    expect(screen.getByText(LABELS[role])).toBeVisible();
  });
});
