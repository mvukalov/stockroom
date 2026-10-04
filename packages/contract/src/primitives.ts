import { z } from 'zod';

/** Every entity id is a UUID string. Display numbers (order number, SKU) are separate fields. */
export const Id = z.uuid();
export type Id = z.infer<typeof Id>;

/** ISO 8601 date-time in UTC, e.g. `2026-10-03T12:00:00Z`. */
export const IsoDateTime = z.iso.datetime();
export type IsoDateTime = z.infer<typeof IsoDateTime>;

/** ISO 8601 calendar date, e.g. `2026-10-03`. */
export const IsoDate = z.iso.date();
export type IsoDate = z.infer<typeof IsoDate>;

/** Money as integer cents. */
export const Cents = z.int().nonnegative();
export type Cents = z.infer<typeof Cents>;

export const PositiveInt = z.int().positive();

export const NonNegativeInt = z.int().nonnegative();
