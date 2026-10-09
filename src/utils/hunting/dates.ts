// Calendar-day helpers for the wolves page.
// All interval logic works on local (Europe/Vilnius) calendar days as 'yyyy-MM-dd'
// strings, compared lexicographically. Day arithmetic goes through Date.UTC only,
// so the browser's own time zone never matters (SPEC §4.2).
import type { Interval, PresetId, WolfSource } from './types';

export const TIME_ZONE = 'Europe/Vilnius';
// Earliest day a record may have; older dates are data-entry errors (SPEC §4.3).
export const MIN_DAY = '2017-04-01';
// Wolf hunting window inside a hunting year: Oct 15 – Mar 31 (SPEC §4.4).
export const WOLF_WINDOW_START = '10-15';
export const WOLF_WINDOW_END = '03-31';

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// `hourCycle` is missing from the es2018 Intl typings this repo compiles against.
const dateTimeOptions: Intl.DateTimeFormatOptions & { hourCycle?: string } = {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
};
const dateTimeFormat = new Intl.DateTimeFormat('en-CA', dateTimeOptions);

// Local calendar day of an instant: 'yyyy-MM-dd'.
export const vilniusDay = (iso: string) => dayFormat.format(new Date(iso));

// BIOMON stores a date as 00:00Z, so its UTC date part is the date.
// BIIP stores the real kill time, so its day is the Vilnius date.
export const recordDay = (source: WolfSource, iso: string) =>
  source === 'biomon' ? iso.slice(0, 10) : vilniusDay(iso);

export const todayVilnius = () => vilniusDay(new Date().toISOString());

export function toDay(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

export function dayParts(day: string) {
  return {
    year: Number(day.slice(0, 4)),
    month: Number(day.slice(5, 7)),
    day: Number(day.slice(8, 10)),
  };
}

// A string that is a real calendar date in 'yyyy-MM-dd' form.
export function isValidDay(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = DAY_RE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match;
  return toDay(Number(y), Number(m), Number(d)) === value;
}

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addDays(day: string, n: number) {
  const { year, month, day: d } = dayParts(day);
  return toDay(year, month, d + n);
}

// Number of days from `a` to `b` (b - a).
export function dayDiff(a: string, b: string) {
  const pa = dayParts(a);
  const pb = dayParts(b);
  return (
    (Date.UTC(pb.year, pb.month - 1, pb.day) - Date.UTC(pa.year, pa.month - 1, pa.day)) / 86400000
  );
}

// Inclusive length of an interval in days.
export const intervalDays = (interval: Interval) => dayDiff(interval.from, interval.to) + 1;

export const sameInterval = (a: Interval, b: Interval) => a.from === b.from && a.to === b.to;

export const dayInInterval = (day: string, interval: Interval) =>
  interval.from <= day && day <= interval.to;

// ---------------------------------------------------------------------------
// Seasons (hunting years, Apr 1 – Mar 31)
// ---------------------------------------------------------------------------

// Hunting-year start year of a day (2026-03-31 → 2025, 2026-04-01 → 2026).
export function seasonOfDay(day: string) {
  const { year, month } = dayParts(day);
  return month >= 4 ? year : year - 1;
}

export const seasonInterval = (season: number): Interval => ({
  from: `${season}-04-01`,
  to: `${season + 1}-03-31`,
});

export const seasonLabel = (season: number) => `${season}/${season + 1}`;

export const wolfWindow = (season: number): Interval => ({
  from: `${season}-${WOLF_WINDOW_START}`,
  to: `${season + 1}-${WOLF_WINDOW_END}`,
});

// Days are always inside their own hunting year, which ends on the window's end
// day, so only the start of the window needs checking.
export const isInWolfWindow = (day: string, season = seasonOfDay(day)) =>
  dayInInterval(day, wolfWindow(season));

// Season start year if the interval is exactly one hunting year, else null.
export function intervalSeason(interval: Interval): number | null {
  const season = seasonOfDay(interval.from);
  return sameInterval(interval, seasonInterval(season)) ? season : null;
}

// Seasons offered as presets, newest first: from the season of `minYear-01-01`
// up to the current season.
export function seasonRange(minYear: number, currentSeason: number) {
  const first = seasonOfDay(`${minYear}-01-01`);
  const seasons: number[] = [];
  for (let s = currentSeason; s >= first; s--) seasons.push(s);
  return seasons;
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export const LAST_DAYS = 30;

export function presetInterval(preset: PresetId, today: string): Interval | null {
  if (preset === 'last30') return { from: addDays(today, -(LAST_DAYS - 1)), to: today };
  if (preset === 'all') return { from: MIN_DAY, to: today };
  if (preset.startsWith('season:')) {
    const season = Number(preset.slice('season:'.length));
    return Number.isInteger(season) ? seasonInterval(season) : null;
  }
  return null;
}

// The preset whose interval equals the given one, else 'custom'. When `seasons`
// is given, only those seasons count as season presets.
export function matchPreset(interval: Interval, today: string, seasons?: number[]): PresetId {
  const season = intervalSeason(interval);
  if (season !== null && (!seasons || seasons.indexOf(season) >= 0)) {
    return `season:${season}`;
  }
  if (sameInterval(interval, presetInterval('last30', today) as Interval)) return 'last30';
  if (sameInterval(interval, presetInterval('all', today) as Interval)) return 'all';
  return 'custom';
}

// ---------------------------------------------------------------------------
// Nuo/Iki parts → interval (SPEC §4.4, "Iki empty" rule)
// ---------------------------------------------------------------------------

export interface DateParts {
  year: number;
  month?: number | null; // 1..12
  day?: number | null; // 1..31
}

function unitStart(parts: DateParts) {
  if (!parts.month) return toDay(parts.year, 1, 1);
  if (!parts.day) return toDay(parts.year, parts.month, 1);
  return toDay(parts.year, parts.month, parts.day);
}

function unitEnd(parts: DateParts) {
  if (!parts.month) return toDay(parts.year, 12, 31);
  if (!parts.day) return toDay(parts.year, parts.month, daysInMonth(parts.year, parts.month));
  return toDay(parts.year, parts.month, parts.day);
}

function validParts(parts: DateParts | null | undefined): parts is DateParts {
  if (!parts || !Number.isInteger(parts.year)) return false;
  if (parts.month && (parts.month < 1 || parts.month > 12)) return false;
  if (
    parts.day &&
    (!parts.month || parts.day < 1 || parts.day > daysInMonth(parts.year, parts.month))
  )
    return false;
  return true;
}

// `iki` empty (null or no year) → the whole Nuo unit. Returns null when the parts
// are invalid or Iki ends before Nuo starts; the caller keeps the previous interval.
// `from` is clamped to MIN_DAY.
export function intervalFromParts(nuo: DateParts, iki?: DateParts | null): Interval | null {
  if (!validParts(nuo)) return null;
  const hasIki = !!iki && Number.isInteger(iki.year) && iki.year > 0;
  if (hasIki && !validParts(iki)) return null;
  let from = unitStart(nuo);
  const to = hasIki ? unitEnd(iki as DateParts) : unitEnd(nuo);
  if (to < from) return null;
  if (from < MIN_DAY) from = MIN_DAY;
  if (to < from) return null;
  return { from, to };
}

// ---------------------------------------------------------------------------
// Plurals and number / date formats (SPEC §4.9)
// ---------------------------------------------------------------------------

export type PluralForms = [string, string, string];

export function pluralLt(n: number, forms: PluralForms) {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return forms[0];
  if (a >= 2 && a <= 9 && !(b >= 12 && b <= 19)) return forms[1];
  return forms[2];
}

export const HUNTED_WOLVES: PluralForms = [
  'sumedžiotas vilkas',
  'sumedžioti vilkai',
  'sumedžiotų vilkų',
];
export const WOLVES: PluralForms = ['vilkas', 'vilkai', 'vilkų'];
export const WOLVES_ACC: PluralForms = ['vilką', 'vilkus', 'vilkų'];
export const RECORDS: PluralForms = ['įrašas', 'įrašai', 'įrašų'];

const intFormat = new Intl.NumberFormat('lt-LT');
export const formatInt = (n: number) => intFormat.format(n);

function dateTimeParts(d: Date) {
  const parts: Record<string, string> = {};
  dateTimeFormat.formatToParts(d).forEach((p) => (parts[p.type] = p.value));
  // Some engines print midnight as 24 even with h23.
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${hour}:${parts.minute}` };
}

// Europe/Vilnius 'yyyy-MM-dd HH:mm', 24 h.
export function formatDateTime(d: Date) {
  const { date, time } = dateTimeParts(d);
  return `${date} ${time}`;
}

// Europe/Vilnius 'HH:mm', 24 h.
export const formatTime = (d: Date) => dateTimeParts(d).time;

// Period text used in the filter sentence (SPEC §6.3): '2025/2026 sezonas',
// '2025-12-01 – 2026-01-31', '2025-11-15', 'paskutinės 30 d. (…)', 'visi sezonai'.
export function intervalLabel(interval: Interval, preset: PresetId = 'custom') {
  if (preset === 'all') return 'visi sezonai';
  if (preset === 'last30') return `paskutinės ${LAST_DAYS} d. (${interval.from} – ${interval.to})`;
  const season = intervalSeason(interval);
  if (season !== null) return `${seasonLabel(season)} sezonas`;
  if (interval.from === interval.to) return interval.from;
  return `${interval.from} – ${interval.to}`;
}
