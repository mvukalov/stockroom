/** One CSV column: its header and how a row becomes the cell text. */
export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number;
};

/** Lets spreadsheet apps detect UTF-8 (e.g. Excel would misread "Ž" without it). */
const BOM = '﻿';
const LINE_END = '\r\n';

/**
 * A leading one of these makes spreadsheet apps evaluate the cell as a formula;
 * tab and carriage return can hide one that follows them (OWASP).
 */
const FORMULA_START = /^[=+\-@\t\r]/;

/** Quoted when it contains a quote, a comma or a line break (RFC 4180). */
const NEEDS_QUOTES = /[",\r\n]/;

function cell(value: string | number): string {
  let text = String(value);
  // CSV injection: a single quote makes the cell plain text.
  if (FORMULA_START.test(text)) text = `'${text}`;
  return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * RFC 4180 CSV with a header row, CRLF line endings and a UTF-8 byte order mark.
 * Cells that a spreadsheet would read as a formula are prefixed with `'`.
 */
export function toCsv<T>(
  rows: readonly T[],
  columns: readonly CsvColumn<T>[],
): string {
  const lines = [
    columns.map((column) => cell(column.header)),
    ...rows.map((row) => columns.map((column) => cell(column.value(row)))),
  ];
  return BOM + lines.map((line) => line.join(',')).join(LINE_END) + LINE_END;
}

/** Saves `text` as a file through a temporary link; nothing is sent anywhere. */
export function downloadCsv(filename: string, text: string): void {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'text/csv;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
