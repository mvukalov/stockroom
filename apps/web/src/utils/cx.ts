/** Joins class names, skipping empty values. */
export function cx(
  ...classNames: Array<string | false | null | undefined>
): string {
  return classNames.filter(Boolean).join(' ');
}
