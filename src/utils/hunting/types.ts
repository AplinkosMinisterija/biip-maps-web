export type WolfSource = 'biomon' | 'biip';
export interface WolfApiRow {
  id: string;
  registeredAt: string;
  source: WolfSource;
  age: string | null;
  category: string | null;
  wolfHuntingType: string | null;
  isPackMember: boolean | null;
  packAmount: number | null;
  seasonId: number | null;
  geom: string | null;
}
export interface WolfRecord {
  id: string;
  source: WolfSource;
  day: string; // local calendar day 'yyyy-MM-dd' (§4.2)
  season: number; // hunting-year start year, Apr 1 boundary (2025 = 2025/2026)
  inWolfWindow: boolean; // day within [season-10-15, (season+1)-03-31]
  age: string | null;
  sex: string | null;
  method: string | null;
  packMember: boolean | null;
  packAmount: number | null;
  x: number;
  y: number; // EPSG:3346, snapped to the 1 km cell centre (display)
  rawX: number;
  rawY: number; // EPSG:3346 as received; memory only, used for P1 point-in-polygon, never rendered or exported
  municipalityCode?: number | null;
  municipalityName?: string | null; // P1
}
export interface Interval {
  from: string;
  to: string;
} // inclusive local days
export type PresetId = `season:${number}` | 'last30' | 'all' | 'custom';
export interface SeasonInfo {
  id: number;
  start: number;
  name: string;
  current: boolean;
}
export interface WolfTotals {
  wolfAmount: number;
  wolfLimit: number;
}
export interface WolvesDataset {
  records: WolfRecord[]; // located, valid date, deduplicated
  paperRowsBySeason: Record<number, number>; // rows without geom, by season start year (via seasonId → E3)
  paperRowsUnknownSeason: number; // rows without geom whose seasonId is unknown
  excludedBadDate: number; // day < '2017-04-01' or after today
  excludedBadGeom: number; // geom present but not a readable EWKB point (defensive; today 0)
  duplicateIdsDropped: number;
  possibleDuplicatePairs: number; // flagged only, never removed (§4.5)
  apiTotal: number; // E1 `total`
  minYear: number; // first year with a valid record (2018 today)
}
export interface HistogramBin {
  key: string;
  level: 'season' | 'month' | 'day';
  label: string;
  ariaLabel: string;
  count: number;
  interval: Interval;
}
export type StatusState =
  | 'unavailable'
  | 'notApproved'
  | 'beforeStart'
  | 'exhausted'
  | 'littleLeft'
  | 'ongoing';
export interface StatusModel {
  state: StatusState;
  seasonStart: number;
  seasonLabel: string;
  wolfStartDay: string; // '2026-10-15'
  limit: number | null;
  hunted: number | null;
  points: number;
  remaining: number | null;
}
