import { describe, expect, it } from 'vitest';

import { isDateRangeInvalid, parseDate } from './dateRange';

describe('isDateRangeInvalid', () => {
  it.each([
    [{ from: '2026-10-03', to: '2026-09-27' }, true],
    [{ from: '2026-10-03', to: '2026-10-03' }, false],
    [{ from: '2026-09-27', to: '2026-10-03' }, false],
    [{ from: '2026-10-03' }, false],
    [{ to: '2026-10-03' }, false],
    [{}, false],
  ])('%o is invalid: %s', (range, invalid) => {
    expect(isDateRangeInvalid(range)).toBe(invalid);
  });
});

describe('parseDate', () => {
  it('keeps a complete date', () => {
    expect(parseDate('2026-10-03')).toBe('2026-10-03');
  });

  it.each(['', '2026-10', 'not a date'])(
    'returns undefined for %o',
    (value) => {
      expect(parseDate(value)).toBeUndefined();
    },
  );
});
