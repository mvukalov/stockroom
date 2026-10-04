import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StockStatus } from '@stockroom/contract';

import { StockStatusBadge } from './StockStatusBadge';

const LABELS: Record<StockStatus, string> = {
  IN_STOCK: 'In stock',
  LOW: 'Low',
  OUT: 'Out',
};

describe('StockStatusBadge', () => {
  it.each(StockStatus.options)('shows a text label and an icon for %s', (status) => {
    const { container } = render(<StockStatusBadge status={status} />);
    expect(screen.getByText(LABELS[status])).toBeVisible();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
