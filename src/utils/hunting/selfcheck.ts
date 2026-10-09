// Synthetic fixture + assertions for the data rules (SPEC §6.11). The repo has no
// test runner; DebugPanel (?debug=1) runs these and prints OK / KLAIDA per check.
// All rows are invented; none come from the API.
import type { Interval, SeasonInfo, WolfApiRow, WolfRecord } from './types';
import {
  formatDateTime,
  intervalFromParts,
  intervalLabel,
  isValidDay,
  matchPreset,
  pluralLt,
  presetInterval,
  recordDay,
  seasonOfDay,
  HUNTED_WOLVES,
} from './dates';
import {
  defaultSeason,
  filterRecords,
  histogram,
  normalise,
  seasonMonthPivot,
  snapToGrid,
  statusModel,
} from './wolves';
import { buildCsv, csvFileName } from './csv';
import { packLabel, ageLabel, methodLabel } from './labels';

export interface SelfCheckResult {
  name: string;
  ok: boolean;
  detail?: string;
}

// EWKB hex of a Point with SRID 3346 (little endian), the format E1 returns.
export function pointHex(x: number, y: number) {
  const view = new DataView(new ArrayBuffer(25));
  view.setUint8(0, 1);
  view.setUint32(1, 0x20000001, true);
  view.setUint32(5, 3346, true);
  view.setFloat64(9, x, true);
  view.setFloat64(17, y, true);
  let hex = '';
  for (let i = 0; i < 25; i++) hex += (view.getUint8(i) + 0x100).toString(16).slice(1);
  return hex.toUpperCase();
}

export const SELFCHECK_TODAY = '2026-10-09';

const SEASONS: SeasonInfo[] = [
  { id: 6, start: 2025, name: '2025/2026', current: false },
  { id: 7, start: 2026, name: '2026/2027', current: true },
];

const row = (
  id: string,
  registeredAt: string,
  geom: string | null,
  extra: Partial<WolfApiRow> = {},
): WolfApiRow => ({
  id,
  registeredAt,
  source: id.startsWith('biomon') ? 'biomon' : 'biip',
  age: 'ADULT',
  category: 'MALE',
  wolfHuntingType: 'VAROMOJI',
  isPackMember: false,
  packAmount: 0,
  seasonId: null,
  geom,
  ...extra,
});

const P1 = pointHex(500123.4, 6100987.6);
const P2 = pointHex(501000.0, 6101500.0); // ~1 km from P1
const P3 = pointHex(600000.0, 6200000.0);

export function selfCheckRows(): WolfApiRow[] {
  return [
    // BIOMON: date only, stored as 00:00Z.
    row('biomon_1', '2025-12-01T00:00:00.000Z', P1),
    // BIIP kill at 22:24Z = 01:24 next local day.
    row('biip_1', '2025-10-18T22:24:00.000Z', P3, { age: null, category: null }),
    // Paper aggregate: no geom, labelled through seasonId → E3.
    row('biip_2', '2026-04-20T09:00:00.000Z', null, { seasonId: 6 }),
    // Paper aggregate with an unknown seasonId.
    row('biip_3', '2026-04-21T09:00:00.000Z', null, { seasonId: 99 }),
    // Implausible date.
    row('biomon_2', '1979-11-10T00:00:00.000Z', P3),
    // Duplicate id.
    row('biomon_1', '2025-12-01T00:00:00.000Z', P1),
    // Off-window (September) but inside the hunting year.
    row('biomon_3', '2025-09-01T00:00:00.000Z', P3),
    // Leap-year and month-end boundaries.
    row('biomon_4', '2026-02-28T00:00:00.000Z', P3),
    row('biomon_5', '2024-02-29T00:00:00.000Z', P3),
    // BIIP at 21:30Z on Mar 31 = Apr 1 local → next season, off-window.
    row('biip_5', '2026-03-31T21:30:00.000Z', P3),
    // Window start day.
    row('biomon_6', '2025-10-15T00:00:00.000Z', P3, { isPackMember: true, packAmount: 4 }),
    // Future date.
    row('biomon_7', '2026-11-01T00:00:00.000Z', P3),
    // Same day as biomon_1, ~1 km away → possible duplicate pair (kept).
    row('biip_6', '2025-12-01T10:00:00.000Z', P2, { wolfHuntingType: 'SU;"X"' }),
  ];
}

export function runSelfChecks(): SelfCheckResult[] {
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

  const today = SELFCHECK_TODAY;
  const ds = normalise(selfCheckRows(), SEASONS, today);
  const rec = (id: string) => ds.records.find((r) => r.id === id) as WolfRecord;
  const all: Interval = { from: '2017-04-01', to: today };

  check('BIOMON 00:00Z diena', () => eq(rec('biomon_1').day, '2025-12-01'));
  check('BIIP 22:24Z → kita vietinė diena', () => eq(rec('biip_1').day, '2025-10-19'));
  check('BIIP vasaros laikas (UTC+3)', () =>
    eq(recordDay('biip', '2026-07-01T21:00:00.000Z'), '2026-07-02'),
  );
  check('Popierinis įrašas neskaičiuojamas', () =>
    eq(
      [
        ds.paperRowsBySeason,
        ds.paperRowsUnknownSeason,
        !!ds.records.find((r) => r.id === 'biip_2'),
      ],
      [{ 2025: 1 }, 1, false],
    ),
  );
  check('Neįtikimos datos', () => eq(ds.excludedBadDate, 2));
  check('Pasikartojantis id', () => eq(ds.duplicateIdsDropped, 1));
  check('Galimi pasikartojimai', () => eq(ds.possibleDuplicatePairs, 1));
  check('Įrašų skaičius ir rikiavimas', () =>
    eq(
      ds.records.map((r) => r.id),
      ['biip_5', 'biomon_4', 'biip_6', 'biomon_1', 'biip_1', 'biomon_6', 'biomon_3', 'biomon_5'],
    ),
  );
  check('Sezonas pagal dieną', () =>
    eq(
      [
        rec('biomon_4').season,
        rec('biip_5').season,
        rec('biomon_3').season,
        rec('biomon_5').season,
      ],
      [2025, 2026, 2025, 2023],
    ),
  );
  check('Vilkų medžioklės laikotarpis', () =>
    eq(
      [
        rec('biomon_6').inWolfWindow,
        rec('biomon_4').inWolfWindow,
        rec('biomon_3').inWolfWindow,
        rec('biip_5').inWolfWindow,
      ],
      [true, true, false, false],
    ),
  );
  check('1 km tinklelis', () =>
    eq([rec('biomon_1').x, rec('biomon_1').y, snapToGrid(500999.9)], [500500, 6100500, 500500]),
  );
  check('minYear', () => eq(ds.minYear, 2024));
  check('Filtras: viena diena', () =>
    eq(filterRecords(ds.records, { interval: { from: '2025-10-19', to: '2025-10-19' } }).length, 1),
  );
  check('Filtras: nenurodyta', () =>
    eq(
      filterRecords(ds.records, { interval: all, age: ['nenurodyta'] }).map((r) => r.id),
      ['biip_1'],
    ),
  );
  check('Vasario 28/29 dienos', () =>
    eq(
      [
        histogram([], { from: '2024-02-01', to: '2024-02-29' }).length,
        histogram([], { from: '2026-02-01', to: '2026-02-28' }).length,
      ],
      [29, 28],
    ),
  );
  check('Histograma: sezonas → 12 mėn.', () => {
    const interval = presetInterval('season:2025', today) as Interval;
    const f = filterRecords(ds.records, { interval });
    const bins = histogram(f, interval);
    return eq(
      [
        bins.length,
        bins[0].key,
        bins[11].key,
        bins.reduce((n, b) => n + b.count, 0),
        f.length,
        bins[8].ariaLabel,
      ],
      [12, '2025-04', '2026-03', 6, 6, '2025 m. gruodis: 2 vilkai. Rodyti šį mėnesį.'],
    );
  });
  check('Histograma: visi sezonai', () => {
    const bins = histogram(ds.records, all);
    return eq([bins[0].level, bins.length, bins[9].label], ['season', 10, '2026/2027']);
  });
  check('Iki tuščia: mėnuo', () =>
    eq(intervalFromParts({ year: 2025, month: 12 }, null), {
      from: '2025-12-01',
      to: '2025-12-31',
    }),
  );
  check('Iki tuščia: metai', () =>
    eq(intervalFromParts({ year: 2025 }), { from: '2025-01-01', to: '2025-12-31' }),
  );
  check('Iki tuščia: diena', () =>
    eq(intervalFromParts({ year: 2025, month: 11, day: 15 }), {
      from: '2025-11-15',
      to: '2025-11-15',
    }),
  );
  check('Nuo/Iki mėnesiais', () =>
    eq(intervalFromParts({ year: 2025, month: 12 }, { year: 2026, month: 1 }), {
      from: '2025-12-01',
      to: '2026-01-31',
    }),
  );
  check('Iki < Nuo → klaida', () =>
    eq(intervalFromParts({ year: 2026, month: 2 }, { year: 2025, month: 12, day: 31 }), null),
  );
  check('Nuo prieš 2017-04-01 apkarpoma', () =>
    eq(intervalFromParts({ year: 2017 }), { from: '2017-04-01', to: '2017-12-31' }),
  );
  check('Netinkama data', () =>
    eq(
      [isValidDay('2026-02-29'), isValidDay('2024-02-29'), isValidDay('2025-1-01')],
      [false, true, false],
    ),
  );
  check('pluralLt', () =>
    eq(
      [1, 2, 11, 12, 21, 22, 100].map((n) => pluralLt(n, HUNTED_WOLVES)),
      [
        'sumedžiotas vilkas',
        'sumedžioti vilkai',
        'sumedžiotų vilkų',
        'sumedžiotų vilkų',
        'sumedžiotas vilkas',
        'sumedžioti vilkai',
        'sumedžiotų vilkų',
      ],
    ),
  );
  check('Šabloniniai laikotarpiai', () =>
    eq(
      [
        matchPreset({ from: '2025-04-01', to: '2026-03-31' }, today),
        matchPreset({ from: '2026-09-10', to: today }, today),
        matchPreset(all, today),
        matchPreset({ from: '2025-12-01', to: '2026-01-31' }, today),
        intervalLabel({ from: '2026-09-10', to: today }, 'last30'),
        intervalLabel({ from: '2025-11-15', to: '2025-11-15' }),
      ],
      [
        'season:2025',
        'last30',
        'all',
        'custom',
        'paskutinės 30 d. (2026-09-10 – 2026-10-09)',
        '2025-11-15',
      ],
    ),
  );
  check('Numatytasis sezonas', () =>
    eq(
      [defaultSeason(ds.records, seasonOfDay(today)), defaultSeason(ds.records, 2025)],
      [2025, 2025],
    ),
  );
  check('Būsenos kortelė', () =>
    eq(
      [
        statusModel(null, true, ds.records, today).state,
        statusModel({ wolfAmount: 0, wolfLimit: 0 }, false, ds.records, today).state,
        statusModel({ wolfAmount: 15, wolfLimit: 222 }, false, ds.records, today).state,
        statusModel({ wolfAmount: 300, wolfLimit: 307 }, false, ds.records, '2025-12-01').state,
        statusModel({ wolfAmount: 307, wolfLimit: 307 }, false, ds.records, '2025-12-01').state,
        statusModel({ wolfAmount: 100, wolfLimit: 307 }, false, ds.records, '2025-12-01').remaining,
      ],
      ['unavailable', 'notApproved', 'beforeStart', 'littleLeft', 'exhausted', 207],
    ),
  );
  check('Sezonai ir mėnesiai', () => {
    const pivot = seasonMonthPivot(ds.records, {
      currentSeason: 2026,
      currentWolfLimit: 0,
      paperRowsBySeason: ds.paperRowsBySeason,
    });
    const s = pivot.find((p) => p.season === 2025);
    return eq(
      [
        pivot.map((p) => p.season),
        s && s.months,
        s && s.other,
        s && s.total,
        s && s.limit,
        s && s.paperRows,
        pivot[0].limit,
      ],
      [[2026, 2025, 2024, 2023], { 1: 0, 2: 1, 3: 0, 10: 2, 11: 0, 12: 2 }, 1, 6, 307, 1, null],
    );
  });
  check('Etiketės', () =>
    eq(
      [
        packLabel(true, 4),
        packLabel(true, 0),
        packLabel(null, null),
        ageLabel('NEW_CODE'),
        methodLabel(null),
      ],
      ['Taip, gaujoje 4', 'Taip', 'Nenurodyta', 'NEW_CODE', 'Nenurodytas'],
    ),
  );
  check('CSV be koordinačių ir id', () => {
    const csv = buildCsv(ds.records, {
      interval: all,
      now: new Date('2026-10-09T10:05:00.000Z'),
    });
    const lines = csv.slice(1).split('\r\n');
    if (csv[0] !== '﻿') return 'no BOM';
    if (/biomon_|biip_|500500|6100500|500123/.test(csv)) return 'id or coordinate leaked';
    if (!lines.some((l) => l.indexOf('"SU;""X"""') >= 0)) return 'quoting';
    return eq(
      [lines[0].split('; parengta ')[0], lines[1], lines[2], lines.length, csvFileName(all)],
      [
        '# Sumedžioti vilkai; 2017-04-01–2026-10-09; visa Lietuva',
        'data;sezonas;amzius;lytis;medziokles_budas;gaujos_narys;saltinis;ne_medziokles_laikotarpiu',
        '2026-04-01;2026/2027;Suaugęs;Patinas;Varomoji;Ne;BIIP elektroninis medžioklės lapas;taip',
        ds.records.length + 3,
        'vilkai_2017-04-01_2026-10-09.csv',
      ],
    );
  });
  check('Laikas 24 h', () =>
    eq(formatDateTime(new Date('2026-01-15T22:05:00.000Z')), '2026-01-16 00:05'),
  );

  return results;
}

// One line per check: 'OK: name' or 'KLAIDA: name (detail)'.
export const formatSelfChecks = (results: SelfCheckResult[]) =>
  results.map((r) =>
    r.ok ? `OK: ${r.name}` : `KLAIDA: ${r.name}${r.detail ? ` (${r.detail})` : ''}`,
  );
