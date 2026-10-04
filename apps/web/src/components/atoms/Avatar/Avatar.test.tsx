import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Avatar } from './Avatar';

describe('Avatar', () => {
  it.each([
    ['Ana Kovač', 'AK'],
    ['đuro šimić', 'ĐŠ'],
    ['Ivana Marija Horvat', 'IH'],
    ['  Admin  ', 'A'],
  ])('shows initials for %j', (name, initials) => {
    render(<Avatar name={name} />);
    expect(screen.getByRole('img', { name: name.trim() })).toHaveTextContent(
      initials,
    );
  });

  it('is hidden when decorative', () => {
    render(<Avatar name="Ana Kovač" decorative />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('AK')).toHaveAttribute('aria-hidden', 'true');
  });
});
