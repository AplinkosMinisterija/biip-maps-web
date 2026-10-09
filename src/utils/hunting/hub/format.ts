// Number formats of the hunting data hub (SPEC2 §3.6), Lithuanian locale only:
// '129 485', '20,6', '57 %', '+8,5 %' / '−16,0 %' (U+2212), never a decimal point.
import { formatInt, pluralLt, type PluralForms } from '@/utils/hunting/dates';
import { S } from './strings';

export { formatInt, pluralLt };

// Δ is not shown when either value is below this (§0.4, §5).
export const DELTA_MIN = 20;
const MINUS = '\u2212';
// No-break space before '%', as Intl writes it, so '57 %' never wraps.
const PCT = '\u00a0%';

const decFormats = new Map<string, Intl.NumberFormat>();
function decFormat(min: number, max: number) {
  const key = `${min}:${max}`;
  let format = decFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat('lt-LT', {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    });
    decFormats.set(key, format);
  }
  return format;
}

/** Decimal with a comma: formatDec(20.56) → '20,6'; `fixed` keeps trailing zeros ('16,0'). */
export const formatDec = (n: number, digits = 1, fixed = false) =>
  decFormat(fixed ? digits : 0, digits).format(n);

/** A count that may be suppressed (null = 0, 1 or 2, shown as '<3'). */
export const formatCount = (n: number | null | undefined) =>
  n === null || n === undefined ? S.suppressed : formatInt(n);

/** `n` followed by its plural form: '129 485 gyvūnai'. */
export const formatPlural = (n: number, forms: PluralForms) =>
  `${formatInt(n)} ${pluralLt(n, forms)}`;

/** Ratio in percent, or null when the denominator is 0. Wolves use 1 decimal ('89,6 %'). */
export function percent(part: number, whole: number, digits = 0): string | null {
  if (!whole) return null;
  return `${formatDec((part / whole) * 100, digits)}${PCT}`;
}

/** Tooltip naming numerator and denominator: '2 372 iš 4 177 (MPV naudotojams paskirstyto limito)'. */
export const percentTooltip = (part: number, whole: number, what?: string) =>
  `${formatInt(part)} iš ${formatInt(whole)}${what ? ` (${what})` : ''}`;

/** Density per `per` ha: density(5769, 173329) → 33.28… (per 1 000 ha). */
export const density = (n: number, ha: number, per = 1000) => (ha > 0 ? (n / ha) * per : null);

export interface Delta {
  pct: number; // rounded to one decimal
  text: string; // '+8,5 %', '−16,0 %', 'tiek pat'
  word: 'daugiau' | 'mažiau' | null; // null when 'tiek pat'
  tooltip: string;
}

/**
 * Change from `prev` to `cur` (§3.6). Null when either value is missing or below
 * DELTA_MIN; the UI then shows '—' with S.deltaSuppressed (`deltaSuppressed()`).
 */
export function delta(
  cur: number | null | undefined,
  prev: number | null | undefined,
): Delta | null {
  if (cur == null || prev == null || cur < DELTA_MIN || prev < DELTA_MIN) return null;
  const pct = Math.round(((cur - prev) / prev) * 1000) / 10;
  const tooltip = `${formatInt(prev)} → ${formatInt(cur)}`;
  if (Math.abs(pct) < 0.05) return { pct: 0, text: S.deltaSame, word: null, tooltip };
  const sign = pct > 0 ? '+' : MINUS;
  return {
    pct,
    text: `${sign}${formatDec(Math.abs(pct), 1, true)}${PCT}`,
    word: pct > 0 ? 'daugiau' : 'mažiau',
    tooltip: `${tooltip} (${sign}${formatDec(Math.abs(pct), 1, true)}${PCT})`,
  };
}

/** Text for a suppressed Δ cell or tile. */
export const deltaSuppressed = () => ({ text: '—', tooltip: S.deltaSuppressed });

/**
 * Sentence tail for a change: '8,5 % daugiau nei 2024/2025 sezone', '16,0 % mažiau …',
 * 'tiek pat kaip 2024/2025 sezone'; null when the Δ is suppressed.
 */
export function deltaPhrase(d: Delta | null, prevLabel: string): string | null {
  if (!d) return null;
  if (!d.word) return `${S.deltaSame} kaip ${prevLabel} sezone`;
  return `${formatDec(Math.abs(d.pct), 1, true)}${PCT} ${d.word} nei ${prevLabel} sezone`;
}

/** Spoken form for aria-labels: '8,5 procento daugiau' (a decimal takes the genitive). */
export function deltaSpoken(d: Delta | null): string | null {
  if (!d) return null;
  if (!d.word) return S.deltaSame;
  return `${formatDec(Math.abs(d.pct), 1, true)} procento ${d.word}`;
}
