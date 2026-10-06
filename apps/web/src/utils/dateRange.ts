import { IsoDate } from '@stockroom/contract';

/** The `from` and `to` filters of a list query (calendar dates, both optional). */
export type DateRange = {
  from?: IsoDate | undefined;
  to?: IsoDate | undefined;
};

/** `from` later than `to`: such a range matches nothing and is never requested. */
export function isDateRangeInvalid({ from, to }: DateRange): boolean {
  return from !== undefined && to !== undefined && from > to;
}

/**
 * A complete date from a date input, or `undefined` for an emptied field.
 *
 * Known limitation (accepted in the 004_01 plan): `from` and `to` are calendar dates
 * in the contract and the API compares them with the UTC day of `createdAt`, while
 * the lists show times in the browser's time zone. In Zagreb (UTC+2), a movement at
 * 00:30 local time on 3 Oct is 22:30 UTC on 2 Oct, so it is listed as "3 Oct 2026,
 * 00:30" but matches From = 2 Oct, not From = 3 Oct. Fixing it needs a time zone in
 * the contract query.
 */
export function parseDate(value: string): IsoDate | undefined {
  const parsed = IsoDate.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
