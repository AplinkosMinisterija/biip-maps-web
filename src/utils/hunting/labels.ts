// Lithuanian labels for wolf record codes, aligned with the WordPress map.php I18N
// (SPEC §4.8), plus wolf limits and links (SPEC §4.6).
// Unknown codes (future enums) are rendered as-is.
import type { WolfSource } from './types';

// Value used in attribute filters and URLs for a null code.
export const NOT_SPECIFIED = 'nenurodyta';

export const AGE_LABELS: Record<string, string> = {
  ADULT: 'Suaugęs',
  TWO_YEAR: 'Vyresnis nei 1 m.',
  ONE_YEAR: 'Jauniklis iki 1 m.',
};

export const SEX_LABELS: Record<string, string> = {
  MALE: 'Patinas',
  FEMALE: 'Patelė',
};

export const METHOD_LABELS: Record<string, string> = {
  TYKOJAMOJI: 'Tykojamoji',
  VAROMOJI: 'Varomoji',
  SU_VELIAVELEMIS: 'Su vėliavėlėmis',
  OTHER: 'Kita',
};

export const SOURCE_LABELS: Record<WolfSource, string> = {
  biomon: 'BIOMON',
  biip: 'BIIP elektroninis medžioklės lapas',
};

const label = (map: Record<string, string>, code: string | null, empty: string) =>
  code === null || code === undefined || code === '' ? empty : (map[code] ?? code);

export const ageLabel = (code: string | null) => label(AGE_LABELS, code, 'Nenurodyta');
export const sexLabel = (code: string | null) => label(SEX_LABELS, code, 'Nenurodyta');
export const methodLabel = (code: string | null) => label(METHOD_LABELS, code, 'Nenurodytas');
export const sourceLabel = (source: WolfSource) => SOURCE_LABELS[source] ?? source;

export function packLabel(packMember: boolean | null, packAmount: number | null) {
  if (packMember === true)
    return packAmount && packAmount > 0 ? `Taip, gaujoje ${packAmount}` : 'Taip';
  if (packMember === false) return 'Ne';
  return 'Nenurodyta';
}

// Options for P1 attribute filters, in display order; the null option last.
export const AGE_OPTIONS = [...Object.keys(AGE_LABELS), NOT_SPECIFIED];
export const SEX_OPTIONS = [...Object.keys(SEX_LABELS), NOT_SPECIFIED];
export const METHOD_OPTIONS = [...Object.keys(METHOD_LABELS), NOT_SPECIFIED];

// Month names, index 1..12. Short forms for histogram labels (SPEC §6.5); lower
// case nominative for aria-labels ('2025 m. gruodis'); column heads for the
// season × month table (SPEC §6.7).
export const MONTH_SHORT = [
  '',
  'saus.',
  'vas.',
  'kov.',
  'bal.',
  'geg.',
  'birž.',
  'liep.',
  'rugp.',
  'rugs.',
  'spal.',
  'lapkr.',
  'gruod.',
];
export const MONTH_NAMES = [
  '',
  'sausis',
  'vasaris',
  'kovas',
  'balandis',
  'gegužė',
  'birželis',
  'liepa',
  'rugpjūtis',
  'rugsėjis',
  'spalis',
  'lapkritis',
  'gruodis',
];
export const PIVOT_MONTHS = [10, 11, 12, 1, 2, 3];
export const PIVOT_MONTH_HEADERS: Record<number, string> = {
  10: 'Spal.',
  11: 'Lapkr.',
  12: 'Gruod.',
  1: 'Saus.',
  2: 'Vas.',
  3: 'Kov.',
};

// Source: prod limited_animals GLOBAL wolf rows, verified 2026-10-09; AM announcements. 2023/2024 not verified → unknown.
export const WOLF_LIMITS: Record<number, number> = { 2024: 341, 2025: 307 };
export const AM_WOLVES_URL =
  'https://am.lrv.lt/lt/veiklos-sritys-1/gamtos-apsauga/medziokle/sumedzioti-vilkai/';

// Wolf limit of a season, or null when unknown. The current season's limit comes
// from E2 `wolfLimit`, where 0 means "not approved yet" (also null here; callers
// tell the two apart by `season === currentSeason`).
export function seasonLimit(
  season: number,
  currentSeason: number,
  currentWolfLimit?: number | null,
): number | null {
  if (season === currentSeason) {
    return typeof currentWolfLimit === 'number' && currentWolfLimit > 0 ? currentWolfLimit : null;
  }
  return WOLF_LIMITS[season] ?? null;
}
