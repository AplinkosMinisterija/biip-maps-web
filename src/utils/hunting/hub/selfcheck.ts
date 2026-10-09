// ?debug=1 self-checks of the hunting data hub (SPEC2 §13 T2). The repo has no test runner;
// the debug panel runs these and prints OK / KLAIDA per check:
// - `runHubUnitChecks()`: pure rules on a synthetic fixture (season states, defaults, formats,
//   classes, CSV, URL carry-over, table zipping);
// - `runHubDataChecks(data)`: the committed snapshot against the expected values of §9.5,
//   the privacy rules, and every registered topic's view()/overview() on it.
// Expected values are those verified on prod for the 2026-10-09 snapshot; values marked
// "exact for a 2026-10-09 run" are only checked when meta.snapshotDate is that day.
import { WOLF_LIMITS } from '@/utils/hunting/labels';
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
import { TOPICS } from './topics';
import { keptQuery, wolvesCarry } from './url';
import type { HubSelection, Meta, SnapshotData, TableDef, TopicDef } from './types';

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
          '# Duomenys: 2026-10-09 momentinė kopija; BĮIP',
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
