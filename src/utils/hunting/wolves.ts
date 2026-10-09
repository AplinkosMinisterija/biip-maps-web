// Pure data rules for the wolves page: normalisation, filtering and aggregates
// (SPEC §4.3–4.7, §6.1). No Vue imports here; callers memoise with `computed`.
import WKB from 'ol/format/WKB';
import type Point from 'ol/geom/Point';
import type {
  HistogramBin,
  Interval,
  SeasonInfo,
  StatusModel,
  WolfApiRow,
  WolfRecord,
  WolfTotals,
  WolvesDataset,
} from './types';
import {
  MIN_DAY,
  WOLVES,
  addDays,
  dayInInterval,
  dayParts,
  daysInMonth,
  formatInt,
  intervalDays,
  isInWolfWindow,
  pluralLt,
  recordDay,
  seasonInterval,
  seasonLabel,
  seasonOfDay,
  toDay,
  wolfWindow,
} from './dates';
import { MONTH_NAMES, MONTH_SHORT, NOT_SPECIFIED, PIVOT_MONTHS, seasonLimit } from './labels';

// Display grid: points are snapped to the centre of their 1 km LKS94 cell (SPEC §13).
export const GRID_SIZE = 1000;
export const snapToGrid = (v: number) => Math.floor(v / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;

// A BIOMON and a BIIP record on the same day within this distance (m) are
// reported as a possible duplicate pair (SPEC §4.5).
export const DUPLICATE_DISTANCE = 2000;

const wkb = new WKB();

function readPoint(hex: string): [number, number] | null {
  try {
    const geometry = wkb.readGeometry(hex);
    if (!geometry || geometry.getType() !== 'Point') return null;
    const [x, y] = (geometry as Point).getCoordinates();
    return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
  } catch (e) {
    return null;
  }
}

function safeRecordDay(row: WolfApiRow): string | null {
  if (typeof row.registeredAt !== 'string' || isNaN(Date.parse(row.registeredAt))) return null;
  try {
    return recordDay(row.source, row.registeredAt);
  } catch (e) {
    return null;
  }
}

const byDayDescThenId = (a: WolfRecord, b: WolfRecord) =>
  a.day < b.day ? 1 : a.day > b.day ? -1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

// E1 rows → dataset (SPEC §4.3). `seasons` (E3) only labels paper rows; when it
// is empty all paper rows land in `paperRowsUnknownSeason`.
export function normalise(
  rows: WolfApiRow[],
  seasons: SeasonInfo[],
  today: string,
  apiTotal: number = rows.length,
): WolvesDataset {
  const seasonStartById: Record<number, number> = {};
  seasons.forEach((s) => (seasonStartById[s.id] = s.start));

  const records: WolfRecord[] = [];
  const paperRowsBySeason: Record<number, number> = {};
  const seenIds = new Set<string>();
  let paperRowsUnknownSeason = 0;
  let excludedBadDate = 0;
  let excludedBadGeom = 0;
  let duplicateIdsDropped = 0;

  rows.forEach((row) => {
    // 1. Paper aggregate: no location, never counted, never date-filtered.
    if (row.geom === null || row.geom === undefined || row.geom === '') {
      const start = row.seasonId === null ? undefined : seasonStartById[row.seasonId];
      if (start === undefined) paperRowsUnknownSeason++;
      else paperRowsBySeason[start] = (paperRowsBySeason[start] || 0) + 1;
      return;
    }

    // 2. Defensive duplicate guard.
    if (seenIds.has(row.id)) {
      duplicateIdsDropped++;
      return;
    }
    seenIds.add(row.id);

    // 3. Local day; implausible dates are excluded.
    const day = safeRecordDay(row);
    if (!day || day < MIN_DAY || day > today) {
      excludedBadDate++;
      return;
    }

    // 6. Geometry (EWKB hex, EPSG:3346).
    const point = readPoint(row.geom);
    if (!point) {
      excludedBadGeom++;
      return;
    }
    const [rawX, rawY] = point;

    // 4–5. Season from the day (never from seasonId), wolf window flag.
    const season = seasonOfDay(day);
    records.push({
      id: row.id,
      source: row.source,
      day,
      season,
      inWolfWindow: isInWolfWindow(day, season),
      age: row.age ?? null,
      sex: row.category ?? null,
      method: row.wolfHuntingType ?? null,
      packMember: row.isPackMember ?? null,
      packAmount: row.packAmount ?? null,
      x: snapToGrid(rawX),
      y: snapToGrid(rawY),
      rawX,
      rawY,
    });
  });

  records.sort(byDayDescThenId);
  const minDay = records.length ? records[records.length - 1].day : today;

  return {
    records,
    paperRowsBySeason,
    paperRowsUnknownSeason,
    excludedBadDate,
    excludedBadGeom,
    duplicateIdsDropped,
    possibleDuplicatePairs: countPossibleDuplicates(records),
    apiTotal,
    minYear: dayParts(minDay).year,
  };
}

// BIOMON × BIIP pairs on the same day within DUPLICATE_DISTANCE (raw coordinates).
// Flagged only, never removed (SPEC §4.5).
export function countPossibleDuplicates(records: WolfRecord[]) {
  const biomonByDay: Record<string, WolfRecord[]> = {};
  records.forEach((r) => {
    if (r.source === 'biomon') (biomonByDay[r.day] = biomonByDay[r.day] || []).push(r);
  });
  let pairs = 0;
  records.forEach((r) => {
    if (r.source !== 'biip') return;
    (biomonByDay[r.day] || []).forEach((b) => {
      if (Math.hypot(b.rawX - r.rawX, b.rawY - r.rawY) <= DUPLICATE_DISTANCE) pairs++;
    });
  });
  return pairs;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

// The current season if it already has a located wolf inside the wolf window,
// otherwise the previous season (SPEC §4.4).
export function defaultSeason(records: WolfRecord[], currentSeason: number) {
  return records.some((r) => r.season === currentSeason && r.inWolfWindow)
    ? currentSeason
    : currentSeason - 1;
}

// ---------------------------------------------------------------------------
// Filtering (SPEC §4.7)
// ---------------------------------------------------------------------------

export interface WolfFilter {
  interval: Interval;
  sav?: number | null;
  age?: string[];
  sex?: string[];
  method?: string[];
}

// Empty list = no filter; NOT_SPECIFIED in the list matches null.
const matchesCode = (values: string[] | undefined, code: string | null) =>
  !values || !values.length || values.indexOf(code === null ? NOT_SPECIFIED : code) >= 0;

export function filterRecords(records: WolfRecord[], filter: WolfFilter): WolfRecord[] {
  const { interval, sav, age, sex, method } = filter;
  return records.filter(
    (r) =>
      dayInInterval(r.day, interval) &&
      (sav === null || sav === undefined || r.municipalityCode === sav) &&
      matchesCode(age, r.age) &&
      matchesCode(sex, r.sex) &&
      matchesCode(method, r.method),
  );
}

// ---------------------------------------------------------------------------
// Histogram (SPEC §4.7, §6.5)
// ---------------------------------------------------------------------------

export const HISTOGRAM_DAY_MAX = 31;
export const HISTOGRAM_MONTH_MAX = 731;

export function histogramLevel(interval: Interval): HistogramBin['level'] {
  const days = intervalDays(interval);
  if (days <= HISTOGRAM_DAY_MAX) return 'day';
  if (days <= HISTOGRAM_MONTH_MAX) return 'month';
  return 'season';
}

const countText = (n: number) => `${formatInt(n)} ${pluralLt(n, WOLVES)}`;

// Bins cover the whole interval in chronological order, zero bins included.
// Counts come from `filtered`; each bin's `interval` is its full unit (the
// day, the calendar month, the hunting year), which is what a click selects.
export function histogram(filtered: WolfRecord[], interval: Interval): HistogramBin[] {
  const level = histogramLevel(interval);
  const counts: Record<string, number> = {};
  const keyOf =
    level === 'day'
      ? (r: WolfRecord) => r.day
      : level === 'month'
        ? (r: WolfRecord) => r.day.slice(0, 7)
        : (r: WolfRecord) => String(r.season);
  filtered.forEach((r) => {
    const key = keyOf(r);
    counts[key] = (counts[key] || 0) + 1;
  });

  const bins: HistogramBin[] = [];
  if (level === 'day') {
    for (let day = interval.from; day <= interval.to; day = addDays(day, 1)) {
      const count = counts[day] || 0;
      bins.push({
        key: day,
        level,
        label: String(dayParts(day).day),
        ariaLabel: `${day}: ${countText(count)}. Rodyti šią dieną.`,
        count,
        interval: { from: day, to: day },
      });
    }
  } else if (level === 'month') {
    const start = dayParts(interval.from);
    const end = dayParts(interval.to);
    let { year, month } = start;
    while (year < end.year || (year === end.year && month <= end.month)) {
      const key = `${year}-${month < 10 ? '0' : ''}${month}`;
      const count = counts[key] || 0;
      bins.push({
        key,
        level,
        label: MONTH_SHORT[month],
        ariaLabel: `${year} m. ${MONTH_NAMES[month]}: ${countText(count)}. Rodyti šį mėnesį.`,
        count,
        interval: { from: toDay(year, month, 1), to: toDay(year, month, daysInMonth(year, month)) },
      });
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
  } else {
    const last = seasonOfDay(interval.to);
    for (let season = seasonOfDay(interval.from); season <= last; season++) {
      const count = counts[String(season)] || 0;
      bins.push({
        key: String(season),
        level,
        label: seasonLabel(season),
        ariaLabel: `${seasonLabel(season)} sezonas: ${countText(count)}. Rodyti šį sezoną.`,
        count,
        interval: seasonInterval(season),
      });
    }
  }
  return bins;
}

// ---------------------------------------------------------------------------
// Season × month table (SPEC §6.7)
// ---------------------------------------------------------------------------

export interface SeasonMonthRow {
  season: number;
  label: string; // '2025/2026'
  months: Record<number, number>; // keys 10, 11, 12, 1, 2, 3
  other: number; // April–September
  total: number;
  limit: number | null; // null = unknown or (current season) not approved yet
  paperRows: number | null; // null when the season list (E3) is unavailable
  offWindow: number;
}

export interface PivotOptions {
  currentSeason?: number;
  currentWolfLimit?: number | null; // E2 wolfLimit
  paperRowsBySeason?: Record<number, number> | null; // null/undefined → paperRows null
}

// Over ALL records (ignores the interval), newest season first. Seasons run from
// the oldest record's season to the current season, empty seasons included.
export function seasonMonthPivot(
  records: WolfRecord[],
  options: PivotOptions = {},
): SeasonMonthRow[] {
  const bySeason: Record<number, SeasonMonthRow> = {};
  const row = (season: number): SeasonMonthRow =>
    (bySeason[season] = bySeason[season] || {
      season,
      label: seasonLabel(season),
      months: { 10: 0, 11: 0, 12: 0, 1: 0, 2: 0, 3: 0 },
      other: 0,
      total: 0,
      limit: null,
      paperRows: null,
      offWindow: 0,
    });

  let minSeason = Infinity;
  let maxSeason = -Infinity;
  records.forEach((r) => {
    const target = row(r.season);
    const month = dayParts(r.day).month;
    if (PIVOT_MONTHS.indexOf(month) >= 0) target.months[month]++;
    else target.other++;
    target.total++;
    if (!r.inWolfWindow) target.offWindow++;
    minSeason = Math.min(minSeason, r.season);
    maxSeason = Math.max(maxSeason, r.season);
  });

  const current = options.currentSeason ?? (Number.isFinite(maxSeason) ? maxSeason : NaN);
  if (!Number.isFinite(current)) return [];
  if (!Number.isFinite(minSeason)) minSeason = current;
  maxSeason = Math.max(Number.isFinite(maxSeason) ? maxSeason : current, current);

  const rows: SeasonMonthRow[] = [];
  for (let season = maxSeason; season >= minSeason; season--) {
    const r = row(season);
    r.limit = seasonLimit(season, current, options.currentWolfLimit);
    r.paperRows = options.paperRowsBySeason ? options.paperRowsBySeason[season] || 0 : null;
    rows.push(r);
  }
  return rows;
}

// Per-season counters for the debug panel and "Apie duomenis".
export function countsBySeason(records: WolfRecord[]) {
  const result: Record<number, { total: number; offWindow: number }> = {};
  records.forEach((r) => {
    const c = (result[r.season] = result[r.season] || { total: 0, offWindow: 0 });
    c.total++;
    if (!r.inWolfWindow) c.offWindow++;
  });
  return result;
}

// ---------------------------------------------------------------------------
// P1: municipalities
// ---------------------------------------------------------------------------

export interface MunicipalityCount {
  code: number | null; // null = not assigned ('Nenustatyta')
  name: string;
  count: number;
  adults: number; // ADULT or TWO_YEAR
  juniors: number; // ONE_YEAR
  males: number;
  females: number;
  lastDay: string;
}

export function countByMunicipality(filtered: WolfRecord[]): MunicipalityCount[] {
  const byCode = new Map<number | null, MunicipalityCount>();
  filtered.forEach((r) => {
    const code = r.municipalityCode ?? null;
    let item = byCode.get(code);
    if (!item) {
      item = {
        code,
        name: code === null ? 'Nenustatyta' : r.municipalityName || String(code),
        count: 0,
        adults: 0,
        juniors: 0,
        males: 0,
        females: 0,
        lastDay: r.day,
      };
      byCode.set(code, item);
    }
    item.count++;
    if (r.age === 'ADULT' || r.age === 'TWO_YEAR') item.adults++;
    if (r.age === 'ONE_YEAR') item.juniors++;
    if (r.sex === 'MALE') item.males++;
    if (r.sex === 'FEMALE') item.females++;
    if (r.day > item.lastDay) item.lastDay = r.day;
  });
  return Array.from(byCode.values()).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, 'lt'),
  );
}

// ---------------------------------------------------------------------------
// Status card (SPEC §6.1)
// ---------------------------------------------------------------------------

// Current season only. `totals` null (still loading or failed) → 'unavailable';
// the card shows its own loading state while E2 is pending.
export function statusModel(
  totals: WolfTotals | null,
  totalsFailed: boolean,
  records: WolfRecord[],
  today: string,
): StatusModel {
  const seasonStart = seasonOfDay(today);
  const wolfStartDay = wolfWindow(seasonStart).from;
  const points = records.reduce((n, r) => (r.season === seasonStart ? n + 1 : n), 0);
  const base = {
    seasonStart,
    seasonLabel: seasonLabel(seasonStart),
    wolfStartDay,
    points,
  };

  if (totalsFailed || !totals) {
    return { ...base, state: 'unavailable', limit: null, hunted: null, remaining: null };
  }

  const h = totals.wolfAmount;
  const L = totals.wolfLimit;
  if (L === 0) {
    return { ...base, state: 'notApproved', limit: 0, hunted: h, remaining: null };
  }

  const taken = Math.max(h, points);
  const remaining = L - taken;
  let state: StatusModel['state'];
  if (today < wolfStartDay) state = 'beforeStart';
  else if (h >= L || points >= L) state = 'exhausted';
  else if (remaining <= Math.max(10, Math.ceil(0.05 * L))) state = 'littleLeft';
  else state = 'ongoing';

  return { ...base, state, limit: L, hunted: h, remaining: Math.max(0, remaining) };
}
