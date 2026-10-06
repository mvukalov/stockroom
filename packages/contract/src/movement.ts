import { z } from 'zod';

import { LocationCode } from './catalog';
import { Id, IsoDateTime, PositiveInt } from './primitives';

export const MovementType = z.enum([
  'RECEIPT',
  'ISSUE',
  'TRANSFER',
  'ADJUSTMENT',
]);
export type MovementType = z.infer<typeof MovementType>;

export const AdjustmentDirection = z.enum(['INCREASE', 'DECREASE']);
export type AdjustmentDirection = z.infer<typeof AdjustmentDirection>;

/** Longest reason a movement accepts, in characters (after trimming). */
export const REASON_MAX_LENGTH = 200;

const Reason = z.string().trim().min(1).max(REASON_MAX_LENGTH);

// `quantity` is always positive. The sign is derived from `type`
// (and `direction` for ADJUSTMENT); TRANSFER is shown unsigned.
const inputFields = {
  /** Client-generated, so a retry of the same movement is idempotent. */
  id: Id,
  productId: Id,
  quantity: PositiveInt,
};

/** Set by the server, never sent by the client. */
const serverFields = {
  createdBy: Id,
  createdAt: IsoDateTime,
};

const receiptFields = {
  ...inputFields,
  type: z.literal('RECEIPT'),
  locationId: Id,
  reason: Reason.nullable(),
};

const issueFields = {
  ...inputFields,
  type: z.literal('ISSUE'),
  locationId: Id,
  reason: Reason.nullable(),
};

const adjustmentFields = {
  ...inputFields,
  type: z.literal('ADJUSTMENT'),
  locationId: Id,
  direction: AdjustmentDirection,
  reason: Reason,
};

const transferFields = {
  ...inputFields,
  type: z.literal('TRANSFER'),
  /** Source location. */
  locationId: Id,
  destinationLocationId: Id,
  reason: Reason.nullable(),
};

// Zod 4 forbids `.omit()`/`.extend()` on refined objects, so the transfer rule is
// applied to the input and the stored shape separately.
const hasDistinctLocations = (m: {
  locationId: string;
  destinationLocationId: string;
}) => m.locationId !== m.destinationLocationId;
const distinctLocationsError = {
  message: 'Destination must differ from source',
  path: ['destinationLocationId'],
};

export const CreateMovementInput = z.discriminatedUnion('type', [
  z.object(receiptFields),
  z.object(issueFields),
  z.object(adjustmentFields),
  z.object(transferFields).refine(hasDistinctLocations, distinctLocationsError),
]);
export type CreateMovementInput = z.infer<typeof CreateMovementInput>;

export const StockMovement = z.discriminatedUnion('type', [
  z.object({ ...receiptFields, ...serverFields }),
  z.object({ ...issueFields, ...serverFields }),
  z.object({ ...adjustmentFields, ...serverFields }),
  z
    .object({ ...transferFields, ...serverFields })
    .refine(hasDistinctLocations, distinctLocationsError),
]);
export type StockMovement = z.infer<typeof StockMovement>;

/**
 * A movement as listed by `GET /api/movements`, with the display fields the table needs.
 * User names come from `GET /api/users`.
 */
export const MovementListItem = StockMovement.and(
  z.object({
    productSku: z.string().min(1),
    productTitle: z.string().min(1),
    locationCode: LocationCode,
    /** Set for TRANSFER only. */
    destinationLocationCode: LocationCode.nullable(),
  }),
);
export type MovementListItem = z.infer<typeof MovementListItem>;
