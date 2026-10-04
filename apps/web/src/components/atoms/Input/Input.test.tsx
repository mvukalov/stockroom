import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Input } from './Input';

describe('Input', () => {
  it('is a labelled text field that accepts typing', async () => {
    const user = userEvent.setup();
    render(
      <>
        <label htmlFor="reason">Reason</label>
        <Input id="reason" />
      </>,
    );
    const input = screen.getByRole('textbox', { name: 'Reason' });

    await user.tab();
    await user.keyboard('Damaged in transit');

    expect(input).toHaveFocus();
    expect(input).toHaveValue('Damaged in transit');
  });

  it('exposes an error through aria-invalid and aria-describedby', () => {
    render(
      <>
        <Input aria-label="Quantity" aria-invalid aria-describedby="quantity-error" />
        <p id="quantity-error">Only 14 on hand</p>
      </>,
    );
    const input = screen.getByRole('textbox', { name: 'Quantity' });

    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription('Only 14 on hand');
  });

  it('renders a search field in the search variant', () => {
    render(<Input variant="search" aria-label="Search products" />);
    expect(
      screen.getByRole('searchbox', { name: 'Search products' }),
    ).toBeInTheDocument();
  });
});
