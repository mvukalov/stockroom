import { describe, expect, it } from 'vitest';

import { OrderStatus, type Role } from '@stockroom/contract';

import {
  cancelDenialReason,
  lineCount,
  NO_USER_REASON,
  reservationNotice,
} from './orderDetailText';

const as = (role: Role) => ({ role });

describe('cancelDenialReason', () => {
  it.each(['ADMIN', 'CLERK'] as const)(
    'lets %s cancel a draft, confirmed or picked order',
    (role) => {
      for (const status of ['DRAFT', 'CONFIRMED', 'PICKED'] as const) {
        expect(cancelDenialReason(as(role), status)).toBeUndefined();
      }
    },
  );

  it.each(OrderStatus.options)(
    'tells a VIEWER the role is read-only for a %s order',
    (status) => {
      expect(cancelDenialReason(as('VIEWER'), status)).toBe(
        'Your role is read-only',
      );
    },
  );

  it('names the status the state machine does not allow', () => {
    expect(cancelDenialReason(as('ADMIN'), 'SHIPPED')).toBe(
      'A shipped order cannot be cancelled',
    );
    expect(cancelDenialReason(as('CLERK'), 'CANCELLED')).toBe(
      'This order is already cancelled',
    );
  });

  it('asks for a user while none is known', () => {
    expect(cancelDenialReason(undefined, 'DRAFT')).toBe(NO_USER_REASON);
  });
});

describe('reservationNotice', () => {
  it.each(['CONFIRMED', 'PICKED'] as const)(
    'says a %s order holds its stock',
    (status) => {
      expect(reservationNotice(status)).toBe(
        'Stock for these items is reserved while the order is Confirmed or Picked.',
      );
    },
  );

  it.each(['DRAFT', 'SHIPPED', 'CANCELLED'] as const)(
    'says nothing for a %s order',
    (status) => {
      expect(reservationNotice(status)).toBeNull();
    },
  );
});

describe('lineCount', () => {
  it('counts lines in the singular and plural', () => {
    expect(lineCount(1)).toBe('1 line');
    expect(lineCount(1204)).toBe('1,204 lines');
  });
});
