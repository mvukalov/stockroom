import { describe, expect, it } from 'vitest';

import {
  formatDate,
  formatDateTime,
  formatDateTimeParts,
} from './formatDateTime';

describe('formatDateTime', () => {
  it('formats day, short month, year and a 24-hour time', () => {
    expect(formatDateTime('2026-10-03T08:45:00Z', 'UTC')).toBe(
      '3 Oct 2026, 08:45',
    );
  });

  it('shows the time in the given zone, not in UTC', () => {
    // 22:30 UTC on 27 September is already 28 September in Zagreb (UTC+2).
    expect(formatDateTime('2026-09-27T22:30:00Z', 'Europe/Zagreb')).toBe(
      '28 Sept 2026, 00:30',
    );
  });

  it('keeps midnight as 00, not 24', () => {
    expect(formatDateTime('2026-01-01T00:05:00Z', 'UTC')).toBe(
      '1 Jan 2026, 00:05',
    );
  });
});

describe('formatDateTimeParts', () => {
  it('splits the same text into a date and a time', () => {
    const value = '2026-09-27T22:30:00Z';
    const { date, time } = formatDateTimeParts(value, 'Europe/Zagreb');
    expect({ date, time }).toEqual({ date: '28 Sept 2026', time: '00:30' });
    expect(`${date}, ${time}`).toBe(formatDateTime(value, 'Europe/Zagreb'));
  });
});

describe('formatDate', () => {
  it('formats a calendar date as written, whatever the time zone', () => {
    expect(formatDate('2026-10-03')).toBe('3 Oct 2026');
    expect(formatDate('2026-01-01')).toBe('1 Jan 2026');
  });
});
