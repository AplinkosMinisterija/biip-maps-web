// Pure helpers shared by the snapshot topics (Apžvalga, Laimikiai, Briedžių limitai, Žala):
// season state (SPEC2 §3.2), defaults (§3.3), number formats (§3.6), Δ rules and suppressed
// damages counts (owner decision: every damages count of 1 or 2 is published as null, "<3").
// No Vue imports; callers memoise with `computed`.
import { formatInt, pluralLt, seasonLabel, seasonOfDay, type PluralForms } from '../../dates';
import { S } from '../strings';
import type {
  Badge,
  KpiDef,
  MapMessageDef,
  Meta,
  Provenance,
  SeasonState,
  SnapshotData,
} from '../types';

export type SnapshotKind = 'loots' | 'limits' | 'damages';

// ---------------------------------------------------------------------------
// Seasons
// ---------------------------------------------------------------------------

export const seasonsDesc = (meta: Meta) => meta.seasons.map((s) => s.season).sort((a, b) => b - a);

export const hasSeason = (meta: Meta, season: number) =>
  meta.seasons.some((s) => s.season === season);

// §3.2, first match wins. `asOf` = the snapshot day.
export function seasonState(season: number, meta: Meta, kind: SnapshotKind): SeasonState {
  const asOf = meta.snapshotDate;
  if (asOf < `${season + 1}-04-01`) return 'vyksta';
  if (kind !== 'damages' && asOf <= `${season + 1}-05-29`) return 'preliminarus';
  if (kind === 'damages' && `${season}-04-01` < meta.static.damagesFrom) return 'dalinis';
  return 'galutinis';
}

export const stateBadge = (state: SeasonState): Badge | undefined =>
  state === 'galutinis' ? undefined : state;

// Season containing the snapshot day, or the newest offered season when it is not offered.
export function asOfSeason(meta: Meta, offered: number[] = seasonsDesc(meta)) {
  const season = seasonOfDay(meta.snapshotDate);
  return offered.indexOf(season) >= 0 ? season : offered[0];
}

// `{season}` or `{season} (iki {asOf})` while the season is running.
export const seasonWithAsOf = (season: number, state: SeasonState, asOf: string) =>
  state === 'vyksta' ? `${seasonLabel(season)} (iki ${asOf})` : seasonLabel(season);

// ---------------------------------------------------------------------------
// Formats (§3.6)
// ---------------------------------------------------------------------------

const decFormat = new Intl.NumberFormat('lt-LT', { maximumFractionDigits: 1 });
const dec1Format = new Intl.NumberFormat('lt-LT', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const pctFormat = new Intl.NumberFormat('lt-LT', { style: 'percent', maximumFractionDigits: 0 });
const pct1Format = new Intl.NumberFormat('lt-LT', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export { formatInt };
export const formatDec = (v: number) => decFormat.format(v);
// Ratio → "57 %"; `digits` 1 → "89,6 %".
export const formatPct = (ratio: number, digits: 0 | 1 = 0) =>
  (digits ? pct1Format : pctFormat).format(ratio);
export const plural = (n: number, forms: PluralForms) => pluralLt(n, forms);
export const MINUS = '−';
export const NBSP = String.fromCharCode(160); // between a number and '%', after '≥'
export const DASH = '—'; // value unknown or suppressed
export const NONE = '–'; // not applicable (no MPV)

// Share a / b with the numerator and denominator spelled out (§5 "Percentages").
export function shareText(a: number, b: number, digits: 0 | 1 = 0) {
  return b > 0 ? formatPct(a / b, digits) : DASH;
}

// ---------------------------------------------------------------------------
// Δ (§3.6, §0.4: hidden when either value < 20)
// ---------------------------------------------------------------------------

export const DELTA_MIN = 20;

export interface Delta {
  pct: number; // signed percent, e.g. 8.53
  text: string; // '+8,5 %' | '−16,0 %' | 'tiek pat'
  same: boolean;
}

export function delta(cur: number | null, prev: number | null | undefined): Delta | null {
  if (cur === null || prev === null || prev === undefined) return null;
  if (cur < DELTA_MIN || prev < DELTA_MIN) return null;
  const pct = ((cur - prev) / prev) * 100;
  if (Math.abs(pct) < 0.05) return { pct: 0, text: S.deltaSame, same: true };
  const abs = dec1Format.format(Math.abs(pct));
  return { pct, text: `${pct > 0 ? '+' : MINUS}${abs}${NBSP}%`, same: false };
}

// "8,5 % daugiau nei 2024/2025 sezone" / "tiek pat, kiek 2024/2025 sezone".
export function deltaPhrase(d: Delta, prevSeason: number) {
  const prev = seasonLabel(prevSeason);
  if (d.same) return `tiek pat, kiek ${prev} sezone`;
  const abs = dec1Format.format(Math.abs(d.pct));
  return `${abs}${NBSP}% ${d.pct > 0 ? 'daugiau' : 'mažiau'} nei ${prev} sezone`;
}

export const deltaAria = (d: Delta, prevSeason: number) =>
  d.same
    ? `tiek pat, kiek ${seasonLabel(prevSeason)} sezone`
    : `${dec1Format.format(Math.abs(d.pct))} procento ${d.pct > 0 ? 'daugiau' : 'mažiau'} nei ${seasonLabel(prevSeason)} sezone`;

// ---------------------------------------------------------------------------
// Suppressed damages counts (null = 0, 1 or 2, or withheld). Sums of parts become ranges.
// ---------------------------------------------------------------------------

export interface Count {
  lo: number;
  hi: number; // Infinity when a part has no known upper bound
  withheld?: boolean; // one withheld cell ("neskelbiama")
}

export const exact = (n: number): Count => ({ lo: n, hi: n });
export const ZERO: Count = { lo: 0, hi: 0 };
export const WITHHELD: Count = { lo: 0, hi: Infinity, withheld: true };

// A published damages cell: null means 0, 1 or 2 ("<3"), or withheld when its measure is named
// in the row's `hidden` column (privacy.mjs).
export const cell = (v: number | null | undefined, withheld = false): Count =>
  withheld ? WITHHELD : v === null ? { lo: 0, hi: 2 } : exact(v ?? 0);

/** True when `key` is withheld in a damages row. */
export const isHidden = (row: { hidden?: string | null } | undefined, key: string) =>
  !!row?.hidden && row.hidden.split(',').indexOf(key) >= 0;

export const addCount = (a: Count, b: Count): Count => ({ lo: a.lo + b.lo, hi: a.hi + b.hi });
export const sumCounts = (list: Count[]) => list.reduce(addCount, ZERO);
// Both bounds hold, so a total and the sum of its parts narrow each other.
export const intersectCount = (a: Count, b: Count): Count => {
  const lo = Math.max(a.lo, b.lo);
  const hi = Math.min(a.hi, b.hi);
  return lo <= hi ? (lo === a.lo && hi === a.hi ? a : { lo, hi }) : a;
};
export const isExact = (c: Count) => c.lo === c.hi;
export const isSuppressed = (c: Count) => !c.withheld && c.hi > 0 && c.hi < 3;
const isUnknown = (c: Count) => c.withheld || (c.lo === 0 && c.hi === Infinity);

// "<3", "5", "5–7", "≥ 5" or "neskelbiama".
export function formatCount(c: Count) {
  if (isUnknown(c)) return S.withheld;
  if (isSuppressed(c)) return S.suppressed;
  if (isExact(c)) return formatInt(c.lo);
  if (c.hi === Infinity) return `≥${NBSP}${formatInt(c.lo)}`;
  return `${formatInt(c.lo)}–${formatInt(c.hi)}`;
}

// Value for sorting and CSV: the exact number, or the displayed text when not exact.
export const countValue = (c: Count): number | string => (isExact(c) ? c.lo : formatCount(c));

// Map value of a count (it picks the class; the tooltip shows `formatCount`): exact counts as
// is, "<3" as 1.5 (class "<3"), a range by its middle, an open range by its lower bound + 0.5,
// a withheld cell as null ("Duomenų nėra").
export function countMapValue(c: Count): number | null {
  if (isExact(c)) return c.lo;
  if (isUnknown(c)) return null;
  if (isSuppressed(c)) return 1.5;
  if (c.hi === Infinity) return c.lo + 0.5;
  return (c.lo + c.hi) / 2;
}
export function formatMapCount(v: number) {
  if (Number.isInteger(v)) return formatInt(v);
  if (v === 1.5) return S.suppressed;
  return `~${NBSP}${formatInt(Math.round(v))}`;
}

// "92 pranešimai" / "mažiau nei 3 pranešimai" / "nuo 5 iki 7 pranešimų" /
// "ne mažiau nei 5 pranešimų" / "neskelbiamas skaičius pranešimų".
export function countPhrase(c: Count, forms: PluralForms) {
  if (isUnknown(c)) return `neskelbiamas skaičius ${forms[2]}`;
  if (isSuppressed(c)) return `mažiau nei 3 ${forms[1]}`;
  if (isExact(c)) return `${formatInt(c.lo)} ${pluralLt(c.lo, forms)}`;
  if (c.hi === Infinity) return `ne mažiau nei ${formatInt(c.lo)} ${forms[2]}`;
  return `nuo ${formatInt(c.lo)} iki ${formatInt(c.hi)} ${forms[2]}`;
}

export const SUPPRESSED_RANGE_TOOLTIP =
  'Kai kurios dalys mažesnės nei 3 arba neskelbiamos, todėl rodomos galimos ribos.';

// ---------------------------------------------------------------------------
// Places, provenance, misc.
// ---------------------------------------------------------------------------

export type Municipality = Meta['municipalities'][number];

const muniCache = new WeakMap<Meta, Map<number, Municipality>>();
export function municipalityMap(meta: Meta) {
  let map = muniCache.get(meta);
  if (!map) {
    map = new Map(meta.municipalities.map((m) => [m.code, m]));
    muniCache.set(meta, map);
  }
  return map;
}

export const municipalityName = (meta: Meta, code: number) =>
  municipalityMap(meta).get(code)?.name ?? `${code}`;

// Municipalities with fewer than 3 MPV: their loots and limits are pooled (privacy), so they have
// no figures of their own; the pooled rows count only in the national sums.
export const isPooled = (m: Municipality | null | undefined) => !!m?.pooled;
export function pooledNote(meta: Meta) {
  const names = meta.municipalities.filter((m) => m.pooled).map((m) => m.name);
  return names.length ? S.pooledNote(names.join(', ')) : null;
}

// Municipalities in table order: by name (Lithuanian collation).
export const municipalitiesByName = (meta: Meta) =>
  meta.municipalities.slice().sort((a, b) => a.name.localeCompare(b.name, 'lt'));

export const provenance = (data: SnapshotData): Provenance => ({
  kind: 'snapshot',
  asOf: data.meta.snapshotDate,
  text: S.provenanceSnapshot(data.meta.snapshotDate),
});

export const seasonSlug = (season: number) => `${season}-${season + 1}`;

export function csvName(topic: string, table: string, season: number, sav: number | null) {
  return `${topic}-${table}-${seasonSlug(season)}${sav === null ? '' : `-sav-${sav}`}`;
}

export function emptyState(defaultSeason: number) {
  const actions: MapMessageDef['action'][] = [
    { label: S.emptyShowAll, sel: { sav: null } },
    { label: S.emptyShowSeason(seasonLabel(defaultSeason)), sel: { season: defaultSeason } },
  ];
  return { text: S.empty, actions };
}

export function kpi(
  id: string,
  label: string,
  value: string,
  extra: Partial<Omit<KpiDef, 'id' | 'label' | 'value'>> = {},
): KpiDef {
  return { id, label, value, ariaLabel: extra.ariaLabel ?? `${label} ${value}`, ...extra };
}

export const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);

export function upperFirst(text: string) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}
