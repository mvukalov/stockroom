import type { Meta, StoryObj } from '@storybook/react-vite';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { PageSize } from '@stockroom/contract';

import { Button } from '../../atoms/Button/Button';
import { Icon } from '../../atoms/Icon/Icon';
import { Input } from '../../atoms/Input/Input';
import { Select } from '../../atoms/Select/Select';
import { DataTable } from './DataTable';
import { Table } from './Table';
import type { ActiveFilter } from './tableContext';
import {
  SHIPMENT_COLUMNS,
  SHIPMENT_NOUN,
  SHIPMENTS,
  shipmentPage,
  WIDE_SHIPMENT_COLUMNS,
  type ShipmentSort,
} from './tableFixtures';
import { useRowSelection } from './useRowSelection';

type DemoProps = {
  /** What the request for the current page is doing. */
  request: 'done' | 'loading' | 'refetching' | 'failed' | 'refetchFailed';
  /** Start with every shipment filtered out. */
  noRows?: boolean;
  initialSearch?: string;
  initialCarrier?: string;
  wide?: boolean;
  /** Start on this page, e.g. one past the end. */
  initialPage?: number;
  onBulkAction?: (ids: readonly string[]) => void;
};

const FILTER_WIDTH = { flex: '1 1 12rem', maxWidth: '18rem' };

const CARRIERS = [...new Set(SHIPMENTS.map((s) => s.carrier))].sort();

/**
 * Plays the caller: holds the query (here in state; a screen keeps it in the URL)
 * and computes the page the server would return, so sorting, paging, filters and
 * selection all work in the story.
 */
function ShipmentsDemo({
  request,
  noRows = false,
  initialSearch = '',
  initialCarrier = '',
  wide = false,
  initialPage = 1,
  onBulkAction = () => {},
}: DemoProps) {
  const [sort, setSort] = useState<ShipmentSort>('reference');
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [search, setSearch] = useState(initialSearch);
  const [carrier, setCarrier] = useState(initialCarrier);
  const selection = useRowSelection(
    JSON.stringify([sort, page, pageSize, search, carrier]),
  );

  const rows = noRows
    ? []
    : SHIPMENTS.filter(
        (s) =>
          (carrier === '' || s.carrier === carrier) &&
          s.reference.toLowerCase().includes(search.trim().toLowerCase()),
      );
  const hasData = request !== 'loading' && request !== 'failed';
  const data = hasData ? shipmentPage(sort, page, pageSize, rows) : undefined;

  const activeFilters: ActiveFilter[] = [];
  if (search !== '') {
    activeFilters.push({
      id: 'search',
      label: 'Search',
      value: search,
      onRemove: () => setSearch(''),
    });
  }
  if (carrier !== '') {
    activeFilters.push({
      id: 'carrier',
      label: 'Carrier',
      value: carrier,
      onRemove: () => setCarrier(''),
    });
  }

  return (
    <DataTable
      caption="Shipments"
      itemNoun={SHIPMENT_NOUN}
      columns={wide ? WIDE_SHIPMENT_COLUMNS : SHIPMENT_COLUMNS}
      data={data}
      getRowId={(row) => row.id}
      getRowLabel={(row) => row.reference}
      sort={sort}
      page={page}
      pageSize={pageSize}
      onSortChange={(next) => {
        setSort(next);
        setPage(1);
      }}
      onPageChange={setPage}
      onPageSizeChange={(next) => {
        setPageSize(next);
        setPage(1);
      }}
      isFetching={request === 'loading' || request === 'refetching'}
      error={
        request === 'failed' || request === 'refetchFailed'
          ? { onRetry: fn() }
          : undefined
      }
      activeFilters={activeFilters}
      onClearFilters={() => {
        setSearch('');
        setCarrier('');
      }}
      selection={selection}
      empty={
        <Table.Empty
          title="No shipments yet"
          description="Shipments appear here once an order is shipped."
        />
      }
    >
      <Table.Toolbar>
        {/* The caller sizes its filters; the atoms fill their container. */}
        <div style={FILTER_WIDTH}>
          <Input
            variant="search"
            aria-label="Search shipments"
            placeholder="Search by reference…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div style={FILTER_WIDTH}>
          <Select
            aria-label="Carrier"
            value={carrier}
            onChange={(event) => {
              setCarrier(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All carriers</option>
            {CARRIERS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>
      </Table.Toolbar>
      <Table.BulkBar>
        {({ selectedIds }) => (
          <Button onClick={() => onBulkAction([...selectedIds])}>
            <Icon icon={Download} />
            Export CSV
          </Button>
        )}
      </Table.BulkBar>
    </DataTable>
  );
}

const meta = {
  title: 'Organisms/DataTable',
  component: ShipmentsDemo,
  args: { request: 'done', onBulkAction: fn() },
  argTypes: {
    request: {
      control: 'inline-radio',
      options: ['done', 'loading', 'refetching', 'failed', 'refetchFailed'],
    },
  },
} satisfies Meta<typeof ShipmentsDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 194 shipments, 25 per page. Sort, page, filter and select: it all works. */
export const Default: Story = {};

/** No rows yet: skeleton rows in the same layout, the table is `aria-busy`. */
export const Loading: Story = { args: { request: 'loading' } };

/**
 * Rows on screen while the next page loads: they stay at full contrast, a bar on
 * the top edge and `aria-busy` mark the wait. No skeleton flash.
 */
export const Refetching: Story = { args: { request: 'refetching' } };

export const Empty: Story = { args: { noRows: true } };

/** Nothing matches: chips, "Clear filters" in the toolbar and in the empty state. */
export const EmptyWithFilters: Story = {
  args: { initialSearch: 'zzz', initialCarrier: 'Nordpost' },
};

/** Shipments exist, but not on page 50 (a hand-edited URL): not an empty list. */
export const PageOutOfRange: Story = { args: { initialPage: 50 } };

/** The first load failed: the banner with Retry is all there is. */
export const Error: Story = { args: { request: 'failed' } };

/** A refetch failed: the banner sits above the stale rows. */
export const RefetchFailed: Story = { args: { request: 'refetchFailed' } };

export const SelectionNone: Story = {};

/** Some rows selected: the header checkbox is mixed, the bulk bar shows. */
export const SelectionSome: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const reference of [
      'SHP-2026-1000',
      'SHP-2026-1002',
      'SHP-2026-1005',
    ]) {
      await userEvent.click(
        canvas.getByRole('checkbox', { name: `Select ${reference}` }),
      );
    }
    await expect(
      canvas.getByRole('checkbox', { name: 'Select all rows on this page' }),
    ).toBePartiallyChecked();
  },
};

export const SelectionAll: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole('checkbox', { name: 'Select all rows on this page' }),
    );
    await expect(canvas.getByText('25 shipments selected')).toBeVisible();
  },
};

/** More columns than fit: the table scrolls inside its own box, never the page. */
export const WideData: Story = { args: { wide: true } };
