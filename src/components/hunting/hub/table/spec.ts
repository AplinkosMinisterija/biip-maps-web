// One table spec for every table of the hunting data hub (DataTable, StebTable and the wolves
// RecordsTable, SeasonMonthTable, MunicipalityTable), so a table reads the same in every topic:
// header 12/16 semibold muted on white with a #cdd5df rule, body 14/20 ink in 36 px rows with
// #e3e8ef rules and a row hover, totals as the first body row (semibold, page tint, 2 px rule),
// numbers right-aligned in tabular figures, the first-column name as the row's action.
// Tables use `border-separate border-spacing-0`, so the rules stay on sticky cells.
import { FOCUS_RING } from '../shell/controls';

export const TABLE =
  'w-full max-w-[960px] border-separate border-spacing-0 text-left text-sm leading-5 text-ink';

// Header cells (sticky inside the table's own scroller).
export const TH =
  'sticky top-0 z-20 border-b border-line bg-white px-2 py-2 align-bottom text-xs font-semibold leading-4 text-ink-muted';
// Numeric columns stay compact: the first column takes the remaining width (DATAVIZ-21).
export const NUM = 'w-[1%] whitespace-nowrap pl-3 pr-2 text-right tabular-nums';
// A numeric column's header wraps (REGRESS-01, VISUAL-03): long labels ("Paskirstyta MPV
// naudotojams") take two or three lines instead of pushing the last columns out of the pane.
// The body cells stay on one line. `numThStyle` gives the header room for about half its
// label per line, so short labels stay on one line and long ones break near the middle.
export const NUM_TH = 'w-[1%] whitespace-normal pl-3 pr-2 text-right tabular-nums';
export const numThStyle = (label: string) => {
  // ≈ 0.42 rem per character at 12 px semibold, plus the padding and the sort arrow; at
  // least the longest word.
  const longest = Math.max(...label.split(' ').map((w) => w.length));
  const chars = Math.max(longest, Math.ceil(label.length / 2));
  const rem = Math.min(8.5, Math.max(4.5, chars * 0.42 + 2.25));
  return { minWidth: `${rem.toFixed(2)}rem` };
};
export const TEXT = 'px-2 text-left';
// The sticky first column; z above the body cells, under the header.
export const STICKY_FIRST = 'sticky left-0 z-10 text-left';

// Body rows and cells. Row hover and selection colour the sticky cells too (`group`).
export const TR = 'group';
export const TD = 'border-b border-line-soft px-2 py-2 align-top';
export const TD_BG = 'bg-white group-hover:bg-[#f1f5f6]';
// The selected row (a municipality): teal tint, semibold, and a 3 px teal bar at the start of
// its first cell (JOURNEYS-07), so it does not read as the hover tint.
export const TD_SELECTED = 'bg-brand-50 font-semibold group-hover:bg-brand-50';
export const TD_SELECTED_FIRST = 'shadow-[inset_3px_0_0_#004650] !pl-2';
// Totals: the first body row (SPEC2 §10), sticky under the header where the table scrolls.
export const TOTALS_CELL = 'border-b-2 border-line bg-page px-2 py-2 font-semibold';
// The divider before rows without figures of their own (pooled, no MPV).
export const DIVIDER_CELL = 'h-0 border-b-2 border-line p-0';

// Sort button in a header: the arrow sits before the label of a numeric column, so the
// label's right edge meets the digits (DATAVIZ-14), and after the label of a text column
// (VISUAL-13): in a flex button put the icon first in the DOM and add `sortIconOrder()`;
// DataTable flows it inline with a wrapping label. Resting "↕", sorted "▲"/"▼" in teal.
export const SORT_BTN = `group/sort inline-flex min-h-[24px] max-md:min-h-[44px] items-end gap-1 whitespace-normal rounded font-semibold hover:text-ink ${FOCUS_RING}`;
export const SORT_ICON = 'inline-block w-3 shrink-0 text-center';
export const sortIconOrder = (numeric = false) => (numeric ? 'order-first' : 'order-last');
export const SORT_ICON_IDLE = 'text-[#9aa4b2] group-hover/sort:text-ink-muted';
export const SORT_ICON_ON = 'text-brand';
export const SORT_LABEL_ON = 'text-ink';
export const sortIcon = (dir: 'asc' | 'desc' | null) => (dir ? (dir === 'asc' ? '▲' : '▼') : '↕');

// The first-column name as the row's action: teal, underline on hover/focus, and a map pin
// after the name on hover/focus (the pin: `ROW_ACTION_PIN`). A 24 px target in a 36 px row.
export const ROW_ACTION = `group/row -my-0.5 inline-flex min-h-[24px] max-md:min-h-[44px] items-center gap-1 rounded text-left font-medium text-brand no-underline underline-offset-2 hover:underline focus-visible:underline ${FOCUS_RING}`;
export const ROW_ACTION_PIN =
  'shrink-0 text-ink-muted opacity-0 group-hover/row:opacity-100 group-focus-visible/row:opacity-100';
// Record tables: one 32 px icon button at the row end, on the text's line (VISUAL-14): its
// cell is `TD` like the others (align-top, py-2) and the button's -my-1.5 keeps the row at
// 37 px. Phones use cards.
export const ROW_ICON_BTN = `-my-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-brand hover:bg-brand-50 ${FOCUS_RING}`;

// Phone record card (VISUAL-17), one anatomy for the wolves and Stebėjimai records: the whole
// card is the record's one action; title "date · what" in teal with a chevron, one ink line,
// one muted meta line. Aggregate tables keep the label/value grid of CardList, with the same
// box and title.
export const RECORD_CARD = `block w-full min-h-[44px] rounded-lg border border-line bg-white p-3 text-left no-underline hover:bg-brand-50 ${FOCUS_RING}`;
export const RECORD_CARD_STATIC = 'block rounded-lg border border-line bg-white p-3';
export const RECORD_CARD_TITLE =
  'flex flex-wrap items-center gap-x-2 text-[15px] font-semibold leading-5 text-brand tabular-nums';
export const RECORD_CARD_LINE = 'mt-1 block text-sm leading-5 text-ink';
export const RECORD_CARD_META = 'block text-[13px] leading-[18px] text-ink-muted';

export const FOOTNOTES = 'flex flex-col gap-1 text-[13px] leading-[18px] text-ink-muted';
// Pager buttons of the record tables.
export const PAGER_BTN = `inline-flex min-h-[44px] md:min-h-[32px] items-center rounded-full border border-line-strong bg-white px-3 text-sm font-semibold text-ink hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;
