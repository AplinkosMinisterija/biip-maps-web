// Laimikiai: how many animals were hunted (SPEC2 §6.3), from the `loots.json` snapshot.
// Pure: view(), overview() and otherRow() read only their arguments.
import { seasonLabel } from '../../dates';
import {
  ATTRIBUTION_RULE,
  P_ANIMAL,
  P_ANIMAL_GEN,
  P_HUNTED,
  S,
  TOPIC_SUBTITLES,
  TOPIC_TABS,
} from '../strings';
import type {
  CardDef,
  ChartDef,
  ChoroplethDef,
  ColumnDef,
  DimDef,
  HubSelection,
  KitaRow,
  KpiDef,
  LootRow,
  MapMessageDef,
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
  NONE,
  asOfSeason,
  csvName,
  delta,
  deltaAria,
  deltaPhrase,
  emptyState,
  formatDec,
  formatInt,
  formatPct,
  hasSeason,
  kpi,
  municipalitiesByName,
  isPooled,
  pooledNote,
  municipalityMap,
  plural,
  provenance,
  seasonState as snapshotSeasonState,
  seasonsDesc,
  stateBadge,
  sum,
  type Delta,
  type Municipality,
} from './common';

export const H1 = 'Kiek gyvūnų sumedžiota?';
export const ALL_SPECIES = 'visos';
const OTHER_SPECIES = 'Kitos rūšys';
const TOP_BARS = 8;

// Fixed classes: pooled 2024 + 2025 municipality quintiles, rounded (§6.3). Values per
// `unit` ha of MPV area. Species without classes get a map message instead of a map.
export const CLASSES: Record<string, { breaks: number[]; unit: 1000 | 10000 }> = {
  visos: { breaks: [15, 19, 21, 24], unit: 1000 },
  stirna: { breaks: [3.3, 4.2, 4.9, 5.6], unit: 1000 },
  'taurusis-elnias': { breaks: [1.5, 2.1, 3.5, 5.0], unit: 1000 },
  sernas: { breaks: [1.4, 2.1, 3.0, 4.5], unit: 1000 },
  bebras: { breaks: [1.9, 2.3, 3.0, 4.1], unit: 1000 },
  lape: { breaks: [1.5, 1.7, 2.3, 3.3], unit: 1000 },
  briedis: { breaks: [1.5, 2.7, 4.3, 6.1], unit: 10000 },
};

// Species group labels in display order (meta.static.speciesGroups, §6.3).
const GROUP_ORDER = ['Kanopiniai', 'Plėšrūnai', 'Kiti žinduoliai', 'Paukščiai'];
const SEXED_FORMS = ['HORNED', 'EXTENDED'];

const T = {
  noMap:
    'Šiai rūšiai žemėlapis nebraižomas – per mažai laimikių patikimam palyginimui. Žr. lentelę.',
  currentMap: (season: number) =>
    `${seasonLabel(season)} sezono žemėlapis bus po ${season + 1}-05-15, kai MPV naudotojai pateiks sezono ataskaitas.`,
  currentNotice:
    'Didžioji dalis laimikių pateikiama po sezono (iki gegužės 15 d.), todėl šie skaičiai su ankstesniais sezonais nelyginami.',
  currentMuniDisabled: (season: number) =>
    `Einamojo sezono savivaldybių palyginimas bus po ${season + 1}-05-15.`,
  legend: (unit: number, season: number) =>
    `Sumedžiota per ${formatInt(unit)} ha MPV ploto · ${seasonLabel(season)}`,
  perUnit: (unit: number) => `per ${formatInt(unit)} ha MPV ploto`,
  perUnitShort: (unit: number) => `/ ${formatInt(unit)} ha`,
  kita: (n: number) =>
    `Be to, ataskaitose ${formatInt(n)} ${plural(n, P_ANIMAL_GEN)} rūšis nenurodyta („Kita“) – į sumas neįtraukta.`,
  wolfNote: (bip: number, official: number) =>
    `Vilkų skaičius pagal MPV naudotojų ataskaitas (${formatInt(bip)}). Oficialus AM skaičius – ${formatInt(official)}, žr. „Vilkai“.`,
  deadNote: (inconsistent: number[]) =>
    'Rasta kritusių – į sumedžiotų skaičių neįtraukta.' +
    (inconsistent.length
      ? ` ${inconsistent.map(seasonLabel).join(', ')} sezono duomenys nenuoseklūs.`
      : ''),
  deadInconsistent: (season: number) =>
    `${seasonLabel(season)} duomenys nenuoseklūs – neskelbiami.`,
  totalRow: 'Iš viso (be „Kita“)',
};

// ---------------------------------------------------------------------------
// Index: rows pre-aggregated once per loaded file (§11: view() ≤ 10 ms)
// ---------------------------------------------------------------------------

interface Agg {
  n: number;
  paper: number;
  app: number;
  m: number | null;
  f: number | null;
  j: number | null;
  dead: number;
  road: number;
}

const emptyAgg = (): Agg => ({
  n: 0,
  paper: 0,
  app: 0,
  m: null,
  f: null,
  j: null,
  dead: 0,
  road: 0,
});

const addNullable = (a: number | null, b: number | null) =>
  a === null && b === null ? null : (a ?? 0) + (b ?? 0);

function addRow(agg: Agg, r: LootRow) {
  agg.n += r.n;
  agg.paper += r.paper;
  agg.app += r.app;
  agg.m = addNullable(agg.m, r.m);
  agg.f = addNullable(agg.f, r.f);
  agg.j = addNullable(agg.j, r.j);
  agg.dead += r.dead;
  agg.road += r.road;
}

interface SeasonIndex {
  // key `${muni}:${sp}`; muni 0 = Lietuva, sp 0 = every species
  cells: Map<string, Agg>;
  species: Set<number>;
}

const indexCache = new WeakMap<LootRow[], Map<number, SeasonIndex>>();

function seasonIndex(rows: LootRow[], season: number): SeasonIndex {
  let bySeason = indexCache.get(rows);
  if (!bySeason) {
    bySeason = new Map();
    for (const r of rows) {
      let idx = bySeason.get(r.season);
      if (!idx) {
        idx = { cells: new Map(), species: new Set() };
        bySeason.set(r.season, idx);
      }
      for (const key of [`${r.muni}:${r.sp}`, `${r.muni}:0`, `0:${r.sp}`, '0:0']) {
        let agg = idx.cells.get(key);
        if (!agg) {
          agg = emptyAgg();
          idx.cells.set(key, agg);
        }
        addRow(agg, r);
      }
      idx.species.add(r.sp);
    }
    indexCache.set(rows, bySeason);
  }
  return bySeason.get(season) ?? { cells: new Map(), species: new Set() };
}

const cellOf = (idx: SeasonIndex, muni: number | null, sp: number | null) =>
  idx.cells.get(`${muni ?? 0}:${sp ?? 0}`) ?? emptyAgg();

// ---------------------------------------------------------------------------
// Species
// ---------------------------------------------------------------------------

type Species = Meta['species'][number];

function speciesGroup(meta: Meta, sp: Species) {
  if (sp.group) return sp.group;
  const groups = meta.static.speciesGroups;
  let fallback: string | null = null;
  for (const label of Object.keys(groups)) {
    const ids = groups[label];
    if (ids === '*') fallback = label;
    else if (ids.indexOf(sp.id) >= 0) return label;
  }
  return fallback ?? '';
}

export const speciesBySlug = (meta: Meta, slug: string | undefined) =>
  slug && slug !== ALL_SPECIES
    ? (meta.species.find((s) => s.slug === slug && !s.isOther) ?? null)
    : null;

const isSexed = (sp: Species | null) => !!sp && SEXED_FORMS.indexOf(sp.formType) >= 0;

// ---------------------------------------------------------------------------
// Season rules (§3.2, §3.3)
// ---------------------------------------------------------------------------

const seasonState = (season: number, meta: Meta) => snapshotSeasonState(season, meta, 'loots');

export function defaultSeason(meta: Meta) {
  const offered = seasonsDesc(meta);
  const closed = offered.find((s) => seasonState(s, meta) !== 'vyksta');
  return closed ?? offered[0];
}

// A season whose found-dead sub-counts are inconsistent (by roads > found dead nationally).
function deadInconsistent(rows: LootRow[], season: number) {
  const all = cellOf(seasonIndex(rows, season), null, null);
  return all.road > all.dead;
}

// ---------------------------------------------------------------------------
// Measures
// ---------------------------------------------------------------------------

interface Ctx {
  data: SnapshotData;
  meta: Meta;
  rows: LootRow[];
  kita: KitaRow[];
  season: number;
  prev: number | null;
  current: boolean;
  sp: Species | null;
  idx: SeasonIndex;
  prevIdx: SeasonIndex | null;
  unit: 1000 | 10000;
  ltHa: number;
}

function makeCtx(data: SnapshotData, sel: HubSelection): Ctx {
  const meta = data.meta;
  const rows = data.loots?.rows ?? [];
  const season = sel.season;
  const prev = hasSeason(meta, season - 1) ? season - 1 : null;
  const sp = speciesBySlug(meta, sel.dims.rusis);
  const idx = seasonIndex(rows, season);
  const ltHa = sum(meta.municipalities.map((m) => m.mpvHa));
  const ltN = cellOf(idx, null, sp?.id ?? null).n;
  const fixed = CLASSES[sp ? sp.slug : ALL_SPECIES];
  // Unit switches to 10 000 ha when the national density is < 1 per 1 000 ha (§6.3).
  const unit = fixed ? fixed.unit : ltHa > 0 && (ltN / ltHa) * 1000 < 1 ? 10000 : 1000;
  return {
    data,
    meta,
    rows,
    kita: data.loots?.kita ?? [],
    season,
    prev,
    current: seasonState(season, meta) === 'vyksta',
    sp,
    idx,
    prevIdx: prev === null ? null : seasonIndex(rows, prev),
    unit,
    ltHa,
  };
}

const density = (n: number, ha: number, unit: number) => (ha > 0 ? (n / ha) * unit : null);

function placeHa(c: Ctx, muni: Municipality | null) {
  return muni ? muni.mpvHa : c.ltHa;
}

function placeDelta(c: Ctx, muni: number | null): Delta | null {
  if (c.current || !c.prevIdx) return null;
  const sp = c.sp?.id ?? null;
  return delta(cellOf(c.idx, muni, sp).n, cellOf(c.prevIdx, muni, sp).n);
}

const huntedAnimals = (n: number) =>
  `${formatInt(n)} ${plural(n, P_HUNTED)} ${plural(n, P_ANIMAL)}`;

// ---------------------------------------------------------------------------
// Answer sentence (§6.3)
// ---------------------------------------------------------------------------

function answer(c: Ctx, muni: Municipality | null) {
  const label = seasonLabel(c.season);
  const n = cellOf(c.idx, muni?.code ?? null, c.sp?.id ?? null).n;
  if (c.current) {
    const prefix = [c.sp?.name, muni?.name].filter(Boolean).join(', ');
    const body = `${label} sezono el. žurnale iki ${c.meta.snapshotDate} užregistruota ${formatInt(n)}.`;
    return prefix ? `${prefix}: ${body}` : body;
  }
  const d = placeDelta(c, muni?.code ?? null);
  const tail = d && c.prev !== null ? ` – ${deltaPhrase(d, c.prev)}.` : '.';
  if (c.sp) {
    const name = muni ? `${c.sp.name}, ${muni.name}` : c.sp.name;
    return `${name}: ${label} sezone sumedžiota ${formatInt(n)}${tail}`;
  }
  const body = `${label} sezone ${plural(n, P_HUNTED)} ${formatInt(n)} ${plural(n, P_ANIMAL)}${tail}`;
  return muni ? `${muni.name} ${body}` : body;
}

// ---------------------------------------------------------------------------
// KPIs (§6.3)
// ---------------------------------------------------------------------------

function deltaTooltip(c: Ctx, d: Delta | null, muni: Municipality | null) {
  if (!d || muni || c.sp || c.prev === null) return undefined;
  const am = c.meta.static.am.loots;
  const bipPrev = cellOf(c.prevIdx as SeasonIndex, null, null).n;
  const bipCur = cellOf(c.idx, null, null).n;
  let text = `BĮIP: ${formatInt(bipPrev)} → ${formatInt(bipCur)} (${d.text}).`;
  const amPrev = am[`${c.prev}`];
  const amCur = am[`${c.season}`];
  if (typeof amPrev === 'number' && typeof amCur === 'number') {
    const amDelta = delta(amCur, amPrev);
    text += ` AM lentelės: ${formatInt(amPrev)} → ${formatInt(amCur)}${amDelta ? ` (${amDelta.text})` : ''}.`;
    if (bipPrev > amPrev) {
      text += ` ${seasonLabel(c.prev)} BĮIP skaičius didesnis, nes ataskaitos buvo taisomos po AM suvestinės.`;
    }
  }
  return text;
}

function kpis(c: Ctx, muni: Municipality | null): KpiDef[] {
  const code = muni?.code ?? null;
  const sp = c.sp?.id ?? null;
  const agg = cellOf(c.idx, code, sp);
  if (c.current) {
    return [kpi('registered', 'Užregistruota el. žurnale', formatInt(agg.n))];
  }
  const list: KpiDef[] = [];
  const d = placeDelta(c, code);
  const prevLabel = c.prev === null ? '' : seasonLabel(c.prev);
  const subject = c.sp ? '' : ` ${plural(agg.n, P_ANIMAL)}`;
  list.push(
    kpi('hunted', 'Sumedžiota', formatInt(agg.n), {
      sub: c.prev === null ? undefined : d ? `${d.text} nei ${prevLabel}` : DASH,
      tooltip: d ? deltaTooltip(c, d, muni) : c.prev === null ? undefined : S.deltaSuppressed,
      ariaLabel:
        `Sumedžiota ${formatInt(agg.n)}${subject}` +
        (d && c.prev !== null ? `, ${deltaAria(d, c.prev)}` : ''),
    }),
  );

  const dens = density(agg.n, placeHa(c, muni), c.unit);
  const ltDens = density(cellOf(c.idx, null, sp).n, c.ltHa, c.unit);
  if (dens !== null) {
    list.push(
      kpi('density', T.perUnit(c.unit), formatDec(dens), {
        sub: muni && ltDens !== null ? `Lietuvoje ${formatDec(ltDens)}` : undefined,
        ariaLabel: `${formatDec(dens)} sumedžiota ${T.perUnit(c.unit)}`,
      }),
    );
  }

  if (isSexed(c.sp) && (agg.m !== null || agg.f !== null || agg.j !== null)) {
    const value = [agg.m, agg.f, agg.j].map((v) => (v === null ? DASH : formatInt(v))).join(' · ');
    list.push(
      kpi('sexAge', 'Patinai · Patelės · Jaunikliai', value, {
        ariaLabel: `Patinai ${agg.m ?? DASH}, patelės ${agg.f ?? DASH}, jaunikliai ${agg.j ?? DASH}`,
      }),
    );
  } else if (deadInconsistent(c.rows, c.season)) {
    list.push(
      kpi('dead', 'Rasta kritusių', DASH, {
        sub: T.deadInconsistent(c.season),
        muted: true,
        ariaLabel: `Rasta kritusių: ${T.deadInconsistent(c.season)}`,
      }),
    );
  } else {
    list.push(
      kpi('dead', 'Rasta kritusių', formatInt(agg.dead), {
        sub: `iš jų prie kelių ${formatInt(agg.road)}`,
        ariaLabel: `Rasta kritusių ${formatInt(agg.dead)}, iš jų prie kelių ${formatInt(agg.road)}`,
      }),
    );
  }
  return list;
}

// ---------------------------------------------------------------------------
// Chart (§6.3)
// ---------------------------------------------------------------------------

function speciesOfPlace(c: Ctx, idx: SeasonIndex, muni: number | null) {
  const list: { sp: Species; agg: Agg }[] = [];
  c.meta.species.forEach((sp) => {
    if (sp.isOther || !idx.species.has(sp.id)) return;
    const agg = cellOf(idx, muni, sp.id);
    if (agg.n > 0 || agg.dead > 0) list.push({ sp, agg });
  });
  return list.sort((a, b) => b.agg.n - a.agg.n || a.sp.name.localeCompare(b.sp.name, 'lt'));
}

function chart(c: Ctx, muni: Municipality | null): ChartDef | undefined {
  const code = muni?.code ?? null;
  if (c.sp) {
    const seasons = c.prevIdx && c.prev !== null && !c.current ? [c.prev, c.season] : [c.season];
    const bars = seasons.map((s) => {
      const n = cellOf(seasonIndex(c.rows, s), code, c.sp!.id).n;
      return { label: seasonLabel(s), value: n, valueLabel: formatInt(n) };
    });
    return { kind: 'columns', title: `${c.sp.name}: sumedžiota pagal sezonus`, bars };
  }
  const list = speciesOfPlace(c, c.idx, code).filter((x) => x.agg.n > 0);
  if (!list.length) return undefined;
  const top = list.slice(0, TOP_BARS);
  const rest = sum(list.slice(TOP_BARS).map((x) => x.agg.n));
  const bars = top.map((x) => ({
    label: x.sp.name,
    value: x.agg.n,
    valueLabel: formatInt(x.agg.n),
  }));
  if (rest > 0) bars.push({ label: OTHER_SPECIES, value: rest, valueLabel: formatInt(rest) });
  return {
    kind: 'hbar',
    title: `${c.current ? 'Užregistruota el. žurnale' : 'Sumedžiota'} pagal rūšis · ${seasonLabel(c.season)}`,
    bars,
  };
}

// ---------------------------------------------------------------------------
// Map (§6.3)
// ---------------------------------------------------------------------------

function map(c: Ctx): ChoroplethDef | MapMessageDef {
  if (c.current) {
    const back = c.prev;
    return {
      kind: 'message',
      text: T.currentMap(c.season),
      action:
        back === null ? undefined : { label: `Rodyti ${seasonLabel(back)}`, sel: { season: back } },
    };
  }
  const fixed = CLASSES[c.sp ? c.sp.slug : ALL_SPECIES];
  if (!fixed) return { kind: 'message', text: T.noMap };
  const values = new Map<number, number | null>();
  const hatched = new Set<number>();
  const labels = new Map<number, string>();
  const pooled = new Set<number>();
  c.meta.municipalities.forEach((m) => {
    if (!m.mpvCount || !m.mpvHa) {
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
    values.set(m.code, density(cellOf(c.idx, m.code, c.sp?.id ?? null).n, m.mpvHa, fixed.unit));
  });
  return {
    kind: 'choropleth',
    values,
    breaks: fixed.breaks,
    palette: 'green',
    special: [{ key: 'pooled', label: S.legendPooled, fill: 'dotted', codes: pooled }],
    legendTitle: T.legend(fixed.unit, c.season),
    format: (v: number) => `${formatDec(v)} ${T.perUnitShort(fixed.unit)}`,
    labels,
    hatched,
    zeroIsWhite: false,
    note: S.legendFixedClasses,
  };
}

// ---------------------------------------------------------------------------
// Tables (§6.3)
// ---------------------------------------------------------------------------

interface SpeciesRow {
  name: string;
  n: number;
  delta: Delta | null;
  m: number | null;
  f: number | null;
  j: number | null;
  dead: number | null;
  road: number | null;
  appPct: number | null;
}

interface MuniRow {
  code: number | null;
  name: string;
  noMpv: boolean;
  pooled: boolean;
  mpvCount: number;
  mpvHa: number;
  n: number | null;
  density: number | null;
  delta: Delta | null;
}

const intOrNone = (v: number | null) => (v === null ? DASH : formatInt(v));

function speciesTable(c: Ctx, muni: Municipality | null): TableDef<SpeciesRow> {
  const code = muni?.code ?? null;
  const inconsistent = deadInconsistent(c.rows, c.season);
  const toRow = (name: string, agg: Agg, d: Delta | null): SpeciesRow => ({
    name,
    n: agg.n,
    delta: d,
    m: agg.m,
    f: agg.f,
    j: agg.j,
    dead: inconsistent ? null : agg.dead,
    road: inconsistent ? null : agg.road,
    appPct: agg.n > 0 ? agg.app / agg.n : null,
  });
  const prevN = (sp: number | null) =>
    c.prevIdx && !c.current ? cellOf(c.prevIdx, code, sp).n : null;
  const rows = speciesOfPlace(c, c.idx, code).map((x) =>
    toRow(x.sp.name, x.agg, delta(x.agg.n, prevN(x.sp.id))),
  );
  const totalAgg = cellOf(c.idx, code, null);
  const totals = toRow(T.totalRow, totalAgg, delta(totalAgg.n, prevN(null)));

  const prevLabel = c.prev === null ? '' : ` nei ${seasonLabel(c.prev)}`;
  const columns: ColumnDef<SpeciesRow>[] = [
    { id: 'name', label: 'Rūšis', value: (r) => r.name },
    {
      id: 'n',
      label: c.current ? 'Užregistruota el. žurnale' : 'Sumedžiota',
      numeric: true,
      value: (r) => r.n,
      display: (r) => formatInt(r.n),
    },
  ];
  if (!c.current && c.prev !== null) {
    columns.push({
      id: 'delta',
      label: `Pokytis${prevLabel}`,
      numeric: true,
      value: (r) => (r.delta ? Math.round(r.delta.pct * 10) / 10 : null),
      display: (r) => (r.delta ? r.delta.text : DASH),
      tooltip: S.deltaSuppressed,
    });
  }
  columns.push(
    {
      id: 'm',
      label: 'Patinai',
      numeric: true,
      value: (r) => r.m,
      display: (r) => intOrNone(r.m),
    },
    {
      id: 'f',
      label: 'Patelės',
      numeric: true,
      value: (r) => r.f,
      display: (r) => intOrNone(r.f),
    },
    {
      id: 'j',
      label: 'Jaunikliai',
      numeric: true,
      value: (r) => r.j,
      display: (r) => intOrNone(r.j),
    },
    {
      id: 'dead',
      label: 'Rasta kritusių',
      numeric: true,
      value: (r) => r.dead,
      display: (r) => intOrNone(r.dead),
      tooltip: inconsistent ? T.deadInconsistent(c.season) : undefined,
    },
    {
      id: 'road',
      label: 'iš jų prie kelių',
      numeric: true,
      value: (r) => r.road,
      display: (r) => intOrNone(r.road),
    },
    {
      id: 'app',
      label: 'Iš el. žurnalo, %',
      numeric: true,
      value: (r) => (r.appPct === null ? null : Math.round(r.appPct * 1000) / 10),
      display: (r) => (r.appPct === null ? DASH : formatPct(r.appPct)),
    },
  );

  const footnotes: string[] = [];
  const kita = c.kita.find((k) => k.season === c.season);
  if (kita && kita.n > 0) footnotes.push(T.kita(kita.n));
  const wolf = c.meta.species.find((s) => s.slug === 'vilkas');
  const official = c.meta.static.wolves.seasons[`${c.season}`]?.official;
  if (wolf && !muni && typeof official === 'number' && !c.current) {
    const bip = cellOf(c.idx, null, wolf.id).n;
    if (bip > 0) footnotes.push(T.wolfNote(bip, official));
  }
  const bad = seasonsDesc(c.meta)
    .filter((s) => s <= c.season && deadInconsistent(c.rows, s))
    .sort((a, b) => a - b);
  footnotes.push(T.deadNote(bad));

  return {
    id: 'rusys',
    label: 'Rūšys',
    columns,
    rows,
    totals,
    footnotes,
    csvName: csvName('laimikiai', 'rusys', c.season, code),
  };
}

function municipalityTable(c: Ctx): TableDef<MuniRow> {
  const sp = c.sp?.id ?? null;
  const toRow = (m: Municipality): MuniRow => {
    const noMpv = !m.mpvCount;
    const pooled = isPooled(m);
    const n = noMpv || pooled ? null : cellOf(c.idx, m.code, sp).n;
    return {
      code: m.code,
      name: m.name,
      noMpv,
      pooled,
      mpvCount: m.mpvCount,
      mpvHa: m.mpvHa,
      n,
      density: n === null ? null : density(n, m.mpvHa, c.unit),
      delta: noMpv || pooled ? null : placeDelta(c, m.code),
    };
  };
  const list = municipalitiesByName(c.meta);
  const rows = list.filter((m) => m.mpvCount && !isPooled(m)).map(toRow);
  rows.push(...list.filter((m) => isPooled(m)).map(toRow));
  rows.push(...list.filter((m) => !m.mpvCount).map(toRow));
  const ltN = cellOf(c.idx, null, sp).n;
  const totals: MuniRow = {
    code: null,
    name: S.totalsRow,
    noMpv: false,
    pooled: false,
    mpvCount: sum(c.meta.municipalities.map((m) => m.mpvCount)),
    mpvHa: c.ltHa,
    n: ltN,
    density: density(ltN, c.ltHa, c.unit),
    delta: placeDelta(c, null),
  };
  const dash = (r: MuniRow, text: string) => (r.noMpv ? NONE : text);
  const columns: ColumnDef<MuniRow>[] = [
    { id: 'name', label: 'Savivaldybė', value: (r) => r.name },
    {
      id: 'mpv',
      label: 'MPV',
      numeric: true,
      value: (r) => (r.noMpv ? null : r.mpvCount),
      display: (r) => dash(r, formatInt(r.mpvCount)),
    },
    {
      id: 'ha',
      label: 'MPV plotas, ha',
      numeric: true,
      value: (r) => (r.noMpv ? null : r.mpvHa),
      display: (r) => dash(r, formatInt(r.mpvHa)),
    },
    {
      id: 'n',
      label: c.sp ? `Sumedžiota: ${c.sp.name}` : 'Sumedžiota',
      numeric: true,
      value: (r) => r.n,
      display: (r) => (r.n === null ? NONE : formatInt(r.n)),
    },
    {
      id: 'density',
      label: `per ${formatInt(c.unit)} ha`,
      numeric: true,
      value: (r) => (r.density === null ? null : Math.round(r.density * 10) / 10),
      display: (r) => (r.density === null ? NONE : formatDec(r.density)),
    },
    {
      id: 'delta',
      label: 'Pokytis, %',
      numeric: true,
      value: (r) => (r.delta ? Math.round(r.delta.pct * 10) / 10 : null),
      display: (r) => (r.noMpv || r.pooled ? NONE : r.delta ? r.delta.text : DASH),
      tooltip: S.deltaSuppressed,
    },
  ];
  const pooled = pooledNote(c.meta);
  return {
    id: 'vietoves',
    label: 'Savivaldybės',
    columns,
    rows,
    totals,
    footnotes: pooled ? [ATTRIBUTION_RULE, pooled] : [ATTRIBUTION_RULE],
    rowSav: (r) => (r.noMpv ? null : r.code),
    disabled: c.current ? T.currentMuniDisabled(c.season) : undefined,
    csvName: csvName('laimikiai', 'savivaldybes', c.season, null),
  };
}

// ---------------------------------------------------------------------------
// Area card (§6.3)
// ---------------------------------------------------------------------------

function card(c: Ctx, code: number): CardDef | null {
  const muni = municipalityMap(c.meta).get(code);
  if (!muni) return null;
  if (!muni.mpvCount) return { title: muni.name, lines: [S.noMpv], other: true };
  if (isPooled(muni)) {
    const lines = [S.pooled, `${formatInt(muni.mpvCount)} MPV · ${formatInt(muni.mpvHa)} ha`];
    return { title: muni.name, lines, other: true };
  }
  const sp = c.sp?.id ?? null;
  const agg = cellOf(c.idx, code, sp);
  const lines: string[] = [];
  if (c.current) {
    lines.push(
      `${c.sp ? `${c.sp.name}: ` : ''}el. žurnale iki ${c.meta.snapshotDate} užregistruota ${formatInt(agg.n)}`,
    );
  } else {
    lines.push(c.sp ? `${c.sp.name}: sumedžiota ${formatInt(agg.n)}` : huntedAnimals(agg.n));
    const dens = density(agg.n, muni.mpvHa, c.unit);
    const lt = density(cellOf(c.idx, null, sp).n, c.ltHa, c.unit);
    if (dens !== null) {
      lines.push(
        `${formatDec(dens)} ${T.perUnitShort(c.unit)}${lt === null ? '' : ` (Lietuvoje ${formatDec(lt)})`}`,
      );
    }
    const d = placeDelta(c, code);
    if (d && c.prev !== null) lines.push(`${d.text} nei ${seasonLabel(c.prev)}`);
  }
  lines.push(`${formatInt(muni.mpvCount)} MPV · ${formatInt(muni.mpvHa)} ha`);
  if (!c.sp) {
    const top = speciesOfPlace(c, c.idx, code)
      .filter((x) => x.agg.n > 0)
      .slice(0, 3);
    if (top.length) {
      lines.push(`Daugiausia: ${top.map((x) => `${x.sp.name} ${formatInt(x.agg.n)}`).join(' · ')}`);
    }
  }
  return { title: muni.name, lines, other: true };
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export function view(data: SnapshotData, sel: HubSelection): TopicView {
  const c = makeCtx(data, sel);
  const muni = sel.sav === null ? null : (municipalityMap(c.meta).get(sel.sav) ?? null);
  const state = seasonState(c.season, c.meta);
  const base = {
    h1: H1,
    badge: stateBadge(state),
    notice: c.current ? T.currentNotice : undefined,
    map: map(c),
    provenance: provenance(data),
    card: (code: number) => card(c, code),
  };
  const tables: TableDef[] = [speciesTable(c, muni), municipalityTable(c)];

  if (muni && !muni.mpvCount) {
    return {
      ...base,
      answer: `${muni.name}: ${S.noMpv}`,
      kpis: [],
      notes: [],
      tables,
    };
  }
  if (muni && isPooled(muni)) {
    return {
      ...base,
      answer: `${muni.name}: ${S.pooled}`,
      kpis: [],
      notes: [],
      tables: [{ ...tables[0], disabled: S.pooled }, tables[1]],
    };
  }
  const notes: string[] = [];
  const kita = c.kita.find((k) => k.season === c.season);
  if (!muni && !c.sp && kita && kita.n > 0) notes.push(T.kita(kita.n));
  const result: TopicView = {
    ...base,
    answer: answer(c, muni),
    kpis: kpis(c, muni),
    chart: chart(c, muni),
    notes,
    tables,
  };
  if (cellOf(c.idx, null, null).n === 0 && cellOf(c.idx, null, null).dead === 0) {
    result.empty = emptyState(defaultSeason(c.meta));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Apžvalga card and "Kiti rodikliai čia"
// ---------------------------------------------------------------------------

export function overview(data: SnapshotData): OverviewCard {
  const meta = data.meta;
  const season = defaultSeason(meta);
  const sel: HubSelection = { topic: 'laimikiai', season, sav: null, dims: {}, table: null };
  const c = makeCtx(data, sel);
  const card: OverviewCard = {
    topic: 'laimikiai',
    title: TOPIC_TABS.laimikiai,
    question: H1,
    answer: answer(c, null),
    badge: stateBadge(seasonState(season, meta)),
  };
  const running = asOfSeason(meta);
  if (running !== season && seasonState(running, meta) === 'vyksta') {
    const n = cellOf(seasonIndex(c.rows, running), null, null).n;
    card.secondary = `Šio sezono el. žurnale iki ${meta.snapshotDate}: ${formatInt(n)}`;
    card.badge = 'vyksta';
  }
  return card;
}

export function otherRow(data: SnapshotData, sav: number): OtherRow | null {
  const meta = data.meta;
  const muni = municipalityMap(meta).get(sav);
  if (!muni || !data.loots) return null;
  const season = defaultSeason(meta);
  const head = `Laimikiai ${seasonLabel(season)}`;
  if (!muni.mpvCount) return { topic: 'laimikiai', text: `${head}: nėra MPV` };
  if (isPooled(muni)) return { topic: 'laimikiai', text: `${head}: ${S.pooledShort}` };
  const sel: HubSelection = { topic: 'laimikiai', season, sav, dims: {}, table: null };
  const c = makeCtx(data, sel);
  const n = cellOf(c.idx, sav, null).n;
  const dens = density(n, muni.mpvHa, c.unit);
  const lt = density(cellOf(c.idx, null, null).n, c.ltHa, c.unit);
  const densText =
    dens === null
      ? ''
      : ` · ${formatDec(dens)} ${T.perUnitShort(c.unit)}${lt === null ? '' : ` (Lietuvoje ${formatDec(lt)})`}`;
  return { topic: 'laimikiai', text: `${head}: ${formatInt(n)}${densText}` };
}

// ---------------------------------------------------------------------------
// Dims, About, TopicDef
// ---------------------------------------------------------------------------

export const speciesDim: DimDef = {
  key: 'rusis',
  label: 'Rūšis',
  // Species present in the selected season, grouped, each group ordered by national bag.
  options(data, sel) {
    const meta = data.meta;
    const idx = seasonIndex(data.loots?.rows ?? [], sel.season);
    const present = meta.species
      .filter((sp) => !sp.isOther && cellOf(idx, null, sp.id).n > 0)
      .map((sp) => ({ sp, n: cellOf(idx, null, sp.id).n, group: speciesGroup(meta, sp) }));
    const rank = (g: string) => {
      const i = GROUP_ORDER.indexOf(g);
      return i < 0 ? GROUP_ORDER.length : i;
    };
    present.sort((a, b) => rank(a.group) - rank(b.group) || b.n - a.n);
    return [
      { value: ALL_SPECIES, label: 'Visos' },
      ...present.map((x) => ({ value: x.sp.slug, label: x.sp.name, group: x.group })),
    ];
  },
  default: () => ALL_SPECIES,
};

export const about = {
  source: [
    'BĮIP medžioklės žurnalas: MPV naudotojų sezono ataskaitos ir elektroninis medžioklės žurnalas.',
    'Duomenys – momentinė kopija (data nurodyta apačioje); ištrinti įrašai neįtraukti.',
  ],
  meaning: [
    'Sumedžiota – visi MPV naudotojų ataskaitose ir el. žurnale nurodyti sumedžioti gyvūnai, įskaitant sumedžiotus sužeistus ar sergančius gyvūnus. Rasti kritę gyvūnai skaičiuojami atskirai. Tankis – sumedžiota per 1 000 ha medžioklės plotų vienetų ploto.',
    ATTRIBUTION_RULE,
  ],
  missing: [
    'Laimikių datų ir vietų (dauguma pateikiama sezono suma), MPV lygmens duomenų, populiacijos dydžio.',
  ],
  compare: [
    '2025/2026: BĮIP 129 485, AM lentelė „Sumedžioti žvėrys ir paukščiai“ 129 494 (skirtumas 9 – vėlesni taisymai). 2024/2025: BĮIP 119 311, AM 118 823.',
  ],
};

export const laimikiai: TopicDef = {
  id: 'laimikiai',
  tab: TOPIC_TABS.laimikiai,
  menuSubtitle: TOPIC_SUBTITLES.laimikiai,
  kind: 'snapshot',
  files: ['meta', 'loots'],
  seasons: seasonsDesc,
  seasonState,
  defaultSeason: (meta) => defaultSeason(meta),
  dims: [speciesDim],
  defaultTable: 'rusys',
  view,
  overview: (data) => overview(data),
  otherRow,
  about,
};

export default laimikiai;
