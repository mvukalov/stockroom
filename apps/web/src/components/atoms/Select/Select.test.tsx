import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Select } from './Select';

describe('Select', () => {
  it('is a labelled native select that can be changed', async () => {
    const user = userEvent.setup();
    render(
      <>
        <label htmlFor="type">Movement type</label>
        <Select id="type" defaultValue="RECEIPT">
          <option value="RECEIPT">Receipt</option>
          <option value="ISSUE">Issue</option>
        </Select>
      </>,
    );
    const select = screen.getByRole('combobox', { name: 'Movement type' });

    await user.tab();
    expect(select).toHaveFocus();

    await user.selectOptions(select, 'Issue');
    expect(select).toHaveValue('ISSUE');
  });

  it('passes aria-invalid and aria-describedby to the select', () => {
    render(
      <>
        <Select aria-label="Location" aria-invalid aria-describedby="location-error">
          <option value="">Choose a location</option>
        </Select>
        <p id="location-error">Choose a location</p>
      </>,
    );
    const select = screen.getByRole('combobox', { name: 'Location' });

    expect(select).toBeInvalid();
    expect(select).toHaveAccessibleDescription('Choose a location');
  });
});
