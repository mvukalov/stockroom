import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MovementType } from '@stockroom/contract';

import { MovementTypeBadge } from './MovementTypeBadge';

const LABELS: Record<MovementType, string> = {
  RECEIPT: 'Receipt',
  ISSUE: 'Issue',
  TRANSFER: 'Transfer',
  ADJUSTMENT: 'Adjustment',
};

describe('MovementTypeBadge', () => {
  it.each(MovementType.options)('shows a text label for %s', (type) => {
    render(<MovementTypeBadge type={type} />);
    expect(screen.getByText(LABELS[type])).toBeVisible();
  });
});
