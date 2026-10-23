// ?debug=1 self-checks of the hunting data hub (SPEC2 §13 T2). The repo has no test runner;
// the debug panel runs these and prints OK / KLAIDA per check:
// - `runHubUnitChecks()`: pure rules on a synthetic fixture (season states, defaults, formats,
//   classes, CSV, URL carry-over, table zipping), the WP embed contract, the live topics'
//   registry and, when its modules are there, the Stebėjimai topic's own checks;
// - `runHubDataChecks(data)`: the committed snapshot against the expected values of §9.5,
//   the privacy rules, and every registered topic's view()/overview() on it.
// Expected values are those verified on prod for the 2026-10-09 snapshot; values marked
// "exact for a 2026-10-09 run" are only checked when meta.snapshotDate is that day.
import { WOLF_LIMITS } from '@/utils/hunting/labels';
import { foldLt, rankByQuery } from '@/components/hunting/hub/shell/shell';
import type { SelfCheckResult } from '@/utils/hunting/selfcheck';
import { classIndex, classLabels } from './classes';
import { buildTableCsv, tableCsvFileName } from './csv';
import { delta, deltaPhrase, formatCount, formatDec, formatInt, percent } from './format';
import { zip } from './adapters/snapshot';
import {
  asOfSeason,
  newestSettledSeason,
  parseSeasonKey,
  seasonKey,
  seasonMonths,
  seasonState,
  stateBadge,
} from './time';
import {
  createHeightReporter,
  createModalReporter,
  EMBED_TOPICS,
  heightMessage,
  modalMessage,
  isAllowedParent,
  PASS_KEYS,
  parseCommand,
  readyMessage,
  resolveParentOrigin,
  stateMessage,
  stateQuery,
} from './embed';
import { hubTop, isRailed, mapPadding, tableReplacesMap } from './layout';
import { firstSentence, peekSecondLine } from '@/components/hunting/hub/shell/sheet';
import {
  ABOUT_LOCALE_RULE,
  ATTRIBUTION_RULE,
  BADGE_LABELS,
  BANDOMOJI_TOOLTIP,
  S,
  TOPIC_ORDER,
  TOPIC_SUBTITLES,
  TOPIC_TABS,
} from './strings';
import { getTopic, hasTopic, LIVE_HOSTS, TOPICS } from './topics';
import { certainTop } from './topics/zala';
import {
  keptQuery,
  LIVE_TABLES,
  ownedKeys,
  STEBEJIMAI_KEYS,
  STEBEJIMAI_TABLES,
  WOLVES_KEYS,
  WOLVES_TABLES,
  wolvesCarry,
} from './url';
import type { HubSelection, Meta, SnapshotData, TableDef, TopicDef } from './types';

// The Stebėjimai topic's own modules (STEB-SPEC §4.6, §7), loaded only when they are there:
// this file builds without them, and nothing here imports them statically.
type StebModelModule = {
  STEB_URL_KEYS?: readonly string[];
  STEB_TABLES?: readonly string[];
  STEB_DEFAULT_TABLE?: string;
  STEB_GYVUNAS_RE?: RegExp;
  STEB_FAKTAS_RE?: RegExp;
};
type StebSelfCheckModule = { runStebejimaiChecks?: () => SelfCheckResult[] };
type StebStringsModule = { SS?: Record<string, unknown> };
const stebModel: StebModelModule | undefined = Object.values(
  import.meta.glob<StebModelModule>('@/utils/hunting/hub/stebejimai/model.ts', { eager: true }),
)[0];
const stebSelfCheck: StebSelfCheckModule | undefined = Object.values(
  import.meta.glob<StebSelfCheckModule>('@/utils/hunting/hub/stebejimai/selfcheck.ts', {
    eager: true,
  }),
)[0];
const stebStrings: StebStringsModule | undefined = Object.values(
  import.meta.glob<StebStringsModule>('@/utils/hunting/hub/stebejimai/strings.ts', {
    eager: true,
  }),
)[0];

// The URL keys each live topic owns (`lentele` included), as written by its host.
const LIVE_KEYS: Readonly<Record<string, readonly string[]>> = Object.freeze(
  Object.assign(Object.create(null) as Record<string, readonly string[]>, {
    vilkai: WOLVES_KEYS,
    stebejimai: STEBEJIMAI_KEYS,
  }),
);

export type { SelfCheckResult };
export { formatSelfChecks } from '@/utils/hunting/selfcheck';

export const HUB_SELFCHECK_DAY = '2026-10-09';

function runner() {
  const results: SelfCheckResult[] = [];
  const check = (name: string, fn: () => boolean | string) => {
    try {
      const outcome = fn();
      results.push(
        outcome === true ? { name, ok: true } : { name, ok: false, detail: String(outcome) },
      );
    } catch (e) {
      results.push({ name, ok: false, detail: e instanceof Error ? e.message : String(e) });
    }
  };
  const eq = (actual: unknown, expected: unknown) =>
    JSON.stringify(actual) === JSON.stringify(expected) ||
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
  return { results, check, eq };
}

// Synthetic meta: three seasons, the 2026-10-09 snapshot, no real municipality data.
export function fixtureMeta(snapshotDate = HUB_SELFCHECK_DAY): Meta {
  return {
    v: 1,
    snapshotDate,
    generatedAt: `${snapshotDate}T08:00:00.000Z`,
    seasons: [
      { season: 2024, current: false },
      { season: 2025, current: false },
      { season: 2026, current: true },
    ],
    species: [],
    municipalities: [
      {
        code: 99,
        name: 'Bandomoji sav.',
        county: 'Bandomoji',
        mpvCount: 1,
        mpvHa: 1000,
        mpvSmall: 0,
        pooled: false,
      },
    ],
    static: {
      damagesFrom: '2026-01-01',
      wolves: { window: { from: '10-15', to: '03-31' }, seasons: {}, source: '' },
      moose: { order: {}, amUsePct: {} },
      am: { loots: {}, lootsSource: '' },
      speciesGroups: {},
    },
  };
}

export function runHubUnitChecks(): SelfCheckResult[] {
  const { results, check, eq } = runner();
  const meta = fixtureMeta();

  check('Sezono būsena 2026-10-09', () =>
    eq(
      [2024, 2025, 2026].map((s) => [
        seasonState(s, 'loots', meta),
        seasonState(s, 'limits', meta),
        seasonState(s, 'damages', meta),
      ]),
      [
        ['galutinis', 'galutinis', 'dalinis'],
        ['galutinis', 'galutinis', 'dalinis'],
        ['vyksta', 'vyksta', 'vyksta'],
      ],
    ),
  );
  check('Preliminarūs iki 05-29', () => {
    const may = fixtureMeta('2026-05-29');
    const june = fixtureMeta('2026-05-30');
    return eq(
      [seasonState(2025, 'loots', may), seasonState(2025, 'loots', june), stateBadge('galutinis')],
      ['preliminarus', 'galutinis', undefined],
    );
  });
  check('Numatytieji sezonai', () =>
    eq([newestSettledSeason(meta), asOfSeason(meta)], [2025, 2026]),
  );
  check('Sezono raktas URL', () =>
    eq(
      [
        seasonKey(2025),
        parseSeasonKey('2025-2026'),
        parseSeasonKey('2025-2027'),
        parseSeasonKey(5),
      ],
      ['2025-2026', 2025, null, null],
    ),
  );
  check('Sezono mėnesiai', () => {
    const months = seasonMonths(2025);
    return eq(
      [months[0], months[8], months[11], months.length],
      ['2025-04', '2025-12', '2026-03', 12],
    );
  });
  check('Skaičių formatai', () =>
    eq(
      [
        formatInt(129485),
        formatDec(20.56),
        formatDec(16, 1, true),
        percent(2372, 4177),
        percent(275, 307, 1),
        formatCount(null),
        formatCount(0),
      ],
      ['129\u00a0485', '20,6', '16,0', '57\u00a0%', '89,6\u00a0%', '<3', '0'],
    ),
  );
  check('Pokytis (Δ)', () => {
    const up = delta(129485, 119311);
    const down = delta(2372, 2825);
    return eq(
      [
        up?.text,
        down?.text,
        delta(100, 100)?.text,
        delta(19, 300),
        delta(300, 19),
        deltaPhrase(up, '2024/2025'),
      ],
      [
        '+8,5\u00a0%',
        '\u221216,0\u00a0%',
        'tiek pat',
        null,
        null,
        '8,5\u00a0% daugiau nei 2024/2025 sezone',
      ],
    );
  });
  check('Paieška: žodžio pradžia pirmiau (Vieta, Rūšis)', () => {
    const keyed = (labels: string[], group?: string) =>
      labels.map((label) => ({ label, group, key: foldLt(label) }));
    const places = keyed([
      'Visa Lietuva',
      'Kaišiadorių r. sav.',
      'Kauno m. sav.',
      'Kauno r. sav.',
      'Šilutės r. sav.',
      'Utenos r. sav.',
    ]);
    const labels = (q: string) => rankByQuery(places, foldLt(q)).map((i) => i.label);
    // Grouped (Rūšis): a group stays together, the group with the best hit first.
    const grouped = (a: string[], b: string[]) =>
      rankByQuery([...keyed(a, 'A'), ...keyed(b, 'B')], 'bbb').map((i) => i.label);
    return eq(
      [
        labels('ute')[0],
        labels('Kau'),
        labels('kaisiadoriu'),
        labels(''),
        grouped(['Aaa bbb', 'Xbbb'], ['Bbb c']),
        grouped(['Xbbb'], ['Bbb c']),
      ],
      [
        'Utenos r. sav.',
        ['Kauno m. sav.', 'Kauno r. sav.'],
        ['Kaišiadorių r. sav.'],
        places.map((i) => i.label),
        ['Aaa bbb', 'Xbbb', 'Bbb c'],
        ['Bbb c', 'Xbbb'],
      ],
    );
  });
  check('Klasės', () =>
    eq(
      [
        [0, 14.9, 15, 23.9, 24, 99].map((v) => classIndex(v, [15, 19, 21, 24])),
        classLabels([15, 19, 21, 24]),
        classLabels([40, 50, 60, 80], { integer: true, unit: '%' }),
        classLabels([3, 6, 11, 21], { integer: true, min: 1, lastGreater: true }),
      ],
      [
        [0, 0, 1, 3, 4, 4],
        ['< 15', '15–19', '19–21', '21–24', '≥ 24'],
        ['< 40 %', '40–49 %', '50–59 %', '60–79 %', '≥ 80 %'],
        ['1–2', '3–5', '6–10', '11–20', '> 20'],
      ],
    ),
  );
  check('CSV: BOM, kilmė, formulės, <3', () => {
    type Row = { name: string; n: number | null; d: number };
    const table: TableDef<Row> = {
      id: 't',
      label: 'Lentelė',
      columns: [
        { id: 'name', label: 'Savivaldybė', value: (r) => r.name },
        {
          id: 'n',
          label: 'Pranešimai',
          numeric: true,
          value: (r) => r.n,
          display: (r) => formatCount(r.n),
        },
        { id: 'd', label: 'per 1 000 ha', numeric: true, value: (r) => r.d },
        { id: 'x', label: 'Paslėpta', value: () => 'x', csv: false },
      ],
      rows: [
        { name: '=SUM(A1)', n: null, d: 20.6 },
        { name: 'A; "B"', n: 12, d: 3 },
      ],
      totals: { name: 'Iš viso', n: 14, d: 1.5 },
      footnotes: ['Pastaba'],
      csvName: 'žala_2026-2027',
    };
    const csv = buildTableCsv(table, {
      provenance: { kind: 'snapshot', asOf: '2026-10-09', text: '' },
    });
    if (csv[0] !== '\ufeff') return 'no BOM';
    return eq(
      [csv.slice(1).split('\r\n'), tableCsvFileName(table)],
      [
        [
          '# Duomenys 2026-10-09 būklei; BĮIP',
          'Savivaldybė;Pranešimai;per 1 000 ha',
          'Iš viso;14;1,5',
          "'=SUM(A1);<3;20,6",
          '"A; ""B""";12;3',
          '# Pastaba',
          '',
        ],
        'zala_2026-2027.csv',
      ],
    );
  });
  check('CSV: eilutės pastaba (Neskelbiama, Nėra MPV)', () => {
    type Row = { name: string; mpv: number; n: number | null; d: number | null };
    const table: TableDef<Row> = {
      id: 't',
      label: 'Lentelė',
      columns: [
        { id: 'name', label: 'Savivaldybė', value: (r) => r.name },
        { id: 'mpv', label: 'MPV', numeric: true, value: (r) => r.mpv },
        { id: 'x', label: 'Paslėpta', value: () => 'x', csv: false },
        { id: 'n', label: 'Sumedžiota', numeric: true, value: (r) => r.n, display: () => '–' },
        { id: 'd', label: 'per 1 000 ha', numeric: true, value: (r) => r.d, display: () => '–' },
      ],
      rows: [
        { name: 'A', mpv: 5, n: 7, d: 1.5 },
        { name: 'B', mpv: 2, n: null, d: null },
        { name: 'C', mpv: 0, n: null, d: null },
      ],
      footnotes: [],
      rowNote: (r) =>
        r.name === 'B'
          ? { text: 'Neskelbiama (mažiau nei 3 MPV)', from: 2 }
          : r.name === 'C'
            ? { text: 'Nėra MPV', from: 1 }
            : null,
      csvName: 't',
    };
    const csv = buildTableCsv(table, {
      provenance: { kind: 'snapshot', asOf: '2026-10-09', text: '' },
    });
    return eq(csv.slice(1).split('\r\n').slice(2, 5), [
      'A;5;7;1,5',
      'B;2;Neskelbiama (mažiau nei 3 MPV);',
      'C;;;',
    ]);
  });
  check('CSV: „–“ kaip ekrane (csvDash)', () => {
    type Row = { name: string; n: number | null };
    const table: TableDef<Row> = {
      id: 't',
      label: 'Lentelė',
      columns: [
        { id: 'name', label: 'Sezonas', value: (r) => r.name },
        {
          id: 'n',
          label: 'Sumedžiota',
          numeric: true,
          value: (r) => r.n,
          display: (r) => (r.n === null ? '–' : formatInt(r.n)),
        },
      ],
      rows: [
        { name: 'A', n: null },
        { name: 'B', n: 3 },
      ],
      footnotes: ['– – sezonas vyksta.'],
      csvName: 't',
    };
    const lines = (t: TableDef<Row>) =>
      buildTableCsv(t, { provenance: { kind: 'snapshot', asOf: '2026-10-09', text: '' } })
        .slice(1)
        .split('\r\n')
        .slice(2, 5);
    return eq(
      [lines(table), lines({ ...table, csvDash: true })],
      [
        ['A;', 'B;3', '# – – sezonas vyksta.'],
        ['A;–', 'B;3', '# – – sezonas vyksta.'],
      ],
    );
  });
  check('Lentelių stulpeliai (zip)', () => {
    const rows = zip<{ a: number; b: string }>(
      { columns: ['b', 'extra', 'a'], rows: [['x', 'secret', 1]] },
      { a: 'a', b: 'b' },
    );
    let missing = false;
    try {
      zip({ columns: ['a'], rows: [] }, { a: 'a', b: 'b' });
    } catch (e) {
      missing = true;
    }
    return eq([rows, missing], [[{ a: 1, b: 'x' }], true]);
  });
  check('URL: svetimi raktai lieka', () =>
    eq(
      keptQuery({
        x: '1',
        y: '2',
        z: '3',
        debug: '1',
        tema: 'zala',
        grupe: 'vilkai',
        nuo: 'a',
        foo: 'b',
      }),
      {
        x: '1',
        y: '2',
        z: '3',
        debug: '1',
        foo: 'b',
      },
    ),
  );
  check('URL: vilkų laikotarpis → sezonas', () =>
    eq(
      [
        wolvesCarry({ nuo: '2025-04-01', iki: '2026-03-31' }, HUB_SELFCHECK_DAY),
        wolvesCarry({ nuo: '2025-12-01', iki: '2026-01-31' }, HUB_SELFCHECK_DAY),
        wolvesCarry({ sezonas: '2024-2025' }, HUB_SELFCHECK_DAY),
        wolvesCarry({ laikotarpis: '30d' }, HUB_SELFCHECK_DAY),
        wolvesCarry({}, HUB_SELFCHECK_DAY),
      ],
      [
        { season: 2025, fromRange: false },
        { season: 2025, fromRange: true },
        { season: 2024, fromRange: false },
        { season: 2026, fromRange: true },
        null,
      ],
    ),
  );
  check('Žala: „Daugiausia“ – tik tikra eilės tvarka', () => {
    const r = (name: string, lo: number, hi = lo) => ({ name, n: { lo, hi } });
    const names = (list: ReturnType<typeof r>[]) => {
      const out = certainTop(list);
      return [out.top.map((x) => x.name), out.cut];
    };
    return eq(
      [
        // J-03: 2025/2026 kanopiniai – Kėdainių 3–17 and Alytaus 1–15 may exceed Kauno 6–13.
        names([
          r('Kauno', 6, 13),
          r('Kaišiadorių', 5),
          r('Šiaulių', 3),
          r('Kėdainių', 3, 17),
          r('Alytaus', 1, 15),
        ]),
        names([r('A', 20), r('B', 10, 12), r('C', 9), r('D', 0, 2)]),
        names([r('A', 20), r('B', 5, 15), r('C', 12)]),
        names([r('A', 2), r('B', 0, 2)]),
        names([r('A', 7), r('B', 7)]),
      ],
      [
        [[], true],
        [['A', 'B', 'C'], false],
        [['A'], true],
        [[], false],
        [['A', 'B'], false],
      ],
    );
  });
  check('Žala: „Daugiausia“ – lygūs skaičiai ties riba', () => {
    const r = (name: string, lo: number, hi = lo) => ({ name, n: { lo, hi } });
    const out = (list: ReturnType<typeof r>[]) => {
      const x = certainTop(list);
      return [x.top.map((y) => y.name), x.cut, x.tie];
    };
    const seven = ['B', 'C', 'D', 'E', 'F', 'G'].map((n) => r(n, 7));
    return eq(
      [
        // the whole tie group fits (≤ 5 names): all named, the list is complete
        out([r('A', 10), r('D', 7), r('C', 7), r('B', 7), r('E', 2)]),
        // 6 places with 7: too many to name, stop before them
        out([r('A', 10), ...seven, r('H', 1)]),
        // all tied, none named
        out(seven),
        // a range could reach the cut-off: not provably tied, stop before the group
        out([r('A', 10), r('B', 7), r('C', 7), r('D', 5, 7), r('E', 5, 7)]),
        // a range below the cut-off whose rank is still certain: named
        out([r('A', 10), r('B', 7), r('C', 7), r('D', 5, 7), r('E', 2)]),
      ],
      [
        [['A', 'B', 'C', 'D'], false, null],
        [['A'], true, { value: 7, count: 6 }],
        [[], true, { value: 7, count: 6 }],
        [['A'], true, null],
        [['A', 'B', 'C', 'D'], false, null],
      ],
    );
  });
  runEmbedChecks(check, eq);
  runLiveTopicChecks(check, eq);
  runCopyChecks(check);
  results.push(...stebejimaiModuleChecks());
  return results;
}

// ---------------------------------------------------------------------------
// UI copy: forbidden words (strings.ts header) in every shared text
// ---------------------------------------------------------------------------

// Every text of a strings table: plain strings, and functions called with sample arguments.
function textsOf(table: Record<string, unknown> | undefined): string[] {
  if (!table) return [];
  return Object.values(table).flatMap((value) => {
    if (typeof value === 'string') return [value];
    if (typeof value !== 'function') return [];
    try {
      return [String((value as (...args: unknown[]) => unknown)('2026-10-09', 3, 'x', 'y'))];
    } catch (err) {
      return [];
    }
  });
}

/** The shared UI texts: hub strings, Stebėjimai strings, badges and every topic's About. */
export function uiTexts(): string[] {
  return [
    ...textsOf(S as unknown as Record<string, unknown>),
    ...textsOf(stebStrings?.SS),
    ...Object.values(BADGE_LABELS),
    BANDOMOJI_TOOLTIP,
    ...Object.values(TOPIC_TABS),
    ...Object.values(TOPIC_SUBTITLES),
    ...TOPICS.flatMap((t) => [
      t.tab,
      t.menuSubtitle,
      ...t.about.source,
      ...t.about.meaning,
      ...t.about.missing,
      ...t.about.compare,
      ...(t.aboutCommon || []),
    ]),
  ];
}

// Words that must never render: "būrelis" (official: MPV naudotojas), and the prototype /
// test-version wording, which would reach production when the gate is lifted (D9).
export const FORBIDDEN_UI_WORDS: readonly RegExp[] = [/būrel/i, /prototip/i, /bandomoji versija/i];

export function forbiddenWordsIn(texts: string[]): string[] {
  const text = texts.join(' ');
  return FORBIDDEN_UI_WORDS.filter((re) => re.test(text)).map((re) => re.source);
}

function runCopyChecks(check: Check) {
  // J-09: a topic counted by the reported place must not also claim the MPV-sum rule.
  check('Apie duomenis: savivaldybės priskyrimas (MPV / vieta)', () => {
    const problems: string[] = TOPICS.filter(
      (t) =>
        t.attribution === 'place' &&
        [...t.about.meaning, ...(t.aboutCommon || [])].includes(ATTRIBUTION_RULE),
    ).map((t) => t.id);
    const place = TOPICS.filter((t) => t.attribution === 'place').map((t) => t.id);
    if (JSON.stringify(place) !== JSON.stringify(['vilkai', 'zala', 'stebejimai'])) {
      problems.push(`place = ${place.join(', ')}`);
    }
    return problems.length === 0 || problems.join('; ');
  });
  check('Tekstai: be „būrel…“, „prototip…“, „Bandomoji versija“', () => {
    const found = forbiddenWordsIn(uiTexts());
    // The check itself must catch a planted word.
    const planted = forbiddenWordsIn(['Prototipas rodo kopiją', 'Bandomoji versija']);
    if (planted.length !== 2) return `planted words not caught: ${planted.join(', ')}`;
    return found.length === 0 || `found ${found.join(', ')}`;
  });
}

// ---------------------------------------------------------------------------
// Embed contract (SPEC §5.4, §5.5, §5.9, §5.11)
// ---------------------------------------------------------------------------

type Check = ReturnType<typeof runner>['check'];
type Eq = ReturnType<typeof runner>['eq'];

const STAGING_MAPS = 'staging-maps.biip.lt';
const PRODUCTION_MAPS = 'maps.biip.lt';
const sortedEntries = (obj: Record<string, unknown>) =>
  Object.keys(obj)
    .sort()
    .map((key) => [key, obj[key]]);
const sortedList = (list: readonly string[]) => [...list].sort();

function runEmbedChecks(check: Check, eq: Eq) {
  const set = (fields: Record<string, unknown>) => ({
    biipHunting: { v: 1, type: 'set', ...fields },
  });

  check('Įterpimas: parseCommand atmeta netinkamas žinutes', () => {
    const rejected: [string, unknown][] = [
      ['eilutė', JSON.stringify({ biipHunting: { v: 1, type: 'about' } })],
      ['biipHunting eilutė', { biipHunting: 'x' }],
      ['v 2', { biipHunting: { v: 2, type: 'about' } }],
      ['v "1"', { biipHunting: { v: '1', type: 'about' } }],
      ['type state', { biipHunting: { v: 1, type: 'state' } }],
      ['tema __proto__', set({ tema: '__proto__' })],
      [
        'tema __proto__ (JSON)',
        JSON.parse('{"biipHunting":{"v":1,"type":"set","tema":"__proto__"}}'),
      ],
      ['tema constructor', set({ tema: 'constructor' })],
      ['tema senoji', set({ tema: 'senoji' })],
      ['view list', set({ view: 'list' })],
      ['null', null],
      ['masyvas', [{ biipHunting: { v: 1, type: 'about' } }]],
    ];
    const accepted = rejected.filter(([, data]) => parseCommand(data) !== null);
    return accepted.length === 0 || `accepted: ${accepted.map(([label]) => label).join(', ')}`;
  });

  check('Įterpimas: parseCommand priima set ir about', () =>
    eq(
      [
        parseCommand(set({ tema: 'zala' })),
        parseCommand(set({ view: 'table' })),
        parseCommand(set({ tema: 'vilkai', view: 'map', extra: 'ignored' })),
        parseCommand(set({ tema: 'apzvalga', view: null })),
        parseCommand({ biipHunting: { v: 1, type: 'about' } }),
        parseCommand(set({ tema: 'stebejimai' })),
      ],
      [
        { type: 'set', tema: 'zala' },
        { type: 'set', view: 'table' },
        { type: 'set', tema: 'vilkai', view: 'map' },
        { type: 'set', tema: 'apzvalga' },
        { type: 'about' },
        { type: 'set', tema: 'stebejimai' },
      ],
    ),
  );

  // The optional table of a 'table' view: kept only when the target topic has it.
  check('Įterpimas: parseCommand set lentelė', () =>
    eq(
      [
        parseCommand(set({ tema: 'laimikiai', view: 'table', lentele: 'vietoves' })),
        parseCommand(set({ tema: 'vilkai', view: 'table', lentele: 'sezonai' })),
        parseCommand(set({ view: 'table', lentele: 'menesiai' })),
        parseCommand(set({ tema: 'laimikiai', view: 'table', lentele: 'menesiai' })),
        parseCommand(set({ tema: 'laimikiai', view: 'table', lentele: 'X1' })),
        parseCommand(set({ tema: 'laimikiai', view: 'table', lentele: 7 })),
        parseCommand(set({ tema: 'laimikiai', view: 'map', lentele: 'vietoves' })),
        parseCommand(set({ tema: 'apzvalga', view: 'table', lentele: 'rusys' })),
        parseCommand(set({ tema: 'zala', view: 'table', lentele: '__proto__' })),
        parseCommand(set({ tema: 'stebejimai', view: 'table', lentele: 'rusys' })),
        parseCommand(set({ tema: 'stebejimai', view: 'table', lentele: 'menesiai' })),
        parseCommand(set({ tema: 'stebejimai', view: 'table', lentele: 'sezonai' })),
      ],
      [
        { type: 'set', tema: 'laimikiai', view: 'table', lentele: 'vietoves' },
        { type: 'set', tema: 'vilkai', view: 'table', lentele: 'sezonai' },
        { type: 'set', view: 'table', lentele: 'menesiai' },
        { type: 'set', tema: 'laimikiai', view: 'table' },
        { type: 'set', tema: 'laimikiai', view: 'table' },
        { type: 'set', tema: 'laimikiai', view: 'table' },
        { type: 'set', tema: 'laimikiai', view: 'map' },
        { type: 'set', tema: 'apzvalga', view: 'table' },
        { type: 'set', tema: 'zala', view: 'table' },
        { type: 'set', tema: 'stebejimai', view: 'table', lentele: 'rusys' },
        { type: 'set', tema: 'stebejimai', view: 'table' },
        { type: 'set', tema: 'stebejimai', view: 'table' },
      ],
    ),
  );

  check('Įterpimas: leidžiami tėviniai puslapiai', () =>
    eq(
      [
        isAllowedParent('https://medziokle.biip.lt', STAGING_MAPS),
        isAllowedParent('https://staging-medziokle.biip.lt', STAGING_MAPS),
        isAllowedParent('https://medziokle.biip.lt', PRODUCTION_MAPS),
        isAllowedParent('https://staging-medziokle.biip.lt', PRODUCTION_MAPS),
        isAllowedParent('https://evil.example', STAGING_MAPS),
        isAllowedParent('http://localhost:8099', STAGING_MAPS),
        isAllowedParent('http://localhost:8099', PRODUCTION_MAPS),
        isAllowedParent('https://medziokle.biip.lt.evil.example', STAGING_MAPS),
      ],
      [true, true, true, true, false, true, false, false],
    ),
  );

  check('Įterpimas: parent ir referrer', () =>
    eq(
      [
        resolveParentOrigin('http://localhost:8099', '', STAGING_MAPS),
        resolveParentOrigin('https://staging-medziokle.biip.lt/', '', STAGING_MAPS),
        resolveParentOrigin(
          undefined,
          'https://staging-medziokle.biip.lt/zemelapis/?tema=zala',
          STAGING_MAPS,
        ),
        resolveParentOrigin(
          'https://evil.example',
          'https://medziokle.biip.lt/zemelapis/',
          STAGING_MAPS,
        ),
        resolveParentOrigin(
          'https://evil.example',
          'https://evil.example/zemelapis/',
          STAGING_MAPS,
        ),
        resolveParentOrigin('http://localhost:8099', '', PRODUCTION_MAPS),
        resolveParentOrigin('%%:/not a url', '', STAGING_MAPS),
        resolveParentOrigin('http://[::1', 'not a url either', STAGING_MAPS),
      ],
      [
        'http://localhost:8099',
        'https://staging-medziokle.biip.lt',
        'https://staging-medziokle.biip.lt',
        'https://medziokle.biip.lt',
        null,
        null,
        null,
        null,
      ],
    ),
  );

  check('Įterpimas: stateQuery laiko tik leidžiamus raktus', () => {
    const kept = {
      tema: 'zala',
      lentele: 'savivaldybes',
      sezonas: '2025-2026',
      sav: '99',
      nuo: '2025-04-01',
      iki: '2026-03-31',
      amzius: 'A,B',
    };
    const result = stateQuery({
      embed: '1',
      parent: 'http://localhost:8099',
      ...kept,
      x: '12a',
      rusis: 'Briedis',
      foo: 'bar',
      grupe: ['vilkai', 'bebrai'],
    });
    return eq(
      [sortedEntries(result), stateQuery({ tema: 'limitai', lentele: 'x' })],
      [sortedEntries(kept), { tema: 'limitai' }],
    );
  });

  check('Įterpimas: stateQuery be __proto__', () => {
    const query = JSON.parse('{"__proto__":{"polluted":"1"},"constructor":"x","tema":"zala"}');
    const result = stateQuery(query);
    return eq(
      [
        Object.keys(result),
        Object.prototype.hasOwnProperty.call(result, '__proto__'),
        Object.getPrototypeOf(result) === Object.prototype,
        'polluted' in {},
      ],
      [['tema'], false, true, false],
    );
  });

  check('Įterpimas: žinučių vokas', () => {
    const state = stateMessage({
      tema: 'zala',
      view: 'map',
      hasTable: true,
      title: 'Žala',
      query: { tema: 'zala' },
      shareQuery: { tema: 'zala', sezonas: '2026-2027' },
      provenance: { kind: 'snapshot', asOf: '2026-10-09', environment: 'other' },
    });
    return eq(
      [readyMessage(), Object.keys(state), state.biipHunting.type, state.biipHunting.v],
      [{ biipHunting: { v: 1, type: 'ready' } }, ['biipHunting'], 'state', 1],
    );
  });

  check('Įterpimas: state.provenance.text (D12a)', () => {
    const base = {
      tema: 'laimikiai' as const,
      view: 'map' as const,
      hasTable: true,
      title: 'Laimikiai',
      query: { tema: 'laimikiai' },
      shareQuery: { tema: 'laimikiai', sezonas: '2025-2026' },
    };
    const prov = (text?: string) => ({
      kind: 'snapshot' as const,
      asOf: '2026-10-09',
      environment: 'staging' as const,
      text,
    });
    const msg = (text?: string) => stateMessage({ ...base, provenance: prov(text) }).biipHunting;
    const ok = msg('Duomenys 2026-10-09 būklei · BĮIP');
    return eq(
      [
        Object.keys(ok),
        ok.provenance,
        msg(undefined).provenance,
        msg('  ').provenance,
        msg('x'.repeat(161)).provenance,
        msg(' a\n b ').provenance.text,
        msg('x'.repeat(160)).provenance.text?.length,
      ],
      [
        ['v', 'type', 'tema', 'view', 'hasTable', 'title', 'query', 'shareQuery', 'provenance'],
        {
          kind: 'snapshot',
          asOf: '2026-10-09',
          environment: 'staging',
          text: 'Duomenys 2026-10-09 būklei · BĮIP',
        },
        { kind: 'snapshot', asOf: '2026-10-09', environment: 'staging' },
        { kind: 'snapshot', asOf: '2026-10-09', environment: 'staging' },
        { kind: 'snapshot', asOf: '2026-10-09', environment: 'staging' },
        'a b',
        160,
      ],
    );
  });

  check('Įterpimas: height žinutė ir ribojimas (D12b)', () => {
    const frames: (() => void)[] = [];
    const sent: number[] = [];
    let height = 812.4;
    let allowed = true;
    const reporter = createHeightReporter({
      measure: () => height,
      send: (px) => sent.push(px),
      allowed: () => allowed,
      frame: (cb) => frames.push(cb),
      cancelFrame: () => undefined,
    });
    const run = () => frames.splice(0).forEach((cb) => cb());
    reporter.schedule();
    reporter.schedule(); // same frame: one message
    run();
    height = 812.9; // still 813 px: nothing
    reporter.schedule();
    run();
    reporter.force(); // re-send the same value once
    run();
    height = 1300;
    reporter.schedule();
    run();
    allowed = false; // another topic: never posted
    height = 900;
    reporter.schedule();
    run();
    allowed = true;
    reporter.stop();
    reporter.schedule();
    run();
    return eq(
      [sent, heightMessage(1300.2), heightMessage(-5).biipHunting.px],
      [[813, 813, 1300], { biipHunting: { v: 1, type: 'height', px: 1301 } }, 0],
    );
  });

  check('Telefono lapo antra eilutė nekartoja pirmos (JOURNEYS-04)', () => {
    const second = (answer: string, kpis: { value: string; label: string; sub?: string }[]) =>
      peekSecondLine(answer, firstSentence(answer), kpis);
    return eq(
      [
        second(
          'Gauti 503 pranešimai apie žalą iš 226 pranešėjų. Daugiausia – Kėdainių r. sav. (92).',
          [{ value: '503', label: 'Pranešimai' }],
        ),
        second(
          '2026/2027 sezoną leidžiama sumedžioti 3 802 briedžius (įsakymu patvirtinta 3 935). ' +
            '2025/2026 sezone sumedžiota 2 372 iš 4 177 (57 %).',
          [{ value: '3 802', label: 'Leidžiama sumedžioti' }],
        ),
        second('Sumedžioti 129 485 gyvūnai.', [
          { value: '129 485', label: 'Sumedžiota', sub: '+8,5 %' },
          { value: '20,6', label: 'Per 1 000 ha', sub: 'x' },
        ]),
        second('Utenos r. sav. 2026/2027 sezonui limitas nenustatytas.', [
          { value: '12', label: 'Sumedžiota', sub: '+1' },
        ]),
      ],
      [
        'Daugiausia – Kėdainių r. sav. (92).',
        '2025/2026 sezone sumedžiota 2 372 iš 4 177 (57 %).',
        '20,6 per 1 000 ha',
        '12 sumedžiota · +1',
      ],
    );
  });

  check('Įterpimas: modal žinutė tik po ready ir tik pasikeitus (D16)', () => {
    const sent: boolean[] = [];
    const reporter = createModalReporter((open) => sent.push(open));
    reporter.set(true); // before `ready`: held back
    reporter.ready(); // reported now
    reporter.set(true); // no change: nothing
    reporter.set(false);
    reporter.set(false);
    reporter.set(true);
    reporter.stop(); // the hub leaves with a modal open: closed
    reporter.set(true); // after stop: nothing
    return eq(
      [sent, modalMessage(true), modalMessage(false).biipHunting.open],
      [[true, false, true, false], { biipHunting: { v: 1, type: 'modal', open: true } }, false],
    );
  });

  check('Įterpimas: išdėstymas', () =>
    eq(
      [
        hubTop(true),
        isRailed(1440, true, true),
        tableReplacesMap(1440, true, true),
        tableReplacesMap(390, true, true),
        mapPadding(1440, false, true)[0],
      ],
      [56, true, true, false, 56],
    ),
  );

  check('Žemas rėmelis: skydelis – juostelė ant žemėlapio (MOBILE-05)', () =>
    eq(
      [
        isRailed(844, false, true, true),
        isRailed(844, true, true, true),
        isRailed(390, false, true, true),
        isRailed(844, false, true),
        mapPadding(844, false, true, true),
      ],
      [true, false, false, false, [56, 0, 0, 64]],
    ),
  );

  check('Išdėstymas be įterpimo', () =>
    eq(
      [
        mapPadding(1440, true),
        hubTop(),
        isRailed(1440, true),
        tableReplacesMap(1440, true),
        tableReplacesMap(1100, true),
      ],
      [[112, 0, 0, 396], 112, true, true, true],
    ),
  );

  check('Įterpimas: lentelės ir raktai = temos (EMBED_TOPICS)', () => {
    const problems: string[] = [];
    (['laimikiai', 'limitai', 'zala'] as const).forEach((id) => {
      const expected = getTopic(id).defaultTable;
      if (EMBED_TOPICS[id].defaultTable !== expected) {
        problems.push(`${id}.defaultTable ${EMBED_TOPICS[id].defaultTable} ≠ ${expected}`);
      }
    });
    const vilkai = EMBED_TOPICS.vilkai;
    if (JSON.stringify(vilkai.tables) !== JSON.stringify(WOLVES_TABLES)) {
      problems.push('vilkai.tables ≠ WOLVES_TABLES');
    }
    if (vilkai.defaultTable !== 'irasai')
      problems.push(`vilkai.defaultTable ${vilkai.defaultTable}`);
    const wolvesKeys = WOLVES_KEYS.filter((key) => key !== 'lentele');
    if (JSON.stringify(vilkai.keys) !== JSON.stringify(wolvesKeys)) {
      problems.push('vilkai.keys ≠ WOLVES_KEYS − lentele');
    }
    const byId = EMBED_TOPICS as unknown as Record<
      string,
      { defaultTable: string; tables: readonly string[]; keys: readonly string[] } | undefined
    >;
    TOPICS.filter((t) => t.kind === 'snapshot').forEach((t) => {
      const entry = byId[t.id];
      if (!entry) return problems.push(`${t.id}: not in EMBED_TOPICS`);
      const expected = sortedList(['sezonas', 'sav', ...t.dims.map((d) => d.key)]);
      if (JSON.stringify(sortedList(entry.keys)) !== JSON.stringify(expected)) {
        problems.push(`${t.id}.keys ${sortedList(entry.keys).join(' ')} ≠ ${expected.join(' ')}`);
      }
    });
    // Live topics: the tables are LIVE_TABLES, the keys those the host owns (− lentele).
    TOPICS.filter((t) => t.kind === 'live').forEach((t) => {
      const entry = byId[t.id];
      if (!entry) return problems.push(`${t.id}: not in EMBED_TOPICS`);
      if (entry.defaultTable !== t.defaultTable) {
        problems.push(`${t.id}.defaultTable ${entry.defaultTable} ≠ ${t.defaultTable}`);
      }
      const tables = LIVE_TABLES[t.id] || [];
      if (JSON.stringify(entry.tables) !== JSON.stringify(tables)) {
        problems.push(`${t.id}.tables ≠ LIVE_TABLES.${t.id}`);
      }
      const keys = (LIVE_KEYS[t.id] || []).filter((key) => key !== 'lentele');
      if (JSON.stringify(entry.keys) !== JSON.stringify(keys)) {
        problems.push(`${t.id}.keys ${entry.keys.join(' ')} ≠ ${keys.join(' ')}`);
      }
    });
    // Every iframe topic is registered, and every registered topic but Apžvalga is one.
    Object.keys(EMBED_TOPICS).forEach((id) => {
      if (!hasTopic(id)) problems.push(`${id}: in EMBED_TOPICS, not registered`);
    });
    TOPICS.filter((t) => t.kind !== 'overview').forEach((t) => {
      if (!byId[t.id]) problems.push(`${t.id}: registered, not in EMBED_TOPICS`);
    });
    return problems.length === 0 || problems.join('; ');
  });
}

// ---------------------------------------------------------------------------
// Live topics (Vilkai, Stebėjimai): registry, hosts, tables, URL keys (STEB-SPEC §4, §7)
// ---------------------------------------------------------------------------

function runLiveTopicChecks(check: Check, eq: Eq) {
  check('Stebėjimai: temų registras', () => {
    const topic = getTopic('stebejimai');
    return eq(
      [
        TOPIC_ORDER[TOPIC_ORDER.length - 1],
        hasTopic('stebejimai'),
        topic.id,
        topic.kind,
        topic.defaultTable,
        topic.dims.length,
        typeof topic.view,
        // The Apžvalga card (OVERVIEW-05): descriptive without the live records.
        typeof topic.overview,
      ],
      ['stebejimai', true, 'stebejimai', 'live', 'irasai', 0, 'undefined', 'function'],
    );
  });

  check('Gyvos temos = LIVE_HOSTS', () => {
    const live = TOPICS.filter((t) => t.kind === 'live').map((t) => t.id);
    return eq(
      [
        sortedList(live),
        sortedList(Object.keys(LIVE_HOSTS)),
        LIVE_HOSTS.vilkai,
        LIVE_HOSTS.stebejimai,
        Object.getPrototypeOf(LIVE_HOSTS) === null,
        Object.isFrozen(LIVE_HOSTS),
        typeof LIVE_HOSTS.constructor,
      ],
      [
        sortedList(Object.keys(LIVE_HOSTS)),
        ['stebejimai', 'vilkai'],
        'HuntingHubTopicsVilkaiVilkaiTopic',
        'HuntingHubTopicsStebejimaiStebejimaiTopic',
        true,
        true,
        'undefined',
      ],
    );
  });

  check('Gyvų temų lentelės (LIVE_TABLES)', () => {
    const defaults = TOPICS.filter((t) => t.kind === 'live').filter(
      (t) => (LIVE_TABLES[t.id] || []).indexOf(t.defaultTable) < 0,
    );
    return eq(
      [
        LIVE_TABLES.vilkai === WOLVES_TABLES,
        LIVE_TABLES.stebejimai === STEBEJIMAI_TABLES,
        STEBEJIMAI_TABLES,
        sortedList(Object.keys(LIVE_TABLES)),
        Object.getPrototypeOf(LIVE_TABLES) === null,
        Object.isFrozen(LIVE_TABLES),
        defaults.map((t) => t.id),
      ],
      [true, true, ['irasai', 'rusys', 'savivaldybes'], ['stebejimai', 'vilkai'], true, true, []],
    );
  });

  check('Įterpimas: Stebėjimų lentelės ir raktai (EMBED_TOPICS)', () => {
    const entry = EMBED_TOPICS.stebejimai;
    return eq(
      [
        entry,
        entry.tables === STEBEJIMAI_TABLES,
        STEBEJIMAI_KEYS.filter((key) => key !== 'lentele'),
      ],
      [
        {
          defaultTable: 'irasai',
          tables: ['irasai', 'rusys', 'savivaldybes'],
          keys: ['nuo', 'iki', 'laikotarpis', 'sezonas', 'sav', 'gyvunas', 'faktas'],
        },
        true,
        entry.keys,
      ],
    );
  });

  check('Įterpimas: raktai gyvunas ir faktas', () => {
    const gyvunas = PASS_KEYS.gyvunas;
    const faktas = PASS_KEYS.faktas;
    const accepted = ['lusis', 'rudasis-lokys', 'aptikti-pedsakai'];
    const rejected = ['Lusis', 'lūšis', 'a b', ''];
    return eq(
      [
        accepted.map((v) => gyvunas.test(v) && faktas.test(v)),
        rejected.map((v) => gyvunas.test(v) || faktas.test(v)),
        [gyvunas.test('a'.repeat(40)), gyvunas.test('a'.repeat(41))],
        [faktas.test('a'.repeat(60)), faktas.test('a'.repeat(61))],
        Object.keys(PASS_KEYS),
      ],
      [
        [true, true, true],
        [false, false, false, false],
        [true, false],
        [true, false],
        [
          'tema',
          'lentele',
          'sezonas',
          'sav',
          'rusis',
          'rodiklis',
          'grupe',
          'nuo',
          'iki',
          'laikotarpis',
          'amzius',
          'lytis',
          'budas',
          'gyvunas',
          'faktas',
          'x',
          'y',
          'z',
          'debug',
        ],
      ],
    );
  });

  check('URL: Stebėjimų raktai (stateQuery, keptQuery, ownedKeys)', () => {
    const query = {
      embed: '1',
      tema: 'stebejimai',
      lentele: 'rusys',
      gyvunas: 'rudasis-lokys',
      faktas: 'aptikti-pedsakai',
      x: '1',
      debug: '1',
    };
    return eq(
      [
        sortedEntries(stateQuery(query)),
        stateQuery({ gyvunas: 'Lūšis', faktas: 'a'.repeat(61) }),
        keptQuery(query),
        ['gyvunas', 'faktas'].map((key) => ownedKeys().indexOf(key) >= 0),
        STEBEJIMAI_KEYS.filter((key) => ownedKeys().indexOf(key) < 0),
      ],
      [
        sortedEntries({
          tema: 'stebejimai',
          lentele: 'rusys',
          gyvunas: 'rudasis-lokys',
          faktas: 'aptikti-pedsakai',
          x: '1',
          debug: '1',
        }),
        {},
        { embed: '1', x: '1', debug: '1' },
        [true, true],
        [],
      ],
    );
  });

  check('Stebėjimai: Apie duomenis', () => {
    const topic = getTopic('stebejimai');
    const common = topic.aboutCommon || [];
    const about = topic.about;
    const texts = [
      ...common,
      ...about.source,
      ...about.meaning,
      ...about.missing,
      ...about.compare,
    ].join(' ');
    const problems: string[] = [];
    if (!common.length) problems.push('no aboutCommon');
    if (common.join(' ').indexOf('tikslių vietų') >= 0) problems.push('"tikslių vietų"');
    if (common.indexOf(ABOUT_LOCALE_RULE) < 0) problems.push('no ABOUT_LOCALE_RULE');
    forbiddenWordsIn([texts]).forEach((word) => problems.push(`"${word}"`));
    const counts = [about.source, about.meaning, about.missing, about.compare].map((l) => l.length);
    if (JSON.stringify(counts) !== JSON.stringify([2, 4, 2, 1])) {
      problems.push(`sections ${counts.join('/')}`);
    }
    // Apžvalga states its own rules too (OVERVIEW-27: the Stebėjimai card shows exact places),
    // and so does Vilkai (CONTENT-03: one point and one row per wolf).
    const own = ['stebejimai', 'apzvalga', 'vilkai'];
    const others = TOPICS.filter((t) => own.indexOf(t.id) < 0 && t.aboutCommon).map((t) => t.id);
    if (others.length) problems.push(`aboutCommon on ${others.join(', ')}`);
    return problems.length === 0 || problems.join('; ');
  });
}

// The Stebėjimai topic's modules (S1): their copies of the contract must equal it, and their
// own checks run here. Missing modules give one failing check.
function stebejimaiModuleChecks(): SelfCheckResult[] {
  const missing = [
    stebModel ? '' : 'stebejimai/model.ts',
    typeof stebSelfCheck?.runStebejimaiChecks === 'function' ? '' : 'stebejimai/selfcheck.ts',
  ].filter(Boolean);
  if (!stebModel || missing.length) {
    return [{ name: 'Stebėjimų temos modulis nerastas', ok: false, detail: missing.join(', ') }];
  }
  const { results, check, eq } = runner();
  check('Stebėjimai: modulio kopijos = sutartis', () =>
    eq(
      [
        stebModel.STEB_URL_KEYS,
        stebModel.STEB_TABLES,
        stebModel.STEB_DEFAULT_TABLE,
        stebModel.STEB_GYVUNAS_RE?.source,
        stebModel.STEB_FAKTAS_RE?.source,
      ],
      [
        STEBEJIMAI_KEYS,
        STEBEJIMAI_TABLES,
        EMBED_TOPICS.stebejimai.defaultTable,
        PASS_KEYS.gyvunas.source,
        PASS_KEYS.faktas.source,
      ],
    ),
  );
  try {
    results.push(...stebSelfCheck!.runStebejimaiChecks!());
  } catch (e) {
    results.push({
      name: 'Stebėjimai: runStebejimaiChecks()',
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Snapshot checks
// ---------------------------------------------------------------------------

const sum = (values: (number | null | undefined)[]) =>
  values.reduce<number>((total, v) => total + (typeof v === 'number' ? v : 0), 0);

/** A selection with the topic's default dims (as the hub state builds it). */
export function selectionFor(
  topic: TopicDef,
  meta: Meta,
  season: number,
  sav: number | null = null,
): HubSelection {
  const sel: HubSelection = { topic: topic.id, season, sav, dims: {}, table: null };
  topic.dims.forEach((d) => (sel.dims[d.key] = d.default(sel, meta)));
  return sel;
}

export function runHubDataChecks(data: SnapshotData | null | undefined): SelfCheckResult[] {
  const { results, check, eq } = runner();
  if (!data?.meta) {
    check('Momentinė kopija įkelta', () => 'meta.json not loaded');
    return results;
  }
  const meta = data.meta;
  const exactDay = meta.snapshotDate === HUB_SELFCHECK_DAY;

  check('Sezonai', () =>
    eq(
      meta.seasons.map((s) => [s.season, s.current]),
      [
        [2024, false],
        [2025, false],
        [2026, true],
      ].filter(([s]) => meta.seasons.some((m) => m.season === s)),
    ),
  );
  check('MPV: 946 vienetai 52 savivaldybėse', () => {
    const ms = meta.municipalities;
    const ha = sum(ms.map((m) => m.mpvHa));
    if (Math.abs(ha - 6295267) > 30) return `Σ mpvHa ${ha}`;
    return eq(
      [
        ms.length,
        sum(ms.map((m) => m.mpvCount)),
        ms.filter((m) => m.mpvCount > 0).length,
        sum(ms.map((m) => m.mpvSmall)),
      ],
      [60, 946, 52, 12],
    );
  });
  check('Vilkų limitai = WOLF_LIMITS', () =>
    eq(
      [2024, 2025].map((s) => meta.static.wolves.seasons[String(s)]?.limit),
      [WOLF_LIMITS[2024], WOLF_LIMITS[2025]],
    ),
  );

  const loots = data.loots;
  if (loots) {
    const rows = (season: number, sp?: number, muni?: number) =>
      loots.rows.filter(
        (r) =>
          r.season === season &&
          (sp === undefined || r.sp === sp) &&
          (muni === undefined || r.muni === muni),
      );
    check('Laimikiai Σ 2024 / 2025 (be „Kita“)', () =>
      eq([sum(rows(2024).map((r) => r.n)), sum(rows(2025).map((r) => r.n))], [119311, 129485]),
    );
    check('Laimikiai 2025: popierius / el. žurnalas, kritę / prie kelių', () => {
      const r = rows(2025);
      return eq(
        [
          sum(r.map((x) => x.paper)),
          sum(r.map((x) => x.app)),
          sum(r.map((x) => x.dead)),
          sum(r.map((x) => x.road)),
        ],
        [119773, 9712, 4053, 3181],
      );
    });
    check('Briedis 2025: 2 372 (790 / 572 / 1 010), 2024: 2 825', () => {
      const r = rows(2025, 1);
      return eq(
        [
          sum(r.map((x) => x.n)),
          sum(r.map((x) => x.m)),
          sum(r.map((x) => x.f)),
          sum(r.map((x) => x.j)),
          sum(rows(2024, 1).map((x) => x.n)),
        ],
        [2372, 790, 572, 1010, 2825],
      );
    });
    check('Kėdainių r. laimikiai 2024 / 2025', () =>
      eq(
        [
          sum(rows(2024, undefined, 53).map((r) => r.n)),
          sum(rows(2025, undefined, 53).map((r) => r.n)),
        ],
        [5437, 5769],
      ),
    );
    check('„Kita“ neįtraukta į laimikius', () =>
      loots.rows.some((r) => r.sp === 39)
        ? 'species 39 in loots'
        : eq(
            loots.kita.filter((k) => k.season < 2026).map((k) => [k.season, k.n]),
            [
              [2024, 978],
              [2025, 2055],
            ],
          ),
    );
    check('Laimikiai 2026 ≥ 9 381', () => {
      const n = sum(rows(2026).map((r) => r.n));
      return n >= 9381 || `got ${n}`;
    });
  }

  const limits = data.limits;
  if (limits) {
    const total = (season: number, muni?: number) => {
      const r = limits.filter(
        (x) => x.season === season && (muni === undefined || x.muni === muni),
      );
      return {
        lim: [sum(r.map((x) => x.limM)), sum(r.map((x) => x.limFj))],
        used: [sum(r.map((x) => x.usedM)), sum(r.map((x) => x.usedFj))],
        left: sum(r.map((x) => x.leftM + x.leftFj)),
        mpv: sum(r.map((x) => x.mpvWithLimit)),
      };
    };
    check('Briedžių limitai 2024 / 2025', () => {
      const a = total(2024);
      const b = total(2025);
      return eq(
        [a.lim, a.used, b.lim, b.used, b.left, b.mpv],
        [[1584, 2600], [969, 1856], [1707, 2470], [790, 1582], 1931, 884],
      );
    });
    check('Briedžių limitai 2026: 3 802, 858 MPV', () => {
      const c = total(2026);
      return eq([c.lim, c.mpv, c.used[0] >= 49 && c.used[1] >= 7], [[1641, 2161], 858, true]);
    });
    check('Kėdainių r. limitai 2025 / 2026', () => {
      const a = total(2025, 53);
      const b = total(2026, 53);
      return eq([a.lim, a.used, b.lim, b.mpv], [[26, 49], [6, 14], [22, 24], 18]);
    });
    check('Likutis ≥ limitas − panaudota', () => {
      const bad = limits.filter(
        (r) =>
          r.leftM < Math.max(r.limM - r.usedM, 0) || r.leftFj < Math.max(r.limFj - r.usedFj, 0),
      );
      return bad.length === 0 || `${bad.length} rows`;
    });
  }

  const damages = data.damages;
  if (damages) {
    const nat = (season: number, grp: string) =>
      damages.season.find((r) => r.season === season && r.muni === 0 && r.grp === grp);
    check('Žala: privatumas (jokio 1 ar 2, pranešėjai tik be grupės)', () => {
      const small = (v: number | null) => v === 1 || v === 2;
      const counts = [
        ...damages.season.map((r) => [r.reports, r.reporters, r.escalated]),
        ...damages.month.map((r) => [r.reports]),
        ...damages.attacked.map((r) => [r.entries, r.animals]),
      ];
      if (counts.some((c) => c.some(small))) return 'a published count of 1 or 2';
      if (damages.season.some((r) => r.muni > 0 && r.grp !== '*' && r.reporters !== null)) {
        return 'reporters at municipality × group';
      }
      if (damages.month.some((r) => !/^\d{4}-\d{2}$/.test(r.ym))) return 'a month with a day part';
      const escalatedElsewhere = damages.season.some(
        (r) => r.escalated !== null && r.grp !== 'kanopiniai' && r.grp !== 'bebrai',
      );
      if (escalatedElsewhere) return 'escalated outside kanopiniai and bebrai';
      return true;
    });
    check('Žala 2025: 99 pranešimai, 59 pranešėjai', () => {
      const r = nat(2025, '*');
      return eq([r?.reports, r?.reporters], [99, 59]);
    });
    check('Žala 2026 ≥ 503 pranešimai', () => {
      const r = nat(2026, '*');
      if (!r || r.reports === null || r.reports < 503) return `got ${r?.reports}`;
      if (!exactDay) return true;
      return eq(
        [
          r.reports,
          r.reporters,
          nat(2026, 'kanopiniai')?.escalated,
          nat(2026, 'bebrai')?.escalated,
          ...['kanopiniai', 'vilkai', 'bebrai', 'stumbrai', 'lokiai', 'lusys'].map(
            (g) => nat(2026, g)?.reports,
          ),
        ],
        [503, 226, 70, 17, 258, 93, 74, 61, 13, 4],
      );
    });
    check('Žala: savivaldybių dalys ≤ Lietuvos suma', () => {
      const bad: string[] = [];
      damages.season
        .filter((r) => r.muni === 0)
        .forEach((t) => {
          const parts = damages.season.filter(
            (r) => r.season === t.season && r.grp === t.grp && r.muni > 0,
          );
          if (t.reports !== null && sum(parts.map((r) => r.reports)) > t.reports)
            bad.push(`${t.season}/${t.grp}`);
        });
      return bad.length === 0 || bad.join(', ');
    });
    if (exactDay) {
      check('Kėdainių r. žala 2026: 92 (52 + 40), 16 pranešėjų', () => {
        const r = (grp: string) =>
          damages.season.find((x) => x.season === 2026 && x.muni === 53 && x.grp === grp);
        return eq(
          [r('*')?.reports, r('*')?.reporters, r('kanopiniai')?.reports, r('stumbrai')?.reports],
          [92, 16, 52, 40],
        );
      });
      check('Žalos mėnesiai: 90 eilučių (15 mėn. × 6 grupės), Σ ≤ 602', () => {
        const total = sum(damages.month.map((r) => r.reports));
        return eq([damages.month.length, total <= 602], [90, true]);
      });
    }
    check('Užpulti gyvuliai 2026, vilkai ≥ 283', () => {
      const n = sum(
        damages.attacked
          .filter((r) => r.season === 2026 && r.grp === 'vilkai' && r.cls === '*')
          .map((r) => r.animals),
      );
      return n >= 283 || `got ${n}`;
    });
  }

  const wolves = data.wolves;
  if (wolves) {
    check('Vilkai su vieta 2023 / 2024 / 2025, Kėdainių r. 2025', () => {
      const located = (season: number, muni?: number) =>
        sum(
          wolves
            .filter((r) => r.season === season && (muni === undefined || r.muni === muni))
            .map((r) => r.located),
        );
      return eq(
        [
          located(2023),
          located(2024),
          located(2025),
          wolves.filter((r) => r.season === 2025).length,
          located(2025, 53),
        ],
        [278, 334, 275, 47, 9],
      );
    });
  }

  // Every registered topic on the committed data.
  TOPICS.forEach((topic) => {
    if (topic.files.some((f) => f !== 'meta' && (data as any)[f] === undefined)) return;
    if (topic.view) {
      check(`${topic.tab}: view() visiems sezonams`, () => {
        const slow: string[] = [];
        topic.seasons(meta).forEach((season) => {
          const t0 = performance.now();
          const view = topic.view!(data, selectionFor(topic, meta, season));
          const ms = performance.now() - t0;
          if (!view.answer) throw new Error(`empty answer for ${season}`);
          if (ms > 10) slow.push(`${season}: ${Math.round(ms)} ms`);
          view.card(53);
        });
        return slow.length === 0 || `slower than 10 ms: ${slow.join(', ')}`;
      });
    }
    if (topic.overview) {
      check(
        `${topic.tab}: overview()`,
        () => !!topic.overview!(data, HUB_SELFCHECK_DAY).answer || 'empty',
      );
    }
  });
  const headline = (id: string, season: number, expected: string[]) => {
    const topic = TOPICS.find((t) => t.id === id);
    if (!topic?.view || topic.files.some((f) => f !== 'meta' && (data as any)[f] === undefined))
      return;
    check(`${topic.tab} ${season}: atsakyme ${expected.join(', ')}`, () => {
      const answer = topic.view!(data, selectionFor(topic, meta, season)).answer.replace(
        /\u00a0|\u202f/g,
        ' ',
      );
      const missing = expected.filter((e) => answer.indexOf(e) < 0);
      return missing.length === 0 || `"${answer}"`;
    });
  };
  // Apžvalga keeps every number it showed before the card redesign (exact for 2026-10-09);
  // shares in whole percent, as the topics show them (CONTENT-05).
  const card = (id: string, expected: string[]) => {
    const topic = TOPICS.find((t) => t.id === id);
    if (!topic?.overview || topic.files.some((f) => f !== 'meta' && (data as any)[f] === undefined))
      return;
    check(`Apžvalga: ${topic.tab} kortelėje ${expected.join(', ')}`, () => {
      const c = topic.overview!(data, HUB_SELFCHECK_DAY);
      const text = [c.value, c.outOf, c.unit, c.answer, ...(c.lines || [])]
        .join(' ')
        .replace(/\u00a0|\u202f/g, ' ');
      const missing = expected.filter((e) => text.indexOf(e) < 0);
      return missing.length === 0 || `"${text}"`;
    });
  };
  if (exactDay) {
    card('laimikiai', ['129 485', '8,5 %', '9 381']);
    card('limitai', ['3 802', '3 935', '2 372', '4 177', '57 %']);
    card('zala', ['503', '226', '283', 'Kėdainių r. sav. (92)']);
    card('vilkai', ['275', '307', '90 %']);
  }
  headline('laimikiai', 2025, ['129 485', '8,5 %']);
  headline('limitai', 2025, ['2 372', '4 177', '57 %']);
  headline('limitai', 2026, ['3 802', '3 935']);
  if (exactDay) headline('zala', 2026, ['503', '226']);

  return results;
}

/** Both sets: the pure rules always, the data checks when the snapshot is loaded. */
export const runHubSelfChecks = (data?: SnapshotData | null) => [
  ...runHubUnitChecks(),
  ...runHubDataChecks(data),
];
