import { z } from 'zod';

import { Id, NonNegativeInt } from './primitives';

export const ApiErrorCode = z.enum([
  'VALIDATION_FAILED',
  'FORBIDDEN',
  'NOT_FOUND',
  'INSUFFICIENT_STOCK',
  'INVALID_TRANSITION',
  'CONFLICT',
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCode>;

/** Lets the UI say "Could not save: only 14 on hand now". */
export const InsufficientStockDetails = z.object({
  productId: Id,
  locationId: Id,
  /** The largest quantity that would be accepted now. */
  available: NonNegativeInt,
});
export type InsufficientStockDetails = z.infer<typeof InsufficientStockDetails>;

const message = z.string().min(1);

/** Error body of every failed request: `{ code, message, details? }`. */
export const ApiError = z.discriminatedUnion('code', [
  z.object({
    code: z.literal('VALIDATION_FAILED'),
    message,
    /** Field path to messages. */
    details: z.record(z.string(), z.array(z.string())).optional(),
  }),
  z.object({
    code: z.literal('INSUFFICIENT_STOCK'),
    message,
    details: InsufficientStockDetails,
  }),
  z.object({ code: z.literal('FORBIDDEN'), message }),
  z.object({ code: z.literal('NOT_FOUND'), message }),
  z.object({ code: z.literal('INVALID_TRANSITION'), message }),
  /** Also returned when a movement id is reused with a different payload. */
  z.object({ code: z.literal('CONFLICT'), message }),
]);
export type ApiError = z.infer<typeof ApiError>;
