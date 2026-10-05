// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { downloadCsv, toCsv, type CsvColumn } from './csv';

type Row = { name: string; qty: number };

const COLUMNS: readonly CsvColumn<Row>[] = [
  { header: 'Name', value: (r) => r.name },
  { header: 'Qty', value: (r) => r.qty },
];

const BOM = '﻿';

/** The CSV without its byte order mark, split into lines. */
const lines = (csv: string) => csv.slice(BOM.length).split('\r\n');

describe('toCsv', () => {
  it('starts with a UTF-8 BOM and ends every line with CRLF', () => {
    const csv = toCsv([{ name: 'Tape', qty: 3 }], COLUMNS);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv).toBe(`${BOM}Name,Qty\r\nTape,3\r\n`);
    expect(csv.replaceAll('\r\n', '')).not.toMatch(/[\r\n]/);
  });

  it('writes only the header row when there are no rows', () => {
    expect(toCsv([], COLUMNS)).toBe(`${BOM}Name,Qty\r\n`);
  });

  it('quotes a cell with a comma', () => {
    expect(lines(toCsv([{ name: 'Gloves, medium', qty: 1 }], COLUMNS))[1]).toBe(
      '"Gloves, medium",1',
    );
  });

  it('doubles quotes inside a quoted cell', () => {
    expect(lines(toCsv([{ name: 'Box 12" wide', qty: 1 }], COLUMNS))[1]).toBe(
      '"Box 12"" wide",1',
    );
  });

  it('quotes a cell with a line break and keeps the break inside it', () => {
    const csv = toCsv([{ name: 'Line one\nline two', qty: 1 }], COLUMNS);
    expect(csv).toBe(`${BOM}Name,Qty\r\n"Line one\nline two",1\r\n`);
    const crlf = toCsv([{ name: 'a\r\nb', qty: 1 }], COLUMNS);
    expect(crlf).toBe(`${BOM}Name,Qty\r\n"a\r\nb",1\r\n`);
  });

  it.each(['=', '+', '-', '@'])(
    'makes a cell starting with %s plain text',
    (start) => {
      const name = `${start}SUM(A1:A9)`;
      expect(lines(toCsv([{ name, qty: 1 }], COLUMNS))[1]).toBe(`'${name},1`);
    },
  );

  it('makes a cell starting with a tab plain text', () => {
    expect(lines(toCsv([{ name: '\t=1+1', qty: 1 }], COLUMNS))[1]).toBe(
      "'\t=1+1,1",
    );
  });

  it('makes a cell starting with a carriage return plain text, quoted for the line break', () => {
    const csv = toCsv([{ name: '\r=1+1', qty: 1 }], COLUMNS);
    expect(csv).toBe(`${BOM}Name,Qty\r\n"'\r=1+1",1\r\n`);
  });

  it('guards a title with a leading = and quotes it when it also has a comma', () => {
    const name = '=HYPERLINK("http://x.test","Click")';
    expect(lines(toCsv([{ name, qty: 1 }], COLUMNS))[1]).toBe(
      `"'=HYPERLINK(""http://x.test"",""Click"")",1`,
    );
  });

  it('leaves = elsewhere in a cell alone', () => {
    expect(lines(toCsv([{ name: 'A=B', qty: 1 }], COLUMNS))[1]).toBe('A=B,1');
  });

  it('keeps non-ASCII text as it is', () => {
    const name = 'Žica, čelična — 2 mm ✓';
    expect(lines(toCsv([{ name, qty: 1 }], COLUMNS))[1]).toBe(`"${name}",1`);
  });

  it('applies quoting to headers too', () => {
    const csv = toCsv([], [{ header: 'Price, EUR', value: () => 1 }]);
    expect(csv).toBe(`${BOM}"Price, EUR"\r\n`);
  });
});

describe('downloadCsv', () => {
  // jsdom has no object URLs; the test puts mocks in place and restores what was there.
  const original = {
    create: URL.createObjectURL,
    revoke: URL.revokeObjectURL,
  };
  afterEach(() => {
    URL.createObjectURL = original.create;
    URL.revokeObjectURL = original.revoke;
    vi.restoreAllMocks();
  });

  it('clicks a temporary link to a CSV blob, then cleans up', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:csv');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const clicks: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicks.push(this);
    });

    downloadCsv('products-2026-10-05.csv', 'a,b\r\n');

    const blob = createObjectURL.mock.calls[0]?.[0];
    expect(blob?.type).toBe('text/csv;charset=utf-8');
    expect(await blob?.text()).toBe('a,b\r\n');
    expect(clicks).toHaveLength(1);
    expect(clicks[0]?.download).toBe('products-2026-10-05.csv');
    expect(clicks[0]?.href).toBe('blob:csv');
    expect(clicks[0]?.isConnected).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:csv');
  });
});
