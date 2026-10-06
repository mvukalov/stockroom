import { render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stubScrollContainerSize } from '../../test/scrollContainerSize';
import { shortId } from '../../utils/shortId';
import {
  DEFAULT_MOVEMENTS_QUERY,
  fixtureMovements,
  MOVEMENT_LOCATIONS,
  MOVEMENT_USERS,
} from './movementsFixtures';
import { MovementsView } from './MovementsView';

type Props = ComponentProps<typeof MovementsView>;

function props(overrides: Partial<Props> = {}): Props {
  return {
    query: DEFAULT_MOVEMENTS_QUERY,
    rows: fixtureMovements(5),
    total: 5,
    hasMore: false,
    isLoadingMore: false,
    isRefreshing: false,
    onLoadMore: vi.fn(),
    error: undefined,
    locations: { status: 'ready', data: MOVEMENT_LOCATIONS },
    users: { status: 'ready', data: MOVEMENT_USERS },
    onFilterChange: vi.fn(),
    onClearFilters: vi.fn(),
    onSortChange: vi.fn(),
    listKey: 'default',
    announcement: '',
    copyStatus: null,
    onCopyId: vi.fn(),
    savingIds: new Set(),
    ...overrides,
  };
}

const table = () => screen.getByRole('table', { name: 'Stock movements' });

/** Text of the body rows' cells in the column headed `header`, in order. */
function columnText(header: string): string[] {
  const rows = within(table())
    .getAllByRole('row')
    .filter((row) => row.hasAttribute('data-index'));
  const index = within(table())
    .getAllByRole('columnheader')
    .findIndex((cell) => cell.textContent === header);
  return rows.map(
    (row) => within(row).getAllByRole('cell')[index]?.textContent ?? '',
  );
}

beforeEach(() => {
  stubScrollContainerSize({ height: 400 });
});
afterEach(() => vi.restoreAllMocks());

describe('MovementsView', () => {
  it('shows the short id of a Created by user that is not in the user list', () => {
    const [known, unknown] = fixtureMovements(2);
    if (!known || !unknown) throw new Error('Fixture has fewer than 2 rows');
    const stranger = '9d3e2f1a-0b4c-4d5e-8f6a-7b8c9d0e1f2a';
    render(
      <MovementsView
        {...props({
          rows: [known, { ...unknown, createdBy: stranger }],
          total: 2,
        })}
      />,
    );

    const knownName = MOVEMENT_USERS.find(
      (u) => u.id === known.createdBy,
    )?.name;
    expect(columnText('Created by')).toEqual([knownName, shortId(stranger)]);
  });

  it('disables Location and Created by with a reason while their options load', () => {
    render(
      <MovementsView
        {...props({
          locations: { status: 'loading' },
          users: { status: 'loading' },
        })}
      />,
    );

    const location = screen.getByRole('combobox', { name: 'Location' });
    const createdBy = screen.getByRole('combobox', { name: 'Created by' });
    expect(location).toBeDisabled();
    expect(location).toHaveAccessibleDescription(
      'Loading Location filter options…',
    );
    expect(createdBy).toBeDisabled();
    expect(createdBy).toHaveAccessibleDescription(
      'Loading Created by filter options…',
    );
    // The filters that need no options keep working, and so does the list.
    expect(screen.getByRole('combobox', { name: 'Type' })).toBeEnabled();
    expect(columnText('Created by')).toHaveLength(5);
  });

  it('marks a row that is still saving with text and gives it no Copy ID', () => {
    const rows = fixtureMovements(2);
    const [saving, saved] = rows;
    if (!saving || !saved) throw new Error('Fixture rows missing');
    render(
      <MovementsView {...props({ rows, savingIds: new Set([saving.id]) })} />,
    );

    expect(columnText('Date/time')[0]).toBe('Saving…');
    expect(
      screen.queryByRole('button', { name: `Copy ID ${saving.id}` }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: `Copy ID ${saved.id}` }),
    ).toBeInTheDocument();
  });
});
