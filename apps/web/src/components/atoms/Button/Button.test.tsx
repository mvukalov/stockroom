import { fireEvent, render, screen } from '@testing-library/react';
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

  describe('reason shown with disabledReason', () => {
    const REASON = 'Your role is read-only';
    const reason = () => screen.queryByRole('tooltip');

    it('appears on hover as the same text that describes the button', async () => {
      const user = userEvent.setup();
      render(<Button disabledReason={REASON}>Archive</Button>);
      const button = screen.getByRole('button', { name: 'Archive' });
      expect(reason()).not.toBeInTheDocument();

      await user.hover(button);

      expect(reason()).toBeVisible();
      expect(reason()).toHaveTextContent(REASON);
      expect(button).toHaveAccessibleDescription(REASON);
      expect(button).toHaveAttribute('aria-describedby', reason()?.id);
      expect(button).not.toHaveAttribute('title');

      await user.unhover(button);
      expect(reason()).not.toBeInTheDocument();
    });

    it('stays while the pointer moves from the button onto it and back', async () => {
      const user = userEvent.setup();
      render(<Button disabledReason={REASON}>Archive</Button>);
      const button = screen.getByRole('button', { name: 'Archive' });
      await user.hover(button);
      const shown = screen.getByRole('tooltip');

      fireEvent.pointerLeave(button, { pointerType: 'mouse', relatedTarget: shown });
      expect(shown).toBeVisible();
      fireEvent.pointerLeave(shown, { pointerType: 'mouse', relatedTarget: button });
      expect(shown).toBeVisible();

      fireEvent.pointerLeave(button, {
        pointerType: 'mouse',
        relatedTarget: document.body,
      });
      expect(reason()).not.toBeInTheDocument();
    });

    it('appears on keyboard focus and goes on blur', async () => {
      const user = userEvent.setup();
      render(
        <>
          <Button disabledReason={REASON}>Archive</Button>
          <Button>Next</Button>
        </>,
      );

      await user.tab();
      expect(screen.getByRole('button', { name: 'Archive' })).toHaveFocus();
      expect(reason()).toBeVisible();

      await user.tab();
      expect(reason()).not.toBeInTheDocument();
    });

    it('goes on Escape without moving focus, and only the first Escape is taken', async () => {
      const user = userEvent.setup();
      const onParentKeyDown = vi.fn();
      render(
        // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
        <div onKeyDown={(event) => onParentKeyDown(event.key)}>
          <Button disabledReason={REASON}>Archive</Button>
        </div>,
      );
      const button = screen.getByRole('button', { name: 'Archive' });

      await user.tab();
      await user.keyboard('{Escape}');

      expect(reason()).not.toBeInTheDocument();
      expect(button).toHaveFocus();
      expect(onParentKeyDown).not.toHaveBeenCalled();

      await user.keyboard('{Escape}');
      expect(onParentKeyDown).toHaveBeenCalledWith('Escape');
    });

    it('goes on Escape while only hovered', async () => {
      const user = userEvent.setup();
      render(<Button disabledReason={REASON}>Archive</Button>);

      await user.hover(screen.getByRole('button', { name: 'Archive' }));
      await user.keyboard('{Escape}');

      expect(reason()).not.toBeInTheDocument();
    });

    it('appears on a tap and goes on a tap elsewhere', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <>
          <Button onClick={onClick} disabledReason={REASON}>
            Archive
          </Button>
          <p>Elsewhere</p>
        </>,
      );
      const button = screen.getByRole('button', { name: 'Archive' });

      await user.pointer({ keys: '[TouchA]', target: button });

      expect(reason()).toBeVisible();
      expect(onClick).not.toHaveBeenCalled();

      await user.pointer({ keys: '[TouchA]', target: screen.getByText('Elsewhere') });
      expect(reason()).not.toBeInTheDocument();
    });

    it('does not stay open after a mouse click once the pointer leaves', () => {
      render(<Button disabledReason={REASON}>Archive</Button>);
      const button = screen.getByRole('button', { name: 'Archive' });

      // Safari does not focus a clicked button, so only the hover keeps it.
      fireEvent.pointerEnter(button, { pointerType: 'mouse' });
      fireEvent.pointerDown(button, { pointerType: 'mouse' });
      fireEvent.click(button, { detail: 1 });
      expect(button).not.toHaveFocus();
      expect(reason()).toBeVisible();

      fireEvent.pointerLeave(button, { pointerType: 'mouse' });
      expect(reason()).not.toBeInTheDocument();
    });

    // iOS Safari does not focus a tapped button, so the tap alone must open it.
    it.each(['touch', 'pen'])('opens on a %s tap without focus', (pointerType) => {
      render(<Button disabledReason={REASON}>Archive</Button>);
      const button = screen.getByRole('button', { name: 'Archive' });

      fireEvent.pointerDown(button, { pointerType });
      fireEvent.click(button, { detail: 1 });

      expect(button).not.toHaveFocus();
      expect(reason()).toBeVisible();
    });

    it('opens again on Enter and Space after Escape', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Button onClick={onClick} disabledReason={REASON}>
          Archive
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Archive' });

      await user.tab();
      await user.keyboard('{Escape}');
      expect(reason()).not.toBeInTheDocument();
      await user.keyboard('{Enter}');
      expect(reason()).toBeVisible();

      await user.keyboard('{Escape}');
      expect(reason()).not.toBeInTheDocument();
      await user.keyboard(' ');
      expect(reason()).toBeVisible();

      expect(button).toHaveFocus();
      expect(onClick).not.toHaveBeenCalled();
    });

    it('does not appear by itself when a focused or hovered button becomes blocked', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <>
          <Button>Save</Button>
          <Button>Next</Button>
        </>,
      );
      const button = screen.getByRole('button', { name: 'Save' });
      await user.hover(button);
      await user.tab();

      rerender(
        <>
          <Button disabledReason="The change is being saved">Save</Button>
          <Button>Next</Button>
        </>,
      );

      expect(button).toHaveFocus();
      expect(button).toHaveAccessibleDescription('The change is being saved');
      expect(reason()).not.toBeInTheDocument();

      // A new focus shows it.
      await user.tab();
      await user.tab({ shift: true });
      expect(reason()).toBeVisible();
    });

    it('does not come back by itself when the button is blocked again', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<Button disabledReason={REASON}>Save</Button>);
      await user.tab();
      expect(reason()).toBeVisible();

      rerender(<Button>Save</Button>);
      rerender(<Button disabledReason={REASON}>Save</Button>);

      expect(reason()).not.toBeInTheDocument();
    });

    it('follows a changed reason while shown', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <Button disabledReason="The page count is still loading.">Next</Button>,
      );
      await user.tab();

      rerender(<Button disabledReason="This is the last page.">Next</Button>);

      expect(reason()).toHaveTextContent('This is the last page.');
      expect(screen.getByRole('button', { name: 'Next' })).toHaveAccessibleDescription(
        'This is the last page.',
      );
    });

    it('keeps the caller focus and pointer handlers', async () => {
      const user = userEvent.setup();
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      const onPointerEnter = vi.fn();
      render(
        <Button
          disabledReason={REASON}
          onFocus={onFocus}
          onBlur={onBlur}
          onPointerEnter={onPointerEnter}
        >
          Archive
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Archive' });

      await user.hover(button);
      fireEvent.focus(button);
      fireEvent.blur(button);

      expect(onPointerEnter).toHaveBeenCalledTimes(1);
      expect(onFocus).toHaveBeenCalledTimes(1);
      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it('is not rendered for a button without a reason', async () => {
      const user = userEvent.setup();
      render(<Button>Save</Button>);
      const button = screen.getByRole('button', { name: 'Save' });

      await user.hover(button);
      await user.tab();

      expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument();
      expect(button).not.toHaveAttribute('aria-describedby');
      expect(button).not.toHaveAttribute('aria-disabled');
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
