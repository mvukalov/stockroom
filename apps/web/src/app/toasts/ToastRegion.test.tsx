import { act, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { setupMockServer } from '../../test/mockServer';
import { renderWithProviders } from '../../test/renderApp';
import { ToastRegion } from './ToastRegion';
import { toastShown } from './toastsSlice';

setupMockServer();

describe('ToastRegion', () => {
  it('is a polite live region that shows at most three toasts, oldest first, without taking focus', async () => {
    const { store, user } = renderWithProviders(<ToastRegion />);
    const region = screen.getByRole('status', { name: 'Notifications' });
    expect(within(region).queryAllByRole('listitem')).toHaveLength(0);

    act(() => {
      for (const n of [1, 2, 3, 4]) {
        store.dispatch(toastShown({ message: `Saved ${n}` }));
      }
    });
    const messages = () =>
      within(region)
        .getAllByRole('listitem')
        .map((item) => item.querySelector('p')?.textContent);
    expect(messages()).toEqual(['Saved 1', 'Saved 2', 'Saved 3']);
    expect(document.body).toHaveFocus();

    const [firstDismiss] = within(region).getAllByRole('button', {
      name: 'Dismiss notification',
    });
    await user.click(firstDismiss!);
    expect(messages()).toEqual(['Saved 2', 'Saved 3', 'Saved 4']);
  });
});
