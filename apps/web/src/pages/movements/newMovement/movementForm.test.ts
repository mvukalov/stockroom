import { describe, expect, it } from 'vitest';

import { REASON_MAX_LENGTH } from '@stockroom/contract';

import {
  movementFormResolver,
  newDraft,
  toNewMovement,
  type MovementFormValues,
  type ProductChoice,
} from './movementForm';

const ID = '0f1e2d3c-4b5a-4968-8776-655443322110';
const FROM = '7e2c1a9a-3d4e-4f5a-8b6c-7d8e9f0a1b23';
const TO = '9a4e3c1c-5f6a-4b7c-8d8e-9f0a1b2c3d45';

const product: ProductChoice = {
  id: '6d1b0f8f-2c3d-4e4f-9a5b-6c7d8e9f0a12',
  sku: 'PPE-GLV-M-100',
  title: 'Nitrile gloves, medium',
  onHand: 120,
  available: 100,
};

const filled = (values: Partial<MovementFormValues>): MovementFormValues => ({
  ...newDraft().values,
  product,
  locationId: FROM,
  quantity: '14',
  ...values,
});

async function resolve(values: MovementFormValues) {
  return movementFormResolver(ID)(values, undefined, {
    fields: {},
    shouldUseNativeValidation: false,
  });
}

async function messages(values: MovementFormValues) {
  const { errors } = await resolve(values);
  return Object.fromEntries(
    Object.entries(errors).map(([field, error]) => [field, error?.message]),
  );
}

describe('movementFormResolver', () => {
  it('turns a RECEIPT into the request body, an empty reason into null', async () => {
    const { values, errors } = await resolve(filled({ reason: '  ' }));
    expect(errors).toEqual({});
    expect(values).toEqual({
      id: ID,
      type: 'RECEIPT',
      productId: product.id,
      locationId: FROM,
      quantity: 14,
      reason: null,
    });
  });

  it('keeps only the fields of the chosen type', async () => {
    const { values } = await resolve(
      filled({
        type: 'TRANSFER',
        destinationLocationId: TO,
        direction: 'INCREASE',
        reason: 'Replenish pick face',
      }),
    );
    expect(values).toEqual({
      id: ID,
      type: 'TRANSFER',
      productId: product.id,
      locationId: FROM,
      destinationLocationId: TO,
      quantity: 14,
      reason: 'Replenish pick face',
    });
  });

  it('reports every missing field of an empty form in the words of the form', async () => {
    expect(await messages(newDraft().values)).toEqual({
      product: 'Choose a product',
      locationId: 'Choose a location',
      quantity: 'Enter a whole number above 0',
    });
  });

  it.each(['0', '-3', '1.5', 'abc', ''])(
    'refuses the quantity "%s"',
    async (quantity) => {
      expect((await messages(filled({ quantity }))).quantity).toBe(
        'Enter a whole number above 0',
      );
    },
  );

  it('requires a direction and a reason for an ADJUSTMENT', async () => {
    expect(await messages(filled({ type: 'ADJUSTMENT' }))).toEqual({
      direction: 'Choose increase or decrease',
      reason: 'Enter a reason for the adjustment',
    });
  });

  it('limits the reason to REASON_MAX_LENGTH characters', async () => {
    const reason = 'x'.repeat(REASON_MAX_LENGTH + 1);
    expect((await messages(filled({ reason }))).reason).toBe(
      `Keep the reason to ${REASON_MAX_LENGTH} characters or fewer`,
    );
  });

  it('asks for both ends of a TRANSFER, and for two different ones', async () => {
    expect(
      await messages(filled({ type: 'TRANSFER', locationId: '' })),
    ).toEqual({
      locationId: 'Choose the location to move from',
      destinationLocationId: 'Choose the location to move to',
    });
    expect(
      await messages(filled({ type: 'TRANSFER', destinationLocationId: FROM })),
    ).toEqual({
      destinationLocationId:
        'Choose a location other than the one to move from',
    });
  });
});

describe('newDraft', () => {
  it('starts a RECEIPT with nothing chosen and a new idempotency key each time', () => {
    const a = newDraft();
    const b = newDraft();
    expect(a.values.type).toBe('RECEIPT');
    expect(a.values.product).toBeNull();
    expect(a.id).not.toBe(b.id);
  });

  it('takes prefilled values (Create adjustment)', () => {
    expect(newDraft({ type: 'ADJUSTMENT', product }).values).toMatchObject({
      type: 'ADJUSTMENT',
      product,
    });
  });
});

describe('toNewMovement', () => {
  it('labels a TRANSFER with the codes of both locations', () => {
    const locations = [
      { id: FROM, warehouseId: ID, code: 'A-01-03' },
      { id: TO, warehouseId: ID, code: 'B-01-04' },
    ];
    const { labels } = toNewMovement(
      {
        id: ID,
        type: 'TRANSFER',
        productId: product.id,
        locationId: FROM,
        destinationLocationId: TO,
        quantity: 2,
        reason: null,
      },
      product,
      locations,
    );
    expect(labels).toEqual({
      productSku: product.sku,
      productTitle: product.title,
      locationCode: 'A-01-03',
      destinationLocationCode: 'B-01-04',
    });
  });
});
