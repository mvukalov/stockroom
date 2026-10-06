import type { FieldErrors, Resolver } from 'react-hook-form';

import {
  CreateMovementInput,
  REASON_MAX_LENGTH,
  type AdjustmentDirection,
  type Id,
  type Location,
  type MovementType,
  type ProductListItem,
} from '@stockroom/contract';
import { assertNever } from '@stockroom/domain';

import type { NewMovement } from '../../../api/movementsCache';
import { formatCount } from '../../../utils/formatCount';

/** The chosen product, as the picker found it: enough to label the row and show stock. */
export type ProductChoice = Pick<
  ProductListItem,
  'id' | 'sku' | 'title' | 'onHand' | 'available'
>;

/**
 * The form as the user fills it in: text fields are strings, and nothing is chosen
 * yet is `''` or `null`. `MovementFormSchema` turns it into a `CreateMovementInput`.
 */
export type MovementFormValues = {
  type: MovementType;
  product: ProductChoice | null;
  /** The location, or the source of a TRANSFER. */
  locationId: string;
  destinationLocationId: string;
  direction: AdjustmentDirection | '';
  quantity: string;
  reason: string;
};

/** "120 on hand · 100 available, all locations": the product totals, not one location's. */
export function productStockText(product: ProductChoice): string {
  return `${formatCount(product.onHand)} on hand · ${formatCount(product.available)} available, all locations`;
}

/** Field names in the order they appear: the error summary lists them in this order. */
export const FORM_FIELDS = [
  'type',
  'product',
  'locationId',
  'destinationLocationId',
  'direction',
  'quantity',
  'reason',
] as const satisfies readonly (keyof MovementFormValues)[];
export type FormField = (typeof FORM_FIELDS)[number];

/**
 * An open or closed form that has not been saved yet. `id` is the movement's
 * idempotency key: generated with the draft and reused for every retry of it, so a
 * retry after a lost response cannot record the movement twice.
 */
export type MovementDraft = { id: Id; values: MovementFormValues };

/** A form with nothing filled in: a RECEIPT. */
export const EMPTY_VALUES: MovementFormValues = {
  type: 'RECEIPT',
  product: null,
  locationId: '',
  destinationLocationId: '',
  direction: '',
  quantity: '',
  reason: '',
};

/** A new draft with its own idempotency key; `values` prefill it (Create adjustment). */
export function newDraft(
  values: Partial<MovementFormValues> = {},
): MovementDraft {
  return { id: crypto.randomUUID(), values: { ...EMPTY_VALUES, ...values } };
}

/** The request body the form stands for, before the contract checks it. */
function toInput(values: MovementFormValues, id: Id): unknown {
  const quantity = values.quantity.trim();
  const reason = values.reason.trim();
  const base = {
    id,
    productId: values.product?.id,
    locationId: values.locationId,
    // An empty or non-numeric field fails the contract's whole-number check.
    quantity: quantity === '' ? Number.NaN : Number(quantity),
  };
  switch (values.type) {
    case 'RECEIPT':
    case 'ISSUE':
      return {
        ...base,
        type: values.type,
        reason: reason === '' ? null : reason,
      };
    case 'TRANSFER':
      return {
        ...base,
        type: 'TRANSFER',
        destinationLocationId: values.destinationLocationId,
        reason: reason === '' ? null : reason,
      };
    case 'ADJUSTMENT':
      return {
        ...base,
        type: 'ADJUSTMENT',
        direction: values.direction,
        reason,
      };
    default:
      return assertNever(values.type);
  }
}

/** The form field a contract issue belongs to. */
function fieldOf(path: readonly PropertyKey[]): FormField | undefined {
  const [first] = path;
  if (first === 'productId') return 'product';
  return FORM_FIELDS.find((field) => field === first);
}

/** What to tell the user for an issue the contract found, in the words of the form. */
function messageFor(
  field: FormField,
  issue: { code: string },
  values: MovementFormValues,
): string {
  switch (field) {
    case 'type':
      return 'Choose a movement type';
    case 'product':
      return 'Choose a product';
    case 'locationId':
      return values.type === 'TRANSFER'
        ? 'Choose the location to move from'
        : 'Choose a location';
    case 'destinationLocationId':
      return values.destinationLocationId === ''
        ? 'Choose the location to move to'
        : 'Choose a location other than the one to move from';
    case 'direction':
      return 'Choose increase or decrease';
    case 'quantity':
      return 'Enter a whole number above 0';
    case 'reason':
      return issue.code === 'too_big'
        ? `Keep the reason to ${REASON_MAX_LENGTH} characters or fewer`
        : 'Enter a reason for the adjustment';
    default:
      return assertNever(field);
  }
}

/**
 * The form's resolver for one draft: the values become the request body and go
 * through the contract's own `CreateMovementInput`, the schema the server checks, so
 * no rule is written twice. Only the messages are the form's own, one per field.
 */
export function movementFormResolver(
  id: Id,
): Resolver<MovementFormValues, unknown, CreateMovementInput> {
  return (values) => {
    const parsed = CreateMovementInput.safeParse(toInput(values, id));
    if (parsed.success) return { values: parsed.data, errors: {} };
    const errors: FieldErrors<MovementFormValues> = {};
    for (const issue of parsed.error.issues) {
      const field = fieldOf(issue.path);
      // The first problem of a field is the one to fix.
      if (field === undefined || errors[field] !== undefined) continue;
      errors[field] = {
        type: issue.code,
        message: messageFor(field, issue, values),
      };
    }
    return { values: {}, errors };
  };
}

/** The labels the list needs to show the movement before the server answers. */
export function toNewMovement(
  input: CreateMovementInput,
  product: ProductChoice,
  locations: readonly Location[],
): NewMovement {
  const codeOf = (locationId: Id) =>
    locations.find((l) => l.id === locationId)?.code ?? '';
  return {
    input,
    labels: {
      productSku: product.sku,
      productTitle: product.title,
      locationCode: codeOf(input.locationId),
      destinationLocationCode:
        input.type === 'TRANSFER' ? codeOf(input.destinationLocationId) : null,
    },
  };
}
