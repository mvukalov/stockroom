import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import type { OrderDetail } from '@stockroom/contract';

import { formatCents } from '../../utils/formatCents';
import { formatDateTime } from '../../utils/formatDateTime';
import { MANY_LINES_ORDER, orderDetail } from './orderDetailFixtures';
import { ORDER_LOAD_ERROR } from './orderDetailText';
import { OrderDetailView, type OrderDetailViewProps } from './OrderDetailView';

function renderView(props: OrderDetailViewProps) {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <OrderDetailView {...props} />
    </MemoryRouter>,
  );
  return { user };
}

const ready = (
  order: OrderDetail,
  overrides: Partial<Extract<OrderDetailViewProps, { status: 'ready' }>> = {},
): OrderDetailViewProps => ({
  status: 'ready',
  backPath: '/orders',
  order,
  isRefetching: false,
  refetchFailed: false,
  onRetry: vi.fn(),
  ...overrides,
});

const table = () => screen.getByRole('table', { name: 'Order lines' });
const summary = () => screen.getByRole('region', { name: 'Summary' });

/** The `<dd>` of the `<dt>` named `term` in the summary. */
function summaryValue(term: string): HTMLElement {
  const dt = within(summary()).getByText(term, { selector: 'dt' });
  const dd = dt.nextElementSibling;
  if (!(dd instanceof HTMLElement)) throw new Error(`No value for ${term}`);
  return dd;
}

describe('OrderDetailView', () => {
  it('lists every line with quantity, unit price and line total, and the totals in the footer', () => {
    const order = orderDetail('DRAFT');
    renderView(ready(order));

    const headers = within(table())
      .getAllByRole('columnheader')
      .map((th) => th.textContent);
    expect(headers).toEqual([
      'Product',
      'Quantity',
      'Unit price',
      'Line total',
    ]);
    const [, ...bodyRows] = within(table()).getAllByRole('row');
    const [firstRow] = bodyRows;
    const [first] = order.lines;
    if (!first || !firstRow) throw new Error('Fixture without lines');
    expect(
      within(firstRow)
        .getAllByRole('cell')
        .map((td) => td.textContent),
    ).toEqual([
      `${first.productTitle}${first.productSku}`,
      String(first.quantity),
      formatCents(first.unitPriceCents),
      formatCents(first.quantity * first.unitPriceCents),
    ]);
    // Plain text: no product detail page in this phase.
    expect(within(table()).queryByRole('link')).not.toBeInTheDocument();

    const footer = Object.fromEntries(
      within(table())
        .getAllByRole('rowheader')
        .map((th) => [
          th.textContent,
          th.closest('tr')?.querySelector('td')?.textContent,
        ]),
    );
    expect(footer).toEqual({
      Subtotal: formatCents(order.subtotalCents),
      VAT: formatCents(order.vatCents),
      Total: formatCents(order.totalCents),
    });
  });

  it('labels every summary value with visible text', () => {
    const order = orderDetail('PICKED');
    renderView(ready(order));

    expect(summaryValue('Order number')).toHaveTextContent(order.number);
    expect(summaryValue('Status')).toHaveTextContent('Picked');
    expect(summaryValue('Created')).toHaveTextContent(
      formatDateTime(order.createdAt),
    );
    expect(summaryValue('Lines')).toHaveTextContent('4 lines');
    expect(summaryValue('Total')).toHaveTextContent(
      formatCents(order.totalCents),
    );
    expect(summaryValue('Customer')).toHaveTextContent(order.customer.name);
    expect(summaryValue('Customer')).toHaveTextContent('Attn. Petra Novak');
  });

  it.each(['CONFIRMED', 'PICKED'] as const)(
    'says a %s order holds its stock',
    (status) => {
      renderView(ready(orderDetail(status)));
      expect(
        screen.getByText(
          'Stock for these items is reserved while the order is Confirmed or Picked.',
        ),
      ).toBeVisible();
    },
  );

  it.each(['DRAFT', 'SHIPPED', 'CANCELLED'] as const)(
    'says nothing about reservation for a %s order',
    (status) => {
      renderView(ready(orderDetail(status)));
      expect(screen.queryByText(/is reserved/)).not.toBeInTheDocument();
    },
  );

  it('scrolls the table inside its own focusable region', () => {
    renderView(ready(MANY_LINES_ORDER));
    const region = screen.getByRole('group', { name: 'Order lines' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(within(region).getAllByRole('row')).toHaveLength(
      1 + MANY_LINES_ORDER.lines.length + 3,
    );
  });

  it('shows a busy skeleton in the final layout while loading', () => {
    renderView({ status: 'loading', backPath: '/orders' });

    expect(screen.getByRole('status')).toHaveTextContent('Loading order');
    expect(summary().parentElement).toHaveAttribute('aria-busy', 'true');
    expect(table()).toBeInTheDocument();
  });

  it('shows the load error with Retry', async () => {
    const onRetry = vi.fn();
    const { user } = renderView({
      status: 'error',
      backPath: '/orders',
      onRetry,
    });

    expect(screen.getByRole('alert')).toHaveTextContent(ORDER_LOAD_ERROR);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('says the order was not found and links back to the list it came from', () => {
    renderView({ status: 'notFound', backPath: '/orders?status=DRAFT' });

    expect(screen.getByText('Order not found')).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Go to the orders list' }),
    ).toHaveAttribute('href', '/orders?status=DRAFT');
  });

  it('keeps the order on screen while it refetches, and above it the banner when that fails', () => {
    renderView(
      ready(orderDetail('CONFIRMED'), {
        isRefetching: true,
        refetchFailed: true,
      }),
    );

    expect(table()).toBeVisible();
    expect(summary()).not.toHaveAttribute('aria-busy');
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(ORDER_LOAD_ERROR);
  });

  it('shows no progress bar while nothing is refetching', () => {
    renderView(ready(orderDetail('CONFIRMED')));
    expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument();
  });
});
