import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  CancelOrderDialog,
  type CancelOrderDialogProps,
} from './CancelOrderDialog';
import { orderDetail } from './orderDetailFixtures';
import { CANCELLING_REASON } from './orderDetailText';

function renderDialog(overrides: Partial<CancelOrderDialogProps> = {}) {
  const props: CancelOrderDialogProps = {
    open: true,
    order: orderDetail('CONFIRMED'),
    pending: false,
    error: undefined,
    onConfirm: vi.fn(),
    onDismiss: vi.fn(),
    returnFocus: null,
    ...overrides,
  };
  const user = userEvent.setup();
  render(<CancelOrderDialog {...props} />);
  return { user, props };
}

const dialog = () => screen.getByRole('dialog');

describe('CancelOrderDialog', () => {
  it('names the order and its customer, says reserved stock is released and that it cannot be undone', () => {
    renderDialog();

    expect(dialog()).toHaveAccessibleName('Cancel order ORD-2026-0205?');
    expect(dialog()).toHaveAccessibleDescription(
      "The order for Adria Nautika d.o.o. will be cancelled. The stock reserved for it is released. This can't be undone in the app.",
    );
  });

  it('does not mention stock for a draft, which reserves nothing', () => {
    renderDialog({ order: orderDetail('DRAFT') });
    expect(dialog()).not.toHaveAccessibleDescription(/stock/);
  });

  it('focuses Keep order first; Cancel order is not the default', () => {
    renderDialog();

    expect(
      within(dialog()).getByRole('button', { name: 'Keep order' }),
    ).toHaveFocus();
    expect(
      within(dialog()).getByRole('button', { name: 'Cancel order' }),
    ).toHaveAttribute('type', 'button');
  });

  it('ignores both buttons and Escape while pending', async () => {
    const { user, props } = renderDialog({ pending: true });

    const pending = within(dialog()).getByRole('button', {
      name: 'Cancelling…',
    });
    expect(pending).toHaveAttribute('aria-disabled', 'true');
    expect(pending).toHaveAccessibleDescription(CANCELLING_REASON);
    await user.click(pending);
    await user.click(
      within(dialog()).getByRole('button', { name: 'Keep order' }),
    );
    await user.keyboard('{Escape}');

    expect(props.onConfirm).not.toHaveBeenCalled();
    expect(props.onDismiss).not.toHaveBeenCalled();
  });

  it('shows the error and offers Retry', async () => {
    const { user, props } = renderDialog({ error: 'Something failed.' });

    expect(within(dialog()).getByRole('alert')).toHaveTextContent(
      'Something failed.',
    );
    await user.click(within(dialog()).getByRole('button', { name: 'Retry' }));
    expect(props.onConfirm).toHaveBeenCalledOnce();
  });
});
