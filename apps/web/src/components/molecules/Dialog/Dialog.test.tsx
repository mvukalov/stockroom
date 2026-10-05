import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../../atoms/Button/Button';
import { Dialog } from './Dialog';

function Harness({
  dismissible = true,
  focusCancel = false,
  onDismiss = vi.fn(),
}: {
  dismissible?: boolean;
  focusCancel?: boolean;
  onDismiss?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [returnFocus, setReturnFocus] = useState<HTMLElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const elsewhereRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button
        onClick={(event) => {
          setReturnFocus(event.currentTarget);
          setOpen(true);
        }}
      >
        Open
      </Button>
      <Button ref={elsewhereRef}>Elsewhere</Button>
      <Dialog
        open={open}
        title="Archive 2 products?"
        description={<p>They keep their history.</p>}
        dismissible={dismissible}
        onDismiss={() => {
          onDismiss();
          setOpen(false);
        }}
        {...(focusCancel && { initialFocusRef: cancelRef })}
        returnFocus={returnFocus}
        footer={
          <>
            <Button
              variant="primary"
              onClick={() => {
                setReturnFocus(elsewhereRef.current);
                setOpen(false);
              }}
            >
              Confirm
            </Button>
            <Button ref={cancelRef} onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </>
        }
      />
    </>
  );
}

async function openDialog(props: Parameters<typeof Harness>[0] = {}) {
  const user = userEvent.setup();
  render(<Harness {...props} />);
  await user.click(screen.getByRole('button', { name: 'Open' }));
  return { user, dialog: screen.getByRole('dialog') };
}

describe('Dialog', () => {
  it('is named by its title, described by its description, and renders nothing while closed', async () => {
    render(<Harness />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Open' }));
    const dialog = screen.getByRole('dialog', { name: 'Archive 2 products?' });
    expect(dialog).toHaveAccessibleDescription('They keep their history.');
  });

  it('focuses the first control by default', async () => {
    await openDialog();
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus();
  });

  it('focuses the initial focus target', async () => {
    await openDialog({ focusCancel: true });
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('dismisses on Escape and returns focus to the opener', async () => {
    const onDismiss = vi.fn();
    const { user } = await openDialog({ onDismiss });

    await user.keyboard('{Escape}');
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });

  it('ignores Escape while not dismissible', async () => {
    const onDismiss = vi.fn();
    const { user } = await openDialog({ dismissible: false, onDismiss });

    await user.keyboard('{Escape}');
    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('moves focus to `returnFocus` when it closes', async () => {
    const { user } = await openDialog();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
  });
});
