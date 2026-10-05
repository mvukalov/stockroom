import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RowActionsMenu, type RowAction } from './RowActionsMenu';

function renderMenu(actions: readonly RowAction[]) {
  const user = userEvent.setup();
  render(
    <>
      <RowActionsMenu label="Actions for Packing tape" actions={actions} />
      <button type="button">Outside</button>
    </>,
  );
  const button = screen.getByRole('button', {
    name: 'Actions for Packing tape',
  });
  return { user, button };
}

describe('RowActionsMenu', () => {
  it('opens a disclosure with the actions and runs the chosen one after closing', async () => {
    const onSelect = vi.fn();
    const { user, button } = renderMenu([
      { id: 'category', label: 'Update category', onSelect },
      { id: 'archive', label: 'Archive', onSelect: vi.fn() },
    ]);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull();

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Archive' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Update category' }));
    expect(onSelect).toHaveBeenCalledWith(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('closes on Escape and returns focus to its button', async () => {
    const { user, button } = renderMenu([
      { id: 'archive', label: 'Archive', onSelect: vi.fn() },
    ]);
    await user.click(button);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Archive' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('closes on a click outside', async () => {
    const { user, button } = renderMenu([
      { id: 'archive', label: 'Archive', onSelect: vi.fn() },
    ]);
    await user.click(button);
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes when a scroll moves its button, returning focus from the panel', async () => {
    const { user, button } = renderMenu([
      { id: 'archive', label: 'Archive', onSelect: vi.fn() },
    ]);
    await user.click(button);
    await user.tab();

    // jsdom has no layout: the button "moves" by reporting a new position.
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, -40, 32, 32),
    );
    fireEvent.scroll(document);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('stays open on a scroll that did not move its button', async () => {
    const { user, button } = renderMenu([
      { id: 'archive', label: 'Archive', onSelect: vi.fn() },
    ]);
    await user.click(button);

    fireEvent.scroll(document);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes on resize', async () => {
    const { user, button } = renderMenu([
      { id: 'archive', label: 'Archive', onSelect: vi.fn() },
    ]);
    await user.click(button);
    fireEvent(window, new Event('resize'));
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps a denied action focusable with its reason, and does not run it', async () => {
    const onSelect = vi.fn();
    const { user, button } = renderMenu([
      {
        id: 'archive',
        label: 'Archive',
        onSelect,
        disabledReason: 'Only an admin can do this',
      },
    ]);
    await user.click(button);
    const archive = screen.getByRole('button', { name: 'Archive' });
    expect(archive).toHaveAttribute('aria-disabled', 'true');
    expect(archive).toHaveAccessibleDescription('Only an admin can do this');

    await user.click(archive);
    expect(onSelect).not.toHaveBeenCalled();
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });
});
