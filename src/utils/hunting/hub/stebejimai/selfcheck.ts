// ?debug=1 self-checks of the Stebėjimai topic (STEB-SPEC §7, S1 part). Pure rules on
// synthetic rows only: every row below is invented, none comes from the API. The hub's
// self-check (`utils/hunting/hub/selfcheck.ts`) loads this module and appends the results.
import type { SelfCheckResult } from '@/utils/hunting/selfcheck';
import { pointHex } from '@/utils/hunting/selfcheck';
import { CSV_BOM } from '@/utils/hunting/csv';
import { formatInt } from '@/utils/hunting/dates';
import {
  animalsOf,
  answerText,
  buildStebCsv,
  countText,
  factText,
  filterRecords,
  municipalitySummary,
  observationsUrl,
  parseEwkbPoint,
  parseObservationRow,
  parsePeriod,
  periodInterval,
  periodLabel,
  periodQuery,
  recordPageUrl,
  RECORDS_CSV_HEADER,
  seasonOptions,
  slugLt,
  speciesSummary,
  stebCsvFileName,
  STEB_DEFAULT_TABLE,
  STEB_FAKTAS_RE,
  STEB_FIELDS,
  STEB_FORBIDDEN_FIELDS,
  STEB_GYVUNAS_RE,
  STEB_TABLES,
  STEB_URL_KEYS,
  vilniusParts,
  type MuniCodeOf,
  type StebPeriod,
  type StebRecord,
  type StebTableId,
} from './model';
import { speciesColor, STEB_OTHER_COLOR } from './layers';
import { SS } from './strings';

export type { SelfCheckResult };

export const STEB_SELFCHECK_TODAY = '2026-10-20';

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

// ---- Synthetic fixture (invented names, places and points).
const SYN_MUNI: Record<string, number> = { 'Bandomoji r. sav.': 901, 'Pavyzdžių m. sav.': 902 };
const synCodeOf: MuniCodeOf = (name) => (name ? (SYN_MUNI[name.trim()] ?? null) : null);

const raw = (id: unknown, extra: Record<string, unknown> = {}) => ({
  id,
  dateTime: '2026-10-18T07:20:00.000Z',
  species: 'Vilkas',
  count: 1,
  countMale: 0,
  countFemale: 0,
  countJunior: 0,
  fact: 'Aptikti pėdsakai',
  factOther: '',
  geom: pointHex(470000, 6090000),
  municipalities: 'Bandomoji r. sav.',
  elderships: 'Bandomoji sen.',
  huntingAreas: '„Bandomasis“ MPV',
  ...extra,
});

/** Eight synthetic records: dates in two seasons, no date, no point, a bison breakdown. */
export function stebSelfCheckRecords(): StebRecord[] {
  const rows = [
    raw(1, { dateTime: '2026-10-18T07:20:00.000Z' }),
    raw(2, { dateTime: '2026-10-01T10:00:00.000Z', species: 'Lūšis', count: 2 }),
    raw(3, {
      dateTime: '2026-09-15T12:00:00.000Z',
      species: 'Stumbras',
      count: 6,
      countMale: 2,
      countFemale: 3,
      countJunior: 1,
      fact: 'Stebėtas gyvas individas(-ai)',
    }),
    raw(4, { dateTime: '2026-03-31T21:30:00.000Z', municipalities: 'Pavyzdžių m. sav.' }),
    raw(5, { dateTime: '2025-12-31T22:30:00.000Z', species: 'Rudasis lokys', count: null }),
    raw(6, { dateTime: null, species: '', fact: '', count: 3 }),
    raw(7, { geom: null, municipalities: '', factOther: '=1+1', count: 4 }),
    raw(8, {
      dateTime: '2024-05-02T08:00:00.000Z',
      species: 'Lūšis',
      geom: pointHex(590000.6, 6155000.4),
    }),
  ];
  return rows.map((r, i) => parseObservationRow(r, i)!).filter(Boolean);
}

const ids = (list: StebRecord[]) => list.map((r) => r.id);

export function runStebejimaiChecks(): SelfCheckResult[] {
  const { results, check, eq } = runner();
  const T = STEB_SELFCHECK_TODAY;

  // ---- Constants (§4.2): the S2 contract copies are compared by the hub self-check.
  check('Stebėjimai: STEB_FIELDS (§2)', () =>
    eq(
      [...STEB_FIELDS],
      [
        'id',
        'dateTime',
        'species',
        'count',
        'countMale',
        'countFemale',
        'countJunior',
        'fact',
        'factOther',
        'geom',
        'municipalities',
        'elderships',
        'huntingAreas',
      ],
    ),
  );
  check(
    'Stebėjimai: draudžiami laukai nėra tarp prašomų',
    () =>
      STEB_FORBIDDEN_FIELDS.every((f) => STEB_FIELDS.indexOf(f) < 0) &&
      eq(
        [...STEB_FORBIDDEN_FIELDS],
        ['fullName', 'phone', 'email', 'notes', 'files', 'bdarAgreement'],
      ),
  );
  check('Stebėjimai: lentelės ir URL raktai (§4.2)', () =>
    eq(
      {
        tables: STEB_TABLES,
        def: STEB_DEFAULT_TABLE,
        keys: STEB_URL_KEYS,
        g: STEB_GYVUNAS_RE.source,
        f: STEB_FAKTAS_RE.source,
      },
      {
        tables: ['irasai', 'rusys', 'savivaldybes'],
        def: 'irasai',
        keys: ['nuo', 'iki', 'laikotarpis', 'sezonas', 'sav', 'gyvunas', 'faktas', 'lentele'],
        g: '^[a-z0-9-]{1,40}$',
        f: '^[a-z0-9-]{1,60}$',
      },
    ),
  );

  // ---- EWKB (§2 test vectors).
  check('Stebėjimai: EWKB taškai (§2)', () =>
    eq(
      [
        parseEwkbPoint('0101000020120D000000000000C0AF1C4100000000443B5741'),
        parseEwkbPoint('0101000020120D0000000000006001224100000000BE7A5741'),
        parseEwkbPoint('010100000000000000C0AF1C410000000008455741'),
        parseEwkbPoint('002000000100000D12411CAFC0000000004157450800000000'),
        parseEwkbPoint({ type: 'Point', coordinates: [470000, 6100000] }),
      ],
      [
        [470000, 6090000],
        [590000, 6155000],
        [470000, 6100000],
        [470000, 6100000],
        [470000, 6100000],
      ],
    ),
  );
  check('Stebėjimai: netinkami EWKB → null', () => {
    const bad = [
      '0102000020120D0000',
      '0101',
      'zz',
      '',
      null,
      undefined,
      '0101000020E6100000000000000000F03F000000000000F03F', // SRID 4326
      pointHex(100, 200), // outside Lithuania
      '0101000020120D000000000000C0AF1C4100000000443B57', // truncated
      { type: 'LineString', coordinates: [470000, 6100000] },
    ];
    const out = bad.map((v) => parseEwkbPoint(v));
    return out.every((v) => v === null) || `got ${JSON.stringify(out)}`;
  });

  // ---- Vilnius time (§2), both DST switches.
  check('Stebėjimai: Vilniaus data ir laikas (§2)', () =>
    eq(
      [
        '2026-10-18T07:20:00.000Z',
        '2026-03-29T00:30:00.000Z',
        '2026-10-25T00:30:00.000Z',
        '2026-10-24T22:00:00.000Z',
        '2025-12-31T22:30:00.000Z',
      ].map((iso) => {
        const p = vilniusParts(iso);
        return p ? `${p.day} ${p.time}` : null;
      }),
      [
        '2026-10-18 10:20',
        '2026-03-29 02:30',
        '2026-10-25 03:30',
        '2026-10-25 01:00',
        '2026-01-01 00:30',
      ],
    ),
  );
  check('Stebėjimai: netinkama data → null', () =>
    eq(
      [vilniusParts(''), vilniusParts('x'), vilniusParts(null), vilniusParts(5)],
      [null, null, null, null],
    ),
  );

  // ---- Slugs (§3.3).
  check('Stebėjimai: slugLt', () => {
    const out = [
      slugLt('Rudasis lokys'),
      slugLt('Lūšis'),
      slugLt('Stebėtas gyvas individas(-ai)', 60),
      slugLt(''),
      slugLt('  Ąžuolų  šilas!! '),
    ];
    const res = eq(out, [
      'rudasis-lokys',
      'lusis',
      'stebetas-gyvas-individas-ai',
      '',
      'azuolu-silas',
    ]);
    if (res !== true) return res;
    const long = slugLt('a'.repeat(39) + ' b c', 40);
    if (!STEB_GYVUNAS_RE.test(long) || long.length > 40 || /-$/.test(long))
      return `long slug: ${long}`;
    return (
      (STEB_GYVUNAS_RE.test(out[0]) &&
        STEB_GYVUNAS_RE.test(out[1]) &&
        STEB_FAKTAS_RE.test(out[2])) ||
      'does not match the PASS regex'
    );
  });

  // ---- Rows (§4.6): only the whitelisted fields, never the reporter's.
  check('Stebėjimai: kontaktai neperskaitomi', () => {
    const r = parseObservationRow(
      raw(9, {
        fullName: 'Vardenis Pavardenis',
        phone: '+37060000000',
        email: 'x@example.invalid',
        notes: 'pastaba',
        files: ['a.jpg'],
        bdarAgreement: true,
      }),
    ) as unknown as Record<string, unknown>;
    const text = JSON.stringify(r);
    const leaked = STEB_FORBIDDEN_FIELDS.filter(
      (f) => f in r || /Vardenis|37060000000|example\.invalid|pastaba|a\.jpg/.test(text),
    );
    return leaked.length === 0 || `found: ${leaked.join(', ')}`;
  });
  check('Stebėjimai: įrašas be tinkamo id – be nuorodos', () => {
    const zero = parseObservationRow(raw(0), 3)!;
    const x = parseObservationRow(raw('x'), 4)!;
    const ok7 = parseObservationRow(raw('7'), 5)!;
    return eq(
      [
        zero.id,
        zero.key,
        x.id,
        x.key,
        recordPageUrl(zero.id, null, 'staging-maps.biip.lt'),
        ok7.id,
      ],
      [null, 'row:3', null, 'row:4', null, 7],
    );
  });
  check('Stebėjimai: netinkami skaičiai → null', () => {
    const r = parseObservationRow(
      raw(10, { count: 1.5, countMale: -1, countFemale: 'du', countJunior: '2' }),
    )!;
    return eq([r.count, r.countMale, r.countFemale, r.countJunior], [null, null, null, 2]);
  });
  check('Stebėjimai: kortelės tekstai', () => {
    const [, , bison, , , , noPoint] = stebSelfCheckRecords();
    return eq(
      [countText(bison), factText(bison), factText(noPoint), countText(noPoint)],
      [
        '6 (patinų 2, patelių 3, jauniklių 1)',
        'Stebėtas gyvas individas',
        'Aptikti pėdsakai – =1+1',
        '4',
      ],
    );
  });

  // ---- Request (§2).
  check('Stebėjimai: užklausa prašo tik STEB_FIELDS', () => {
    const url = new URL(observationsUrl(2), 'http://localhost');
    const p = url.searchParams;
    const fields = (p.get('fields') || '').split(',');
    const forbidden = STEB_FORBIDDEN_FIELDS.filter((f) => url.href.indexOf(f) >= 0);
    if (forbidden.length) return `forbidden: ${forbidden.join(', ')}`;
    return eq(
      [
        fields,
        p.get('sort'),
        p.get('pageSize'),
        p.get('page'),
        url.pathname.endsWith('/medziokle/observations'),
      ],
      [[...STEB_FIELDS], '-dateTime,-id', '500', '2', true],
    );
  });

  // ---- Period (§3.3).
  check('Stebėjimai: laikotarpio pirmenybė ir normalizavimas', () =>
    eq(
      [
        parsePeriod(
          { nuo: '2026-01-01', iki: '2026-03-31', sezonas: '2025-2026', laikotarpis: '30d' },
          T,
        ),
        parsePeriod({ nuo: '2026-03-31', iki: '2026-01-01', sezonas: '2025-2026' }, T),
        parsePeriod({ nuo: '2026-02-30', iki: '2026-03-31', laikotarpis: '30d' }, T),
        parsePeriod({ sezonas: '2025-2027' }, T),
        parsePeriod({ sezonas: '2027-2028' }, T),
        parsePeriod({ sezonas: '2016-2017' }, T),
        parsePeriod({ laikotarpis: 'visi' }, T),
        parsePeriod({ laikotarpis: ['30d'] }, T),
        parsePeriod({}, T),
      ],
      [
        { kind: 'range', from: '2026-01-01', to: '2026-03-31' },
        { kind: 'season', season: 2025 },
        { kind: '30d' },
        { kind: 'all' },
        { kind: 'all' },
        { kind: 'all' },
        { kind: 'all' },
        { kind: 'all' },
        { kind: 'all' },
      ],
    ),
  );
  check('Stebėjimai: laikotarpis ↔ URL', () => {
    const periods: StebPeriod[] = [
      { kind: 'all' },
      { kind: '30d' },
      { kind: 'season', season: 2025 },
      { kind: 'range', from: '2026-10-18', to: '2026-10-18' },
    ];
    const back = periods.map((p) => parsePeriod(periodQuery(p), T));
    if (JSON.stringify(back) !== JSON.stringify(periods)) return `got ${JSON.stringify(back)}`;
    return eq(periodQuery({ kind: 'all' }), {});
  });
  check('Stebėjimai: laikotarpio intervalai ir pavadinimai', () =>
    eq(
      [
        periodInterval({ kind: '30d' }, T),
        periodInterval({ kind: 'season', season: 2025 }, T),
        periodInterval({ kind: 'all' }, T),
        periodLabel({ kind: 'all' }, T),
        periodLabel({ kind: '30d' }, T),
        periodLabel({ kind: 'season', season: 2025 }, T),
        periodLabel({ kind: 'range', from: '2026-01-01', to: '2026-01-01' }, T),
      ],
      [
        { from: '2026-09-21', to: '2026-10-20' },
        { from: '2025-04-01', to: '2026-03-31' },
        null,
        'visas laikotarpis',
        'paskutinės 30 d. (2026-09-21 – 2026-10-20)',
        '2025/2026 sezonas',
        '2026-01-01',
      ],
    ),
  );
  // The oldest record's own season is the last one offered, not the season of its year's
  // 1 January (a record from 2026-09-21 offers 2026/2027 only).
  check('Stebėjimai: sezonų sąrašas (§3.3)', () =>
    eq(
      [
        seasonOptions(T, '2026-09-21'),
        seasonOptions(T, '2024-06-15'),
        seasonOptions(T, '2024-03-31'),
        seasonOptions(T, null),
        seasonOptions(T, '2027-01-05'),
        seasonOptions(T, '2012-07-01').length,
      ],
      [[2026], [2026, 2025, 2024], [2026, 2025, 2024, 2023], [2026], [2026], 10],
    ),
  );

  // ---- Filtering (§3.3).
  check('Stebėjimai: filtravimas', () => {
    const rows = stebSelfCheckRecords();
    const f = (filters: Partial<Parameters<typeof filterRecords>[1]>) =>
      ids(
        filterRecords(
          rows,
          { period: { kind: 'all' }, gyvunas: null, faktas: null, sav: null, ...filters },
          T,
          synCodeOf,
        ),
      );
    return eq(
      [
        f({}),
        f({ period: { kind: '30d' } }),
        f({ period: { kind: 'season', season: 2025 } }),
        f({ period: { kind: 'range', from: '2026-04-01', to: '2026-04-01' } }),
        f({ gyvunas: 'lusis' }),
        f({ gyvunas: 'nenurodyta' }),
        f({ faktas: 'stebetas-gyvas-individas-ai' }),
        f({ faktas: 'nenurodyta' }),
        f({ sav: 902 }),
        f({ sav: 901, gyvunas: 'vilkas', period: { kind: 'season', season: 2026 } }),
        f({ sav: 903 }),
      ],
      [[1, 2, 3, 4, 5, 6, 7, 8], [1, 2, 7], [5], [4], [2, 8], [6], [3], [6], [4], [1], []],
    );
  });

  // ---- Answer (§3.2). No-break spaces keep "vilkas – 4" together; compared as spaces.
  const sp = (text: string) => text.replace(/\u00a0/g, ' ');
  const many = (n: number, species = 'Vilkas') =>
    Array.from(
      { length: n },
      (_, i) => parseObservationRow(raw(100 + i, { species, count: null }), i)!,
    );
  check('Stebėjimai: atsakymo derinimas (0, 1, 2, 10, 11, 21, 22)', () =>
    eq(
      [0, 1, 2, 10, 11, 21, 22].map((n) => sp(answerText(many(n), { kind: '30d' }, T).text)),
      [
        'Per paskutines 30 d. stebėjimų neužregistruota.',
        'Per paskutines 30 d. užregistruotas 1 stebėjimas: vilkas – 1.',
        'Per paskutines 30 d. užregistruoti 2 stebėjimai (paskutinis – 2026-10-18): vilkas – 2.',
        'Per paskutines 30 d. užregistruota 10 stebėjimų (paskutinis – 2026-10-18): vilkas – 10.',
        'Per paskutines 30 d. užregistruota 11 stebėjimų (paskutinis – 2026-10-18): vilkas – 11.',
        'Per paskutines 30 d. užregistruotas 21 stebėjimas (paskutinis – 2026-10-18): vilkas – 21.',
        'Per paskutines 30 d. užregistruoti 22 stebėjimai (paskutinis – 2026-10-18): vilkas – 22.',
      ],
    ),
  );
  check('Stebėjimai: atsakymas, sąrašo tvarka ir gyvūnai', () => {
    const rows = stebSelfCheckRecords();
    const all = answerText(rows, { kind: 'all' }, T);
    const tie = answerText(
      [...many(2, 'Stumbras'), ...many(2, 'Lūšis'), ...many(2, 'Briedis'), ...many(2, 'Vilkas')],
      { kind: 'season', season: 2026 },
      T,
    );
    return eq(
      [
        all.text,
        tie.sentence,
        answerText([], { kind: 'all' }, T).text,
        answerText(rows.slice(3, 4), { kind: 'range', from: '2026-04-01', to: '2026-04-01' }, T)
          .sentence,
        answerText(rows.slice(5, 6), { kind: 'all' }, T).sentence,
        answerText([], { kind: 'all' }, T, '2024-05-02').text,
        answerText(rows.slice(1, 2), { kind: 'all' }, T, '2024-05-02').sentence,
        answerText(rows.slice(0, 1), { kind: 'range', from: '2026-10-01', to: '2026-10-20' }, T)
          .text,
      ].map(sp),
      [
        'Iš viso nuo 2024-05-02 užregistruoti 8 stebėjimai (paskutinis – 2026-10-18): vilkas – 3, ' +
          'lūšis – 2, rudasis lokys – 1, stumbras – 1, nenurodyta – 1. Pranešimuose nurodyta 18 ' +
          'gyvūnų.',
        '2026/2027 sezone užregistruoti 8 stebėjimai (paskutinis – 2026-10-18): vilkas – 2, ' +
          'lūšis – 2, stumbras – 2, briedis – 2.',
        'Stebėjimų neužregistruota.',
        '2026-04-01 užregistruotas 1 stebėjimas: vilkas – 1.',
        'Iš viso užregistruotas 1 stebėjimas: nenurodyta – 1.',
        'Nuo 2024-05-02 stebėjimų neužregistruota.',
        'Iš viso nuo 2026-10-01 užregistruotas 1 stebėjimas: lūšis – 1.',
        'Laikotarpiu 2026-10-01 – 2026-10-20 užregistruotas 1 stebėjimas: vilkas – 1. ' +
          'Pranešimuose nurodytas 1 gyvūnas.',
      ],
    );
  });

  // ---- Record link (§3.7).
  check('Stebėjimai: įrašo nuoroda', () =>
    eq(
      [
        recordPageUrl(7, 'http://localhost:8090', 'localhost'),
        recordPageUrl('7', 'https://staging-medziokle.biip.lt', 'localhost'),
        recordPageUrl(7, null, 'staging-maps.biip.lt'),
        recordPageUrl(7, null, 'maps.biip.lt'),
        recordPageUrl(7, null, 'dev-maps.biip.lt'),
        recordPageUrl(7, null, 'localhost'),
        recordPageUrl(0, null, 'maps.biip.lt'),
        recordPageUrl(-1, null, 'maps.biip.lt'),
        recordPageUrl(1.5, null, 'maps.biip.lt'),
        recordPageUrl('7a', null, 'maps.biip.lt'),
        recordPageUrl(7, null, '__proto__'),
      ],
      [
        'http://localhost:8090/stebeti-gyvunai/7/',
        'https://staging-medziokle.biip.lt/stebeti-gyvunai/7/',
        'https://staging-medziokle.biip.lt/stebeti-gyvunai/7/',
        'https://medziokle.biip.lt/stebeti-gyvunai/7/',
        'https://dev-medziokle.biip.lt/stebeti-gyvunai/7/',
        null,
        null,
        null,
        null,
        null,
        null,
      ],
    ),
  );

  // ---- CSV (§3.6).
  const labels = {
    period: 'visas laikotarpis',
    species: 'visos rūšys',
    fact: 'visi faktai',
    place: 'visa Lietuva',
  };
  const csvOf = (
    table: StebTableId,
    rows: StebRecord[],
    truncated?: { shown: number; total: number },
  ) =>
    buildStebCsv({
      table,
      records: rows,
      fetchedAt: new Date('2026-10-20T07:42:00.000Z'),
      labels,
      truncated: truncated || null,
      linkOf: (r) => recordPageUrl(r.id, null, 'staging-maps.biip.lt'),
    });
  check('Stebėjimai: CSV formatas', () => {
    const rows = stebSelfCheckRecords();
    const csv = csvOf('irasai', rows);
    if (!csv.startsWith(CSV_BOM)) return 'no BOM';
    const lines = csv.slice(1).split('\r\n');
    if (lines[lines.length - 1] !== '') return 'last line without CRLF';
    if (/[^\r]\n/.test(csv)) return 'LF without CR';
    const bison = lines.find((l) => l.startsWith('3;'));
    const noPoint = lines.find((l) => l.startsWith('7;'));
    const lynx = lines.find((l) => l.startsWith('8;'));
    return eq(
      [lines[0], lines[1], lines[2], bison, noPoint, lynx],
      [
        '# Duomenys: tiesiogiai iš BĮIP; gauta 2026-10-20 10:42',
        '# Stebėjimai – Įrašai; visas laikotarpis; visos rūšys; visi faktai; visa Lietuva',
        RECORDS_CSV_HEADER.join(';'),
        '3;2026-09-15;15:00;Stumbras;6;2;3;1;Stebėtas gyvas individas(-ai);;Bandomoji r. sav.;' +
          'Bandomoji sen.;„Bandomasis“ MPV;470000;6090000;' +
          'https://staging-medziokle.biip.lt/stebeti-gyvunai/3/',
        "7;2026-10-18;10:20;Vilkas;4;;;;Aptikti pėdsakai;'=1+1;;Bandomoji sen.;„Bandomasis“ MPV;;;" +
          'https://staging-medziokle.biip.lt/stebeti-gyvunai/7/',
        '8;2024-05-02;11:00;Lūšis;1;;;;Aptikti pėdsakai;;Bandomoji r. sav.;Bandomoji sen.;' +
          '„Bandomasis“ MPV;590001;6155000;https://staging-medziokle.biip.lt/stebeti-gyvunai/8/',
      ],
    );
  });
  check('Stebėjimai: CSV suvestinės ir nupjovimas', () => {
    const rows = stebSelfCheckRecords();
    const species = csvOf('rusys', rows).slice(1).split('\r\n');
    const munis = csvOf('savivaldybes', rows, { shown: 10000, total: 12345 })
      .slice(1)
      .split('\r\n');
    return eq(
      [species.slice(2, 5), munis[1], munis.slice(2, 7)],
      [
        ['Rūšis;Stebėjimų;Gyvūnų', 'Iš viso;8;18', 'Vilkas;3;6'],
        '# Stebėjimai – Savivaldybės; visas laikotarpis; visos rūšys; visi faktai; visa Lietuva; ' +
          `rodoma ${formatInt(10000)} naujausių įrašų iš ${formatInt(12345)}`,
        [
          'Savivaldybė;Stebėjimų;Gyvūnų',
          'Iš viso;8;18',
          'Bandomoji r. sav.;6;13',
          'Pavyzdžių m. sav.;1;1',
          'Nenurodyta;1;4',
        ],
      ],
    );
  });
  check('Stebėjimai: nupjovimo pastaba', () =>
    eq(
      [SS.truncated(10000, 12345), SS.truncated(9999, 12345), SS.truncated(21, 30)],
      [
        `Rodoma ${formatInt(10000)} naujausių įrašų iš ${formatInt(12345)}.`,
        `Rodomi ${formatInt(9999)} naujausi įrašai iš ${formatInt(12345)}.`,
        'Rodomas 21 naujausias įrašas iš 30.',
      ],
    ),
  );
  check('Stebėjimai: CSV failų vardai', () =>
    eq(
      [
        stebCsvFileName('irasai', { kind: 'all' }, T),
        stebCsvFileName('rusys', { kind: 'season', season: 2025 }, T),
        stebCsvFileName('savivaldybes', { kind: '30d' }, T),
        stebCsvFileName('irasai', { kind: 'range', from: '2026-01-01', to: '2026-03-31' }, T),
        stebCsvFileName('irasai', { kind: 'season', season: 2025 }, T, {
          place: 'Kauno r. sav.',
          species: 'Paprastoji lūšis',
        }),
      ],
      [
        'stebejimai-irasai-visi.csv',
        'stebejimai-rusys-2025-2026.csv',
        'stebejimai-savivaldybes-30d-2026-10-20.csv',
        'stebejimai-irasai-2026-01-01-2026-03-31.csv',
        'stebejimai-irasai-2025-2026-kauno-r-sav-paprastoji-lusis.csv',
      ],
    ),
  );

  // ---- QA invariant (§3.5) on the synthetic set, for every period.
  check('Stebėjimai: N = įrašai = rūšys = savivaldybės = CSV = taškai + be vietos', () => {
    const rows = stebSelfCheckRecords();
    const periods: StebPeriod[] = [
      { kind: 'all' },
      { kind: '30d' },
      { kind: 'season', season: 2025 },
      { kind: 'season', season: 2026 },
    ];
    for (const period of periods) {
      const list = filterRecords(
        rows,
        { period, gyvunas: null, faktas: null, sav: null },
        T,
        synCodeOf,
      );
      const n = answerText(list, period, T).n;
      const speciesTotal = speciesSummary(list).reduce((s, g) => s + g.n, 0);
      const muniTotal = municipalitySummary(list).reduce((s, g) => s + g.n, 0);
      const csvRows = csvOf('irasai', list).slice(1).split('\r\n').length - 4;
      const points = list.filter((r) => r.x !== null).length;
      const noPoint = list.filter((r) => r.x === null).length;
      const all = [n, list.length, speciesTotal, muniTotal, csvRows, points + noPoint];
      if (all.some((v) => v !== n)) return `${period.kind}: ${JSON.stringify(all)}`;
    }
    return eq(animalsOf(rows), 18);
  });

  // ---- Map colours (§3.4).
  check('Stebėjimai: rūšių spalvos', () =>
    eq(['vilkas', 'lusis', 'rudasis-lokys', 'stumbras', 'briedis', '__proto__'].map(speciesColor), [
      '#B45309',
      '#7C7CCB',
      '#1DA09F',
      '#638353',
      STEB_OTHER_COLOR,
      STEB_OTHER_COLOR,
    ]),
  );

  return results;
}
