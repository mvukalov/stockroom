/** Shown when the reverse movement could not be sent at all. Undo is not offered again. */
export const UNDO_FAILED_OFFLINE =
  "Couldn't undo: check your connection. To correct the movement, add an ADJUSTMENT.";

/** Shown when the server refuses the reverse movement, e.g. the stock has been used since. */
export function undoRefusedText(reason: string): string {
  return `Couldn't undo: ${reason}`;
}
