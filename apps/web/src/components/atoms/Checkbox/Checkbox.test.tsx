import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('is named by its label and toggles with Space', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Show archived" />);
    const checkbox = screen.getByRole('checkbox', { name: 'Show archived' });

    await user.tab();
    await user.keyboard(' ');

    expect(checkbox).toHaveFocus();
    expect(checkbox).toBeChecked();
  });

  it('toggles when its label is clicked', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Show archived" />);

    await user.click(screen.getByText('Show archived'));

    expect(screen.getByRole('checkbox', { name: 'Show archived' })).toBeChecked();
  });

  it('keeps a hidden label as its accessible name', () => {
    render(<Checkbox label="Select SKU-0001" hideLabel />);
    expect(
      screen.getByRole('checkbox', { name: 'Select SKU-0001' }),
    ).toBeInTheDocument();
  });

  it('shows the mixed state and follows prop changes', () => {
    const { rerender } = render(<Checkbox label="Select all" indeterminate />);
    const checkbox = screen.getByRole('checkbox', { name: 'Select all' });
    expect(checkbox).toBePartiallyChecked();

    rerender(<Checkbox label="Select all" indeterminate={false} checked readOnly />);
    expect(checkbox).not.toBePartiallyChecked();
    expect(checkbox).toBeChecked();
  });

  it('forwards an object ref and a callback ref to the input', () => {
    const objectRef = createRef<HTMLInputElement>();
    const { unmount } = render(<Checkbox label="A" ref={objectRef} indeterminate />);
    expect(objectRef.current).toBe(screen.getByRole('checkbox', { name: 'A' }));
    expect(objectRef.current?.indeterminate).toBe(true);
    unmount();
    expect(objectRef.current).toBeNull();

    const callbackRef = vi.fn();
    render(<Checkbox label="B" ref={callbackRef} />);
    expect(callbackRef).toHaveBeenCalledWith(
      screen.getByRole('checkbox', { name: 'B' }),
    );
  });
});
