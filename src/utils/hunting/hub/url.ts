// URL rules of the hunting data hub (SPEC2 §2.3), as pure functions so ?debug=1 can test
// them. Query values are strings; anything invalid is ignored silently.
import { seasonOfDay } from '@/utils/hunting/dates';
import { parseSeasonKey } from './time';

export type Query = Record<string, unknown>;

// Keys written by the hub itself, by the snapshot topics' dims (§2.3) and by the wolves
// state; everything else (x, y, z, debug, …) belongs to others and is always kept.
export const HUB_KEYS = ['tema', 'sezonas', 'sav', 'lentele'];
export const DIM_KEYS = ['rusis', 'rodiklis', 'grupe'];
export const WOLVES_KEYS = [
  'nuo',
  'iki',
  'laikotarpis',
  'amzius',
  'lytis',
  'budas',
  'sezonas',
  'sav',
  'lentele',
];
export const WOLVES_TABLES = ['irasai', 'sezonai', 'savivaldybes'];

export const queryString = (query: Query, key: string) => {
  const value = query[key];
  return typeof value === 'string' ? value : undefined;
};

/** Every key the hub or one of its topics owns. */
export function ownedKeys(dimKeys: string[] = []) {
  return Array.from(new Set([...HUB_KEYS, ...DIM_KEYS, ...WOLVES_KEYS, ...dimKeys]));
}

/** The query without the owned keys (x, y, z, debug and unknown keys stay). */
export function keptQuery(query: Query, dimKeys: string[] = []) {
  const owned = ownedKeys(dimKeys);
  // fromEntries defines own properties, so a `__proto__` key from the URL stays a plain key.
  return Object.fromEntries(
    Object.entries(query).filter(([key]) => owned.indexOf(key) < 0),
  ) as Record<string, any>;
}

/** Municipality code from `sav` (shape only; membership is checked against meta). */
export function parseSav(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{1,3}$/.test(value)) return null;
  return Number(value);
}

export interface SeasonCarry {
  season: number;
  // The wolves period was a day range (or the last 30 days / all seasons), not a season.
  fromRange: boolean;
}

/**
 * Season the Vilkai tab shows, read from its URL keys (§2.3 topic switch): a full season →
 * that season; a day range → the season of its last day; '30d' / 'visi' → the season of
 * today. Null when the wolves page shows its default period (no key).
 */
export function wolvesCarry(query: Query, today: string): SeasonCarry | null {
  const nuo = queryString(query, 'nuo');
  const iki = queryString(query, 'iki');
  if (nuo && iki && /^\d{4}-\d{2}-\d{2}$/.test(iki) && nuo <= iki) {
    const season = seasonOfDay(nuo);
    const full = nuo === `${season}-04-01` && iki === `${season + 1}-03-31`;
    return { season: full ? season : seasonOfDay(iki), fromRange: !full };
  }
  const season = parseSeasonKey(queryString(query, 'sezonas'));
  if (season !== null) return { season, fromRange: false };
  const period = queryString(query, 'laikotarpis');
  if (period === '30d' || period === 'visi') return { season: seasonOfDay(today), fromRange: true };
  return null;
}

/** Hub-relevant part of a query, for telling our own writes from back/forward. */
export function querySignature(query: Query, keys: string[]) {
  return keys.map((key) => `${key}=${queryString(query, key) ?? ''}`).join('&');
}
