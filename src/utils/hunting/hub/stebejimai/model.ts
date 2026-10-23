// Data model of the Stebėjimai topic of the hunting data hub (STEB-SPEC §2, §3, §4.6):
// citizen observations of wolves, lynx, bears and bison, read live from the environment's
// public proxy. Pure functions without Vue reactivity, so ?debug=1 can test them on
// synthetic rows (`selfcheck.ts`). Reporter contacts are never requested, read, shown or
// exported: only the whitelisted public fields (`STEB_FIELDS`) are requested and parsed.
import { medziokleApiHost } from '@/config';
import {
  addDays,
  formatDateTime,
  formatInt,
  isValidDay,
  pluralLt,
  seasonInterval,
  seasonLabel,
  seasonOfDay,
  type PluralForms,
} from '@/utils/hunting/dates';
import { CSV_BOM, CSV_EOL, CSV_SEPARATOR, csvField, csvSafe } from '@/utils/hunting/csv';
import type { Interval } from '@/utils/hunting/types';
import { P_ANIMAL, P_SPECIFIED } from '@/utils/hunting/hub/strings';
import { truncatedPart } from './strings';
import { mpvName } from '@/components/hunting/hub/table/text';

// ---------------------------------------------------------------------------
// Contract constants (§4.2; S2 keeps the contract copies, ?debug=1 checks they agree)
// ---------------------------------------------------------------------------

/** Public fields requested from `/observations`, in this order (§2). */
export const STEB_FIELDS: readonly string[] = Object.freeze([
  'id',
  'dateTime',
  'species',
  'count',
  'countMale',
  'countFemale',
  'countJunior',
  'fact',
  'factOther',
  'geom',
  'municipalities',
  'elderships',
  'huntingAreas',
]);

/** Never requested, never read, never shown or exported (§2). */
export const STEB_FORBIDDEN_FIELDS: readonly string[] = Object.freeze([
  'fullName',
  'phone',
  'email',
  'notes',
  'files',
  'bdarAgreement',
]);

/** Table ids (`lentele`); equal to S2's `STEBEJIMAI_TABLES`. */
export const STEB_TABLES: readonly string[] = Object.freeze(['irasai', 'rusys', 'savivaldybes']);
export type StebTableId = 'irasai' | 'rusys' | 'savivaldybes';
export const STEB_DEFAULT_TABLE: StebTableId = 'irasai';

/** URL keys the topic owns; equal to S2's `STEBEJIMAI_KEYS`. */
export const STEB_URL_KEYS: readonly string[] = Object.freeze([
  'nuo',
  'iki',
  'laikotarpis',
  'sezonas',
  'sav',
  'gyvunas',
  'faktas',
  'lentele',
]);

// Same sources as the embed PASS_KEYS regexes of `gyvunas` and `faktas` (§4.2).
export const STEB_GYVUNAS_RE = /^[a-z0-9-]{1,40}$/;
export const STEB_FAKTAS_RE = /^[a-z0-9-]{1,60}$/;

export const PAGE_SIZE = 500;
export const MAX_PAGES = 20;
/** Requests in flight at once while paging (§2). */
export const PARALLEL_PAGES = 4;
export const PAGE_TIMEOUT_MS = 15000;
/** The most rows ever shown: the newest MAX_PAGES × PAGE_SIZE (§3.9). */
export const MAX_ROWS = MAX_PAGES * PAGE_SIZE;

/** Slug of a missing species or fact (`gyvunas=nenurodyta`, `faktas=nenurodyta`). */
export const NOT_SET_SLUG = 'nenurodyta';
export const NOT_SET_LABEL = 'Nenurodyta';

/** Species shown first, in this order, when counts tie (§3.2). */
export const SPECIES_ORDER: readonly string[] = Object.freeze([
  'Vilkas',
  'Lūšis',
  'Rudasis lokys',
  'Stumbras',
]);

// Plural forms of the answer (§3.2).
export const P_REGISTERED: PluralForms = ['užregistruotas', 'užregistruoti', 'užregistruota'];
export const P_OBSERVATION: PluralForms = ['stebėjimas', 'stebėjimai', 'stebėjimų'];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One observation, parsed from the whitelisted fields only. */
export interface StebRecord {
  /** Unique within one load: `id:{id}`, or `row:{n}` for a row without a valid id. */
  key: string;
  /** Positive integer record id; null → no record link. */
  id: number | null;
  /** The instant as received (a parsable ISO string), else null. */
  dateTime: string | null;
  /** Europe/Vilnius day 'yyyy-MM-dd' and 24 h time 'HH:mm'; null without a valid date. */
  day: string | null;
  time: string | null;
  species: string | null;
  speciesSlug: string;
  count: number | null;
  countMale: number | null;
  countFemale: number | null;
  countJunior: number | null;
  fact: string | null;
  factSlug: string;
  factOther: string | null;
  /** LKS-94 (EPSG:3346) metres; null without a usable point. */
  x: number | null;
  y: number | null;
  municipality: string | null;
  eldership: string | null;
  huntingArea: string | null;
}

export type StebPeriod =
  | { kind: 'all' }
  | { kind: '30d' }
  | { kind: 'season'; season: number }
  | { kind: 'range'; from: string; to: string };

export interface StebFilters {
  period: StebPeriod;
  gyvunas: string | null;
  faktas: string | null;
  sav: number | null;
}

export type Query = Record<string, unknown>;

const queryString = (query: Query, key: string) => {
  const value = query[key];
  return typeof value === 'string' ? value : undefined;
};

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

/**
 * URL slug of a Lithuanian text (§3.3): NFD, combining marks removed, lowercase,
 * non-alphanumerics → '-', trimmed, at most `max` characters.
 */
export function slugLt(text: unknown, max = 40): string {
  if (typeof text !== 'string') return '';
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/^-+|-+$/g, '');
}

const ltCollator = new Intl.Collator('lt');
export const compareLt = (a: string, b: string) => ltCollator.compare(a, b);

// ---------------------------------------------------------------------------
// Geometry and time
// ---------------------------------------------------------------------------

// Plausible LKS-94 extent of Lithuania (§2).
const X_RANGE: [number, number] = [290000, 720000];
const Y_RANGE: [number, number] = [5940000, 6280000];
const SRID_LKS94 = 3346;

const inExtent = (x: number, y: number) =>
  Number.isFinite(x) &&
  Number.isFinite(y) &&
  x >= X_RANGE[0] &&
  x <= X_RANGE[1] &&
  y >= Y_RANGE[0] &&
  y <= Y_RANGE[1];

/**
 * `[x, y]` in EPSG:3346 from an EWKB hex Point (either byte order; SRID, Z and M flags
 * honoured; an SRID other than 3346 is rejected, none means 3346), or from a GeoJSON
 * Point object. Null for anything else or a point outside Lithuania.
 */
export function parseEwkbPoint(value: unknown): [number, number] | null {
  if (value && typeof value === 'object') {
    const geo = value as { type?: unknown; coordinates?: unknown };
    if (geo.type !== 'Point' || !Array.isArray(geo.coordinates)) return null;
    const [x, y] = geo.coordinates as unknown[];
    return typeof x === 'number' && typeof y === 'number' && inExtent(x, y) ? [x, y] : null;
  }
  if (typeof value !== 'string' || value.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(value)) {
    return null;
  }
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16);
  if (bytes.length < 5) return null;
  const view = new DataView(bytes.buffer);
  const order = bytes[0];
  if (order !== 0 && order !== 1) return null;
  const little = order === 1;
  const type = view.getUint32(1, little);
  if ((type & 0x0fffffff) !== 1) return null;
  const hasSrid = (type & 0x20000000) !== 0;
  const hasZ = (type & 0x80000000) !== 0;
  const hasM = (type & 0x40000000) !== 0;
  let offset = 5;
  if (hasSrid) {
    if (bytes.length < offset + 4) return null;
    if (view.getUint32(offset, little) !== SRID_LKS94) return null;
    offset += 4;
  }
  const needed = offset + 16 + (hasZ ? 8 : 0) + (hasM ? 8 : 0);
  if (bytes.length < needed) return null;
  const x = view.getFloat64(offset, little);
  const y = view.getFloat64(offset + 8, little);
  return inExtent(x, y) ? [x, y] : null;
}

// `hourCycle` is missing from the es2018 Intl typings this repo compiles against.
const vilniusOptions: Intl.DateTimeFormatOptions & { hourCycle?: string } = {
  timeZone: 'Europe/Vilnius',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
};
const vilniusFormat = new Intl.DateTimeFormat('en-CA', vilniusOptions);

/** Europe/Vilnius day 'yyyy-MM-dd' and 24 h time 'HH:mm' of an ISO instant, or null. */
export function vilniusParts(iso: unknown): { day: string; time: string } | null {
  if (typeof iso !== 'string' || !iso) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  const parts: Record<string, string> = {};
  vilniusFormat.formatToParts(date).forEach((p) => (parts[p.type] = p.value));
  // Some engines print midnight as 24 even with h23.
  const hour = parts.hour === '24' ? '00' : parts.hour;
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  if (!isValidDay(day) || !/^\d{2}$/.test(hour || '') || !/^\d{2}$/.test(parts.minute || '')) {
    return null;
  }
  return { day, time: `${hour}:${parts.minute}` };
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

const RECORD_ID_RE = /^[1-9]\d{0,9}$/;

/** A positive integer record id (as a number or a digit string), else null. */
export function validRecordId(id: unknown): number | null {
  if (typeof id !== 'number' && typeof id !== 'string') return null;
  const text = String(id);
  return RECORD_ID_RE.test(text) ? Number(text) : null;
}

const text = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const count = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isInteger(value) && value >= 0 ? value : null;
  if (typeof value === 'string' && /^\d{1,9}$/.test(value)) return Number(value);
  return null;
};

const slugOrNotSet = (value: string | null, max: number) => {
  const slug = value ? slugLt(value, max) : '';
  return slug || NOT_SET_SLUG;
};

/**
 * A record from one API row, built only from the whitelisted fields (§4.6): any other
 * property of the row (reporter contacts included) is never read. `index` makes the key
 * of a row without a valid id unique. Null when the row is not an object.
 */
export function parseObservationRow(raw: unknown, index = 0): StebRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const pick = (field: string) =>
    Object.prototype.hasOwnProperty.call(row, field) ? row[field] : undefined;
  const id = validRecordId(pick('id'));
  const when = vilniusParts(pick('dateTime'));
  const point = parseEwkbPoint(pick('geom'));
  const species = text(pick('species'));
  const fact = text(pick('fact'));
  return {
    key: id !== null ? `id:${id}` : `row:${index}`,
    id,
    dateTime: when ? (pick('dateTime') as string) : null,
    day: when ? when.day : null,
    time: when ? when.time : null,
    species,
    speciesSlug: slugOrNotSet(species, 40),
    count: count(pick('count')),
    countMale: count(pick('countMale')),
    countFemale: count(pick('countFemale')),
    countJunior: count(pick('countJunior')),
    fact,
    factSlug: slugOrNotSet(fact, 60),
    factOther: text(pick('factOther')),
    x: point ? point[0] : null,
    y: point ? point[1] : null,
    municipality: text(pick('municipalities')),
    eldership: text(pick('elderships')),
    huntingArea: lithuanianQuotes(text(pick('huntingAreas'))),
  };
}

// MPV names arrive as „Lūšies” (English closing quote); Lithuanian closes with “ (J-25).
const lithuanianQuotes = (value: string | null) =>
  value === null ? null : value.replace(/„([^„”“]*)”/g, '„$1“');

/** Newest first: the instant desc, then id desc; rows without a valid date last. */
export function compareRecords(a: StebRecord, b: StebRecord): number {
  if (a.dateTime !== b.dateTime) {
    if (!a.dateTime) return 1;
    if (!b.dateTime) return -1;
    const diff = Date.parse(b.dateTime) - Date.parse(a.dateTime);
    if (diff) return diff;
  }
  return (b.id ?? 0) - (a.id ?? 0) || a.key.localeCompare(b.key);
}

/** One page of `/observations`, requesting exactly `STEB_FIELDS`. */
export function observationsUrl(page: number): string {
  return (
    `${medziokleApiHost}/observations?fields=${STEB_FIELDS.join(',')}` +
    `&sort=-dateTime,-id&pageSize=${PAGE_SIZE}&page=${page}`
  );
}

/** Any of males, females, juniors given (> 0). */
export const hasBreakdown = (r: StebRecord) =>
  (r.countMale ?? 0) > 0 || (r.countFemale ?? 0) > 0 || (r.countJunior ?? 0) > 0;

/** "6", or "6 (patinų 2, patelių 3, jauniklių 1)" with a breakdown; "Nenurodyta". */
export function countText(r: StebRecord): string {
  const base = r.count === null ? NOT_SET_LABEL : formatInt(r.count);
  if (!hasBreakdown(r)) return base;
  return (
    `${base} (patinų ${formatInt(r.countMale ?? 0)}, patelių ${formatInt(r.countFemale ?? 0)}, ` +
    `jauniklių ${formatInt(r.countJunior ?? 0)})`
  );
}

/** "Faktas – kitas faktas", the fact alone, or "Nenurodyta". */
export function factText(r: StebRecord): string {
  if (r.fact && r.factOther) return `${r.fact} – ${r.factOther}`;
  return r.fact || r.factOther || NOT_SET_LABEL;
}

/** 'yyyy-MM-dd HH:mm' (Vilnius) or "Nenurodyta". */
export const dateTimeText = (r: StebRecord) =>
  r.day && r.time ? `${r.day} ${r.time}` : NOT_SET_LABEL;

// ---------------------------------------------------------------------------
// Period (§3.3)
// ---------------------------------------------------------------------------

export const FIRST_SEASON = 2017;

/**
 * Seasons the period picker offers, newest first: from the current season down to the
 * season of the oldest record's day (not before 2017); with no dated record, the current
 * season only (§3.3).
 */
export function seasonOptions(today: string, oldestDay: string | null): number[] {
  const current = seasonOfDay(today);
  const oldest = oldestDay ? seasonOfDay(oldestDay) : current;
  const first = Math.max(FIRST_SEASON, Math.min(current, oldest));
  const list: number[] = [];
  for (let s = current; s >= first; s--) list.push(s);
  return list;
}

/**
 * The period of a query: valid `nuo`+`iki` (nuo ≤ iki) > valid `sezonas` (YYYY-YYYY+1,
 * from 2017, not after the current season when `today` is given) > `laikotarpis=30d` >
 * all (`laikotarpis=visi` and anything invalid).
 */
export function parsePeriod(query: Query, today?: string): StebPeriod {
  const nuo = queryString(query, 'nuo');
  const iki = queryString(query, 'iki');
  if (isValidDay(nuo) && isValidDay(iki) && nuo <= iki)
    return { kind: 'range', from: nuo, to: iki };
  const sezonas = queryString(query, 'sezonas');
  const match = sezonas ? /^(\d{4})-(\d{4})$/.exec(sezonas) : null;
  if (match) {
    const start = Number(match[1]);
    const latest = today ? seasonOfDay(today) : Infinity;
    if (Number(match[2]) === start + 1 && start >= FIRST_SEASON && start <= latest) {
      return { kind: 'season', season: start };
    }
  }
  if (queryString(query, 'laikotarpis') === '30d') return { kind: '30d' };
  return { kind: 'all' };
}

/** URL keys of a period; the default ("all") writes none. */
export function periodQuery(period: StebPeriod): Record<string, string> {
  if (period.kind === '30d') return { laikotarpis: '30d' };
  if (period.kind === 'season') return { sezonas: `${period.season}-${period.season + 1}` };
  if (period.kind === 'range') return { nuo: period.from, iki: period.to };
  return {};
}

/** Days of a period, inclusive; null for all records. */
export function periodInterval(period: StebPeriod, today: string): Interval | null {
  if (period.kind === '30d') return { from: addDays(today, -29), to: today };
  if (period.kind === 'season') return seasonInterval(period.season);
  if (period.kind === 'range') return { from: period.from, to: period.to };
  return null;
}

export const samePeriod = (a: StebPeriod, b: StebPeriod) =>
  JSON.stringify(periodQuery(a)) === JSON.stringify(periodQuery(b));

/** Period in the filter sentence, captions and the CSV (§3.2). */
export function periodLabel(period: StebPeriod, today: string): string {
  const interval = periodInterval(period, today);
  if (period.kind === 'all' || !interval) return 'visas laikotarpis';
  if (period.kind === '30d') return `paskutinės 30 d. (${interval.from} – ${interval.to})`;
  if (period.kind === 'season') return `${seasonLabel(period.season)} sezonas`;
  return interval.from === interval.to ? interval.from : `${interval.from} – ${interval.to}`;
}

/** Period on the filter chip: "Visas laikotarpis", "Paskutinės 30 d.", … */
export function periodChipLabel(period: StebPeriod, today: string): string {
  if (period.kind === 'all') return 'Visas laikotarpis';
  if (period.kind === '30d') return 'Paskutinės 30 d.';
  return periodLabel(period, today);
}

// ---------------------------------------------------------------------------
// Filtering and summaries
// ---------------------------------------------------------------------------

/** Municipality code of a name (exact trimmed match against meta), or null. */
export type MuniCodeOf = (name: string | null) => number | null;

/**
 * Rows that pass the filters (§3.3): the period on the Vilnius day (rows without a valid
 * date pass only "all"), species and fact on their slugs, the place on name → code.
 */
export function filterRecords(
  records: StebRecord[],
  filters: StebFilters,
  today: string,
  muniCodeOf: MuniCodeOf,
): StebRecord[] {
  const interval = periodInterval(filters.period, today);
  return records.filter((r) => {
    if (interval && (!r.day || r.day < interval.from || r.day > interval.to)) return false;
    if (filters.gyvunas !== null && r.speciesSlug !== filters.gyvunas) return false;
    if (filters.faktas !== null && r.factSlug !== filters.faktas) return false;
    if (filters.sav !== null && muniCodeOf(r.municipality) !== filters.sav) return false;
    return true;
  });
}

export interface SummaryRow {
  key: string;
  label: string;
  /** Observations. */
  n: number;
  /** Sum of the valid counts; null when no row of the group has one. */
  animals: number | null;
}

const addAnimals = (sum: number | null, r: StebRecord) =>
  r.count === null ? sum : (sum ?? 0) + r.count;

const speciesRank = (label: string) => {
  const i = SPECIES_ORDER.indexOf(label);
  return i < 0 ? SPECIES_ORDER.length : i;
};

/** Species order of options and lists: known species first, then lt collation, missing last. */
export function compareSpecies(a: { key: string; label: string }, b: typeof a): number {
  const missing = Number(a.key === NOT_SET_SLUG) - Number(b.key === NOT_SET_SLUG);
  if (missing) return missing;
  return speciesRank(a.label) - speciesRank(b.label) || compareLt(a.label, b.label);
}

/** Rows per species, count desc; ties in the species order; "Nenurodyta" last (§3.2). */
export function speciesSummary(records: StebRecord[]): SummaryRow[] {
  const groups = new Map<string, SummaryRow>();
  records.forEach((r) => {
    let g = groups.get(r.speciesSlug);
    if (!g) {
      const label = r.speciesSlug === NOT_SET_SLUG ? NOT_SET_LABEL : r.species || NOT_SET_LABEL;
      g = { key: r.speciesSlug, label, n: 0, animals: null };
      groups.set(r.speciesSlug, g);
    }
    g.n++;
    g.animals = addAnimals(g.animals, r);
  });
  return Array.from(groups.values()).sort((a, b) => {
    const missing = Number(a.key === NOT_SET_SLUG) - Number(b.key === NOT_SET_SLUG);
    return missing || b.n - a.n || compareSpecies(a, b);
  });
}

/** Rows per municipality name, count desc then lt collation; "Nenurodyta" last. */
export function municipalitySummary(records: StebRecord[]): SummaryRow[] {
  const groups = new Map<string, SummaryRow>();
  records.forEach((r) => {
    const key = r.municipality || '';
    let g = groups.get(key);
    if (!g) {
      g = { key, label: r.municipality || NOT_SET_LABEL, n: 0, animals: null };
      groups.set(key, g);
    }
    g.n++;
    g.animals = addAnimals(g.animals, r);
  });
  return Array.from(groups.values()).sort((a, b) => {
    const missing = Number(a.key === '') - Number(b.key === '');
    return missing || b.n - a.n || compareLt(a.label, b.label);
  });
}

/** Sum of the valid counts of the rows; null when none has one. */
export const animalsOf = (records: StebRecord[]) =>
  records.reduce<number | null>((sum, r) => addAnimals(sum, r), null);

// ---------------------------------------------------------------------------
// Answer (§3.2)
// ---------------------------------------------------------------------------

export interface StebAnswer {
  /** The answer paragraph (both sentences). */
  text: string;
  /** First sentence only. */
  sentence: string;
  /** "Pranešimuose nurodyta …" or null. */
  animals: string | null;
  n: number;
  empty: boolean;
}

// Around the dash of "stumbras – 1", so a species and its count never part on a wrap.
const NBSP = String.fromCharCode(160);

const capitalise = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** The first valid Vilnius day of the rows, or null. */
export function firstDay(records: StebRecord[]): string | null {
  let first = '';
  for (const r of records) if (r.day && (!first || r.day < first)) first = r.day;
  return first || null;
}

/**
 * The sentence prefix of a period: "Nuo …" (all records, used for the no-record sentence:
 * since the first record, `since` when given, else the first day of `records`), "Per
 * paskutines 30 d.", "2025/2026 sezone", "Laikotarpiu … – …" or the single day.
 */
export function answerPrefix(
  period: StebPeriod,
  records: StebRecord[],
  today: string,
  since?: string | null,
): string {
  const interval = periodInterval(period, today);
  if (period.kind === 'all' || !interval) {
    const first = since === undefined ? firstDay(records) : since;
    return first ? `Nuo ${first}` : '';
  }
  if (period.kind === '30d') return 'Per paskutines 30 d.';
  // "sezone", as every other topic's answer (OVERVIEW-16).
  if (period.kind === 'season') return `${seasonLabel(period.season)} sezone`;
  return interval.from === interval.to
    ? interval.from
    : `Laikotarpiu ${interval.from} – ${interval.to}`;
}

/**
 * "{prefix} užregistruota 13 stebėjimų: vilkas – 6, lūšis – 5, rudasis lokys – 2." plus
 * "Pranešimuose nurodyta 17 gyvūnų." when a row has a count; all records: "Iš viso
 * užregistruoti 8 stebėjimai (pirmasis – 2026-09-21): …" (the date does not look like a
 * period filter); for no rows "{prefix} stebėjimų neužregistruota.". Species are common
 * nouns inside the sentence (lower case). `records` are the filtered rows; `since` is the
 * first day of all loaded rows.
 */
export function answerText(
  records: StebRecord[],
  period: StebPeriod,
  today: string,
  since?: string | null,
): StebAnswer {
  const prefix = answerPrefix(period, records, today, since);
  const n = records.length;
  if (!n) {
    const sentence = prefix ? `${prefix} stebėjimų neužregistruota.` : 'Stebėjimų neužregistruota.';
    return { text: sentence, sentence, animals: null, n, empty: true };
  }
  const list = speciesSummary(records)
    .map((g) => `${g.label.toLocaleLowerCase('lt')}${NBSP}–${NBSP}${formatInt(g.n)}`)
    .join(', ');
  const verb = pluralLt(n, P_REGISTERED);
  const count = `${formatInt(n)} ${pluralLt(n, P_OBSERVATION)}`;
  let head: string;
  if (period.kind === 'all' || !periodInterval(period, today)) {
    const first = firstDay(records);
    head = `Iš viso ${verb} ${count}${first ? ` (pirmasis –${NBSP}${first})` : ''}`;
  } else {
    head = `${prefix} ${verb} ${count}`;
  }
  const sentence = `${head}: ${list}.`;
  const m = animalsOf(records);
  const animals =
    m === null
      ? null
      : `Pranešimuose ${pluralLt(m, P_SPECIFIED)} ${formatInt(m)} ${pluralLt(m, P_ANIMAL)}.`;
  return {
    text: animals ? `${sentence} ${animals}` : sentence,
    sentence,
    animals,
    n,
    empty: false,
  };
}

// ---------------------------------------------------------------------------
// Apžvalga card (OVERVIEW-05)
// ---------------------------------------------------------------------------

/**
 * The running season's numbers for the Apžvalga card: "8 užregistruoti stebėjimai", the
 * species line "Vilkas – 4, lūšis – 2, rudasis lokys – 1." and the animals sentence. The
 * records are all loaded rows; the season is the one of `today`. Null without a record in it.
 */
export function stebOverviewNumbers(
  records: StebRecord[],
  today: string,
): { value: string; unit: string; lines: string[] } | null {
  const season = seasonOfDay(today);
  const rows = filterRecords(
    records,
    { period: { kind: 'season', season }, gyvunas: null, faktas: null, sav: null },
    today,
    () => null,
  );
  const n = rows.length;
  if (!n) return null;
  const species = speciesSummary(rows)
    .map((g) => `${g.label.toLocaleLowerCase('lt')}${NBSP}–${NBSP}${formatInt(g.n)}`)
    .join(', ');
  const lines = [`${capitalise(species)}.`];
  const m = animalsOf(rows);
  if (m !== null) {
    lines.push(
      `Pranešimuose ${pluralLt(m, P_SPECIFIED)} ${formatInt(m)} ${pluralLt(m, P_ANIMAL)}.`,
    );
  }
  return {
    value: formatInt(n),
    unit: `${pluralLt(n, P_REGISTERED)} ${pluralLt(n, P_OBSERVATION)}`,
    lines,
  };
}

/** A page of the WP site on the same environment (the parent page's origin when embedded). */
export function wpPageUrl(path: string, parentOrigin: string | null, hostname: string) {
  const base =
    parentOrigin && ORIGIN_RE.test(parentOrigin)
      ? parentOrigin
      : Object.prototype.hasOwnProperty.call(WP_BY_MAPS_HOST, hostname)
        ? WP_BY_MAPS_HOST[hostname]
        : null;
  return base ? `${base}${path}` : null;
}

// ---------------------------------------------------------------------------
// Record link (§3.7)
// ---------------------------------------------------------------------------

const WP_BY_MAPS_HOST: Readonly<Record<string, string>> = Object.freeze(
  Object.assign(Object.create(null) as Record<string, string>, {
    'maps.biip.lt': 'https://medziokle.biip.lt',
    'staging-maps.biip.lt': 'https://staging-medziokle.biip.lt',
    'dev-maps.biip.lt': 'https://dev-medziokle.biip.lt',
  }),
);
const ORIGIN_RE = /^https?:\/\/[a-z0-9.-]+(:\d{1,5})?$/i;

/**
 * The WP record page `/stebeti-gyvunai/{id}/` on the same environment: embedded, the
 * validated parent origin; standalone, the WP host of this maps host; null for an invalid
 * id or an unknown host (localhost, previews).
 */
export function recordPageUrl(
  id: unknown,
  parentOrigin: string | null,
  hostname: string,
): string | null {
  const valid = validRecordId(id);
  if (valid === null) return null;
  return wpPageUrl(`/stebeti-gyvunai/${valid}/`, parentOrigin, hostname);
}

// ---------------------------------------------------------------------------
// CSV (§3.6)
// ---------------------------------------------------------------------------

export const TABLE_LABELS: Readonly<Record<StebTableId, string>> = Object.freeze({
  irasai: 'Įrašai',
  rusys: 'Rūšys',
  savivaldybes: 'Savivaldybės',
});

export const RECORDS_CSV_HEADER: readonly string[] = Object.freeze([
  'ID',
  'Data',
  'Laikas',
  'Rūšis',
  'Gyvūnų skaičius',
  'Patinų',
  'Patelių',
  'Jauniklių',
  'Faktas',
  'Kitas faktas',
  'Savivaldybė',
  'Seniūnija',
  'MPV',
  'X (LKS-94)',
  'Y (LKS-94)',
  'Nuoroda',
]);

export interface StebCsvOptions {
  table: StebTableId;
  /** Filtered rows in the order the table shows them (irasai). */
  records: StebRecord[];
  /** When the data was read. */
  fetchedAt: Date | null;
  /** Texts of the selection (§3.6 line 2). */
  labels: { period: string; species: string; fact: string; place: string };
  /** Shown and total rows when the load was truncated (§3.9). */
  truncated?: { shown: number; total: number } | null;
  /** Record page URL of a row, or null. */
  linkOf(record: StebRecord): string | null;
}

const commentPart = (s: string) => s.replace(/[;\r\n]+/g, ' ').trim();

/** CSV of the active table: BOM, ';', CRLF, two '#' lines, header, rows (§3.6). */
export function buildStebCsv(options: StebCsvOptions): string {
  const { table, records, labels, truncated } = options;
  const at = options.fetchedAt ? formatDateTime(options.fetchedAt) : '';
  const parts = [
    `Stebėjimai – ${TABLE_LABELS[table]}`,
    labels.period,
    labels.species,
    labels.fact,
    labels.place,
  ].map(commentPart);
  if (truncated) {
    parts.push(truncatedPart(truncated.shown, truncated.total));
  }
  const lines = [`# Duomenys: tiesiogiai iš BĮIP; gauta ${at}`, `# ${csvSafe(parts.join('; '))}`];
  const line = (cells: (string | number | null)[]) =>
    cells.map((c) => csvField(c)).join(CSV_SEPARATOR);

  if (table === 'irasai') {
    lines.push(line([...RECORDS_CSV_HEADER]));
    records.forEach((r) => {
      const breakdown = hasBreakdown(r);
      lines.push(
        line([
          r.id,
          r.day,
          r.time,
          r.species,
          r.count,
          breakdown ? (r.countMale ?? 0) : null,
          breakdown ? (r.countFemale ?? 0) : null,
          breakdown ? (r.countJunior ?? 0) : null,
          r.fact,
          r.factOther,
          r.municipality,
          r.eldership,
          // The MPV name as the table shows it (REGRESS-08).
          mpvName(r.huntingArea),
          r.x === null ? null : Math.round(r.x),
          r.y === null ? null : Math.round(r.y),
          options.linkOf(r),
        ]),
      );
    });
  } else {
    const rows = table === 'rusys' ? speciesSummary(records) : municipalitySummary(records);
    lines.push(line([table === 'rusys' ? 'Rūšis' : 'Savivaldybė', 'Stebėjimų', 'Gyvūnų']));
    lines.push(line(['Iš viso', records.length, animalsOf(records)]));
    rows.forEach((g) => lines.push(line([g.label, g.n, g.animals])));
  }
  return CSV_BOM + lines.join(CSV_EOL) + CSV_EOL;
}

/** ASCII file name of the CSV (§3.6). */
export function stebCsvFileName(table: StebTableId, period: StebPeriod, today: string): string {
  const base = `stebejimai_${table}`;
  if (period.kind === 'season') return `${base}_${period.season}-${period.season + 1}.csv`;
  if (period.kind === '30d') return `${base}_30d_${today}.csv`;
  if (period.kind === 'range') return `${base}_${period.from}_${period.to}.csv`;
  return `${base}_visi.csv`;
}
