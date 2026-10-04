import { render, screen } from '@testing-library/react';
import { Truck } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { Badge } from './Badge';

describe('Badge', () => {
  it('always shows its label, with the icon hidden from assistive technology', () => {
    const { container } = render(
      <Badge tone="success" icon={Truck}>
        Shipped
      </Badge>,
    );

    expect(screen.getByText('Shipped')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps the text of a struck-through label', () => {
    render(
      <Badge tone="neutral" strikethrough>
        Cancelled
      </Badge>,
    );
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });
});
