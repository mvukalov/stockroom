import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { OrdersQuery } from '@stockroom/contract';

import { DATE_RANGE_MESSAGE } from '../../components/molecules/DateRangeFilter/DateRangeFilter';
import { formatCents } from '../../utils/formatCents';
import {
  DEFAULT_ORDERS_QUERY,
  ORDER_ROWS,
  ORDER_ROWS_BY_STATUS,
  ordersPage,
} from './ordersFixtures';
import { OrdersView, type OrdersViewProps } from './OrdersView';

function renderView(overrides: Partial<OrdersViewProps> = {}) {
  const props: OrdersViewProps = {
    query: DEFAULT_ORDERS_QUERY,
    data: ordersPage(ORDER_ROWS, { total: 26 }),
    isFetching: false,
    error: undefined,
    searchText: '',
    onSearchTextChange: vi.fn(),
    onFilterChange: vi.fn(),
    onClearFilters: vi.fn(),
    onSortChange: vi.fn(),
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    ...overrides,
  };
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <OrdersView {...props} />
    </MemoryRouter>,
  );
  return { user, props };
}

const table = () => screen.getByRole('table', { name: 'Orders' });

describe('OrdersView', () => {
  it('shows the columns in order, with no selection and no actions', () => {
    renderView();

    expect(
      within(table())
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Order no.', 'Customer', 'Status', 'Lines', 'Total', 'Created']);
    expect(within(table()).queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('links each order number to its detail route; the row is not a link', () => {
    renderView();
    const [order] = ORDER_ROWS;

    const link = screen.getByRole('link', { name: order!.number });
    expect(link).toHaveAttribute('href', `/orders/${order!.id}`);
    const row = link.closest('tr')!;
    expect(within(row).getAllByRole('link')).toHaveLength(1);
    expect(within(row).getByText(formatCents(order!.totalCents))).toBeVisible();
  });

  it('shows every status as a text label', () => {
    renderView({ data: ordersPage(ORDER_ROWS_BY_STATUS) });

    for (const label of [
      'Draft',
      'Confirmed',
      'Picked',
      'Shipped',
      'Cancelled',
    ]) {
      expect(within(table()).getByText(label)).toBeVisible();
    }
  });

  it('offers every status in the Status filter and reports the choice', async () => {
    const { user, props } = renderView();
    const status = screen.getByRole('combobox', { name: 'Status' });

    expect(
      within(status)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual([
      'All statuses',
      'Draft',
      'Confirmed',
      'Picked',
      'Shipped',
      'Cancelled',
    ]);
    await user.selectOptions(status, 'PICKED');
    expect(props.onFilterChange).toHaveBeenCalledWith('status', 'PICKED');
  });

  it('From later than To: marks both fields and shows no table, count or pages', async () => {
    const { user, props } = renderView({
      query: OrdersQuery.parse({ from: '2026-10-03', to: '2026-09-27' }),
      data: undefined,
    });

    const message = screen.getByText(DATE_RANGE_MESSAGE);
    for (const name of ['From', 'To']) {
      const field = screen.getByLabelText(name);
      expect(field).toHaveAttribute('aria-invalid', 'true');
      expect(field).toHaveAccessibleDescription(message.textContent);
    }
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText(/Loading orders/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Next page' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Nothing to show for these dates'),
    ).toBeInTheDocument();

    // The toolbar's and the idle state's.
    const clear = screen.getAllByRole('button', { name: 'Clear filters' });
    expect(clear).toHaveLength(2);
    await user.click(clear[1]!);
    expect(props.onClearFilters).toHaveBeenCalledOnce();
  });
});
