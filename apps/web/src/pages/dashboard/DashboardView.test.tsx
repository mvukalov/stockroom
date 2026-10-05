import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { DASHBOARD_DATA } from './dashboardFixtures';
import {
  DASHBOARD_LOAD_ERROR,
  DashboardView,
  type DashboardViewProps,
} from './DashboardView';

function renderView(props: DashboardViewProps) {
  const user = userEvent.setup();
  const { container } = render(
    <MemoryRouter>
      <DashboardView {...props} />
    </MemoryRouter>,
  );
  return { user, container };
}

describe('DashboardView', () => {
  it('loading: skeleton cards and rows in a busy region, announced as loading', () => {
    const { container } = renderView({ status: 'loading' });

    expect(screen.getByRole('status')).toHaveTextContent('Loading dashboard');
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    // Labels are known up front; values and captions are placeholders.
    for (const label of [
      'Products in stock',
      'Low-stock items',
      'Open orders',
      'Movements this week',
    ]) {
      const term = screen.getByText(label, { selector: 'dt' });
      for (const dd of within(term.parentElement!).getAllByRole('definition')) {
        expect(dd).toHaveTextContent('');
      }
    }
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(1 + 5);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('ready: no longer busy and the status is cleared', () => {
    const { container } = renderView({
      status: 'ready',
      data: DASHBOARD_DATA,
      refetchFailed: false,
      onRetry: vi.fn(),
    });

    expect(screen.getByRole('status')).toHaveTextContent('');
    expect(container.querySelector('[aria-busy]')).toBeNull();
    expect(screen.getByText('188', { selector: 'dd' })).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('error: only the banner, and Retry calls back', async () => {
    const onRetry = vi.fn();
    const { user } = renderView({ status: 'error', onRetry });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(DASHBOARD_LOAD_ERROR);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('a failed refetch puts the banner above the stale data', async () => {
    const onRetry = vi.fn();
    const { user } = renderView({
      status: 'ready',
      data: DASHBOARD_DATA,
      refetchFailed: true,
      onRetry,
    });

    const alert = screen.getByRole('alert');
    const value = screen.getByText('188', { selector: 'dd' });
    expect(value).toBeVisible();
    expect(
      alert.compareDocumentPosition(value) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
