import type { IsoDate, IsoDateTime } from '@stockroom/contract';

const OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
};

/** In the browser's time zone; built once, since a list formats hundreds of rows. */
const LOCAL_FORMAT = new Intl.DateTimeFormat('en-GB', OPTIONS);

const formatFor = (timeZone: string | undefined) =>
  timeZone === undefined
    ? LOCAL_FORMAT
    : new Intl.DateTimeFormat('en-GB', { ...OPTIONS, timeZone });

/**
 * A point in time as `3 Oct 2026, 08:45`, in the browser's time zone unless
 * `timeZone` is given (tests pin it, so the result does not depend on the machine).
 */
export function formatDateTime(value: IsoDateTime, timeZone?: string): string {
  return formatFor(timeZone).format(new Date(value));
}

/**
 * The same text as `formatDateTime`, split for two lines: `{ date: '3 Oct 2026',
 * time: '08:45' }`. Split at the `, ` the formatter puts between them.
 */
export function formatDateTimeParts(
  value: IsoDateTime,
  timeZone?: string,
): { date: string; time: string } {
  const parts = formatFor(timeZone).formatToParts(new Date(value));
  const split = parts.findIndex(
    (part) => part.type === 'literal' && part.value.includes(','),
  );
  const join = (from: number, to?: number) =>
    parts
      .slice(from, to)
      .map((part) => part.value)
      .join('');
  if (split === -1) return { date: join(0), time: '' };
  return { date: join(0, split), time: join(split + 1) };
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** A calendar date as `3 Oct 2026`. It has no time zone, so it is read as written. */
export function formatDate(value: IsoDate): string {
  return DATE_FORMAT.format(new Date(`${value}T00:00:00Z`));
}
