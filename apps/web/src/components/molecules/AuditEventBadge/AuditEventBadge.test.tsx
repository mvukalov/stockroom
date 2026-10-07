import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AuditEventType } from '@stockroom/contract';

import { AuditEventBadge } from './AuditEventBadge';

const LABELS: Record<AuditEventType, string> = {
  MOVEMENT_CREATED: 'Movement created',
  ORDER_STATUS_CHANGED: 'Order status changed',
  ORDER_EDITED: 'Order edited',
  ROLE_CHANGED: 'Role changed',
};

describe('AuditEventBadge', () => {
  it.each(AuditEventType.options)('shows a text label for %s', (type) => {
    render(<AuditEventBadge type={type} />);
    expect(screen.getByText(LABELS[type])).toBeVisible();
  });
});
