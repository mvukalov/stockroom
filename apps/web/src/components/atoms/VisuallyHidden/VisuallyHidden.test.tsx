import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VisuallyHidden } from './VisuallyHidden';

describe('VisuallyHidden', () => {
  it('contributes to the accessible name', () => {
    render(
      <button type="button">
        <VisuallyHidden>Delete row</VisuallyHidden>
      </button>,
    );
    expect(screen.getByRole('button', { name: 'Delete row' })).toBeInTheDocument();
  });
});
