// Vilkai topic of the hunting data hub (SPEC2 §6.2, §6.1, §6.6, §7). The tab itself is
// live (`kind: 'live'`): the route mounts `HuntingHubTopicsVilkaiVilkaiTopic`, which hosts
// the wolves page's context and components. This module holds the pure parts: the
// TopicDef, the Apžvalga card, the "Kiti rodikliai čia" row, the snapshot fallback view
// used when `/wolfs` fails, and the season carried to another topic.
import {
  formatInt,
  isValidDay,
  pluralLt,
  seasonLabel,
  seasonOfDay,
  type PluralForms,
} from '@/utils/hunting/dates';
import { P_HUNTED, S, TOPIC_SUBTITLES, TOPIC_TABS } from '../strings';
import type {
  AboutDef,
  ChoroplethDef,
  HubSelection,
  KpiDef,
  Meta,
  MetaStaticWolfSeason,
  OtherRow,
  OverviewCard,
  SeasonState,
  SnapshotData,
  TableDef,
  TopicDef,
  TopicView,
} from '../types';

export const VILKAI_H1 = 'Kiek vilkų sumedžiota?';
// First season with located wolves (BIOMON); the wolves page uses the same bound.
export const VILKAI_FIRST_SEASON = 2017;
const DEFAULT_WINDOW = { from: '10-15', to: '03-31' };

const P_LOCATED: PluralForms = [
  'sumedžiotas vilkas su vieta',
  'sumedžioti vilkai su vieta',
  'sumedžiotų vilkų su vieta',
];

const percentFormat = new Intl.NumberFormat('lt-LT', {
  style: 'percent',
  maximumFractionDigits: 1,
});

// ---------------------------------------------------------------------------
// Seasons
// ---------------------------------------------------------------------------

const currentSeasonOf = (meta: Meta) =>
  meta.seasons.find((s) => s.current)?.season ?? seasonOfDay(meta.snapshotDate);

const wolfWindowOf = (meta: Meta) => meta.static?.wolves?.window || DEFAULT_WINDOW;

const staticSeason = (meta: Meta, season: number): MetaStaticWolfSeason | undefined =>
  meta.static?.wolves?.seasons?.[String(season)];

// Every season the live tab can show, newest first.
function vilkaiSeasons(meta: Meta): number[] {
  const list: number[] = [];
  for (let s = currentSeasonOf(meta); s >= VILKAI_FIRST_SEASON; s--) list.push(s);
  return list;
}

function vilkaiSeasonState(season: number, meta: Meta): SeasonState {
  return season >= currentSeasonOf(meta) ? 'vyksta' : 'galutinis';
}

// The wolves rule (SPEC §4.4) needs the records; without them the calendar decides: the
// current season once its wolf window has opened, else the previous one. The live tab
// replaces this guess with `useWolvesState`'s own default once the data is loaded.
function vilkaiDefaultSeason(meta: Meta, today: string): number {
  const season = seasonOfDay(today);
  return today < `${season}-${wolfWindowOf(meta).from}` ? season - 1 : season;
}

// ---------------------------------------------------------------------------
// Carry-over to another topic (SPEC2 §2.3 "Topic switch")
// ---------------------------------------------------------------------------

export interface VilkaiCarry {
  season: number | null; // null = the wolves default (no period key in the URL)
  sav: number | null;
  dayRange: boolean; // the period was not a full season: the target shows a coercion notice
}

const queryValue = (query: Record<string, unknown>, key: string) => {
  const value = query[key];
  return typeof value === 'string' ? value : undefined;
};

/**
 * The season and place the Vilkai tab shows, read from its URL keys (the wolves state
 * writes them 300 ms after a change). `VilkaiTopic` also exposes `carry()` with the live
 * state, which has no such delay.
 */
export function vilkaiCarryFromQuery(query: Record<string, unknown>, today: string): VilkaiCarry {
  const savRaw = queryValue(query, 'sav');
  const sav = savRaw && /^\d+$/.test(savRaw) ? Number(savRaw) : null;
  const nuo = queryValue(query, 'nuo');
  const iki = queryValue(query, 'iki');
  if (isValidDay(nuo) && isValidDay(iki) && nuo <= iki) {
    return { season: seasonOfDay(iki), sav, dayRange: true };
  }
  const match = /^(\d{4})-(\d{4})$/.exec(queryValue(query, 'sezonas') || '');
  if (match && Number(match[2]) === Number(match[1]) + 1) {
    return { season: Number(match[1]), sav, dayRange: false };
  }
  const period = queryValue(query, 'laikotarpis');
  if (period === '30d' || period === 'visi') {
    return { season: seasonOfDay(today), sav, dayRange: true };
  }
  return { season: null, sav, dayRange: false };
}

// ---------------------------------------------------------------------------
// Apžvalga card (SPEC2 §6.1)
// ---------------------------------------------------------------------------

function vilkaiOverview(data: SnapshotData, today: string): OverviewCard {
  const meta = data.meta;
  const c = seasonOfDay(today);
  const window = wolfWindowOf(meta);
  const start = `${c}-${window.from}`;
  // The window closes in the season's second calendar year.
  const end = `${c + 1}-${window.to}`;
  const current = staticSeason(meta, c);
  const label = seasonLabel(c);

  let answer: string;
  if (today < start) {
    if (current?.limit) {
      answer = `${label} sezono vilkų medžioklė prasidės ${start}, limitas – ${formatInt(
        current.limit,
      )}.`;
    } else {
      const draft = current?.draft;
      answer =
        `${label} sezono vilkų medžioklė prasidės ${start}. Limitas dar nepatvirtintas` +
        (draft ? ` (projekte – ${formatInt(draft.total)}, ${draft.date}).` : '.');
    }
  } else if (today <= end) {
    // No number: the snapshot predates the running hunt.
    answer = 'Vilkų medžioklė vyksta – naujausi skaičiai skiltyje „Vilkai“.';
  } else {
    answer = `${label} sezono vilkų medžioklė baigėsi – skaičiai skiltyje „Vilkai“.`;
  }

  const previous = staticSeason(meta, c - 1);
  let secondary: string | undefined;
  if (previous?.official != null && previous.limit) {
    secondary = `Praėjusį sezoną sumedžiota ${formatInt(previous.official)} iš ${formatInt(
      previous.limit,
    )} (${percentFormat.format(previous.official / previous.limit)}).`;
  }

  return {
    topic: 'vilkai',
    title: TOPIC_TABS.vilkai,
    question: VILKAI_H1,
    answer,
    secondary,
  };
}

// ---------------------------------------------------------------------------
// "Kiti rodikliai čia" (SPEC2 §6.6)
// ---------------------------------------------------------------------------

// The newest season whose wolf window had opened by the snapshot date: 2025/2026 on
// 2026-10-09, before the first 2026/2027 wolf can be in the copy.
function newestWolfSeason(data: SnapshotData): number | null {
  const rows = data.wolves || [];
  if (!rows.length) return null;
  const meta = data.meta;
  const limit = vilkaiDefaultSeason(meta, meta.snapshotDate);
  const seasons = rows.map((r) => r.season).filter((s) => s <= limit);
  return seasons.length ? Math.max(...seasons) : null;
}

function vilkaiOtherRow(data: SnapshotData, sav: number): OtherRow | null {
  const season = newestWolfSeason(data);
  if (season === null) return null;
  const n = (data.wolves || [])
    .filter((r) => r.season === season && r.muni === sav)
    .reduce((sum, r) => sum + r.located, 0);
  return {
    topic: 'vilkai',
    text: `Vilkai ${seasonLabel(season)}: ${formatInt(n)} ${pluralLt(n, P_HUNTED)} (su vieta)`,
  };
}

// ---------------------------------------------------------------------------
// Snapshot fallback (SPEC2 §6.2 "Fallback view", P0b)
// ---------------------------------------------------------------------------

// Located wolves per municipality: 1–2 · 3–5 · 6–10 · 11–20 · > 20. Each break is the lower
// bound of a class; 0 is drawn white (`zeroIsWhite`).
export const VILKAI_FALLBACK_BREAKS = [1, 3, 6, 11, 21];

export interface VilkaiFallbackRow {
  code: number | null;
  name: string;
  located: number;
}

/** Closed seasons in `wolves.json` (the copy holds finished seasons only), newest first. */
export function vilkaiFallbackSeasons(data: SnapshotData): number[] {
  const snapshotDate = data.meta.snapshotDate;
  const seasons = new Set<number>();
  (data.wolves || []).forEach((r) => {
    if (`${r.season + 1}-03-31` < snapshotDate) seasons.add(r.season);
  });
  return Array.from(seasons).sort((a, b) => b - a);
}

const located = (n: number) => `${formatInt(n)} ${pluralLt(n, P_LOCATED)}`;

/** The generic snapshot panel's content while the live wolves data is unavailable. */
export function vilkaiFallbackView(data: SnapshotData, sel: HubSelection): TopicView {
  const meta = data.meta;
  const snapshotDate = meta.snapshotDate;
  const offered = vilkaiFallbackSeasons(data);
  const season = offered.includes(sel.season) ? sel.season : (offered[0] ?? sel.season);
  const label = seasonLabel(season);
  const rows = (data.wolves || []).filter((r) => r.season === season);

  const byCode = new Map<number, number>();
  let national = 0;
  rows.forEach((r) => {
    national += r.located;
    if (r.muni != null) byCode.set(r.muni, (byCode.get(r.muni) || 0) + r.located);
  });
  const muniName = (code: number) => meta.municipalities.find((m) => m.code === code)?.name;
  const sav = sel.sav != null && muniName(sel.sav) ? sel.sav : null;
  const total = sav === null ? national : byCode.get(sav) || 0;
  const place = sav === null ? S.placeAll : muniName(sav)!;

  const official = staticSeason(meta, season);
  const kpis: KpiDef[] = [
    {
      id: 'located',
      label: pluralLt(total, P_LOCATED),
      value: formatInt(total),
      ariaLabel: `${label} sezonas, ${place}: ${located(total)}`,
    },
  ];
  if (official?.limit) {
    kpis.push({
      id: 'limit',
      label: `Limitas ${label}`,
      value: formatInt(official.limit),
      ariaLabel: `${label} sezono vilkų limitas ${formatInt(official.limit)}`,
    });
  }

  const notes: string[] = [];
  if (sav === null && official?.official != null) {
    notes.push(
      `Oficialus AM skaičius: ${formatInt(official.official)} (taškų su vieta: ${formatInt(
        national,
      )}).`,
    );
  }
  const unattributed = rows.filter((r) => r.muni == null).reduce((n, r) => n + r.located, 0);

  const values = new Map<number, number | null>();
  meta.municipalities.forEach((m) => values.set(m.code, byCode.get(m.code) || 0));
  const map: ChoroplethDef = {
    kind: 'choropleth',
    values,
    breaks: VILKAI_FALLBACK_BREAKS,
    palette: 'orange',
    legendTitle: `Sumedžioti vilkai su vieta, ${label}`,
    format: formatInt,
    hatched: new Set<number>(),
    zeroIsWhite: true,
  };

  const tableRows: VilkaiFallbackRow[] = meta.municipalities
    .map((m) => ({ code: m.code, name: m.name, located: byCode.get(m.code) || 0 }))
    .sort((a, b) => b.located - a.located || a.name.localeCompare(b.name, 'lt'));
  const table: TableDef<VilkaiFallbackRow> = {
    id: 'savivaldybes',
    label: 'Savivaldybės',
    columns: [
      { id: 'name', label: 'Savivaldybė', value: (r) => r.name },
      {
        id: 'located',
        label: 'Sumedžiota (su vieta)',
        numeric: true,
        value: (r) => r.located,
        display: (r) => formatInt(r.located),
      },
    ],
    rows: tableRows,
    totals: { code: null, name: S.totalsRow, located: national },
    footnotes: unattributed
      ? [`Vietos, kurios nepavyko priskirti savivaldybei: ${formatInt(unattributed)}.`]
      : [],
    rowSav: (r) => r.code,
    csvName: `vilkai_savivaldybes_${season}-${season + 1}`,
  };

  return {
    h1: VILKAI_H1,
    answer:
      `Gyvi vilkų duomenys šiuo metu nepasiekiami. Rodoma ${snapshotDate} kopija: ` +
      'užbaigti sezonai, savivaldybių lygiu.',
    notice:
      season !== sel.season && offered.length
        ? `Kopijoje ${seasonLabel(sel.season)} sezono nėra – rodomas ${label} sezonas.`
        : undefined,
    kpis,
    notes,
    map,
    tables: [table],
    provenance: { kind: 'snapshot', asOf: snapshotDate, text: S.provenanceSnapshot(snapshotDate) },
    empty: rows.length
      ? undefined
      : {
          text: S.empty,
          actions: sav === null ? [] : [{ label: S.emptyShowAll, sel: { sav: null } }],
        },
    card(code: number) {
      const name = muniName(code);
      if (!name) return null;
      return { title: name, lines: [`${label}: ${located(byCode.get(code) || 0)}`], other: true };
    },
  };
}

// ---------------------------------------------------------------------------
// About (SPEC2 §6.2). The live tab opens the wolves page's dialog (`AboutData`, with the
// counts of the loaded data) and adds `VILKAI_COMPARE` to it; these static texts serve the
// hub's generic About dialog.
// ---------------------------------------------------------------------------

export const VILKAI_COMPARE =
  '2025/2026: AM puslapis „Sumedžioti vilkai“ – 275; MPV naudotojų ataskaitose (BĮIP) – 278. ' +
  'Skirtumas: AM puslapis skaičiuoja kiekvieną vilką pagal BIOMON registraciją, ataskaitos – ' +
  'MPV naudotojų pateiktas sumas. 2024/2025: 326 (iš jų 1 žuvęs kelyje ir 6 pagal leidimus; ' +
  'sumedžiota 319), ataskaitose 320.';

const about: AboutDef = {
  source: [
    'Taškai – BIOMON duomenys (iki 2026-03-31) ir BIIP elektroninio medžioklės lapo įrašai (nuo ' +
      '2025/2026 sezono). Einamojo sezono skaitiklis ir limitas – iš BIIP.',
    'Duomenys gaunami atidarius puslapį. Jei jų gauti nepavyksta, rodoma momentinė kopija: ' +
      'užbaigti sezonai, savivaldybių lygiu.',
  ],
  meaning: [
    'Skaičiuojami vilkai, kurių sumedžiojimo vieta ir data žinomos. Vieta žemėlapyje rodoma ' +
      'apytiksliai – 1 km tinklelio langelio centre.',
    'Medžioklės sezonas – nuo balandžio 1 d. iki kovo 31 d.; vilkų medžioklė – nuo spalio 15 d. ' +
      'iki kovo 31 d. (baigiama anksčiau, jei išnaudojamas limitas).',
    'Savivaldybė nustatoma pagal sumedžiojimo vietą; prie ribų galimas nedidelis netikslumas.',
  ],
  missing: [
    'Popieriniais lapais po sezono pateiktos suvestinės neturi vietos ir tikrosios datos, todėl ' +
      'čia nerodomos ir neskaičiuojamos. Oficialus sezono skaičius dėl to gali būti didesnis.',
  ],
  compare: [VILKAI_COMPARE],
};

export const vilkai: TopicDef = {
  id: 'vilkai',
  tab: TOPIC_TABS.vilkai,
  menuSubtitle: TOPIC_SUBTITLES.vilkai,
  kind: 'live',
  // Meta only: the draft limit for the status line. `wolves` is loaded by the tab when the
  // live data fails (fallback) and by Apžvalga / "Kiti rodikliai čia".
  files: ['meta'],
  seasons: vilkaiSeasons,
  seasonState: vilkaiSeasonState,
  defaultSeason: vilkaiDefaultSeason,
  dims: [],
  defaultTable: 'irasai',
  overview: vilkaiOverview,
  otherRow: vilkaiOtherRow,
  // The live tab needs only `meta`; its "Kiti rodikliai" row reads the wolves snapshot.
  otherRowFiles: ['meta', 'wolves'],
  about,
};

export default vilkai;
