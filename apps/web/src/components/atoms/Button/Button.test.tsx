import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button';

describe('Button', () => {
  it('is a non-submitting button by default', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute(
      'type',
      'button',
    );
  });

  it('activates by click, Enter and Space', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    await user.tab();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onClick).toHaveBeenCalledTimes(3);
  });

  describe('with disabledReason', () => {
    it('stays focusable and explains why it is unavailable', async () => {
      const user = userEvent.setup();
      render(
        <Button variant="primary" disabledReason="Your role is read-only">
          New movement
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'New movement' });

      await user.tab();

      expect(button).toHaveFocus();
      expect(button).not.toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAccessibleDescription('Your role is read-only');
    });

    it('keeps an existing description', () => {
      render(
        <>
          <p id="hint">Opens the movement drawer</p>
          <Button aria-describedby="hint" disabledReason="Your role is read-only">
            New movement
          </Button>
        </>,
      );
      expect(
        screen.getByRole('button', { name: 'New movement' }),
      ).toHaveAccessibleDescription(
        'Opens the movement drawer Your role is read-only',
      );
    });

    it('ignores clicks and keyboard activation', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Button onClick={onClick} disabledReason="Your role is read-only">
          Archive
        </Button>,
      );

      await user.click(screen.getByRole('button', { name: 'Archive' }));
      await user.tab();
      await user.keyboard('{Enter}');
      await user.keyboard(' ');

      expect(onClick).not.toHaveBeenCalled();
    });

    it('does not submit its form', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
      render(
        <form
          aria-label="Movement"
          ref={(form) => form?.addEventListener('submit', onSubmit)}
        >
          <Button type="submit" disabledReason="Your role is read-only">
            Save movement
          </Button>
        </form>,
      );

      await user.click(screen.getByRole('button', { name: 'Save movement' }));

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('with disabled is skipped by the keyboard', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Button disabled>Save</Button>
        <Button>Cancel</Button>
      </>,
    );

    await user.tab();

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });
});
