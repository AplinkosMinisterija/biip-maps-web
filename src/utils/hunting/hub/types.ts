// Shared contract of the hunting data hub (SPEC2 §8.2). Every task codes against these types;
// changes go through the contract owner only.
//
// Deviations from the SPEC2 §8.2 text (owner decisions, 2026-10-09):
// - Damages: every published damages count of 1 or 2 is suppressed and shipped as `null`
//   (shown as "<3"). This covers report counts, escalated counts and attacked-livestock
//   counts, not only reporters. 0 stays 0. Totals are computed in SQL on unsuppressed data,
//   so a total row can be larger than the sum of its published (non-null) parts.
// - `MetaStatic` is defined here from SPEC2 §9.3 (the spec references it without a body).

export type TopicId = 'apzvalga' | 'vilkai' | 'laimikiai' | 'limitai' | 'zala';
export type SnapshotFile = 'meta' | 'loots' | 'limits' | 'damages' | 'wolves';
export type SeasonState = 'vyksta' | 'preliminarus' | 'dalinis' | 'galutinis';
export type DamageGroup = 'kanopiniai' | 'stumbrai' | 'bebrai' | 'vilkai' | 'lusys' | 'lokiai';

// `scripts/hunting-snapshot/meta-static.json`, copied verbatim into `meta.json` as `static`
// (SPEC2 §9.3). Season keys are season start years as strings ("2025" = 2025/2026).
export interface MetaStaticWolfSeason {
  official: number | null; // AM page "Sumedžioti vilkai"
  limit: number | null; // null = not approved yet
  hunted?: number;
  speciesTable?: number; // MPV user reports (BĮIP)
  note?: string;
  draft?: { total: number; date: string }; // draft limit while `limit` is null
  sourceUrl?: string;
}
export interface MetaStatic {
  damagesFrom: string; // 'yyyy-MM-dd'
  wolves: {
    window: { from: string; to: string }; // 'MM-dd'
    seasons: Record<string, MetaStaticWolfSeason>;
    source: string;
    sourceUrl?: string;
  };
  moose: {
    order: Record<string, number>; // limit approved by order, per season
    amUsePct: Record<string, number>;
  };
  am: { loots: Record<string, number>; lootsSource: string; lootsSourceUrl?: string };
  // Species group label -> species ids, or '*' = every species not listed in another group.
  speciesGroups: Record<string, number[] | '*'>;
  classes?: string;
}

export interface Meta {
  v: 1;
  snapshotDate: string;
  generatedAt: string;
  seasons: { season: number; current: boolean }[];
  species: {
    id: number;
    name: string;
    slug: string;
    formType: string;
    group: string | null;
    isOther: boolean;
  }[];
  municipalities: {
    code: number;
    name: string;
    county: string;
    mpvCount: number;
    mpvHa: number;
    mpvSmall: number;
    // Fewer than 3 MPV: the loot and limit rows are pooled under POOLED_CODE (privacy).
    pooled: boolean;
  }[];
  static: MetaStatic; // = scripts/hunting-snapshot/meta-static.json, §9.3
}
// Loot and limit rows of the municipalities flagged `pooled` in meta are summed under this code.
export const POOLED_CODE = 1;

export interface LootRow {
  season: number;
  muni: number;
  sp: number;
  n: number;
  paper: number;
  app: number;
  m: number | null;
  f: number | null;
  j: number | null;
  dead: number;
  road: number;
}
export interface KitaRow {
  season: number;
  n: number;
  dead: number;
}
export interface LimitRow {
  season: number;
  muni: number;
  mpvWithLimit: number;
  limM: number;
  limFj: number;
  usedM: number;
  usedFj: number;
  leftM: number;
  leftFj: number;
}
// Damages counts (owner decision 2026-10-09; scripts/hunting-snapshot/privacy.mjs): every row comes
// with all its sibling rows, and null means 0, 1 or 2 ('<3') unless the measure is named in
// `hidden` (withheld so that no small count can be worked out from the totals: "neskelbiama").
export interface DamageSeasonRow {
  season: number;
  muni: number /* 0 = Lietuva */;
  grp: DamageGroup | '*';
  reports: number | null /* null = '<3', or withheld */;
  reporters: number | null /* null = '<3' or not published at this grain */;
  escalated: number | null /* kanopiniai and bebrai only; null = '<3', withheld or not published */;
  hidden: string | null /* comma-separated withheld measures */;
}
export interface DamageMonthRow {
  ym: string;
  grp: DamageGroup;
  reports: number | null /* null = '<3', or withheld */;
  hidden: string | null;
}
export interface AttackedRow {
  season: number;
  grp: 'vilkai' | 'lusys' | 'lokiai';
  cls: string;
  entries: number | null /* null = '<3' lines, or withheld */;
  animals: number | null /* null when `entries` is '<3', when itself 1 or 2, or withheld */;
  hidden: string | null;
}
export interface WolfMuniRow {
  season: number;
  muni: number;
  located: number;
}
export interface SnapshotData {
  meta: Meta;
  loots?: { rows: LootRow[]; kita: KitaRow[] };
  limits?: LimitRow[];
  damages?: { season: DamageSeasonRow[]; month: DamageMonthRow[]; attacked: AttackedRow[] };
  wolves?: WolfMuniRow[];
}

export interface HubSelection {
  topic: TopicId;
  season: number;
  sav: number | null;
  dims: Record<string, string>;
  table: string | null;
}

export type Badge = 'vyksta' | 'preliminarus' | 'dalinis' | 'bandomoji';
export interface Provenance {
  kind: 'snapshot' | 'live';
  asOf: string;
  text: string;
}
export interface KpiDef {
  id: string;
  label: string;
  value: string;
  sub?: string;
  tooltip?: string;
  ariaLabel: string;
  muted?: boolean;
}
export interface ChartBar {
  label: string;
  value: number;
  valueLabel: string;
  series?: string;
}
export interface ChartDef {
  kind: 'hbar' | 'columns' | 'stacked';
  title: string;
  bars: ChartBar[];
  series?: { id: string; label: string }[];
  note?: string;
  /** Stacked column total labels by bar label, when the parts are not all exact ("113–117"). */
  totals?: Record<string, string>;
}
export interface ChoroplethDef {
  kind: 'choropleth';
  values: Map<number, number | null>;
  breaks: number[];
  palette: 'green' | 'blue' | 'orange';
  legendTitle: string;
  format(v: number): string;
  labels?: Map<number, string> /* per-municipality value text, when `format` cannot rebuild it */;
  hatched: Set<number>;
  zeroIsWhite: boolean;
  note?: string;
  /** Municipalities drawn apart, each set with its own fill and legend row (e.g. pooled). */
  special?: { key: string; label: string; fill: string | 'dotted'; codes: Set<number> }[];
}
export interface MapMessageDef {
  kind: 'message';
  text: string;
  action?: { label: string; sel: Partial<HubSelection> };
}
export interface ColumnDef<R> {
  id: string;
  label: string;
  numeric?: boolean;
  value(r: R): string | number | null;
  display?(r: R): string;
  tooltip?: string;
  csv?: boolean /* default true */;
}
export interface TableDef<R = any> {
  id: string;
  label: string;
  columns: ColumnDef<R>[];
  rows: R[];
  totals?: R;
  footnotes: string[];
  rowSav?(r: R): number | null;
  disabled?: string;
  csvName: string;
}
export interface CardDef {
  title: string;
  lines: string[];
  other: boolean /* show "Kiti rodikliai čia" */;
}
export interface TopicView {
  h1: string;
  answer: string;
  badge?: Badge;
  notice?: string;
  fixedNote?: string;
  kpis: KpiDef[];
  chart?: ChartDef;
  notes: string[];
  map: ChoroplethDef | MapMessageDef | { kind: 'live' };
  tables: TableDef[];
  provenance: Provenance;
  empty?: { text: string; actions: MapMessageDef['action'][] };
  card(sav: number): CardDef | null;
}
export interface OverviewCard {
  topic: TopicId;
  title: string;
  question: string;
  answer: string;
  secondary?: string;
  badge?: Badge;
  fixedNote?: string;
}
export interface OtherRow {
  topic: TopicId;
  text: string;
}
export interface DimDef {
  key: string;
  label: string;
  options(
    data: SnapshotData,
    sel: HubSelection,
  ): { value: string; label: string; group?: string }[];
  default(sel: HubSelection, meta: Meta): string;
}
export interface AboutDef {
  source: string[];
  meaning: string[];
  missing: string[];
  compare: string[];
}

export interface TopicDef {
  id: TopicId;
  tab: string;
  menuSubtitle: string;
  kind: 'snapshot' | 'live' | 'overview';
  files: SnapshotFile[];
  seasons(meta: Meta): number[]; // offered, newest first
  seasonState(season: number, meta: Meta): SeasonState;
  defaultSeason(meta: Meta, today: string): number;
  dims: DimDef[];
  defaultTable: string;
  view?(data: SnapshotData, sel: HubSelection): TopicView; // snapshot topics
  overview?(data: SnapshotData, today: string): OverviewCard; // Apžvalga
  otherRow?(data: SnapshotData, sav: number): OtherRow | null; // "Kiti rodikliai čia"
  otherRowFiles?: SnapshotFile[]; // files `otherRow` reads, when they differ from `files`
  about: AboutDef;
}
