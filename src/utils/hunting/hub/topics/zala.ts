// Žala: residents' reports of damage by wild animals (SPEC2 §6.5), from `damages.json`.
// Reports, not assessed damage. Every damages count of 0, 1 or 2 of a published row's sibling
// cells arrives as null and is shown as "<3" (owner decision; scripts/hunting-snapshot/privacy.mjs);
// a cell withheld so that no small count can be worked out is "neskelbiama". Sums of parts that
// include such cells become ranges.
// Pure: view(), overview() and otherRow() read only their arguments.
import { seasonLabel, type PluralForms } from '../../dates';
import { MONTH_NAMES, MONTH_SHORT } from '../../labels';
import {
  P_ATTACKED_LIVESTOCK,
  P_RECEIVED,
  P_REPORT,
  P_REPORTER_GEN,
  P_SPECIFIED,
  S,
  TOPIC_SUBTITLES,
  TOPIC_TABS,
} from '../strings';
import type {
  AttackedRow,
  CardDef,
  ChartDef,
  ChoroplethDef,
  ColumnDef,
  DamageGroup,
  DamageMonthRow,
  DamageSeasonRow,
  DimDef,
  HubSelection,
  KpiDef,
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
  FOOTNOTE_WITHHELD,
  SUPPRESSED_RANGE_TOOLTIP,
  WITHHELD_MARK,
  ZERO,
  asOfSeason,
  cell,
  countMapValue,
  countPhrase,
  countValue,
  csvName,
  emptyState,
  formatCount,
  formatInt,
  formatMapCount,
  formatPct,
  intersectCount,
  isExact,
  isHidden,
  isSuppressed,
  kpi,
  municipalitiesByName,
  municipalityMap,
  plural,
  provenance,
  seasonState as snapshotSeasonState,
  seasonWithAsOf,
  seasonsDesc,
  stateBadge,
  sumCounts,
  type Count,
} from './common';

// Set to false if the DPO declines the municipality grain (§16.1): national KPIs, chart
// and livestock only, and a map message instead of the choropleth.
export const ZALA_MUNICIPALITY = true;

export type Preset = 'visos' | 'plesrunai' | 'augalai';
export type Grupe = Preset | DamageGroup;

export const GROUPS: DamageGroup[] = [
  'kanopiniai',
  'stumbrai',
  'bebrai',
  'vilkai',
  'lusys',
  'lokiai',
];
export const PRESETS: Record<Preset, DamageGroup[]> = {
  visos: GROUPS,
  plesrunai: ['vilkai', 'lusys', 'lokiai'],
  augalai: ['kanopiniai', 'stumbrai', 'bebrai'],
};
export const PRESET_LABELS: Record<Preset, string> = {
  visos: 'Visi',
  plesrunai: 'Plėšrūnai',
  augalai: 'Kanopiniai, stumbrai, bebrai',
};
// One help line per preset in the "Gyvūnai" tree (what the damage is to).
export const PRESET_HELP: Partial<Record<Preset, string>> = {
  plesrunai: 'Žala ūkiniams gyvūnams ir bitynams',
  augalai: 'Žala pasėliams, miškui ir melioracijai',
};
export const GROUP_LABELS: Record<DamageGroup, string> = {
  kanopiniai: 'Kanopiniai',
  stumbrai: 'Stumbrai',
  bebrai: 'Bebrai',
  vilkai: 'Vilkai',
  lusys: 'Lūšys',
  lokiai: 'Rudieji lokiai',
};
// Short labels for table heads and "Vilkai 93 · Lokiai 13" lines.
const GROUP_SHORT: Record<DamageGroup, string> = { ...GROUP_LABELS, lokiai: 'Lokiai' };

const H1: Record<Grupe, string> = {
  visos: 'Kur laukiniai gyvūnai daro žalą?',
  plesrunai: 'Kur plėšrūnai puola ūkinius gyvūnus ir bitynus?',
  augalai: 'Kur žvėrys daro žalą pasėliams, miškui ir melioracijai?',
  vilkai: 'Kur vilkai puola ūkinius gyvūnus?',
  lusys: 'Kur lūšys puola ūkinius gyvūnus?',
  lokiai: 'Kur rudieji lokiai daro žalą?',
  kanopiniai: 'Kur kanopiniai žvėrys daro žalą?',
  stumbrai: 'Kur stumbrai daro žalą?',
  bebrai: 'Kur bebrai daro žalą?',
};

const PREDATORS: AttackedRow['grp'][] = ['vilkai', 'lusys', 'lokiai'];
// Escalation is a choice only for these groups; for predators and bison the letter to the
// eldership is automatic (§6.5).
const ESCALATION_GROUPS: DamageGroup[] = ['kanopiniai', 'bebrai'];

// Livestock classes of `attacked.cls`, in table order.
const LIVESTOCK: { cls: string; label: string; short: string }[] = [
  { cls: 'avys', label: 'Avys', short: 'avys' },
  { cls: 'ozkos', label: 'Ožkos', short: 'ožkos' },
  { cls: 'galvijai', label: 'Galvijai', short: 'galvijai' },
  { cls: 'elniai', label: 'Ūkyje laikomi elniai', short: 'elniai' },
  { cls: 'alpakos', label: 'Alpakos', short: 'alpakos' },
  { cls: 'arkliai', label: 'Arkliai', short: 'arkliai' },
  { cls: 'kita', label: 'Kita', short: 'kita' },
];

// Season month order April … March.
const SEASON_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

export const T = {
  fixedNote: 'Tai gyventojų pranešimai, o ne įvertinta žala. Kompensacijos čia neskelbiamos.',
  fixedNoteCard: 'Tai gyventojų pranešimai, o ne įvertinta žala.',
  partialNotice:
    'Pranešimai apie žalą BĮIP renkami nuo 2026 m. sausio – 2025/2026 sezono duomenys daliniai.',
  escalationLabel: 'Kanopinių ir bebrų pranešimai, perduoti seniūnijai',
  escalationLabelShort: 'Perduoti seniūnijai',
  escalationTooltip:
    'Pranešėjas pažymėjo, kad su medžiotojais susitarti nepavyko, todėl pranešimas perduotas seniūnijai. Tai pranešėjo nurodymas, jis netikrintas.',
  livestockNote: 'Pranešime nurodytas skaičius; neatskiriama, ar gyvūnas žuvo, ar sužeistas.',
  reportersGroupOnly: 'Pranešėjų skaičius skelbiamas tik visoms grupėms kartu.',
  monthNote: 'Pranešimai pradėti teikti per BĮIP 2026 m. sausį; pavieniai ankstesni pranešimai.',
  municipalityPending:
    'Savivaldybių lygmens duomenys bus paskelbti suderinus su duomenų apsaugos pareigūnu.',
  legend: (season: string) => `Pranešimai apie žalą · ${season} · pagal pranešime nurodytą vietą`,
  placeNote: 'Savivaldybė nustatyta pagal pranešime nurodytą žalos vietą.',
  topCut: 'kitų savivaldybių eilės nustatyti negalima – dalis skaičių neskelbiama.',
  rankNote: 'Rikiuojama pagal mažiausią galimą skaičių.',
};

const upperFirst = (t: string) => t.charAt(0).toLocaleUpperCase('lt') + t.slice(1);
const lowerFirst = (t: string) => t.charAt(0).toLocaleLowerCase('lt') + t.slice(1);

// ---------------------------------------------------------------------------
// Selection and season rules
// ---------------------------------------------------------------------------

const isGrupe = (v: string | undefined): v is Grupe =>
  !!v &&
  (Object.prototype.hasOwnProperty.call(PRESETS, v) || GROUPS.indexOf(v as DamageGroup) >= 0);

export const grupeOf = (sel: HubSelection): Grupe =>
  isGrupe(sel.dims.grupe) ? sel.dims.grupe : 'visos';

export const groupsOf = (g: Grupe): DamageGroup[] =>
  g in PRESETS ? PRESETS[g as Preset] : [g as DamageGroup];

// The preset a grupe belongs to (a single group sits inside its preset).
export const presetOf = (g: Grupe): Preset =>
  g in PRESETS
    ? (g as Preset)
    : PRESETS.plesrunai.indexOf(g as DamageGroup) >= 0
      ? 'plesrunai'
      : 'augalai';

const isSingle = (g: Grupe) => !(g in PRESETS);

const seasonState = (season: number, meta: Meta) => snapshotSeasonState(season, meta, 'damages');

// Seasons with damage reports: those ending on or after the first collection season.
export function seasons(meta: Meta) {
  return seasonsDesc(meta).filter((s) => `${s + 1}-03-31` >= '2025-04-01');
}

export const defaultSeason = (meta: Meta) => asOfSeason(meta, seasons(meta));

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

type SeasonIdx = Map<string, DamageSeasonRow>; // `${season}:${muni}:${grp}`

const indexCache = new WeakMap<DamageSeasonRow[], SeasonIdx>();
function index(rows: DamageSeasonRow[]): SeasonIdx {
  let idx = indexCache.get(rows);
  if (!idx) {
    idx = new Map(rows.map((r) => [`${r.season}:${r.muni}:${r.grp}`, r]));
    indexCache.set(rows, idx);
  }
  return idx;
}

interface Ctx {
  meta: Meta;
  idx: SeasonIdx;
  month: DamageMonthRow[];
  attacked: AttackedRow[];
  season: number;
}

function makeCtx(data: SnapshotData, season: number): Ctx {
  return {
    meta: data.meta,
    idx: index(data.damages?.season ?? []),
    month: data.damages?.month ?? [],
    attacked: data.damages?.attacked ?? [],
    season,
  };
}

const rowOf = (c: Ctx, muni: number, grp: DamageGroup | '*') =>
  c.idx.get(`${c.season}:${muni}:${grp}`);

// A published count of a row; a missing row is 0, a null value 0–2 ("<3") or withheld.
function countAt(
  c: Ctx,
  muni: number,
  grp: DamageGroup | '*',
  key: 'reports' | 'escalated',
): Count {
  const row = rowOf(c, muni, grp);
  return row ? cell(row[key], isHidden(row, key)) : ZERO;
}

// Reports for the selected groups at a place. Visi uses the '*' row (computed in SQL on
// unsuppressed data), narrowed by its group cells when withheld; a preset or group sums its
// group cells, each narrowed by the '*' total (groupReports).
function reports(c: Ctx, muni: number, g: Grupe): Count {
  const byGroup = groupReports(c, muni);
  const parts = sumCounts(groupsOf(g).map((grp) => byGroup[grp]));
  if (g !== 'visos') return parts;
  const total = countAt(c, muni, '*', 'reports');
  return isExact(total) ? total : intersectCount(total, parts);
}

// "Kanopiniai 52 · Stumbrai 40 · kitos <3": the exact groups, then the rest as one figure
// (a rest of 1 or 2 is shown as "<3", never as the number).
function restText(rest: Count) {
  if (rest.hi === 0) return null;
  return formatCount(rest.lo === rest.hi && rest.lo > 0 && rest.lo < 3 ? { lo: 0, hi: 2 } : rest);
}
const minusCount = (a: Count, b: Count): Count => ({
  lo: Math.max(0, a.lo - b.hi),
  hi: a.hi - b.lo,
});

// Distinct reporters: published only for (season, municipality) and (season, group), and
// only when ≥ 3. Undefined = not published at this grain (multi-group preset or
// municipality × group); null = fewer than 3.
function reporters(c: Ctx, muni: number, g: Grupe): number | null | undefined {
  if (g === 'visos') {
    const row = rowOf(c, muni, '*');
    return row ? row.reporters : 0;
  }
  if (!isSingle(g) || muni !== 0) return undefined;
  const row = rowOf(c, 0, g as DamageGroup);
  return row ? row.reporters : 0;
}

// The report count of each group at a place, narrowed by the exact '*' total as a reader
// would: Kėdainiai 92 = kanopiniai 52 + stumbrai 40 leaves bebrai "<3" at exactly 0.
function groupReports(c: Ctx, muni: number): Record<DamageGroup, Count> {
  const list = GROUPS.map((grp) => countAt(c, muni, grp, 'reports'));
  const total = countAt(c, muni, '*', 'reports');
  const out = {} as Record<DamageGroup, Count>;
  GROUPS.forEach((grp, i) => {
    const n = list[i];
    if (!isExact(total) || isExact(n)) {
      out[grp] = n;
      return;
    }
    const others = sumCounts(list.filter((_, j) => j !== i));
    out[grp] = {
      ...n,
      lo: Math.max(n.lo, total.lo - others.hi),
      hi: Math.min(n.hi, total.lo - others.lo),
    };
  });
  return out;
}

// Escalated kanopiniai + bebrai reports (in the selection) out of their reports.
function escalation(c: Ctx, muni: number, g: Grupe) {
  const groups = groupsOf(g).filter((grp) => ESCALATION_GROUPS.indexOf(grp) >= 0);
  if (!groups.length) return null;
  const byGroup = groupReports(c, muni);
  const esc = sumCounts(
    groups.map((grp) => {
      const n = countAt(c, muni, grp, 'escalated');
      return { ...n, hi: Math.min(n.hi, byGroup[grp].hi) };
    }),
  );
  const all = sumCounts(groups.map((grp) => byGroup[grp]));
  return { esc, all };
}

// The share, exact or as a range when a part is "<3" ("31–37 %", "17–19 iš 52–54"); null when
// a part is withheld or there are fewer than 3 reports.
function escalationText(e: { esc: Count; all: Count }) {
  if (e.all.lo === 0 || e.esc.hi === Infinity || e.all.hi === Infinity) return null;
  if (isExact(e.esc) && isExact(e.all)) {
    const ratio = e.esc.lo / e.all.lo;
    return {
      pct: formatPct(ratio),
      of: `${formatInt(e.esc.lo)} iš ${formatInt(e.all.lo)}`,
      lo: ratio,
      hi: ratio,
    };
  }
  const lo = e.esc.lo / e.all.hi;
  const hi = Math.min(1, e.esc.hi / e.all.lo);
  const loPct = Math.round(lo * 100);
  return {
    pct: loPct === Math.round(hi * 100) ? formatPct(lo) : `${loPct}–${formatPct(hi)}`,
    of: `${formatCount(e.esc)} iš ${formatCount(e.all)}`,
    lo,
    hi,
  };
}

// Why the share is not shown: too few reports, or a part withheld.
const escalationMissingTooltip = (e: { esc: Count; all: Count }) =>
  e.all.hi < 3 ? S.suppressedReports : S.withheldTooltip;

// Animals named in one livestock row: exact; 1 or 2 when the lines are published but the sum
// is not; unknown (no upper bound) when the lines are "<3" or withheld.
function animalsOf(r: AttackedRow): Count {
  if (r.animals !== null && !isHidden(r, 'animals')) return { lo: r.animals, hi: r.animals };
  if (r.entries !== null && !isHidden(r, 'entries') && !isHidden(r, 'animals'))
    return { lo: 1, hi: 2 };
  return { lo: 0, hi: Infinity };
}

// Animals in the predators' reports: one class, or all classes (the '*' row, computed on
// unsuppressed data, narrowed by the class rows).
function attackedOf(c: Ctx, groups: DamageGroup[], cls?: string): Count {
  return sumCounts(
    groups.map((grp) => {
      const rows = c.attacked.filter((r) => r.season === c.season && r.grp === grp);
      if (cls !== undefined) {
        const row = rows.find((r) => r.cls === cls);
        return row ? animalsOf(row) : ZERO;
      }
      const parts = sumCounts(rows.filter((r) => r.cls !== '*').map(animalsOf));
      const star = rows.find((r) => r.cls === '*');
      if (!star) return parts;
      const total = animalsOf(star);
      return isExact(total) ? total : intersectCount(total, parts);
    }),
  );
}

const predatorGroups = (g: Grupe) =>
  groupsOf(g).filter((grp) => PREDATORS.indexOf(grp as AttackedRow['grp']) >= 0);

// ---------------------------------------------------------------------------
// Answer (§6.5)
// ---------------------------------------------------------------------------

function answer(c: Ctx, muni: number, g: Grupe, placeName: string | null, withTop = true) {
  const state = seasonState(c.season, c.meta);
  const r = reports(c, muni, g);
  // "gauti mažiau nei 3 pranešimai", "gauta nuo 5 iki 7 pranešimų", "gauti 503 pranešimai"
  const verb = isSuppressed(r)
    ? P_RECEIVED[1]
    : isExact(r)
      ? plural(r.lo, P_RECEIVED)
      : P_RECEIVED[2];
  const period = state === 'vyksta' ? ` (iki ${c.meta.snapshotDate})` : '';
  let text = `${seasonLabel(c.season)} sezone${period} ${verb} ${countPhrase(r, P_REPORT)} apie žalą`;
  const rep = reporters(c, muni, g);
  if (rep === null && r.hi > 0) text += ' iš mažiau nei 3 pranešėjų';
  else if (typeof rep === 'number' && rep > 0) {
    text += ` iš ${formatInt(rep)} ${plural(rep, P_REPORTER_GEN)}`;
  }
  text += '.';
  if (!placeName && withTop) {
    const top = topPlaces(c, g);
    if (top) text += ` ${top}`;
  }
  return placeName ? `${placeName}: ${text}` : text;
}

const P_MUNI: PluralForms = ['savivaldybė', 'savivaldybės', 'savivaldybių'];

export interface RankedPlace {
  name: string;
  n: Count;
}

/**
 * The leading places whose rank is certain (J-03): ordered by the lower bound, entry i is
 * kept only while its lower bound is at least the upper bound of every place not yet named,
 * and at most `max`; `cut` when a further place could still belong in the list. A count with
 * a lower bound below 3 is never named.
 *
 * Ties at the cut-off: when a place not named could have as many as the last one named, the
 * whole tie group is named if the list stays at most `tieMax` long; otherwise the list stops
 * before the group and is `cut`. `tie` then gives the group's exact value and size (null
 * when its members are ranges).
 */
export function certainTop(
  list: RankedPlace[],
  max = 3,
  tieMax = 5,
): { top: RankedPlace[]; cut: boolean; tie: { value: number; count: number } | null } {
  const sorted = list
    .slice()
    .sort((a, b) => b.n.lo - a.n.lo || a.n.hi - b.n.hi || a.name.localeCompare(b.name, 'lt'));
  // maxHiAfter[i]: the largest upper bound among sorted[i..].
  const maxHiAfter: number[] = new Array(sorted.length + 1).fill(0);
  for (let i = sorted.length - 1; i >= 0; i--) {
    maxHiAfter[i] = Math.max(sorted[i].n.hi, maxHiAfter[i + 1]);
  }
  const certain = (i: number) => sorted[i].n.lo >= 3 && sorted[i].n.lo >= maxHiAfter[i + 1];
  // After k names, no place left could have as many as the last one named.
  const clean = (k: number) => sorted[k - 1].n.lo > maxHiAfter[k];
  let k = 0;
  while (k < sorted.length && k < max && certain(k)) k++;
  if (k < max || clean(k)) {
    // Cut: fewer than `max` named although another place may have 3 or more reports.
    return { top: sorted.slice(0, k), cut: k < max && maxHiAfter[k] >= 3, tie: null };
  }
  // A tie at the cut-off: take in the places that share it, while their rank is certain.
  let end = k;
  while (end < sorted.length && end < tieMax && !clean(end) && certain(end)) end++;
  if (clean(end)) return { top: sorted.slice(0, end), cut: false, tie: null };
  // Too many (or not provably tied): stop before the group, every place that may reach it.
  const value = sorted[k - 1].n.lo;
  const start = sorted.findIndex((x) => x.n.lo <= value);
  const group = sorted.slice(start).filter((x) => x.n.hi >= value);
  const exactTie = group.every((x) => x.n.lo === value && x.n.hi === value);
  return {
    top: sorted.slice(0, start),
    cut: true,
    tie: exactTie ? { value, count: group.length } : null,
  };
}

// "Daugiausia – Kėdainių r. sav. (92), …": the municipalities with the most reports, so the
// "Kur…?" heading gets places, not only a count. Only places whose rank the published
// (partly suppressed) counts prove are named; none, and the clause is left out.
function topPlaces(c: Ctx, g: Grupe) {
  if (!ZALA_MUNICIPALITY) return null;
  const { top, cut, tie } = certainTop(
    c.meta.municipalities.map((m) => ({ name: m.name, n: reports(c, m.code, g) })),
  );
  // "dar 6 savivaldybės – po 7": a tie too large to name.
  const tieText = tie
    ? `${top.length ? 'dar ' : ''}${formatInt(tie.count)} ${plural(tie.count, P_MUNI)} – po ${formatInt(tie.value)}`
    : null;
  if (!top.length) return tieText ? `Daugiausia – ${tieText}.` : null;
  const list = top.map((x) => `${x.name} (${formatCount(x.n)})`).join(', ');
  if (tieText) return `Daugiausia – ${list}; ${tieText}.`;
  return cut ? `Daugiausia – ${list}; ${T.topCut}` : `Daugiausia – ${list}.`;
}

// ---------------------------------------------------------------------------
// KPIs (§6.5)
// ---------------------------------------------------------------------------

function countKpi(id: string, label: string, c: Count, extra: Partial<KpiDef> = {}) {
  return kpi(id, label, formatCount(c), {
    tooltip: isSuppressed(c)
      ? S.suppressedReports
      : !isExact(c)
        ? SUPPRESSED_RANGE_TOOLTIP
        : undefined,
    ...extra,
  });
}

// Groups with an exact count, largest first, then the other groups as one figure.
function groupSplit(c: Ctx, muni: number, groups: DamageGroup[], total: Count) {
  const list = groups.map((grp) => ({ grp, n: countAt(c, muni, grp, 'reports') }));
  const known = list.filter((x) => isExact(x.n) && x.n.lo > 0).sort((a, b) => b.n.lo - a.n.lo);
  const parts = known.map((x) => `${GROUP_SHORT[x.grp]} ${formatInt(x.n.lo)}`);
  const restGroups = list.filter((x) => !isExact(x.n));
  if (restGroups.length) {
    const rest = restText(minusCount(total, sumCounts(known.map((x) => x.n))));
    if (rest) parts.push(`${known.length ? 'kitos' : 'visos'} ${rest}`);
  }
  return parts.join(' · ');
}

// Livestock classes with an exact count, largest first; the classes named in fewer than 3
// lines are not split out.
function livestockLine(c: Ctx, groups: DamageGroup[]) {
  const list = LIVESTOCK.map((l) => ({ l, n: attackedOf(c, groups, l.cls) }));
  const known = list.filter((x) => isExact(x.n) && x.n.lo > 0).sort((a, b) => b.n.lo - a.n.lo);
  const parts = known.map((x) => `${x.l.short} ${formatInt(x.n.lo)}`);
  if (list.some((x) => !isExact(x.n))) parts.push('kiti – neskelbiami');
  return parts.join(' · ');
}

function kpis(c: Ctx, muni: number, g: Grupe): KpiDef[] {
  const list: KpiDef[] = [];
  const r = reports(c, muni, g);
  list.push(
    countKpi('reports', 'Pranešimai', r, {
      ariaLabel: `Pranešimai ${formatCount(r)}`,
    }),
  );
  const rep = reporters(c, muni, g);
  if (rep !== undefined) {
    list.push(
      kpi('reporters', 'Pranešėjai', rep === null ? S.suppressed : formatInt(rep), {
        tooltip: rep === null ? S.suppressedReporters : undefined,
        ariaLabel: `Pranešėjai ${rep === null ? 'mažiau nei 3' : formatInt(rep)}`,
      }),
    );
  }
  const preds = predatorGroups(g);
  // Attacked livestock is published nationally only.
  if (g === 'plesrunai' && muni === 0) {
    const total = attackedOf(c, preds);
    const parts = preds
      .map((grp) => ({ grp, n: attackedOf(c, [grp]) }))
      .filter((x) => x.n.hi > 0)
      .map((x) => `${GROUP_SHORT[x.grp].toLowerCase()} ${formatCount(x.n)}`)
      .join(', ');
    list.push(
      // The same measure has one short label (CONTENT-15).
      countKpi('attacked', 'Užpulti ūkiniai gyvūnai', total, {
        sub: parts || undefined,
        tooltip: T.livestockNote,
      }),
    );
  } else if (isSingle(g) && preds.length && muni === 0) {
    const total = attackedOf(c, preds);
    list.push(
      countKpi('attacked', 'Užpulti ūkiniai gyvūnai', total, {
        sub: livestockLine(c, preds) || undefined,
        tooltip: T.livestockNote,
      }),
    );
  }
  if (g === 'plesrunai' || g === 'augalai') {
    const split = groupSplit(c, muni, groupsOf(g), r);
    const splitLabel =
      g === 'plesrunai' ? 'Pranešimai pagal plėšrūną' : 'Pranešimai pagal gyvūnų grupę';
    if (split) list.push(kpi('split', splitLabel, split));
  }
  const e = escalation(c, muni, g);
  if (e && list.length < 3) {
    const t = escalationText(e);
    // Short label; the sub-line names what is counted, so the tile does not wrap (DATAVIZ-07).
    const label = T.escalationLabelShort;
    const ofWhat = g === 'visos' || g === 'augalai' ? ' kanopinių ir bebrų' : '';
    list.push(
      kpi('escalated', label, t ? t.pct : DASH, {
        sub: t ? `${t.of}${ofWhat}` : undefined,
        tooltip: t ? T.escalationTooltip : escalationMissingTooltip(e),
        ariaLabel: t
          ? `${T.escalationLabel}: ${t.pct}, ${t.of}${ofWhat}`
          : `${T.escalationLabel}: neskelbiama`,
      }),
    );
  }
  return list.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Chart: national stacked months (§6.5)
// ---------------------------------------------------------------------------

function seasonMonths(c: Ctx) {
  const asOf = c.meta.snapshotDate;
  return SEASON_MONTHS.map((m) => {
    const year = m >= 4 ? c.season : c.season + 1;
    return { m, ym: `${year}-${m < 10 ? `0${m}` : m}` };
  }).filter((x) => x.ym <= asOf.slice(0, 7));
}

function monthCount(c: Ctx, ym: string, grp: DamageGroup): Count {
  const row = c.month.find((r) => r.ym === ym && r.grp === grp);
  return row ? cell(row.reports, isHidden(row, 'reports')) : ZERO;
}

function chart(c: Ctx, g: Grupe): ChartDef {
  const groups = groupsOf(g);
  const bars: ChartDef['bars'] = [];
  const months = seasonMonths(c);
  const totals: Record<string, string> = {};
  months.forEach(({ m, ym }) => {
    const total = sumCounts(groups.map((grp) => monthCount(c, ym, grp)));
    if (total.hi > 0) totals[MONTH_SHORT[m]] = formatCount(total);
    groups.forEach((grp) => {
      const n = monthCount(c, ym, grp);
      bars.push({
        label: MONTH_SHORT[m],
        value: countMapValue(n) ?? 0,
        valueLabel: formatCount(n),
        series: grp,
      });
    });
  });
  const notes: string[] = [];
  const state = seasonState(c.season, c.meta);
  if (state === 'dalinis') notes.push(T.monthNote);
  if (state === 'vyksta' && months.length) {
    const last = months[months.length - 1];
    notes.push(`${upperFirst(MONTH_NAMES[last.m])} – duomenys iki ${c.meta.snapshotDate}.`);
  }
  // One note per glyph, each starting with the glyph (CONTENT-14).
  if (bars.some((b) => b.valueLabel === S.suppressed))
    notes.push(`${S.suppressed} – mažiau nei 3 pranešimai (0, 1 arba 2).`);
  // Range and "≥" totals explained next to the chart (DATAVIZ-16), each example once.
  const ranged = Array.from(new Set(Object.values(totals).filter((t) => RANGE.test(t))));
  if (ranged.length) {
    notes.push(
      `${ranged.slice(0, 2).join(', ')} – kai kurios dalys mažesnės nei 3 arba neskelbiamos; rodomos galimos ribos.`,
    );
  }
  return {
    kind: 'stacked',
    axisLabel: 'Mėnuo',
    title: `Pranešimai pagal mėnesius · Lietuva · ${seasonLabel(c.season)}`,
    bars,
    series: groups.map((grp) => ({ id: grp, label: GROUP_LABELS[grp] })),
    // One line per note (the chart renders them with `whitespace-pre-line`).
    note: notes.length ? notes.join('\n') : undefined,
    totals,
  };
}

// ---------------------------------------------------------------------------
// Map (§6.5)
// ---------------------------------------------------------------------------

export const BREAKS = [3, 6, 11, 21]; // 0 white · 1–2 · 3–5 · 6–10 · 11–20 · > 20

// Tooltip text with its unit: "59 pranešimai", "<3 pranešimai", "129–133 pranešimai".
function reportsText(n: Count) {
  const text = formatCount(n);
  if (text === S.withheld) return text;
  const last = isSuppressed(n) ? 2 : n.hi === Infinity ? n.lo : n.hi;
  return `${text} ${plural(last, P_REPORT)}`;
}

function map(c: Ctx, g: Grupe): ChoroplethDef | MapMessageDef {
  if (!ZALA_MUNICIPALITY) return { kind: 'message', text: T.municipalityPending };
  const values = new Map<number, number | null>();
  const labels = new Map<number, string>();
  let ranges = false;
  c.meta.municipalities.forEach((m) => {
    const n = reports(c, m.code, g);
    if (!isExact(n) && !isSuppressed(n)) ranges = true;
    values.set(m.code, countMapValue(n));
    labels.set(m.code, reportsText(n));
  });
  const state = seasonState(c.season, c.meta);
  return {
    kind: 'choropleth',
    values,
    breaks: BREAKS,
    palette: 'warm',
    legendTitle: T.legend(seasonWithAsOf(c.season, state, c.meta.snapshotDate)),
    format: formatMapCount,
    labels,
    hatched: new Set<number>(),
    zeroIsWhite: true,
    note: ranges ? SUPPRESSED_RANGE_TOOLTIP : undefined,
  };
}

// ---------------------------------------------------------------------------
// Tables (§6.5)
// ---------------------------------------------------------------------------

interface MuniRow {
  code: number | null;
  name: string;
  reports: Count;
  reporters: number | null | undefined;
  groups: Record<DamageGroup, Count>;
  escalation: ReturnType<typeof escalationText>;
}

interface MonthRow {
  label: string;
  total: Count;
  groups: Record<DamageGroup, Count>;
}

interface LivestockRow {
  label: string;
  groups: Record<string, Count>;
}

const isZero = (c: Count) => !c.withheld && c.lo === 0 && c.hi === 0;

const countColumn = <R>(
  id: string,
  label: string,
  get: (r: R) => Count,
  tooltip?: string,
): ColumnDef<R> => ({
  id,
  label,
  numeric: true,
  value: (r) => countValue(get(r)),
  display: (r) => formatCount(get(r)),
  // "<3" sorts as 1.5, a range by its middle, a withheld cell last (as on the map).
  sort: (r) => countMapValue(get(r)),
  tooltip,
});

// Table titles: what, where and when (DATAVIZ-19).
const seasonTitle = (c: Ctx) =>
  seasonWithAsOf(c.season, seasonState(c.season, c.meta), c.meta.snapshotDate);
const grupeTitle = (g: Grupe) =>
  g === 'visos'
    ? ''
    : ` (${(g in PRESETS ? PRESET_LABELS[g as Preset] : GROUP_LABELS[g as DamageGroup]).toLowerCase()})`;

const RANGE = /^\d[\d\s]*–\d|^≥|^iki /;
const OPEN_RANGE = /^≥/;
const PCT_RANGE = /^\d+–\d+/;

// Footnotes for the glyphs a damages table shows ("<3", ranges, "x"), each with an example
// taken from the table itself (J-12, DATAVIZ-15, DATAVIZ-18).
function glyphNotes<R>(columns: ColumnDef<R>[], rows: R[]) {
  const texts: string[] = [];
  columns
    .filter((col) => col.numeric && col.display)
    .forEach((col) => rows.forEach((r) => texts.push(col.display!(r))));
  const notes: string[] = [];
  if (texts.indexOf(S.suppressed) >= 0)
    notes.push(`${S.suppressed} – ${lowerFirst(S.suppressedReports)}`);
  // "≥" is a lower bound, not an interval: its own note.
  const atLeast = texts.find((t) => OPEN_RANGE.test(t));
  if (atLeast) {
    notes.push(`${atLeast} – dalis skaičių neskelbiama; rodoma mažiausia galima reikšmė.`);
  }
  const range = texts.find((t) => RANGE.test(t) && !OPEN_RANGE.test(t) && !/%$/.test(t));
  if (range) notes.push(`${range} – kai kurios dalys mažesnės nei 3; rodomos galimos ribos.`);
  if (texts.indexOf(S.withheld) >= 0) notes.push(FOOTNOTE_WITHHELD);
  return notes;
}

function municipalityTable(c: Ctx, g: Grupe): TableDef<MuniRow> {
  // Escalation column: kanopiniai + bebrai only (for the others the letter is automatic).
  const toRow = (code: number, name: string): MuniRow => {
    // Narrowed by the total, as the Pranešimai column is: one row never shows 0 and "<3"
    // for the same group.
    const groups = groupReports(c, code);
    const e = escalation(c, code, 'visos');
    return {
      code: code || null,
      name,
      reports: reports(c, code, g),
      reporters: g === 'visos' ? reporters(c, code, 'visos') : undefined,
      groups,
      escalation: e ? escalationText(e) : null,
    };
  };
  const rows = municipalitiesByName(c.meta).map((m) => toRow(m.code, m.name));
  const totals = toRow(0, S.totalsRow);
  const columns: ColumnDef<MuniRow>[] = [
    { id: 'name', label: 'Savivaldybė', value: (r) => r.name },
    countColumn('reports', 'Pranešimai', (r) => r.reports, `${S.suppressedReports} ${T.rankNote}`),
    {
      id: 'reporters',
      label: 'Pranešėjai',
      numeric: true,
      value: (r) =>
        r.reporters === undefined ? null : r.reporters === null ? S.suppressed : r.reporters,
      display: (r) =>
        r.reporters === undefined
          ? DASH
          : r.reporters === null
            ? r.reports.hi > 0
              ? S.suppressed
              : '0'
            : formatInt(r.reporters),
      tooltip: g === 'visos' ? S.suppressedReporters : T.reportersGroupOnly,
    },
    ...GROUPS.map((grp) =>
      countColumn<MuniRow>(grp, GROUP_SHORT[grp], (r) => r.groups[grp], S.suppressedReports),
    ),
    {
      id: 'escalated',
      // Short head, so the table fits the drawer; the tooltip names the groups.
      label: 'Perduota seniūnijai, %',
      numeric: true,
      unit: '%',
      // Exact shares as a number (1 decimal), ranges as their text ("33–57").
      value: (r) => {
        const e = r.escalation;
        if (!e) return null;
        return e.lo === e.hi ? Math.round(e.lo * 1000) / 10 : e.pct.replace(/\s*%$/, '');
      },
      display: (r) => r.escalation?.pct ?? DASH,
      sort: (r) => {
        const e = r.escalation;
        return e ? (e.lo + e.hi) / 2 : null;
      },
      tooltip: `Tik kanopinių ir bebrų pranešimai. ${T.escalationTooltip}`,
    },
  ];
  const all = [totals, ...rows];
  const footnotes = glyphNotes(columns, all);
  const pctRange = all.map((r) => r.escalation?.pct).find((t) => t && PCT_RANGE.test(t));
  if (pctRange) {
    footnotes.push(
      `${pctRange} – tiksli dalis neskelbiama, nes kai kurie skaičiai mažesni nei 3; rodomos galimos dalies ribos, todėl intervalas gali būti platus.`,
    );
  }
  if (all.some((r) => !r.escalation)) {
    footnotes.push(
      `${DASH} stulpelyje „Perduota seniūnijai, %“ – dalis neapskaičiuojama: kanopinių ir bebrų pranešimų nėra, jų mažiau nei 3 arba dalis neskelbiama.`,
    );
  }
  if (g !== 'visos')
    footnotes.push(
      `${DASH} stulpelyje „Pranešėjai“ – ${T.reportersGroupOnly.charAt(0).toLowerCase()}${T.reportersGroupOnly.slice(1)}`,
    );
  // The place rule is in the legend and the "reports, not damage" note in the panel next to
  // the table (CONTENT-14).
  footnotes.push(
    'Iš viso – skaičiuojama iš visų pranešimų, todėl gali būti didesnė už paskelbtų dalių sumą.',
  );
  return {
    id: 'savivaldybes',
    label: 'Savivaldybės',
    title: `Pranešimai apie žalą${grupeTitle(g)} pagal savivaldybes · ${seasonTitle(c)}`,
    columns,
    rows,
    totals,
    footnotes,
    // Most reports first, as the answer names them; alphabetical is one click away.
    defaultSort: { col: 'reports', dir: 'desc' },
    rowSav: (r) => r.code,
    // Phone cards: a municipality without any report is one line (same numbers, less noise).
    cardSummary: (r) =>
      isZero(r.reports) && GROUPS.every((grp) => isZero(r.groups[grp]))
        ? `0 ${plural(0, P_REPORT)}`
        : null,
    disabled: ZALA_MUNICIPALITY ? undefined : T.municipalityPending,
    csvName: csvName('zala', 'savivaldybes', c.season, null),
  };
}

function monthTable(c: Ctx): TableDef<MonthRow> {
  const rows: MonthRow[] = seasonMonths(c).map(({ m, ym }) => {
    const groups = {} as Record<DamageGroup, Count>;
    GROUPS.forEach((grp) => (groups[grp] = monthCount(c, ym, grp)));
    return {
      label: `${ym.slice(0, 4)} m. ${MONTH_NAMES[m]}`,
      total: sumCounts(GROUPS.map((grp) => groups[grp])),
      groups,
    };
  });
  const totalGroups = {} as Record<DamageGroup, Count>;
  GROUPS.forEach((grp) => (totalGroups[grp] = countAt(c, 0, grp, 'reports')));
  const totals: MonthRow = {
    label: S.totalsRow,
    total: countAt(c, 0, '*', 'reports'),
    groups: totalGroups,
  };
  const columns: ColumnDef<MonthRow>[] = [
    { id: 'month', label: 'Mėnuo', value: (r) => r.label },
    countColumn('total', 'Iš viso', (r) => r.total, SUPPRESSED_RANGE_TOOLTIP),
    ...GROUPS.map((grp) =>
      countColumn<MonthRow>(grp, GROUP_SHORT[grp], (r) => r.groups[grp], S.suppressedReports),
    ),
  ];
  return {
    id: 'menesiai',
    label: 'Mėnesiai',
    title: `Pranešimai apie žalą pagal mėnesius · Lietuva · ${seasonTitle(c)}`,
    columns,
    rows,
    totals,
    footnotes: [
      'Tik Lietuvos mastu: mėnesių duomenys savivaldybėms neskelbiami.',
      ...glyphNotes(columns, [totals, ...rows]),
    ],
    csvName: csvName('zala', 'menesiai', c.season, null),
  };
}

function livestockTable(c: Ctx): TableDef<LivestockRow> {
  const rows: LivestockRow[] = LIVESTOCK.map((l) => {
    const groups: Record<string, Count> = {};
    PREDATORS.forEach((grp) => (groups[grp] = attackedOf(c, [grp], l.cls)));
    return { label: l.label, groups };
  }).filter((r) => PREDATORS.some((grp) => r.groups[grp].hi > 0));
  const totalGroups: Record<string, Count> = {};
  PREDATORS.forEach((grp) => (totalGroups[grp] = attackedOf(c, [grp])));
  const columns: ColumnDef<LivestockRow>[] = [
    { id: 'cls', label: 'Gyvūnai', value: (r) => r.label },
    ...PREDATORS.map((grp) =>
      countColumn<LivestockRow>(grp, GROUP_SHORT[grp], (r) => r.groups[grp], T.livestockNote),
    ),
  ];
  const totals: LivestockRow = { label: S.totalsRow, groups: totalGroups };
  const texts = [totals, ...rows].flatMap((r) =>
    PREDATORS.map((grp) => formatCount(r.groups[grp])),
  );
  const footnotes = [T.livestockNote, 'Tik Lietuvos mastu.'];
  if (texts.indexOf(S.suppressed) >= 0) {
    footnotes.push(`${S.suppressed} – gyvūnų skaičius 1 arba 2, tikslus skaičius neskelbiamas.`);
  }
  if (texts.indexOf(S.withheld) >= 0) {
    footnotes.push(
      `${WITHHELD_MARK} („${S.withheld}“) – gyvūnai nurodyti mažiau nei 3 pranešimų eilutėse.`,
    );
  }
  if (texts.some((t) => t.indexOf('≥') === 0)) {
    footnotes.push('≥ – dalis skaičių neskelbiama, rodoma mažiausia galima suma.');
  }
  return {
    id: 'gyvuliai',
    label: 'Užpulti gyvūnai',
    title: `Pranešimuose nurodyti užpulti ūkiniai gyvūnai · Lietuva · ${seasonTitle(c)}`,
    columns,
    rows,
    totals,
    footnotes,
    csvName: csvName('zala', 'gyvuliai', c.season, null),
  };
}

// ---------------------------------------------------------------------------
// Area card (§6.5)
// ---------------------------------------------------------------------------

function card(c: Ctx, code: number, g: Grupe): CardDef | null {
  const muni = municipalityMap(c.meta).get(code);
  if (!muni) return null;
  const r = reports(c, code, g);
  let first = countPhrase(r, P_REPORT);
  if (g === 'visos') {
    const rep = reporters(c, code, g);
    if (rep === null && r.hi > 0) first += ' iš mažiau nei 3 pranešėjų';
    else if (typeof rep === 'number' && rep > 0) {
      first += ` iš ${formatInt(rep)} ${plural(rep, P_REPORTER_GEN)}`;
    }
  }
  const lines = [first];
  const split = groupSplit(c, code, groupsOf(g), r);
  if (split && groupsOf(g).length > 1) lines.push(split);
  const e = escalation(c, code, g);
  const t = e && escalationText(e);
  if (t) lines.push(`Kanopinių ir bebrų pranešimų perduota seniūnijai: ${t.pct} (${t.of})`);
  return { title: muni.name, lines, other: true };
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export function view(data: SnapshotData, sel: HubSelection): TopicView {
  const c = makeCtx(data, sel.season);
  const g = grupeOf(sel);
  const muniDef = sel.sav === null ? null : (municipalityMap(c.meta).get(sel.sav) ?? null);
  const muni = ZALA_MUNICIPALITY && muniDef ? muniDef.code : 0;
  const state = seasonState(c.season, c.meta);
  const notes: string[] = [];
  const preds = predatorGroups(g);
  if (preds.length && muni === 0 && g !== 'visos') notes.push(T.livestockNote);
  if (muni !== 0) notes.push(T.placeNote);
  const tables: TableDef[] = [municipalityTable(c, g), monthTable(c)];
  if (preds.length && g !== 'visos') tables.push(livestockTable(c));
  const result: TopicView = {
    h1: H1[g],
    answer: answer(c, muni, g, muni ? (muniDef?.name ?? null) : null),
    badge: stateBadge(state),
    notice: state === 'dalinis' ? T.partialNotice : undefined,
    fixedNote: T.fixedNote,
    kpis: kpis(c, muni, g),
    chart: chart(c, g),
    notes,
    map: map(c, g),
    tables,
    provenance: provenance(data),
    card: (code) => (ZALA_MUNICIPALITY ? card(c, code, g) : null),
  };
  const total = reports(c, 0, 'visos');
  if (total.hi === 0) result.empty = emptyState(defaultSeason(c.meta));
  return result;
}

// ---------------------------------------------------------------------------
// Apžvalga card and "Kiti rodikliai čia"
// ---------------------------------------------------------------------------

export function overview(data: SnapshotData): OverviewCard {
  const meta = data.meta;
  const season = defaultSeason(meta);
  const c = makeCtx(data, season);
  const state = seasonState(season, meta);
  const r = reports(c, 0, 'visos');
  const rep = reporters(c, 0, 'visos');
  const unknown = r.withheld || r.hi === Infinity;
  const result: OverviewCard = {
    topic: 'zala',
    title: TOPIC_TABS.zala,
    question: H1.visos,
    season,
    state,
    answer: answer(c, 0, 'visos', null),
    fixedNote: T.fixedNoteCard,
  };
  if (!unknown) {
    const by =
      rep === null && r.hi > 0
        ? ' iš mažiau nei 3 pranešėjų'
        : typeof rep === 'number' && rep > 0
          ? ` iš ${formatInt(rep)} ${plural(rep, P_REPORTER_GEN)}`
          : '';
    result.value = formatCount(r);
    result.unit =
      `${isExact(r) ? plural(r.lo, P_REPORT) : P_REPORT[2]} apie žalą${by}` +
      (state === 'vyksta' ? ` (iki ${meta.snapshotDate})` : '');
  }
  // The card answers its "Kur…?" question with places (OVERVIEW-19), then the wolves line.
  const lines: string[] = [];
  const top = topPlaces(c, 'visos');
  if (top) lines.push(top);
  const wolves = attackedOf(c, ['vilkai']);
  if (wolves.hi > 0) {
    const n = isExact(wolves) ? wolves.lo : null;
    lines.push(
      n === null
        ? `Pranešimuose apie vilkų išpuolius nurodyta ${countPhrase(wolves, ['užpulto ūkinio gyvūno', 'užpultų ūkinių gyvūnų', 'užpultų ūkinių gyvūnų'])}.`
        : `Pranešimuose apie vilkų išpuolius ${plural(n, P_SPECIFIED)} ${formatInt(n)} ${plural(n, P_ATTACKED_LIVESTOCK)}.`,
    );
  }
  if (lines.length) result.lines = lines;
  return result;
}

export function otherRow(data: SnapshotData, sav: number): OtherRow | null {
  if (!ZALA_MUNICIPALITY || !data.damages) return null;
  const meta = data.meta;
  if (!municipalityMap(meta).get(sav)) return null;
  const season = defaultSeason(meta);
  const c = makeCtx(data, season);
  const state = seasonState(season, meta);
  const head = `Žala ${seasonWithAsOf(season, state, meta.snapshotDate)}`;
  return { topic: 'zala', text: `${head}: ${countPhrase(reports(c, sav, 'visos'), P_REPORT)}` };
}

// ---------------------------------------------------------------------------
// Dims, About, TopicDef
// ---------------------------------------------------------------------------

export const groupDim: DimDef = {
  key: 'grupe',
  label: 'Gyvūnai',
  // Presets first, then single groups; `group` names the preset a single group belongs to.
  options() {
    const presets = (Object.keys(PRESETS) as Preset[]).map((p) => ({
      value: p,
      label: PRESET_LABELS[p],
    }));
    const singles = GROUPS.map((grp) => ({
      value: grp,
      label: GROUP_LABELS[grp],
      group: PRESET_LABELS[presetOf(grp)],
    }));
    return [...presets, ...singles];
  },
  default: () => 'visos',
};

export const about = {
  source: [
    'Gyventojų pranešimai apie laukinių gyvūnų padarytą žalą (BĮIP, medziokle.biip.lt forma).',
    'Duomenys – BĮIP duomenų kopija; jos data nurodyta eilutėje „Duomenys … būklei“. Data – pranešime nurodyta žalos pastebėjimo data (Lietuvos laiku).',
  ],
  meaning: [
    'Skaičiuojami pranešimai, o ne įvertinta žala. Kanopinių žvėrių ir bebrų žalą pirmiausia sprendžia MPV naudotojas; vilkų, lūšių, lokių ir stumbrų – seniūnija ir savivaldybės komisija.',
    'Savivaldybė nustatoma pagal pranešime nurodytą žalos vietą. Pranešėjai – skirtingi pranešimų teikėjai.',
    `Skaičiai, mažesni nei 3 (0, 1 arba 2), neskelbiami ir rodomi kaip „${S.suppressed}“; jei savivaldybėje per sezoną pranešimų visai nėra, rodomas 0. Kai kurie skaičiai gali būti „${S.withheld}“ – kad mažų skaičių nebūtų galima apskaičiuoti iš sumų. Sumos („Iš viso“) skaičiuojamos iš visų pranešimų, todėl gali būti didesnės už paskelbtų dalių sumą.`,
  ],
  missing: [
    'Žalos dydžio ir kompensacijų, tikslių vietų, datų, pranešėjų duomenų. Savivaldybių skaičiai skelbiami tik viso sezono, mėnesių – tik visos Lietuvos, kad nebūtų galima atpažinti pranešėjo.',
  ],
  compare: [
    'Oficialios žalos įvertinimo ir kompensacijų suvestinės skelbia savivaldybės; BĮIP jų neturi.',
  ],
};

// A `lentele=gyvuliai` link (advertised by the WP page) without a group opens the predators,
// whose livestock table it is (REGRESS-04); an explicit non-predator group keeps the fallback.
export function tableDims(table: string | null, dims: Record<string, string>) {
  if (table !== 'gyvuliai' || (dims.grupe && dims.grupe !== 'visos')) return null;
  return { ...dims, grupe: 'plesrunai' };
}

export const zala: TopicDef = {
  id: 'zala',
  tab: TOPIC_TABS.zala,
  menuSubtitle: TOPIC_SUBTITLES.zala,
  kind: 'snapshot',
  files: ['meta', 'damages'],
  seasons,
  seasonState,
  defaultSeason: (meta) => defaultSeason(meta),
  dims: [groupDim],
  defaultTable: 'savivaldybes',
  tableDims,
  attribution: 'place',
  view,
  overview: (data) => overview(data),
  otherRow,
  about,
};

export default zala;
