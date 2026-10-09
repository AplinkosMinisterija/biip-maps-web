// Season model of the hunting data hub (SPEC2 §3.1–§3.3). Pure functions on
// 'yyyy-MM-dd' Vilnius days; the season `s` is its start year (2025 = 2025/2026).
import { seasonLabel, seasonOfDay } from '@/utils/hunting/dates';
import { MONTH_SHORT } from '@/utils/hunting/labels';
import type { Badge, Meta, SeasonState } from './types';

export { seasonLabel, seasonOfDay };

// Which data family a season state is computed for (§3.2).
export type SeasonKind = 'loots' | 'limits' | 'damages';

// Days after the season end until which loots and limit use stay preliminary: MPV users
// report the season until May 15; two more weeks for late corrections.
export const PRELIMINARY_UNTIL = '05-29';

// URL form of a season: 2025 ↔ '2025-2026' (§2.3).
export const seasonKey = (season: number) => `${season}-${season + 1}`;

export function parseSeasonKey(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{4})$/.exec(value);
  if (!match) return null;
  const start = Number(match[1]);
  return Number(match[2]) === start + 1 ? start : null;
}

/** Season state on the snapshot day (§3.2, first matching rule). */
export function seasonState(season: number, kind: SeasonKind, meta: Meta): SeasonState {
  const asOf = meta.snapshotDate;
  if (asOf < `${season + 1}-04-01`) return 'vyksta';
  if ((kind === 'loots' || kind === 'limits') && asOf <= `${season + 1}-${PRELIMINARY_UNTIL}`) {
    return 'preliminarus';
  }
  if (kind === 'damages' && `${season}-04-01` < meta.static.damagesFrom) return 'dalinis';
  return 'galutinis';
}

/** Badge for a season state; final seasons carry no badge (§0.5). */
export function stateBadge(state: SeasonState): Badge | undefined {
  return state === 'galutinis' ? undefined : state;
}

/** Seasons present in the snapshot, newest first. */
export const snapshotSeasons = (meta: Meta) =>
  meta.seasons.map((s) => s.season).sort((a, b) => b - a);

/** Season containing the snapshot day, if the snapshot has it, else the newest one. */
export function asOfSeason(meta: Meta) {
  const seasons = snapshotSeasons(meta);
  const season = seasonOfDay(meta.snapshotDate);
  return seasons.indexOf(season) >= 0 ? season : (seasons[0] ?? season);
}

/** Newest season whose figures are settled (galutinis or preliminarus), §3.3 Laimikiai. */
export function newestSettledSeason(meta: Meta, kind: SeasonKind = 'loots') {
  const seasons = snapshotSeasons(meta);
  const settled = seasons.find((s) => {
    const state = seasonState(s, kind, meta);
    return state === 'galutinis' || state === 'preliminarus';
  });
  return settled ?? seasons[0] ?? seasonOfDay(meta.snapshotDate);
}

/** ' (iki 2026-10-09)' while the season is running, else ''. */
export const untilSuffix = (state: SeasonState, asOf: string) =>
  state === 'vyksta' ? ` (iki ${asOf})` : '';

/** The twelve months of a season as 'yyyy-MM', April first. */
export function seasonMonths(season: number) {
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const month = ((3 + i) % 12) + 1;
    const year = month >= 4 ? season : season + 1;
    months.push(`${year}-${String(month).padStart(2, '0')}`);
  }
  return months;
}

/** Short Lithuanian month label of 'yyyy-MM' ('bal.', 'saus.'). */
export const monthShort = (ym: string) => MONTH_SHORT[Number(ym.slice(5, 7))] || ym;

/** Season of a 'yyyy-MM' month. */
export const seasonOfMonth = (ym: string) => seasonOfDay(`${ym}-01`);
