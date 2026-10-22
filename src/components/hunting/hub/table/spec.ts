// One table spec for every table of the hunting data hub (DataTable, StebTable and the wolves
// RecordsTable, SeasonMonthTable, MunicipalityTable), so a table reads the same in every topic:
// header 12/16 semibold muted on white with a #cdd5df rule, body 14/20 ink in 36 px rows with
// #e3e8ef rules and a row hover, totals as the first body row (semibold, page tint, 2 px rule),
// numbers right-aligned in tabular figures, the first-column name as the row's action.
// Tables use `border-separate border-spacing-0`, so the rules stay on sticky cells.
import { FOCUS_RING } from '../shell/controls';

export const TABLE = 'w-full border-separate border-spacing-0 text-left text-sm leading-5 text-ink';

// Header cells (sticky inside the table's own scroller).
export const TH =
  'sticky top-0 z-20 border-b border-line bg-white px-2 py-2 align-bottom text-xs font-semibold leading-4 text-ink-muted';
// Numeric columns stay compact: the first column takes the remaining width (DATAVIZ-21).
export const NUM = 'w-[1%] whitespace-nowrap pl-6 pr-2 text-right tabular-nums';
export const TEXT = 'px-2 text-left';
// The sticky first column; z above the body cells, under the header.
export const STICKY_FIRST = 'sticky left-0 z-10 text-left';

// Body rows and cells. Row hover and selection colour the sticky cells too (`group`).
export const TR = 'group';
export const TD = 'border-b border-line-soft px-2 py-2 align-top';
export const TD_BG = 'bg-white group-hover:bg-[#f1f5f6]';
export const TD_SELECTED = 'bg-brand-50 group-hover:bg-brand-50';
// Totals: the first body row (SPEC2 §10), sticky under the header where the table scrolls.
export const TOTALS_CELL = 'border-b-2 border-line bg-page px-2 py-2 font-semibold';
// The divider before rows without figures of their own (pooled, no MPV).
export const DIVIDER_CELL = 'h-0 border-b-2 border-line p-0';

// Sort button in a header: the arrow sits before the label of a numeric column, so the
// label's right edge meets the digits (DATAVIZ-14). Resting "↕", sorted "▲"/"▼" in teal.
export const SORT_BTN = `group/sort inline-flex min-h-[24px] max-md:min-h-[44px] items-end gap-1 rounded font-semibold hover:text-ink ${FOCUS_RING}`;
export const SORT_ICON = 'w-3 shrink-0 text-center';
export const SORT_ICON_IDLE = 'text-[#9aa4b2] group-hover/sort:text-ink-muted';
export const SORT_ICON_ON = 'text-brand';
export const SORT_LABEL_ON = 'text-ink';
export const sortIcon = (dir: 'asc' | 'desc' | null) => (dir ? (dir === 'asc' ? '▲' : '▼') : '↕');

// The first-column name as the row's action: teal, underline on hover/focus, and a map pin
// after the name on hover/focus (the pin: `ROW_ACTION_PIN`). A 24 px target in a 36 px row.
export const ROW_ACTION = `group/row -my-0.5 inline-flex min-h-[24px] max-md:min-h-[44px] items-center gap-1 rounded text-left font-medium text-brand no-underline underline-offset-2 hover:underline focus-visible:underline ${FOCUS_RING}`;
export const ROW_ACTION_PIN =
  'shrink-0 text-ink-muted opacity-0 group-hover/row:opacity-100 group-focus-visible/row:opacity-100';
// Record tables: one 40 px icon button at the row end.
export const ROW_ICON_BTN = `inline-flex h-10 w-10 items-center justify-center rounded-full text-brand hover:bg-brand-50 ${FOCUS_RING}`;

export const FOOTNOTES = 'flex flex-col gap-1 text-[13px] leading-[18px] text-ink-muted';
// Pager buttons of the record tables.
export const PAGER_BTN = `inline-flex min-h-[44px] md:min-h-[32px] items-center rounded-full border border-line-strong bg-white px-3 text-sm font-semibold text-ink hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;
