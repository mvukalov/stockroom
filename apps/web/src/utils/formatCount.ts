const COUNT_FORMAT = new Intl.NumberFormat('en-GB');

/** A whole count with thousands separators: `48213` becomes `48,213`. */
export function formatCount(value: number): string {
  return COUNT_FORMAT.format(value);
}
