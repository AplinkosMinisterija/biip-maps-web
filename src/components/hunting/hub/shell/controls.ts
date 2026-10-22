// One control vocabulary for the public hunting data hub, in the look of the
// medziokle.biip.lt WordPress site around it (tokens in tailwind.config.js: brand, ink, line,
// band, page, coral; fonts font-hub and font-kpi). Every hub and wolves component takes its
// classes from here instead of keeping its own copy, so a state looks the same everywhere:
// "current/active" = the site's nav tint, "on" = the filled teal pill ("Prisijungti"),
// links = teal, focus = one teal outline in both layers (the WP bar uses the same outline).

// Focus: 2 px teal outline, 2 px off the control (hub.css uses the same for the WP bar).
export const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
// Inside a scrolling row (overflow clips an outside outline).
export const FOCUS_RING_INSET =
  'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand';

// §1 Filter chip: the dropdown trigger of every filter in the bar ("Vieta: Visa Lietuva").
// 40 px on desktop, 44 px on phones (CHIP_TOUCH). Idle / open / active (value ≠ default).
// The line box fits the font's ascent and descent (20 px for 14 px, 24 px for 16 px text):
// the value is truncated (overflow hidden), so a tighter box would cut g, j, p, y, ą, ę, į, ų.
export const CHIP = `inline-flex h-10 max-w-[22rem] items-center gap-1.5 whitespace-nowrap rounded-full border bg-white px-4 text-sm leading-5 text-ink transition-colors ${FOCUS_RING}`;
export const CHIP_TOUCH = 'h-11 text-base leading-6';
export const CHIP_IDLE = 'border-line-strong hover:bg-brand-50';
export const CHIP_OPEN = 'border-brand bg-brand-50';
export const CHIP_ACTIVE = 'border-brand bg-brand-100 text-brand';
// Chip text: the name is regular and muted, the value semibold.
export const CHIP_NAME = 'font-normal text-ink-muted';
export const CHIP_VALUE = 'truncate font-semibold';
// The 16 px chevron after the value (rotate-180 while open).
export const CHIP_CHEVRON = 'shrink-0 transition-transform motion-reduce:transition-none';

// §2 Popover and option list.
export const POPOVER =
  'absolute left-0 top-full z-50 mt-2 w-80 min-w-full max-h-[min(70vh,560px)] overflow-y-auto rounded-lg border border-line bg-white p-2 shadow-[0_8px_24px_rgba(18,25,38,0.12)]';
export const OPTION =
  'flex min-h-[40px] w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-[15px] text-ink hover:bg-brand-50';
export const OPTION_TOUCH = 'min-h-[48px] text-base';
export const OPTION_SELECTED = 'bg-brand-100 font-semibold text-brand';
export const OPTION_HIGHLIGHT = 'bg-brand-50';
export const GROUP_LABEL = 'px-3 pb-1 pt-3 text-[13px] font-semibold text-ink-muted';
export const HELP = 'text-[13px] leading-snug text-ink-muted';
// Native radios and checkboxes take the site accent.
export const CHECK = `h-4 w-4 shrink-0 accent-brand ${FOCUS_RING}`;

// §3 Segmented control: 2–3 mutually exclusive view options that stay visible
// (not for filters). Track + pills; "on" = the filled teal pill.
export const SEG =
  'inline-flex h-10 items-center gap-0.5 rounded-full border border-brand bg-white p-0.5';
export const SEG_TOUCH = 'h-11';
export const SEG_ITEM = `inline-flex h-full items-center justify-center rounded-full px-4 text-sm font-semibold text-brand hover:bg-brand-50 ${FOCUS_RING}`;
export const SEG_ITEM_ON = 'bg-brand text-white hover:bg-brand';

// §4 Pill tabs: every tab row below the WP topic tabs (table sub-tabs).
export const PILL_TAB = `inline-flex h-9 shrink-0 items-center rounded-full px-4 text-sm font-semibold text-ink hover:bg-brand-50 ${FOCUS_RING_INSET}`;
export const PILL_TAB_TOUCH = 'h-11';
export const PILL_TAB_ON = 'bg-brand-100 text-brand hover:bg-brand-100';

// §5 Buttons and links. At most one BTN_PRIMARY per surface.
export const BTN_PRIMARY = `inline-flex h-10 items-center justify-center gap-2 rounded-full bg-brand px-5 text-[15px] font-semibold text-white hover:bg-brand-hover disabled:bg-[#9aa4b1] ${FOCUS_RING}`;
export const BTN_SECONDARY = `inline-flex h-10 items-center justify-center gap-2 rounded-full border border-brand bg-white px-4 text-[15px] font-semibold text-brand hover:bg-brand-50 disabled:border-line disabled:text-ink-muted ${FOCUS_RING}`;
export const BTN_TOUCH = 'h-12';
// Text action ("Atstatyti filtrus", "Apie duomenis" in a panel).
export const BTN_TEXT = `inline-flex min-h-[32px] items-center gap-1 rounded px-1 text-[15px] font-semibold text-brand underline-offset-4 hover:underline ${FOCUS_RING}`;
export const BTN_TEXT_TOUCH = 'min-h-[44px]';
// Call to action with an arrow icon after the text (the site's "Pildyti anketą →").
export const CTA_LINK = `inline-flex min-h-[44px] items-center gap-2 rounded text-[15px] font-bold text-brand no-underline underline-offset-4 hover:underline md:min-h-[32px] ${FOCUS_RING}`;
// A link inside running text, a table cell or a provenance line.
export const INLINE_LINK = `font-semibold text-brand underline decoration-1 underline-offset-2 hover:decoration-2 ${FOCUS_RING}`;
export const ICON_BTN = `inline-flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-brand-50 ${FOCUS_RING}`;
export const ICON_BTN_TOUCH = 'h-11 w-11';
// Form field (select, input) inside a popover or sheet.
const FIELD_BASE =
  'block h-10 w-full rounded border border-line-strong bg-white px-3 text-base text-ink hover:border-brand focus-visible:border-brand';
export const FIELD = `${FIELD_BASE} ${FOCUS_RING}`;
// The search field of a combobox whose list sits right under it (popover, sheet): focus is
// the teal border thickened to 2 px, so the field and the list's active option are never
// framed twice (the active option is shown by its tint and a 3 px bar on the left).
export const FIELD_FOCUS_INSET = `${FIELD_BASE} focus-visible:outline-none focus-visible:shadow-[0_0_0_1px_#004650]`;
export const FIELD_TOUCH = 'h-12';

// §6 Surfaces. Cards in the page flow are bordered without a shadow (the site's form card);
// surfaces floating over the map get a soft shadow.
export const CARD = 'rounded-lg border border-line bg-white';
export const FLOAT_CARD =
  'rounded-lg border border-line bg-white shadow-[0_2px_8px_rgba(18,25,38,0.08)]';

// Badges: fully rounded (the site's calendar "today" pill).
export const BADGE =
  'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold';

// Headline numbers: the home page "Statistika" counters (Atkinson Hyperlegible, teal).
export const KPI_VALUE = 'font-kpi font-bold text-brand';
