// Briedžių limitai: moose limits allocated to MPV users and their use (SPEC2 §6.4), from the
// `limits.json` snapshot. Pure: view(), overview() and otherRow() read only their arguments.
import { seasonLabel } from '../../dates';
import { ATTRIBUTION_RULE, P_MOOSE, S, TOPIC_SUBTITLES, TOPIC_TABS } from '../strings';
import { CHOROPLETH_UNSET_FILL } from '../colors';
import type {
  CardDef,
  ChartDef,
  ChoroplethDef,
  ColumnDef,
  DimDef,
  HubSelection,
  KpiDef,
  LimitRow,
  Meta,
  OtherRow,
  OverviewCard,
  SnapshotData,
  TableDef,
  TopicDef,
  TopicView,
} from '../types';
import {
  DASH,
  NBSP,
  NONE,
  NOTE_NO_MPV,
  NOTE_POOLED,
  asOfSeason,
  csvName,
  emptyState,
  formatDec,
  formatInt,
  formatPct,
  kpi,
  municipalitiesByName,
  isPooled,
  municipalityMap,
  pooledNote,
  plural,
  provenance,
  seasonState as snapshotSeasonState,
  seasonsDesc,
  stateBadge,
  type Municipality,
} from './common';

export const H1 = 'Kiek briedžių leidžiama sumedžioti?';
export const METRIC_USED = 'panaudota';
export const METRIC_DENSITY = 'tankis';

// Fixed classes (§6.4).
export const CLASSES = {
  panaudota: [40, 50, 60, 80], // % of the allocated limit
  tankis: [3.5, 5, 7, 10], // limit per 10 000 ha of MPV area
};

// AM's own share (a whole number in meta.static), with the locale's NBSP and decimal comma.
const amPctText = (pct: number) => `${String(pct).replace('.', ',')}${NBSP}%`;

const T = {
  metricUsed: 'Panaudota, %',
  metricDensity: 'Limitas / 10 000 ha',
  legendUsed: (season: number) => `Panaudota limito dalis, % · ${seasonLabel(season)}`,
  legendDensity: (season: number) =>
    `Briedžių limitas per 10 000 ha medžioklės plotų · ${seasonLabel(season)}`,
  unsetLegend: 'Limitas nenustatytas',
  unsetShort: 'limitas nenustatytas',
  noLimit: 'Limitas nenustatytas',
  orderTooltip:
    'Įsakymu patvirtinta visos Lietuvos suma. Čia „leidžiama sumedžioti“ ir „panaudota“ skaičiuojami nuo MPV naudotojams paskirstyto limito; AM procentus skaičiuoja nuo įsakymo sumos.',
  overUse:
    'Sumedžiota daugiau nei paskirstyta: kai kuriuose MPV sumedžiota daugiau, nei leido limitas, arba laimikiai užregistruoti be limito. Išsamiau – AAD.',
  allocatedTooltip:
    'Tiek briedžių leidžiama sumedžioti: limitas, paskirstytas medžioklės plotų naudotojams.',
  usedLater: (season: number) => `bus žinomas po ${season + 1}-05-15`,
  registered: (asOf: string, n: number) =>
    `El. žurnale iki ${asOf} užregistruota sumedžiotų briedžių: ${formatInt(n)} (preliminarus skaičius).`,
  amPct: (pct: number, order: number) =>
    `AM skelbia ${amPctText(pct)}, nes skaičiuoja nuo įsakymu patvirtinto limito (${formatInt(order)}).`,
  left: (n: number) =>
    `Nepanaudotas likutis – ${formatInt(n)}: kiekvieno MPV nepanaudoto limito suma (MPV, kuriuose sumedžiota daugiau, nei leido limitas, neįtraukti).`,
  ofLimit: (used: number, lim: number) =>
    `${formatInt(used)} iš ${formatInt(lim)} (MPV naudotojams paskirstyto limito)`,
};

// ---------------------------------------------------------------------------
// Aggregates
// ---------------------------------------------------------------------------

interface Agg {
  mpvWithLimit: number;
  limM: number;
  limFj: number;
  usedM: number;
  usedFj: number;
  leftM: number;
  leftFj: number;
}

const emptyAgg = (): Agg => ({
  mpvWithLimit: 0,
  limM: 0,
  limFj: 0,
  usedM: 0,
  usedFj: 0,
  leftM: 0,
  leftFj: 0,
});

const lim = (a: Agg) => a.limM + a.limFj;
const used = (a: Agg) => a.usedM + a.usedFj;
const left = (a: Agg) => a.leftM + a.leftFj;
const ratio = (u: number, l: number) => (l > 0 ? u / l : null);

const indexCache = new WeakMap<LimitRow[], Map<string, Agg>>();

// key `${season}:${muni}`, muni 0 = Lietuva
function index(rows: LimitRow[]) {
  let idx = indexCache.get(rows);
  if (!idx) {
    idx = new Map();
    for (const r of rows) {
      for (const key of [`${r.season}:${r.muni}`, `${r.season}:0`]) {
        let agg = idx.get(key);
        if (!agg) {
          agg = emptyAgg();
          idx.set(key, agg);
        }
        agg.mpvWithLimit += r.mpvWithLimit;
        agg.limM += r.limM;
        agg.limFj += r.limFj;
        agg.usedM += r.usedM;
        agg.usedFj += r.usedFj;
        agg.leftM += r.leftM;
        agg.leftFj += r.leftFj;
      }
    }
    indexCache.set(rows, idx);
  }
  return idx;
}

const aggOf = (rows: LimitRow[], season: number, muni: number | null) =>
  index(rows).get(`${season}:${muni ?? 0}`) ?? emptyAgg();

const seasonState = (season: number, meta: Meta) => snapshotSeasonState(season, meta, 'limits');
const isCurrent = (season: number, meta: Meta) => seasonState(season, meta) === 'vyksta';

// Allocation default: the season containing the snapshot day (§3.3).
export const defaultSeason = (meta: Meta) => asOfSeason(meta);

// Newest season whose use is known (not running).
const closedSeason = (meta: Meta) => seasonsDesc(meta).find((s) => !isCurrent(s, meta)) ?? null;

const orderOf = (meta: Meta, season: number) => meta.static.moose.order[`${season}`] ?? null;

const pctText = (u: number, l: number) => {
  const r = ratio(u, l);
  return r === null ? DASH : formatPct(r);
};

const usedOf = (u: number, l: number) =>
  `${formatInt(u)} iš ${formatInt(l)}${l > 0 ? ` (${pctText(u, l)})` : ''}`;

const metricOf = (sel: HubSelection, meta: Meta) =>
  isCurrent(sel.season, meta) || sel.dims.rodiklis === METRIC_DENSITY
    ? METRIC_DENSITY
    : METRIC_USED;

// ---------------------------------------------------------------------------
// Answer and KPIs (§6.4)
// ---------------------------------------------------------------------------

function answer(meta: Meta, a: Agg, season: number, muni: Municipality | null, rows?: LimitRow[]) {
  const label = seasonLabel(season);
  if (muni && !muni.mpvCount) return `${muni.name}: ${S.noMpv}`;
  if (isPooled(muni)) return `${muni!.name}: ${S.pooled}`;
  if (muni && lim(a) === 0 && used(a) === 0) {
    return `${muni.name}: ${label} sezonui briedžių limitas nenustatytas.`;
  }
  if (isCurrent(season, meta)) {
    const order = orderOf(meta, season);
    const tail = !muni && order !== null ? ` (įsakymu patvirtinta ${formatInt(order)})` : '';
    const body = `${label} sezonui medžioklės plotų naudotojams paskirstytas limitas – ${formatInt(lim(a))} ${plural(lim(a), P_MOOSE)}${tail}.`;
    if (muni) return `${muni.name}: ${body}`;
    // J-15: last season's use, so the running season's panel answers without a switch.
    const closed = closedSeason(meta);
    const c = closed === null || !rows ? null : aggOf(rows, closed, null);
    return c && lim(c) > 0
      ? `${body} ${seasonLabel(closed!)} sezone sumedžiota ${formatInt(used(c))} iš ${formatInt(lim(c))} (${pctText(used(c), lim(c))}).`
      : body;
  }
  const body = `${label} sezone sumedžiota ${formatInt(used(a))} iš ${formatInt(lim(a))} paskirstyto limito (${pctText(used(a), lim(a))}).`;
  return muni ? `${muni.name}: ${body}` : body;
}

function kpis(meta: Meta, a: Agg, season: number, muni: Municipality | null): KpiDef[] {
  if ((muni && !muni.mpvCount) || isPooled(muni)) return [];
  if (isCurrent(season, meta)) {
    const list = [
      // J-15: the tile answers the question; the tooltip says what the number is.
      kpi('allocated', 'Paskirstytas limitas', formatInt(lim(a)), {
        sub: `patinai ${formatInt(a.limM)} · patelės ir jaunikliai ${formatInt(a.limFj)}`,
        tooltip: T.allocatedTooltip,
        ariaLabel: `Paskirstytas limitas ${formatInt(lim(a))}: patinai ${formatInt(a.limM)}, patelės ir jaunikliai ${formatInt(a.limFj)}`,
      }),
    ];
    const order = orderOf(meta, season);
    if (!muni && order !== null) {
      list.push(kpi('order', 'Patvirtinta įsakymu', formatInt(order), { tooltip: T.orderTooltip }));
    }
    // The date in the value slot instead of a lone "—" (DATAVIZ-07).
    list.push(
      kpi('use', 'Panaudojimas paaiškės', `po ${season + 1}-05-15`, {
        muted: true,
        ariaLabel: `Panaudojimas ${T.usedLater(season)}`,
      }),
    );
    return list;
  }
  const tile = (id: string, label: string, u: number, l: number) =>
    kpi(id, label, usedOf(u, l), {
      tooltip: T.ofLimit(u, l),
      ariaLabel: `${label}: ${formatInt(u)} iš ${formatInt(l)}${l > 0 ? `, ${pctText(u, l)}` : ''}`,
    });
  return [
    tile('used', 'Sumedžiota', used(a), lim(a)),
    tile('usedM', 'Patinai', a.usedM, a.limM),
    tile('usedFj', 'Patelės ir jaunikliai', a.usedFj, a.limFj),
  ];
}

function notes(meta: Meta, rows: LimitRow[], season: number, muni: Municipality | null) {
  const list: string[] = [];
  const a = aggOf(rows, season, muni?.code ?? null);
  if ((muni && !muni.mpvCount) || isPooled(muni)) return list;
  if (isCurrent(season, meta)) {
    list.push(T.registered(meta.snapshotDate, used(a)));
    return list;
  }
  const amPct = meta.static.moose.amUsePct[`${season}`];
  const order = orderOf(meta, season);
  if (!muni && typeof amPct === 'number' && order !== null) list.push(T.amPct(amPct, order));
  list.push(T.left(left(a)));
  const r = ratio(used(a), lim(a));
  if (r !== null && r > 1) list.push(T.overUse);
  return list;
}

// ---------------------------------------------------------------------------
// Chart: allocated vs hunted per season (§6.4)
// ---------------------------------------------------------------------------

function chart(meta: Meta, rows: LimitRow[], muni: Municipality | null): ChartDef {
  const seasons = seasonsDesc(meta).slice().reverse();
  const bars: ChartDef['bars'] = [];
  seasons.forEach((s) => {
    const a = aggOf(rows, s, muni?.code ?? null);
    const label = seasonLabel(s);
    bars.push({ label, value: lim(a), valueLabel: formatInt(lim(a)), series: 'allocated' });
    const current = isCurrent(s, meta);
    bars.push({
      label,
      value: current ? 0 : used(a),
      valueLabel: current ? DASH : formatInt(used(a)),
      series: 'used',
    });
  });
  return {
    kind: 'columns',
    title: 'Paskirstytas limitas ir sumedžiota pagal sezonus',
    axisLabel: 'Sezonas',
    bars,
    series: [
      { id: 'allocated', label: 'Paskirstytas limitas' },
      { id: 'used', label: 'Sumedžiota' },
    ],
  };
}

// ---------------------------------------------------------------------------
// Map (§6.4)
// ---------------------------------------------------------------------------

function map(meta: Meta, rows: LimitRow[], season: number, metric: string): ChoroplethDef {
  const values = new Map<number, number | null>();
  const hatched = new Set<number>();
  const labels = new Map<number, string>();
  const pooled = new Set<number>();
  const unset = new Set<number>();
  meta.municipalities.forEach((m) => {
    if (!m.mpvCount) {
      hatched.add(m.code);
      values.set(m.code, null);
      return;
    }
    if (isPooled(m)) {
      values.set(m.code, null);
      labels.set(m.code, S.pooledShort);
      pooled.add(m.code);
      return;
    }
    const a = aggOf(rows, season, m.code);
    if (lim(a) === 0) {
      values.set(m.code, null);
      labels.set(m.code, T.unsetShort);
      unset.add(m.code);
      return;
    }
    // Whole percent, as the tooltip and the table show it, so 39,6 % falls in the 40 % class.
    if (metric === METRIC_USED) values.set(m.code, Math.round((used(a) / lim(a)) * 100));
    else values.set(m.code, m.mpvHa > 0 ? (lim(a) / m.mpvHa) * 10000 : null);
  });
  const used_ = metric === METRIC_USED;
  return {
    kind: 'choropleth',
    values,
    breaks: used_ ? CLASSES.panaudota : CLASSES.tankis,
    palette: 'teal',
    special: [
      { key: 'unset', label: T.unsetLegend, fill: CHOROPLETH_UNSET_FILL, codes: unset },
      { key: 'pooled', label: S.legendPooled, fill: 'dotted', codes: pooled },
    ],
    legendTitle: used_ ? T.legendUsed(season) : T.legendDensity(season),
    format: used_
      ? (v: number) => formatPct(v / 100)
      : (v: number) => `${formatDec(v)} / 10 000 ha`,
    labels,
    hatched,
    // Classes "< 40" … "≥ 80": a use of 0 % belongs to the first class, not to white.
    zeroIsWhite: false,
    note: S.legendFixedClasses,
  };
}

// ---------------------------------------------------------------------------
// Tables (§6.4)
// ---------------------------------------------------------------------------

interface MuniRow {
  code: number | null;
  name: string;
  noMpv: boolean; // no MPV, or pooled (fewer than 3 MPV): no figures of its own
  pooled: boolean;
  a: Agg;
}

interface SeasonRow {
  season: number;
  current: boolean;
  order: number | null;
  a: Agg;
}

const usedPctValue = (a: Agg) => {
  const r = ratio(used(a), lim(a));
  return r === null ? null : Math.round(r * 1000) / 10;
};

function municipalityTable(meta: Meta, rows: LimitRow[], season: number): TableDef<MuniRow> {
  const current = isCurrent(season, meta);
  const list = municipalitiesByName(meta);
  const toRow = (m: Municipality): MuniRow => ({
    code: m.code,
    name: m.name,
    noMpv: !m.mpvCount || isPooled(m),
    pooled: isPooled(m),
    a: aggOf(rows, season, m.code),
  });
  const data = list.filter((m) => m.mpvCount && !isPooled(m)).map(toRow);
  data.push(...list.filter((m) => isPooled(m)).map(toRow));
  data.push(...list.filter((m) => !m.mpvCount).map(toRow));
  const num = (
    id: string,
    label: string,
    get: (a: Agg) => number,
    extra: Partial<ColumnDef<MuniRow>> = {},
  ): ColumnDef<MuniRow> => ({
    id,
    label,
    numeric: true,
    value: (r) => (r.noMpv ? null : get(r.a)),
    display: (r) => (r.noMpv ? NONE : formatInt(get(r.a))),
    ...extra,
  });
  const columns: ColumnDef<MuniRow>[] = [
    { id: 'name', label: 'Savivaldybė', value: (r) => r.name },
    num('mpv', 'MPV su limitu', (a) => a.mpvWithLimit),
    num('limM', 'Limitas: patinai', (a) => a.limM),
    num('limFj', 'Limitas: patelės ir jaunikliai', (a) => a.limFj),
    num('lim', 'Paskirstytas limitas', lim),
  ];
  if (!current) {
    columns.push(
      num('used', 'Sumedžiota', used),
      {
        id: 'pct',
        label: 'Panaudota, %',
        numeric: true,
        unit: '%',
        value: (r) => (r.noMpv ? null : usedPctValue(r.a)),
        display: (r) => {
          if (r.noMpv) return NONE;
          const v = ratio(used(r.a), lim(r.a));
          return v === null ? DASH : `${formatPct(v)}${v > 1 ? ' ⓘ' : ''}`;
        },
        tooltip: T.overUse,
      },
      num('left', 'Likutis', left),
    );
  }
  const footnotes = [ATTRIBUTION_RULE];
  const pooled = pooledNote(meta);
  if (pooled) footnotes.push(pooled);
  if (!current && data.some((r) => (ratio(used(r.a), lim(r.a)) ?? 0) > 1)) {
    footnotes.unshift(`ⓘ ${T.overUse}`);
  }
  if (!current && data.some((r) => !r.noMpv && lim(r.a) === 0)) {
    footnotes.unshift(
      `${DASH} stulpelyje „Panaudota“ – limitas nenustatytas, dalies apskaičiuoti negalima.`,
    );
  }
  return {
    id: 'savivaldybes',
    label: 'Savivaldybės',
    title: `Briedžių limitai pagal savivaldybes · ${seasonLabel(season)}`,
    columns,
    rows: data,
    totals: {
      code: null,
      name: S.totalsRow,
      noMpv: false,
      pooled: false,
      a: aggOf(rows, season, null),
    },
    footnotes,
    rowSav: (r) => (r.noMpv ? null : r.code),
    rowNote: (r) =>
      r.pooled ? { text: NOTE_POOLED, from: 1 } : r.noMpv ? { text: NOTE_NO_MPV, from: 1 } : null,
    csvName: csvName('briedziu-limitai', 'savivaldybes', season, null),
  };
}

function seasonTable(meta: Meta, rows: LimitRow[], muni: Municipality | null): TableDef<SeasonRow> {
  const code = muni?.code ?? null;
  const data: SeasonRow[] = seasonsDesc(meta)
    .slice()
    .reverse()
    .map((s) => ({
      season: s,
      current: isCurrent(s, meta),
      order: muni ? null : orderOf(meta, s),
      a: aggOf(rows, s, code),
    }));
  const closedNum = (id: string, label: string, get: (a: Agg) => number): ColumnDef<SeasonRow> => ({
    id,
    label,
    numeric: true,
    value: (r) => (r.current ? null : get(r.a)),
    display: (r) => (r.current ? DASH : formatInt(get(r.a))),
  });
  const columns: ColumnDef<SeasonRow>[] = [
    { id: 'season', label: 'Sezonas', value: (r) => seasonLabel(r.season) },
    {
      id: 'order',
      label: 'Patvirtinta įsakymu',
      numeric: true,
      value: (r) => r.order,
      display: (r) => (r.order === null ? DASH : formatInt(r.order)),
      tooltip: T.orderTooltip,
    },
    {
      id: 'lim',
      label: 'Paskirstytas limitas',
      numeric: true,
      value: (r) => lim(r.a),
      display: (r) => formatInt(lim(r.a)),
    },
    closedNum('used', 'Sumedžiota', used),
    {
      id: 'pct',
      label: 'Panaudota, %',
      numeric: true,
      unit: '%',
      value: (r) => (r.current ? null : usedPctValue(r.a)),
      display: (r) => (r.current ? DASH : pctText(used(r.a), lim(r.a))),
    },
    closedNum('left', 'Likutis', left),
  ];
  const dashes: string[] = [];
  if (data.some((r) => r.current)) dashes.push('sezonas vyksta, panaudojimas dar nežinomas');
  if (data.some((r) => r.order === null)) {
    dashes.push(
      muni
        ? 'įsakymu tvirtinama visos Lietuvos suma'
        : 'šio sezono įsakymo sumos šiame puslapyje nėra',
    );
  }
  return {
    id: 'sezonai',
    label: 'Sezonai',
    title: `Briedžių limitai pagal sezonus · ${muni ? muni.name : 'Lietuva'}`,
    columns,
    rows: data,
    footnotes: dashes.length ? [`${DASH} – ${dashes.join('; ')}.`] : [],
    csvName: csvName('briedziu-limitai', 'sezonai', seasonsDesc(meta)[0], code),
  };
}

// ---------------------------------------------------------------------------
// Area card (§6.4)
// ---------------------------------------------------------------------------

function card(meta: Meta, rows: LimitRow[], season: number, code: number): CardDef | null {
  const muni = municipalityMap(meta).get(code);
  if (!muni) return null;
  if (!muni.mpvCount) return { title: muni.name, lines: [S.noMpv], other: true };
  if (isPooled(muni)) return { title: muni.name, lines: [S.pooled], other: true };
  const a = aggOf(rows, season, code);
  if (lim(a) === 0 && used(a) === 0) {
    return { title: muni.name, lines: [`${T.noLimit} (${seasonLabel(season)})`], other: true };
  }
  const lines = [
    `Limitas ${seasonLabel(season)}: ${formatInt(lim(a))} (patinai ${formatInt(a.limM)} · patelės ir jaunikliai ${formatInt(a.limFj)})`,
  ];
  if (!isCurrent(season, meta)) lines.push(`Sumedžiota ${usedOf(used(a), lim(a))}`);
  lines.push(`${formatInt(a.mpvWithLimit)} MPV su limitu`);
  return { title: muni.name, lines, other: true };
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export function view(data: SnapshotData, sel: HubSelection): TopicView {
  const meta = data.meta;
  const rows = data.limits ?? [];
  const season = sel.season;
  const muni = sel.sav === null ? null : (municipalityMap(meta).get(sel.sav) ?? null);
  const a = aggOf(rows, season, muni?.code ?? null);
  const result: TopicView = {
    h1: H1,
    answer: answer(meta, a, season, muni, rows),
    badge: stateBadge(seasonState(season, meta)),
    kpis: kpis(meta, a, season, muni),
    chart: (muni && !muni.mpvCount) || isPooled(muni) ? undefined : chart(meta, rows, muni),
    notes: notes(meta, rows, season, muni),
    map: map(meta, rows, season, metricOf(sel, meta)),
    tables: [
      municipalityTable(meta, rows, season),
      isPooled(muni)
        ? { ...seasonTable(meta, rows, muni), disabled: S.pooled }
        : seasonTable(meta, rows, muni),
    ],
    provenance: provenance(data),
    card: (code) => card(meta, rows, season, code),
  };
  if (lim(aggOf(rows, season, null)) === 0) result.empty = emptyState(defaultSeason(meta));
  return result;
}

// ---------------------------------------------------------------------------
// Apžvalga card and "Kiti rodikliai čia"
// ---------------------------------------------------------------------------

export function overview(data: SnapshotData): OverviewCard {
  const meta = data.meta;
  const rows = data.limits ?? [];
  const season = defaultSeason(meta);
  const a = aggOf(rows, season, null);
  const result: OverviewCard = {
    topic: 'limitai',
    title: TOPIC_TABS.limitai,
    question: H1,
    season,
    // The same state as the panel ("vyksta" for the running allocation season).
    state: seasonState(season, meta),
    answer: answer(meta, a, season, null),
  };
  const lines: string[] = [];
  if (isCurrent(season, meta)) {
    const order = orderOf(meta, season);
    result.value = formatInt(lim(a));
    // One answer to the question; the order sum goes to the context lines, named (CONTENT-07).
    // Full form: the overview is often the first place a visitor meets the term (OVERVIEW-21).
    result.unit = 'briedžių paskirstyta medžioklės plotų naudotojams';
    if (order !== null) lines.push(`Įsakymu patvirtintas limitas – ${formatInt(order)}.`);
  } else {
    result.value = formatInt(used(a));
    result.outOf = `iš ${formatInt(lim(a))}`;
    result.unit = `briedžių sumedžiota pagal paskirstytą limitą (${pctText(used(a), lim(a))})`;
  }
  const closed = closedSeason(meta);
  if (closed !== null && closed !== season) {
    const c = aggOf(rows, closed, null);
    // Whole percent, as the panel, the table and the map show the same share (CONTENT-05).
    const amPct = meta.static.moose.amUsePct[`${closed}`];
    const am =
      typeof amPct === 'number' ? ` – AM skaičiuoja nuo įsakymo sumos: ${amPctText(amPct)}` : '';
    lines.push(
      `${seasonLabel(closed)} sezone sumedžiota ${formatInt(used(c))} iš ${formatInt(lim(c))} (${pctText(used(c), lim(c))})${am}.`,
    );
  }
  if (lines.length) result.lines = lines;
  return result;
}

export function otherRow(data: SnapshotData, sav: number): OtherRow | null {
  const meta = data.meta;
  const muni = municipalityMap(meta).get(sav);
  if (!muni || !data.limits) return null;
  const season = defaultSeason(meta);
  const head = `Briedžių limitas ${seasonLabel(season)}`;
  if (!muni.mpvCount) return { topic: 'limitai', text: `${head}: nėra MPV` };
  if (isPooled(muni)) return { topic: 'limitai', text: `${head}: ${S.pooledShort}` };
  const a = aggOf(data.limits, season, sav);
  let text = `${head}: ${lim(a) ? formatInt(lim(a)) : T.noLimit.toLowerCase()}`;
  const closed = closedSeason(meta);
  if (closed !== null && closed !== season) {
    const c = aggOf(data.limits, closed, sav);
    if (lim(c) > 0) text += ` · ${seasonLabel(closed)} panaudota ${pctText(used(c), lim(c))}`;
  }
  return { topic: 'limitai', text };
}

// ---------------------------------------------------------------------------
// Dims, About, TopicDef
// ---------------------------------------------------------------------------

export const metricDim: DimDef = {
  key: 'rodiklis',
  label: 'Rodiklis',
  // The running season offers only the density (use is known after the season, §6.4).
  options(data, sel) {
    const density = { value: METRIC_DENSITY, label: T.metricDensity };
    return isCurrent(sel.season, data.meta)
      ? [density]
      : [{ value: METRIC_USED, label: T.metricUsed }, density];
  },
  default: (sel, meta) => (isCurrent(sel.season, meta) ? METRIC_DENSITY : METRIC_USED),
};

export const about = {
  source: ['BĮIP: MPV naudotojams paskirstyti briedžių limitai ir jų laimikiai.'],
  meaning: [
    'Limitą nustato savivaldybių limitų komisijos, tvirtina aplinkos ministras. Patinai ir patelės su jaunikliais – atskiri limitai. Panaudota – sumedžiota pagal tą limitą, įskaitant ataskaitas, pateiktas po sezono (iki gegužės 15 d.). Likutis – kiekviename MPV nepanaudotas limitas, sumuojamas be MPV, kuriuose sumedžiota daugiau, nei leido limitas.',
    ATTRIBUTION_RULE,
  ],
  missing: [
    'MPV lygmens duomenų, vilkų limito (žr. „Vilkai“), kitų rūšių – briedis yra vienintelė MPV lygmeniu limituojama rūšis.',
  ],
  compare: [
    'Įsakymu patvirtinta 4 300 (2024/2025, 2025/2026) ir 3 935 (2026/2027); MPV naudotojams paskirstyta 4 184 / 4 177 / 3 802. AM procentus skaičiuoja nuo įsakymo sumos (2025/2026 – 55 %), čia – nuo paskirstyto limito (57 %).',
  ],
};

export const limitai: TopicDef = {
  id: 'limitai',
  tab: TOPIC_TABS.limitai,
  menuSubtitle: TOPIC_SUBTITLES.limitai,
  kind: 'snapshot',
  files: ['meta', 'limits'],
  seasons: seasonsDesc,
  seasonState,
  defaultSeason: (meta) => defaultSeason(meta),
  dims: [metricDim],
  defaultTable: 'savivaldybes',
  view,
  overview: (data) => overview(data),
  otherRow,
  about,
};

export default limitai;
