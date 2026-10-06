import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it, vi } from 'vitest';

import type { PageSize } from '@stockroom/contract';

import { useTableSearchParams } from '../../../hooks/useTableSearchParams';
import { Button } from '../../atoms/Button/Button';
import { DataTable, type DataTableProps } from './DataTable';
import { Table } from './Table';
import {
  SHIPMENT_COLUMNS,
  SHIPMENT_NOUN,
  shipmentPage,
  type Shipment,
  type ShipmentSort,
} from './tableFixtures';
import { useRowSelection } from './useRowSelection';

type Props = DataTableProps<Shipment, ShipmentSort>;

function baseProps(overrides: Partial<Props> = {}): Props {
  return {
    caption: 'Shipments',
    itemNoun: SHIPMENT_NOUN,
    columns: SHIPMENT_COLUMNS,
    data: shipmentPage('reference', 1, 25),
    getRowId: (row) => row.id,
    getRowLabel: (row) => row.reference,
    sort: 'reference',
    page: 1,
    pageSize: 25,
    onSortChange: vi.fn(),
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    ...overrides,
  };
}

function renderTable(
  overrides: Partial<Props> = {},
  children?: Props['children'],
) {
  const user = userEvent.setup();
  const props = baseProps(overrides);
  const result = render(<DataTable {...props}>{children}</DataTable>);
  return { user, props, ...result };
}

/** A caller with state: sorting, paging and selection behave as on a screen. */
function Harness({ onBulk = vi.fn() }: { onBulk?: (n: number) => void }) {
  const [sort, setSort] = useState<ShipmentSort>('reference');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const selection = useRowSelection(`${sort}|${page}|${pageSize}`);

  return (
    <DataTable
      {...baseProps()}
      data={shipmentPage(sort, page, pageSize)}
      sort={sort}
      page={page}
      pageSize={pageSize}
      onSortChange={setSort}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      selection={selection}
    >
      <Table.Toolbar />
      <Table.BulkBar>
        {({ selectedIds }) => (
          <Button onClick={() => onBulk(selectedIds.size)}>Export CSV</Button>
        )}
      </Table.BulkBar>
    </DataTable>
  );
}

function renderHarness() {
  const user = userEvent.setup();
  const onBulk = vi.fn();
  render(<Harness onBulk={onBulk} />);
  return { user, onBulk };
}

const headerCheckbox = () =>
  screen.getByRole('checkbox', { name: 'Select all rows on this page' });

describe('DataTable markup', () => {
  it('is a real table with a caption and column headers', () => {
    renderTable();

    const table = screen.getByRole('table', { name: 'Shipments' });
    const headers = within(table).getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual([
      'Reference',
      'Carrier',
      'Destination',
      'Parcels',
      'Weight (kg)',
      'Status',
    ]);
    for (const header of headers)
      expect(header).toHaveAttribute('scope', 'col');
    // Header row plus one row per item on the page.
    expect(within(table).getAllByRole('row')).toHaveLength(1 + 25);
    expect(
      within(table).getByRole('cell', { name: 'SHP-2026-1000' }),
    ).toBeVisible();
  });

  it('renders custom cells and right-aligns numeric columns', () => {
    renderTable();

    const firstRow = screen.getAllByRole('row')[1]!;
    const [, , , parcels, , status] = within(firstRow).getAllByRole('cell');
    expect(parcels!.className).toMatch(/end/);
    expect(
      within(status!).getByText(/Pending|In transit|Delivered/),
    ).toBeVisible();
  });

  it('scrolls inside its own labelled, focusable region', () => {
    renderTable();

    const region = screen.getByRole('group', { name: 'Shipments' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(within(region).getByRole('table')).toBeInTheDocument();
  });
});

describe('sorting', () => {
  it('marks the sorted column with aria-sort and only that one', () => {
    renderTable({ sort: '-parcels' });

    expect(
      screen.getByRole('columnheader', { name: /Parcels/ }),
    ).toHaveAttribute('aria-sort', 'descending');
    expect(
      screen.getByRole('columnheader', { name: /Reference/ }),
    ).not.toHaveAttribute('aria-sort');
  });

  it('reports the next sort in the contract format', async () => {
    const { user, props } = renderTable({ sort: 'reference' });

    await user.click(screen.getByRole('button', { name: 'Reference' }));
    expect(props.onSortChange).toHaveBeenLastCalledWith('-reference');

    await user.click(screen.getByRole('button', { name: 'Weight (kg)' }));
    expect(props.onSortChange).toHaveBeenLastCalledWith('weightKg');
  });

  it('toggles back to ascending', async () => {
    const { user, props } = renderTable({ sort: '-carrier' });

    await user.click(screen.getByRole('button', { name: 'Carrier' }));
    expect(props.onSortChange).toHaveBeenLastCalledWith('carrier');
  });

  it('renders no button for a column without sortKey', () => {
    renderTable();

    for (const name of ['Destination', 'Status']) {
      const header = screen.getByRole('columnheader', { name });
      expect(within(header).queryByRole('button')).not.toBeInTheDocument();
    }
  });

  it('works by keyboard and keeps focus on the sort button', async () => {
    const { user } = renderHarness();

    const button = screen.getByRole('button', { name: 'Carrier' });
    button.focus();
    await user.keyboard('{Enter}');

    expect(
      screen.getByRole('columnheader', { name: /Carrier/ }),
    ).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getByRole('button', { name: 'Carrier' })).toHaveFocus();
  });
});

describe('pagination', () => {
  it('shows the range, the page count and the page size options', () => {
    renderTable();

    expect(screen.getByRole('status')).toHaveTextContent(
      'Showing 1-25 of 194 shipments',
    );
    expect(screen.getByText('Page 1 of 8')).toBeVisible();
    const pageSize = screen.getByRole('combobox', { name: 'Rows per page' });
    expect(
      within(pageSize)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['10', '25', '50', '100']);
    expect(pageSize).toHaveValue('25');
  });

  it('Previous is unavailable on the first page and says why', async () => {
    const { user, props } = renderTable();

    const previous = screen.getByRole('button', { name: 'Previous page' });
    expect(previous).toHaveAttribute('aria-disabled', 'true');
    expect(previous).toHaveAccessibleDescription('This is the first page.');
    await user.click(previous);
    expect(props.onPageChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(props.onPageChange).toHaveBeenCalledWith(2);
  });

  it('Next is unavailable on the last page and says why', async () => {
    const { user, props } = renderTable({
      page: 8,
      data: shipmentPage('reference', 8, 25),
    });

    expect(screen.getByRole('status')).toHaveTextContent(
      'Showing 176-194 of 194 shipments',
    );
    const next = screen.getByRole('button', { name: 'Next page' });
    expect(next).toHaveAccessibleDescription('This is the last page.');
    await user.click(next);
    expect(props.onPageChange).not.toHaveBeenCalled();
  });

  it('reports a new page size', async () => {
    const { user, props } = renderTable();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Rows per page' }),
      '50',
    );
    expect(props.onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('keeps focus on Next and announces the new range', async () => {
    const { user } = renderHarness();

    const next = screen.getByRole('button', { name: 'Next page' });
    next.focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('status')).toHaveTextContent(
      'Showing 26-50 of 194 shipments',
    );
    expect(screen.getByRole('button', { name: 'Next page' })).toHaveFocus();
  });
});

describe('selection', () => {
  it('has no checkbox column without a selection', () => {
    renderTable();

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('labels each row checkbox and tracks the header state', async () => {
    const { user, onBulk } = renderHarness();

    expect(headerCheckbox()).not.toBeChecked();
    expect(screen.queryByText(/selected$/)).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('checkbox', { name: 'Select SHP-2026-1000' }),
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'Select SHP-2026-1003' }),
    );
    expect(headerCheckbox()).toBePartiallyChecked();
    expect(screen.getByText('2 shipments selected')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(onBulk).toHaveBeenCalledWith(2);

    await user.click(headerCheckbox());
    expect(headerCheckbox()).toBeChecked();
    expect(screen.getByText('25 shipments selected')).toBeVisible();

    await user.click(headerCheckbox());
    expect(headerCheckbox()).not.toBeChecked();
    expect(screen.queryByText(/selected$/)).not.toBeInTheDocument();
  });

  it('announces the count in a live region that stays mounted', async () => {
    const { user } = renderHarness();

    // Mounted before anything is selected, so the first count is announced.
    const live = document.querySelector('[aria-live="polite"]:empty');
    expect(live).not.toBeNull();

    await user.click(
      screen.getByRole('checkbox', { name: 'Select SHP-2026-1000' }),
    );
    expect(live).toHaveTextContent('1 shipment selected');
    await user.click(
      screen.getByRole('checkbox', { name: 'Select SHP-2026-1001' }),
    );
    expect(live).toHaveTextContent('2 shipments selected');
    // Selecting moved no focus to the bar.
    expect(
      screen.getByRole('checkbox', { name: 'Select SHP-2026-1001' }),
    ).toHaveFocus();
  });

  it('uses the singular for one row and clears from the bulk bar', async () => {
    const { user } = renderHarness();

    await user.click(
      screen.getByRole('checkbox', { name: 'Select SHP-2026-1001' }),
    );
    expect(screen.getByText('1 shipment selected')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.queryByText(/selected$/)).not.toBeInTheDocument();
  });

  it.each([
    [
      'page',
      async (user: ReturnType<typeof userEvent.setup>) =>
        user.click(screen.getByRole('button', { name: 'Next page' })),
    ],
    [
      'sort',
      async (user: ReturnType<typeof userEvent.setup>) =>
        user.click(screen.getByRole('button', { name: 'Carrier' })),
    ],
    [
      'page size',
      async (user: ReturnType<typeof userEvent.setup>) =>
        user.selectOptions(
          screen.getByRole('combobox', { name: 'Rows per page' }),
          '10',
        ),
    ],
  ])('is empty after a %s change', async (_, change) => {
    const { user } = renderHarness();

    await user.click(headerCheckbox());
    expect(screen.getByText('25 shipments selected')).toBeVisible();

    await change(user);
    expect(screen.queryByText(/selected$/)).not.toBeInTheDocument();
    expect(headerCheckbox()).not.toBeChecked();
    expect(headerCheckbox()).not.toBePartiallyChecked();
  });

  it('ignores selected ids of rows that are not on the page', () => {
    const page = shipmentPage('reference', 1, 25);
    const onPage = page.items[0]!.id;
    renderTable(
      {
        data: page,
        selection: {
          selectedIds: new Set([onPage, 'shp-not-on-this-page']),
          setSelectedIds: vi.fn(),
        },
      },
      <Table.BulkBar>{() => null}</Table.BulkBar>,
    );

    expect(screen.getByText('1 shipment selected')).toBeVisible();
    expect(headerCheckbox()).toBePartiallyChecked();
  });
});

describe('states', () => {
  it('loading: skeleton rows in a busy table, announced as loading', () => {
    renderTable({
      data: undefined,
      isFetching: true,
      selection: { selectedIds: new Set(), setSelectedIds: vi.fn() },
    });

    const table = screen.getByRole('table');
    expect(table).toHaveAttribute('aria-busy', 'true');
    // Never more than 10 skeleton rows.
    expect(within(table).getAllByRole('row')).toHaveLength(1 + 10);
    expect(screen.getByRole('status')).toHaveTextContent('Loading shipments…');
    expect(screen.getByText('Page 1')).toBeVisible();
    expect(headerCheckbox()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('refetching: keeps the rows, marks the table busy', () => {
    const { container } = renderTable({ isFetching: true });

    const table = screen.getByRole('table');
    expect(table).toHaveAttribute('aria-busy', 'true');
    expect(within(table).getAllByRole('row')).toHaveLength(1 + 25);
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1-25');
    // The progress bar is decorative; aria-busy and the live region carry the state.
    expect(
      container.querySelector('[aria-hidden="true"] > span'),
    ).not.toBeNull();
  });

  it('ready: the table is not busy', () => {
    renderTable();

    expect(screen.getByRole('table')).not.toHaveAttribute('aria-busy');
  });

  it('empty: the empty state instead of the table', () => {
    renderTable({
      data: { items: [], total: 0, page: 1, pageSize: 25 },
      empty: <Table.Empty title="No shipments yet" />,
    });

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('No shipments yet')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Showing 0 of 0 shipments',
    );
    expect(screen.getByText('Page 1 of 1')).toBeVisible();
  });

  it('idle: only the given content, no table, count or pagination', () => {
    renderTable({
      data: undefined,
      isFetching: true,
      idle: <p>Nothing requested</p>,
    });

    expect(screen.getByText('Nothing requested')).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(document.querySelector('[aria-busy]')).toBeNull();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Next page' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Rows per page')).not.toBeInTheDocument();
  });

  it('empty with active filters: says so, chips and Clear filters', async () => {
    const onClearFilters = vi.fn();
    const onRemove = vi.fn();
    const { user } = renderTable(
      {
        data: { items: [], total: 0, page: 1, pageSize: 25 },
        empty: <Table.Empty title="No shipments yet" />,
        activeFilters: [
          { id: 'carrier', label: 'Carrier', value: 'Nordpost', onRemove },
        ],
        onClearFilters,
      },
      <Table.Toolbar />,
    );

    expect(screen.getByText('No shipments match your filters')).toBeVisible();
    expect(screen.queryByText('No shipments yet')).not.toBeInTheDocument();

    const chips = screen.getByRole('list');
    expect(within(chips).getByRole('listitem')).toHaveTextContent(
      'Carrier: Nordpost',
    );
    await user.click(
      screen.getByRole('button', { name: 'Remove filter Carrier: Nordpost' }),
    );
    expect(onRemove).toHaveBeenCalledOnce();

    // One in the toolbar, one in the empty state.
    const clearButtons = screen.getAllByRole('button', {
      name: 'Clear filters',
    });
    expect(clearButtons).toHaveLength(2);
    for (const button of clearButtons) await user.click(button);
    expect(onClearFilters).toHaveBeenCalledTimes(2);
  });

  it('error without data: the banner only, and Retry calls back', async () => {
    const onRetry = vi.fn();
    const { user } = renderTable({ data: undefined, error: { onRetry } });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(
      "We couldn't load shipments. Check your connection and try again.",
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('');
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('error with data: the banner above the stale rows', () => {
    renderTable({ error: { onRetry: vi.fn(), message: 'Could not refresh.' } });

    const alert = screen.getByRole('alert');
    const table = screen.getByRole('table');
    expect(alert).toHaveTextContent('Could not refresh.');
    expect(
      alert.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe('column visibility', () => {
  it('hides a hideable column; non-hideable ones stay', async () => {
    const { user } = renderTable({}, <Table.Toolbar />);

    const toggle = screen.getByRole('button', { name: 'Columns' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const panel = screen.getByRole('group', { name: 'Visible columns' });
    expect(
      within(panel).getByRole('checkbox', { name: 'Reference' }),
    ).toBeDisabled();
    expect(
      within(panel).getByRole('checkbox', { name: 'Reference' }),
    ).toBeChecked();

    await user.click(within(panel).getByRole('checkbox', { name: 'Carrier' }));
    expect(
      screen.queryByRole('columnheader', { name: /Carrier/ }),
    ).not.toBeInTheDocument();
    expect(
      within(panel).getByRole('checkbox', { name: 'Carrier' }),
    ).not.toBeChecked();

    await user.click(within(panel).getByRole('checkbox', { name: 'Carrier' }));
    expect(screen.getByRole('columnheader', { name: /Carrier/ })).toBeVisible();
  });

  it('leaves out columns with a hidden header', async () => {
    const { user } = renderTable(
      {
        columns: [
          ...SHIPMENT_COLUMNS,
          {
            id: 'actions',
            header: 'Actions',
            hideHeader: true,
            cell: () => null,
          },
        ],
      },
      <Table.Toolbar />,
    );

    await user.click(screen.getByRole('button', { name: 'Columns' }));
    const panel = screen.getByRole('group', { name: 'Visible columns' });
    expect(
      within(panel).queryByRole('checkbox', { name: 'Actions' }),
    ).not.toBeInTheDocument();
    expect(within(panel).getAllByRole('checkbox')).toHaveLength(
      SHIPMENT_COLUMNS.length,
    );
    // The column itself is still shown.
    expect(
      screen.getByRole('columnheader', { name: 'Actions' }),
    ).toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the button', async () => {
    const { user } = renderTable({}, <Table.Toolbar />);

    const toggle = screen.getByRole('button', { name: 'Columns' });
    toggle.focus();
    await user.keyboard('{Enter}');
    await user.tab();
    expect(screen.getByRole('checkbox', { name: 'Carrier' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    expect(
      screen.queryByRole('group', { name: 'Visible columns' }),
    ).not.toBeInTheDocument();
  });

  it('closes on a click outside', async () => {
    const { user } = renderTable({}, <Table.Toolbar />);

    const toggle = screen.getByRole('button', { name: 'Columns' });
    await user.click(toggle);
    await user.click(screen.getByRole('table'));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('sort announcement', () => {
  it('announces the new sort in the live region, without changing the count', async () => {
    const { user } = renderHarness();
    const status = screen.getByRole('status');
    expect(status).not.toHaveTextContent('Sorted by');

    await user.click(screen.getByRole('button', { name: 'Carrier' }));
    expect(status).toHaveTextContent('Showing 1-25 of 194 shipments');
    expect(status).toHaveTextContent('Sorted by Carrier, ascending');

    await user.click(screen.getByRole('button', { name: 'Carrier' }));
    expect(status).toHaveTextContent('Sorted by Carrier, descending');
  });

  it('announces nothing for a refetch or a page change', async () => {
    const { user } = renderHarness();

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Showing 26-50 of 194 shipments',
    );
    expect(screen.getByRole('status')).not.toHaveTextContent('Sorted by');
  });
});

describe('page out of range', () => {
  it('says the page is empty, not the list, and offers the first page', async () => {
    const { user, props } = renderTable({
      page: 50,
      data: { items: [], total: 194, page: 50, pageSize: 25 },
      empty: <Table.Empty title="No shipments yet" />,
    });

    expect(screen.getByText('This page is empty')).toBeVisible();
    expect(screen.queryByText('No shipments yet')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Go to first page' }));
    expect(props.onPageChange).toHaveBeenCalledWith(1);
  });

  it('?page=50 in the URL: Go to first page brings the rows back', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(
      [{ path: '/shipments', element: <UrlShipments /> }],
      { initialEntries: ['/shipments?page=50'] },
    );
    render(<RouterProvider router={router} />);

    expect(screen.getByText('Page 50 of 8')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Go to first page' }));

    expect(router.state.location.search).toBe('');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Showing 1-25 of 194 shipments',
    );
    expect(screen.getAllByRole('row')).toHaveLength(1 + 25);
  });
});

type ShipmentsQuery = { page: number; pageSize: PageSize; sort: ShipmentSort };

/** A stand-in for a contract list query schema: only `page` is read from the URL. */
const ShipmentsQuerySchema = {
  parse(input: unknown): ShipmentsQuery {
    const raw =
      typeof input === 'object' && input !== null
        ? Number(Reflect.get(input, 'page'))
        : Number.NaN;
    const page = Number.isInteger(raw) && raw >= 1 ? raw : 1;
    return { page, pageSize: 25, sort: 'reference' };
  },
};

/** A screen in miniature: the query comes from the URL. */
function UrlShipments() {
  const { query, setSort, setPage, setPageSize } = useTableSearchParams(
    ShipmentsQuerySchema,
    { filterKeys: [] },
  );
  return (
    <DataTable
      {...baseProps()}
      data={shipmentPage(query.sort, query.page, query.pageSize)}
      sort={query.sort}
      page={query.page}
      pageSize={query.pageSize}
      onSortChange={setSort}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
    />
  );
}
