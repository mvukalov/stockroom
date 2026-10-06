import type { ApiError } from '@stockroom/contract';
import { assertNever } from '@stockroom/domain';

import type { SubmitError } from './NewMovementForm';

/** No answer from the server (network, HTTP 500): the movement may be retried safely. */
export const MOVEMENT_SAVE_OFFLINE =
  "We couldn't save the movement. Check your connection and try again.";

/** Where a refusal by the server is shown, in the words of the form. */
export function submitErrorOf(error: ApiError): SubmitError {
  switch (error.code) {
    case 'INSUFFICIENT_STOCK':
      return {
        kind: 'field',
        field: 'quantity',
        message: `${error.message} Lower the quantity.`,
      };
    case 'CONFLICT':
      return {
        kind: 'banner',
        message:
          'This movement was already saved with other values. Close the form and check the list before adding it again.',
      };
    case 'FORBIDDEN':
    case 'VALIDATION_FAILED':
    case 'NOT_FOUND':
    case 'INVALID_TRANSITION':
      return { kind: 'banner', message: `Could not save: ${error.message}` };
    default:
      return assertNever(error);
  }
}
