import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  scrollTo,
  stubScrollContainerSize,
} from '../../../test/scrollContainerSize';
import { VirtualTable, type VirtualColumnDef } from './VirtualTable';

type Row = { id: string; name: string; quantity: number };
type Sort = 'name' | '-name';

const ROW_HEIGHT = 40;
const VIEWPORT = 400;

const rowsOf = (count: number): Row[] =>
  Array.from({ length: count }, (_, n) => ({
    id: `row-${n}`,
    name: `Item ${n}`,
    quantity: n,
  }));

const COLUMNS: VirtualColumnDef<Row, Sort>[] = [
  { id: 'name', header: 'Name', sortKey: 'name', accessor: 'name' },
  {
    id: 'actions',
    header: 'Actions',
    hideHeader: true,
    width: '4rem',
    cell: (row) => <button type="button">Open {row.name}</button>,
  },
];

type Props = ComponentProps<typeof VirtualTable<Row, Sort>>;

function props(overrides: Partial<Props> = {}): Props {
  return {
    columns: COLUMNS,
    rows: rowsOf(1000),
    total: 5000,
    getRowId: (row) => row.id,
    caption: 'Items',
    minWidth: '20rem',
    sort: 'name',
    onSortChange: vi.fn(),
    hasMore: true,
    isLoadingMore: false,
    onLoadMore: vi.fn(),
    resetKey: 'a',
    empty: <p>Nothing here</p>,
    endLabel: 'End of list',
    ...overrides,
  };
}

const table = () => screen.getByRole('table', { name: 'Items' });
const scrollBox = () => screen.getByRole('group', { name: 'Items' });
const dataRows = () =>
  within(table())
    .getAllByRole('row')
    .filter((row) => row.hasAttribute('data-index'));
const rowIndexes = () =>
  dataRows().map((row) => Number(row.getAttribute('aria-rowindex')));

beforeEach(() => {
  stubScrollContainerSize({ height: VIEWPORT });
});
afterEach(() => vi.restoreAllMocks());

describe('VirtualTable', () => {
  it('tells assistive technology the full size and each row position', () => {
    render(<VirtualTable {...props()} />);

    // The header row is row 1, so 5,000 data rows make 5,001.
    expect(table()).toHaveAttribute('aria-rowcount', '5001');
    const [header] = within(table()).getAllByRole('row');
    expect(header).toHaveAttribute('aria-rowindex', '1');
    expect(rowIndexes()[0]).toBe(2);
    expect(
      within(dataRows()[0]!).getByRole('cell', { name: 'Item 0' }),
    ).toBeInTheDocument();
  });

  it('renders only a window of a long list, plus spacer rows for the rest', () => {
    render(<VirtualTable {...props()} />);

    // 10 visible rows plus the overscan below; never the 1,000 loaded ones.
    expect(dataRows().length).toBeGreaterThanOrEqual(VIEWPORT / ROW_HEIGHT);
    expect(dataRows().length).toBeLessThan(30);

    scrollTo(scrollBox(), 500 * ROW_HEIGHT);
    const indexes = rowIndexes();
    expect(indexes[0]).toBeGreaterThan(400);
    expect(indexes).toContain(502);
    expect(dataRows().length).toBeLessThan(40);
  });

  it('renders every row when virtualization is off (the measured baseline)', () => {
    render(
      <VirtualTable {...props({ rows: rowsOf(300), virtualize: false })} />,
    );

    expect(dataRows()).toHaveLength(300);
  });

  it('asks for more rows once, when the visible rows near the end of the loaded ones', () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <VirtualTable {...props({ rows: rowsOf(100), onLoadMore })} />,
    );
    // Rows 50-60 in view: still more than 20 rows from the end.
    scrollTo(scrollBox(), 50 * ROW_HEIGHT);
    expect(onLoadMore).not.toHaveBeenCalled();

    // Rows 75-85 in view: within 20 rows of the end.
    scrollTo(scrollBox(), 75 * ROW_HEIGHT);
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    // In flight: scrolling further asks for nothing more.
    rerender(
      <VirtualTable
        {...props({ rows: rowsOf(100), onLoadMore, isLoadingMore: true })}
      />,
    );
    scrollTo(scrollBox(), 85 * ROW_HEIGHT);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not ask for more after a failed request, or when everything is loaded', () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <VirtualTable
        {...props({ rows: rowsOf(100), onLoadMore, loadMoreFailed: true })}
      />,
    );
    scrollTo(scrollBox(), 85 * ROW_HEIGHT);
    expect(onLoadMore).not.toHaveBeenCalled();

    rerender(
      <VirtualTable
        {...props({
          rows: rowsOf(100),
          total: 100,
          onLoadMore,
          hasMore: false,
        })}
      />,
    );
    scrollTo(scrollBox(), 90 * ROW_HEIGHT);
    expect(onLoadMore).not.toHaveBeenCalled();
    expect(screen.getByText('End of list')).toBeInTheDocument();
  });

  it('shows hidden skeleton rows after the loaded rows while more exist, and none after a failed request', () => {
    // Tail skeleton rows have a cell per column; spacer rows have one cell.
    const tailRows = () =>
      [...table().querySelectorAll('tbody tr[aria-hidden="true"]')].filter(
        (row) => row.children.length === COLUMNS.length,
      );
    const { rerender } = render(
      <VirtualTable {...props({ rows: rowsOf(5), hasMore: true })} />,
    );
    expect(tailRows()).toHaveLength(3);

    rerender(
      <VirtualTable
        {...props({ rows: rowsOf(5), hasMore: true, loadMoreFailed: true })}
      />,
    );
    expect(tailRows()).toHaveLength(0);
    expect(dataRows()).toHaveLength(5);
  });

  it('keeps the row with focus rendered when it scrolls out of view, until focus leaves it', () => {
    render(<VirtualTable {...props()} />);
    const button = screen.getByRole('button', { name: 'Open Item 0' });
    act(() => button.focus());

    scrollTo(scrollBox(), 500 * ROW_HEIGHT);
    expect(button).toBeInTheDocument();
    expect(button).toHaveFocus();
    expect(rowIndexes()[0]).toBe(2);
    expect(rowIndexes()[1]).toBeGreaterThan(400);

    act(() => scrollBox().focus());
    expect(button).not.toBeInTheDocument();
  });

  it('scrolls a new list to the top once its rows replace the previous ones', () => {
    const { rerender } = render(<VirtualTable {...props()} />);
    scrollTo(scrollBox(), 300 * ROW_HEIGHT);

    // The new list is still loading: the previous rows stay where they are.
    rerender(
      <VirtualTable {...props({ resetKey: 'b', isRefreshing: true })} />,
    );
    expect(scrollBox().scrollTop).toBe(300 * ROW_HEIGHT);

    rerender(<VirtualTable {...props({ resetKey: 'b', rows: rowsOf(100) })} />);
    expect(scrollBox().scrollTop).toBe(0);
  });

  it('shows skeleton rows while the first page loads, then the end of the list', () => {
    const { rerender } = render(
      <VirtualTable {...props({ rows: undefined, total: undefined })} />,
    );
    expect(table()).toHaveAttribute('aria-busy', 'true');
    expect(table()).not.toHaveAttribute('aria-rowcount');
    expect(dataRows()).toHaveLength(0);

    rerender(
      <VirtualTable
        {...props({ rows: rowsOf(5), total: 5, hasMore: false })}
      />,
    );
    expect(table()).not.toHaveAttribute('aria-busy');
    expect(dataRows()).toHaveLength(5);
    expect(screen.getByText('End of list')).toBeInTheDocument();
  });

  it('shows the empty state instead of a table without rows', () => {
    render(<VirtualTable {...props({ rows: [], total: 0, hasMore: false })} />);

    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('reports a sort from the header', () => {
    const onSortChange = vi.fn();
    render(<VirtualTable {...props({ onSortChange })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSortChange).toHaveBeenCalledWith('-name');
  });
});
