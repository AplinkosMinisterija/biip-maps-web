// Shared helpers of the hub tables (DataTable, CardList, CsvButton): sorting, cell text and
// the row order the CSV export follows. Pure module, no Vue imports.
import { S } from '@/utils/hunting/hub/strings';
import type { ColumnDef, TableDef } from '@/utils/hunting/hub/types';

export type SortDir = 'asc' | 'desc';
export interface SortState {
  col: string;
  dir: SortDir;
}

const intFormat = new Intl.NumberFormat('lt-LT');
const decimalFormat = new Intl.NumberFormat('lt-LT', { maximumFractionDigits: 1 });

/** Display text of a cell: the column's `display`, else the value in Lithuanian format. */
export function cellText<R>(col: ColumnDef<R>, row: R): string {
  if (col.display) return col.display(row);
  const value = col.value(row);
  if (value === null || value === undefined || value === '') return '–';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? intFormat.format(value) : decimalFormat.format(value);
  }
  return value;
}

/** True when the cell shows a suppressed small count ("<3"). */
export const isSuppressed = (text: string) => text === S.suppressed;

/** Tooltip of a suppressed cell: reporters (distinct people) or reports. */
export function suppressedTooltip<R>(col: ColumnDef<R>) {
  return /reporter|pranesej|pranešėj/i.test(`${col.id} ${col.label}`)
    ? S.suppressedReporters
    : S.suppressedReports;
}

/**
 * Rows sorted by one column; `null` keeps the topic's own order. Empty values (null, '')
 * always go last, whatever the direction, so "–" rows stay at the bottom. Stable.
 */
export function sortRows<R>(table: TableDef<R>, sort: SortState | null): R[] {
  const rows = [...table.rows];
  if (!sort) return rows;
  const col = table.columns.find((c) => c.id === sort.col);
  if (!col) return rows;
  const dir = sort.dir === 'asc' ? 1 : -1;
  const decorated = rows.map((row, i) => ({ row, i, v: col.value(row) }));
  decorated.sort((a, b) => {
    const ea = a.v === null || a.v === undefined || a.v === '';
    const eb = b.v === null || b.v === undefined || b.v === '';
    if (ea || eb) return ea === eb ? a.i - b.i : ea ? 1 : -1;
    let cmp: number;
    if (typeof a.v === 'number' && typeof b.v === 'number') cmp = a.v - b.v;
    else cmp = String(a.v).localeCompare(String(b.v), 'lt', { numeric: true });
    return dir * cmp || a.i - b.i;
  });
  return decorated.map((d) => d.row);
}

/** Next sort state after a header click: numbers start descending, text ascending. */
export function nextSort<R>(current: SortState | null, col: ColumnDef<R>): SortState {
  if (current?.col === col.id) return { col: col.id, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { col: col.id, dir: col.numeric ? 'desc' : 'asc' };
}

export const ariaSort = (sort: SortState | null, colId: string) =>
  sort?.col === colId ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
