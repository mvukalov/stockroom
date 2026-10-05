const EURO_FORMAT = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'EUR',
});

/** Money stored as integer cents, shown in euros: `123456` becomes `€1,234.56`. */
export function formatCents(cents: number): string {
  return EURO_FORMAT.format(cents / 100);
}
