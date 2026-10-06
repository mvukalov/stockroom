import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OrderStatus } from '@stockroom/contract';

import { OrderStatusBadge } from './OrderStatusBadge';

const LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  PICKED: 'Picked',
  SHIPPED: 'Shipped',
  CANCELLED: 'Cancelled',
};

describe('OrderStatusBadge', () => {
  it.each(OrderStatus.options)(
    'shows a text label and an icon for %s',
    (status) => {
      const { container } = render(<OrderStatusBadge status={status} />);
      expect(screen.getByText(LABELS[status])).toBeVisible();
      expect(container.querySelector('svg')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
    },
  );
});
