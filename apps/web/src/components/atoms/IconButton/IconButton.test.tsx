import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Archive } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('is named by its label and its icon is hidden', () => {
    render(<IconButton icon={Archive} label="Archive product" />);
    const button = screen.getByRole('button', { name: 'Archive product' });
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('activates from the keyboard', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<IconButton icon={Archive} label="Archive product" onClick={onClick} />);

    await user.tab();
    await user.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('supports disabledReason like Button', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconButton
        icon={Archive}
        label="Archive product"
        onClick={onClick}
        disabledReason="Your role is read-only"
      />,
    );
    const button = screen.getByRole('button', { name: 'Archive product' });

    await user.click(button);

    expect(onClick).not.toHaveBeenCalled();
    expect(button).toHaveAccessibleDescription('Your role is read-only');
  });
});
