// CSV export of a hub table (SPEC2 §5, §13 T2): UTF-8 with BOM, ';' separator, CRLF,
// first line the provenance, then the column headers, the totals row, the rows and the
// footnotes as '#' lines. Cells go through `csvField` (formula neutralisation, quoting).
import { CSV_BOM, CSV_EOL, CSV_MIME, CSV_SEPARATOR, csvField, csvSafe } from '@/utils/hunting/csv';
import { S } from './strings';
import { FOOTNOTE_PCT_DIGITS } from './topics/common';
import type { ColumnDef, Provenance, TableDef } from './types';

// "Not applicable" glyphs of the tables: an empty cell in the CSV (J-24).
const NOT_APPLICABLE = /^[–—-]$/;

export { CSV_MIME };

/**
 * Raw cell value: numbers stay numbers (decimal comma), a null value uses `display` ('<3'),
 * and a dash ("nėra / netaikoma") is an empty cell, so numeric columns stay numeric.
 */
export function csvCell<R>(column: ColumnDef<R>, row: R): string {
  const value = column.value(row);
  if (value === null || value === undefined) {
    const text = column.display ? column.display(row) : '';
    return NOT_APPLICABLE.test(text.trim()) ? '' : text;
  }
  if (typeof value === 'number') {
    // at most 2 decimals, so float noise never reaches the spreadsheet
    const rounded = Number.isInteger(value) ? value : Math.round(value * 100) / 100;
    return String(rounded).replace('.', ',');
  }
  return value;
}

/** First line: the provenance (§5). */
export function csvProvenanceLine(provenance: Provenance) {
  if (provenance.kind === 'snapshot') return S.provenanceCsv(provenance.asOf);
  return `# ${provenance.text.replace(/ · /g, '; ')}`;
}

export interface TableCsvOptions<R = any> {
  provenance: Provenance;
  // Second '#' line describing the selection, e.g. 'Laimikiai; 2025/2026; Kėdainių r. sav.'.
  title?: string;
  // Rows in the order the table shows them (default: the topic's order).
  rows?: R[];
}

export function buildTableCsv<R>(table: TableDef<R>, options: TableCsvOptions<R>) {
  const columns = table.columns.filter((c) => c.csv !== false);
  const comment = (text: string) => `# ${csvSafe(text.replace(/[\r\n]+/g, ' '))}`;
  const lines = [csvProvenanceLine(options.provenance)];
  if (options.title) lines.push(comment(options.title));
  // Percent columns name their unit (J-24).
  const head = (c: ColumnDef<R>) =>
    c.unit === '%' && c.label.indexOf('%') < 0 ? `${c.label}, %` : c.label;
  lines.push(columns.map((c) => csvField(head(c))).join(CSV_SEPARATOR));
  const row = (r: R) => columns.map((c) => csvField(csvCell(c, r))).join(CSV_SEPARATOR);
  if (table.totals) {
    const totals = table.totals;
    const cells = columns.map((c, i) => {
      const text = csvCell(c, totals);
      return i === 0 && (!text || text === '–') ? S.totalsRow : text;
    });
    lines.push(cells.map(csvField).join(CSV_SEPARATOR));
  }
  (options.rows || table.rows).forEach((r) => lines.push(row(r)));
  table.footnotes.forEach((note) => lines.push(comment(note)));
  if (columns.some((c) => c.unit === '%')) lines.push(comment(FOOTNOTE_PCT_DIGITS));
  return CSV_BOM + lines.join(CSV_EOL) + CSV_EOL;
}

/** File name from `TableDef.csvName`, ASCII only, with the '.csv' extension. */
export function tableCsvFileName(table: Pick<TableDef, 'csvName'>) {
  const base = table.csvName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.csv$/i, '')
    .replace(/[^A-Za-z0-9_.-]+/g, '_');
  return `${base || 'duomenys'}.csv`;
}

/** Save a CSV in the browser. */
export function downloadCsv(csv: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: CSV_MIME }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
