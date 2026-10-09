#!/usr/bin/env node
// Checks the committed snapshot (public/data/hunting/v1/*.json) without a database: privacy lint,
// referential integrity, internal consistency and reconciliation with checks.json.
//
// Usage: node scripts/hunting-snapshot/check.mjs [data-dir]
//
// Node >= 18, no dependencies. Exit 1 with one message per failure. Runs in CI on every push.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DAMAGE_GROUPS,
  ESCALATION_GROUPS,
  LIVESTOCK_CLASSES,
  MIN_MPV,
  POOLED_CODE,
  auditDamages,
} from './privacy.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(process.argv[2] || join(HERE, '../../public/data/hunting/v1'));

const failures = [];
const fail = (msg) => failures.push(msg);

// file -> table -> exact column list. Anything else is a failure.
const SCHEMA = {
  meta: {
    seasons: ['season', 'current'],
    species: ['id', 'name', 'slug', 'formType', 'group', 'isOther'],
    municipalities: ['code', 'name', 'county', 'mpvCount', 'mpvHa', 'mpvSmall', 'pooled'],
  },
  loots: {
    loots: ['season', 'muni', 'sp', 'n', 'paper', 'app', 'm', 'f', 'j', 'dead', 'road'],
    kita: ['season', 'n', 'dead'],
  },
  limits: {
    limits: [
      'season',
      'muni',
      'mpvWithLimit',
      'limM',
      'limFj',
      'usedM',
      'usedFj',
      'leftM',
      'leftFj',
    ],
  },
  damages: {
    season: ['season', 'muni', 'grp', 'reports', 'reporters', 'escalated', 'hidden'],
    month: ['ym', 'grp', 'reports', 'hidden'],
    attacked: ['season', 'grp', 'cls', 'entries', 'animals', 'hidden'],
  },
  wolves: {
    located: ['season', 'muni', 'located'],
  },
};
const GROUPS = DAMAGE_GROUPS;
const HIDDEN = (keys) => new RegExp(`^(${keys})(,(${keys}))*$`);
// Columns that may hold strings, and what they may hold. Every other data cell is an integer or null.
const STRING_COLUMNS = {
  'meta.species.name': /^[\p{L} -]{2,40}$/u,
  'meta.species.slug': /^[a-z0-9-]{2,40}$/,
  'meta.species.formType': /^(HORNED|EXTENDED|SIMPLE|WOLF|OTHER)$/,
  'meta.species.group': /^[\p{L} ]{2,30}$/u,
  'meta.municipalities.name': /^[\p{L} .-]{2,40}$/u,
  'meta.municipalities.county': /^[\p{L} .-]{2,40}$/u,
  'damages.season.grp': new RegExp(`^(\\*|${GROUPS.join('|')})$`),
  'damages.month.grp': new RegExp(`^(${GROUPS.join('|')})$`),
  'damages.month.ym': /^\d{4}-(0[1-9]|1[0-2])$/,
  'damages.attacked.grp': /^(vilkai|lusys|lokiai)$/,
  'damages.attacked.cls': new RegExp(`^(\\*|${LIVESTOCK_CLASSES.join('|')})$`),
  'damages.season.hidden': HIDDEN('escalated|reports'),
  'damages.month.hidden': HIDDEN('reports'),
  'damages.attacked.hidden': HIDDEN('animals|entries'),
};
const BOOLEAN_COLUMNS = new Set([
  'meta.seasons.current',
  'meta.species.isOther',
  'meta.municipalities.pooled',
]);
const NULLABLE = new Set([
  'meta.species.group',
  'loots.loots.m',
  'loots.loots.f',
  'loots.loots.j',
  'damages.season.reports',
  'damages.season.reporters',
  'damages.season.escalated',
  'damages.month.reports',
  'damages.attacked.entries',
  'damages.attacked.animals',
  'damages.season.hidden',
  'damages.month.hidden',
  'damages.attacked.hidden',
]);
// Damages cells published under the small-cell rule: a value of 1 or 2 must have been nulled in SQL.
const SUPPRESSED = new Set([
  'damages.season.reports',
  'damages.season.reporters',
  'damages.season.escalated',
  'damages.month.reports',
  'damages.attacked.entries',
  'damages.attacked.animals',
]);
// Words that must never appear as a key (keys are split on camelCase, '_' and '-').
const FORBIDDEN_KEY_WORDS =
  /^(e?mail|email|phone|tel|telephone|mobile|note|notes|file|files|geom|geometry|coord|coords|coordinates|lat|latitude|lon|lng|longitude|x|y|wkt|point|name|names|first|last|surname|person|user|users|hunter|hunters|member|members|tenant|tenants|address|day|date|time|text|comment|comments|description)$/i;
// Keys allowed to contain one of the words above.
const ALLOWED_KEYS = new Set([
  'meta.species.name',
  'meta.municipalities.name',
  'snapshotDate', // file-level, not data
]);
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE =
  /(\+370[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{3}|\b8[\s-]?6\d{2}[\s-]?\d{5}\b|\b86\d{7}\b|\b6\d{7}\b)/;

const words = (key) =>
  key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .filter(Boolean);

function load(name) {
  try {
    const file = JSON.parse(readFileSync(join(DIR, `${name}.json`), 'utf8'));
    return file;
  } catch (e) {
    fail(`${name}.json: cannot read (${e.message})`);
    return null;
  }
}

// ---------------------------------------------------------------- files and shape
const present = readdirSync(DIR).sort();
const expectedFiles = Object.keys(SCHEMA)
  .map((n) => `${n}.json`)
  .sort();
if (present.join() !== expectedFiles.join())
  fail(`data dir must contain exactly ${expectedFiles.join(', ')}; found ${present.join(', ')}`);

const files = Object.fromEntries(Object.keys(SCHEMA).map((n) => [n, load(n)]));
if (failures.length) finish();

const snapshotDate = files.meta.snapshotDate;
for (const [name, file] of Object.entries(files)) {
  const keys = Object.keys(file);
  const want = [
    'v',
    'snapshotDate',
    'generatedAt',
    'tables',
    ...(name === 'meta' ? ['static'] : []),
  ];
  if (keys.join() !== want.join())
    fail(`${name}.json: top-level keys ${keys.join(', ')} (want ${want.join(', ')})`);
  if (file.v !== 1) fail(`${name}.json: v must be 1`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(file.snapshotDate)) fail(`${name}.json: bad snapshotDate`);
  if (file.snapshotDate !== snapshotDate) fail(`${name}.json: snapshotDate differs from meta.json`);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(file.generatedAt))
    fail(`${name}.json: bad generatedAt`);
  const tables = Object.keys(file.tables || {});
  const wantTables = Object.keys(SCHEMA[name]);
  if (tables.join() !== wantTables.join())
    fail(`${name}.json: tables ${tables.join(', ')} (want ${wantTables.join(', ')})`);
}
if (failures.length) finish();

// ---------------------------------------------------------------- privacy lint
for (const [name, file] of Object.entries(files)) {
  for (const [table, cols] of Object.entries(SCHEMA[name])) {
    const t = file.tables[table];
    if (JSON.stringify(t.columns) !== JSON.stringify(cols))
      fail(`${name}.${table}: columns ${JSON.stringify(t.columns)} not in the whitelist`);
    if (Object.keys(t).join() !== 'columns,rows') fail(`${name}.${table}: unexpected keys`);
    for (const c of t.columns) {
      const path = `${name}.${table}.${c}`;
      if (!ALLOWED_KEYS.has(path) && words(c).some((w) => FORBIDDEN_KEY_WORDS.test(w)))
        fail(`${path}: column name looks personal or locational`);
    }
    t.rows.forEach((row, i) => {
      if (!Array.isArray(row) || row.length !== cols.length) {
        fail(`${name}.${table} row ${i}: wrong length`);
        return;
      }
      row.forEach((v, ci) => {
        const path = `${name}.${table}.${cols[ci]}`;
        const at = `${path} row ${i}`;
        if (v === null) {
          if (!NULLABLE.has(path)) fail(`${at}: null not allowed`);
        } else if (BOOLEAN_COLUMNS.has(path)) {
          if (typeof v !== 'boolean') fail(`${at}: not a boolean`);
        } else if (STRING_COLUMNS[path]) {
          if (typeof v !== 'string' || !STRING_COLUMNS[path].test(v))
            fail(`${at}: unexpected value ${JSON.stringify(v)}`);
        } else if (!Number.isInteger(v) || v < 0)
          fail(`${at}: not a non-negative integer: ${JSON.stringify(v)}`);
        if (typeof v === 'string' && (EMAIL.test(v) || PHONE.test(v)))
          fail(`${at}: looks like an e-mail or phone`);
        if (SUPPRESSED.has(path) && (v === 1 || v === 2))
          fail(`${at}: damages count ${v} must be suppressed (<3)`);
      });
    });
  }
}
// meta.static is hand-maintained text: no key lint (it holds "note" and "sourceUrl"), but no e-mail or phone.
(function walk(v, path) {
  if (typeof v === 'string') {
    if (EMAIL.test(v) || PHONE.test(v)) fail(`${path}: looks like an e-mail or phone`);
    if (/^https?:/.test(v) && !/^https:\/\/am\.lrv\.lt\//.test(v))
      fail(`${path}: source URL outside am.lrv.lt`);
  } else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
})(files.meta.static, 'meta.static');

const rows = (file, table) => {
  const t = files[file].tables[table];
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
};
const meta = {
  seasons: rows('meta', 'seasons'),
  species: rows('meta', 'species'),
  municipalities: rows('meta', 'municipalities'),
};
const loots = rows('loots', 'loots');
const kita = rows('loots', 'kita');
const limits = rows('limits', 'limits');
const dSeason = rows('damages', 'season');
const dMonth = rows('damages', 'month');
const dAttacked = rows('damages', 'attacked');
const wolves = rows('wolves', 'located');

for (const r of dSeason) {
  if (r.reporters !== null && r.reporters < 3)
    fail(`damages.season ${r.season}/${r.muni}/${r.grp}: reporters < 3`);
  if (r.reporters !== null && r.muni > 0 && r.grp !== '*')
    fail(
      `damages.season ${r.season}/${r.muni}/${r.grp}: reporters published at municipality x group`,
    );
}
for (const r of dAttacked)
  if (r.entries === null && r.animals !== null)
    fail(
      `damages.attacked ${r.season}/${r.grp}/${r.cls}: animals published for suppressed entries`,
    );
for (const r of loots) if (r.sp === 39) fail(`loots ${r.season}/${r.muni}: 'Kita' (39) in loots`);
for (const r of dSeason)
  if (r.escalated !== null && !ESCALATION_GROUPS.includes(r.grp))
    fail(
      `damages.season ${r.season}/${r.muni}/${r.grp}: escalated published outside ${ESCALATION_GROUPS}`,
    );
for (const r of dAttacked)
  if (r.entries === null && r.animals !== null)
    fail(`damages.attacked ${r.season}/${r.grp}/${r.cls}: animals published for '<3' lines`);
// Complete sibling cells: "<3" must cover 0 as well, so every row comes with all its siblings.
{
  const count = (list, key) =>
    list.reduce((m, r) => m.set(key(r), (m.get(key(r)) || 0) + 1), new Map());
  for (const [place, k] of count(dSeason, (r) => `${r.season}/${r.muni}`))
    if (k !== GROUPS.length + 1)
      fail(`damages.season ${place}: ${k} rows (want '*' and every group)`);
  for (const [ym, k] of count(dMonth, (r) => r.ym))
    if (k !== GROUPS.length) fail(`damages.month ${ym}: ${k} rows (want every group)`);
  for (const [key, k] of count(dAttacked, (r) => `${r.season}/${r.grp}`))
    if (k !== LIVESTOCK_CLASSES.length + 1)
      fail(`damages.attacked ${key}: ${k} rows (want '*' and every class)`);
}
// No "<3" or withheld cell can be pinned to 1 or 2 from the published totals (privacy.mjs).
for (const id of auditDamages(files.damages.tables))
  fail(`damages ${id}: can be worked out from the published totals as 1 or 2`);
// No loot or limit row describes fewer than MIN_MPV MPV.
{
  const byCode = new Map(meta.municipalities.map((m) => [m.code, m]));
  const pooledCodes = meta.municipalities.filter((m) => m.pooled);
  const pooledMpv = pooledCodes.reduce((a, m) => a + m.mpvCount, 0);
  if (pooledCodes.length && pooledMpv < MIN_MPV)
    fail(`meta.municipalities: pooled municipalities hold ${pooledMpv} MPV (< ${MIN_MPV})`);
  for (const m of meta.municipalities)
    if (m.mpvCount > 0 && m.mpvCount < MIN_MPV && !m.pooled)
      fail(`meta.municipalities ${m.code}: ${m.mpvCount} MPV but not pooled`);
  for (const [label, list] of [
    ['loots', loots],
    ['limits', limits],
  ])
    for (const r of list) {
      if (r.muni === POOLED_CODE) {
        if (!pooledCodes.length)
          fail(`${label} ${r.season}: pooled row without pooled municipalities`);
      } else if (byCode.get(r.muni)?.pooled)
        fail(`${label} ${r.season}/${r.muni}: row of a pooled municipality`);
    }
}

// ---------------------------------------------------------------- referential
const codes = new Set(meta.municipalities.map((m) => m.code));
const spIds = new Set(meta.species.map((s) => s.id));
const seasons = new Set(meta.seasons.map((s) => s.season));
if (codes.size !== 60) fail(`meta.municipalities: ${codes.size} codes (want 60)`);
if (meta.seasons.filter((s) => s.current).length !== 1)
  fail('meta.seasons: exactly one current season expected');
if (spIds.size !== meta.species.length) fail('meta.species: duplicate id');
if (new Set(meta.species.map((s) => s.slug)).size !== meta.species.length)
  fail('meta.species: duplicate slug');
const ymSeason = (ym) =>
  Number(ym.slice(5)) >= 4 ? Number(ym.slice(0, 4)) : Number(ym.slice(0, 4)) - 1;
const ref = (label, list, test) =>
  list.forEach((r, i) => test(r) || fail(`${label} row ${i}: unknown reference`));
const lootCode = (m) => codes.has(m) || m === POOLED_CODE;
ref('loots', loots, (r) => lootCode(r.muni) && spIds.has(r.sp) && seasons.has(r.season));
ref('kita', kita, (r) => seasons.has(r.season));
ref('limits', limits, (r) => lootCode(r.muni) && seasons.has(r.season));
ref('damages.season', dSeason, (r) => (r.muni === 0 || codes.has(r.muni)) && seasons.has(r.season));
ref('damages.month', dMonth, (r) => seasons.has(ymSeason(r.ym)));
ref('damages.attacked', dAttacked, (r) => seasons.has(r.season));
ref('wolves', wolves, (r) => codes.has(r.muni) && r.season >= 2017);
for (const s of meta.species)
  if (s.isOther !== (s.group === null)) fail(`meta.species ${s.id}: group/isOther mismatch`);

// ---------------------------------------------------------------- internal consistency
// A "<3" damages cell (null) holds 0, 1 or 2 and a withheld one (null, named in `hidden`) any count, so a total T
// and its parts must satisfy Σ known ≤ T ≤ Σ known + 2·k (k = "<3" parts; no upper bound with a withheld part).
const withheld = (r, col) =>
  !!r &&
  String(r.hidden || '')
    .split(',')
    .includes(col);
function bounded(label, total, parts) {
  if (total === null || total === undefined) return;
  const known = parts.filter((p) => p.value !== null).reduce((a, p) => a + p.value, 0);
  const k = parts.filter((p) => p.value === null && !p.withheld).length;
  const open = parts.some((p) => p.withheld);
  if (total < known || (!open && total > known + 2 * k))
    fail(`${label}: total ${total} vs parts ${known} + ${k} '<3'${open ? ' + withheld' : ''}`);
}
const part = (r, col) => ({ value: r[col], withheld: withheld(r, col) });
const dKey = (s, m, g) => dSeason.find((r) => r.season === s && r.muni === m && r.grp === g);
for (const s of seasons) {
  const sRows = dSeason.filter((r) => r.season === s);
  if (!sRows.length) continue;
  for (const col of ['reports', 'escalated']) {
    const nat = dKey(s, 0, '*')?.[col];
    bounded(
      `damages ${s} ${col}: Lietuva vs municipalities`,
      nat,
      sRows.filter((r) => r.muni > 0 && r.grp === '*').map((r) => part(r, col)),
    );
    bounded(
      `damages ${s} ${col}: Lietuva vs groups`,
      nat,
      sRows.filter((r) => r.muni === 0 && r.grp !== '*').map((r) => part(r, col)),
    );
    for (const g of GROUPS) {
      const row = dKey(s, 0, g);
      bounded(
        `damages ${s} ${col} ${g}: Lietuva vs municipalities`,
        row ? row[col] : 0,
        sRows.filter((r) => r.muni > 0 && r.grp === g).map((r) => part(r, col)),
      );
    }
    for (const m of new Set(sRows.filter((r) => r.muni > 0).map((r) => r.muni)))
      bounded(
        `damages ${s} ${col} muni ${m}: total vs groups`,
        dKey(s, m, '*')?.[col],
        sRows.filter((r) => r.muni === m && r.grp !== '*').map((r) => part(r, col)),
      );
  }
  bounded(
    `damages ${s}: Lietuva vs month rows`,
    dKey(s, 0, '*')?.reports,
    dMonth.filter((r) => ymSeason(r.ym) === s).map((r) => part(r, 'reports')),
  );
  for (const g of GROUPS)
    bounded(
      `damages ${s} ${g}: Lietuva vs month rows`,
      dKey(s, 0, g)?.reports,
      dMonth.filter((r) => ymSeason(r.ym) === s && r.grp === g).map((r) => part(r, 'reports')),
    );
}
for (const r of limits) {
  if (r.leftM < Math.max(r.limM - r.usedM, 0))
    fail(`limits ${r.season}/${r.muni}: leftM < max(limM - usedM, 0)`);
  if (r.leftFj < Math.max(r.limFj - r.usedFj, 0))
    fail(`limits ${r.season}/${r.muni}: leftFj < max(limFj - usedFj, 0)`);
  if (r.leftM > r.limM || r.leftFj > r.limFj) fail(`limits ${r.season}/${r.muni}: left > limit`);
}
for (const r of loots)
  if (r.paper + r.app !== r.n) fail(`loots ${r.season}/${r.muni}/${r.sp}: paper + app != n`);
const wolfLimits = files.meta.static?.wolves?.seasons ?? {};
if (wolfLimits['2024']?.limit !== 341 || wolfLimits['2025']?.limit !== 307)
  fail('meta.static.wolves.seasons: limits 2024/2025 must be 341/307');

// ---------------------------------------------------------------- reconciliation (checks.json)
const sum = (list, f) => list.reduce((a, r) => a + (f(r) ?? 0), 0);
const n = (x) => Number(x);
const METRICS = {
  seasons: () => [...seasons].sort(),
  current: () => meta.seasons.find((s) => s.current)?.season,
  'mpv.count': (m) =>
    m
      ? meta.municipalities.find((x) => x.code === n(m))?.mpvCount
      : sum(meta.municipalities, (x) => x.mpvCount),
  'mpv.ha': (m) =>
    m
      ? meta.municipalities.find((x) => x.code === n(m))?.mpvHa
      : sum(meta.municipalities, (x) => x.mpvHa),
  'mpv.small': () => sum(meta.municipalities, (x) => x.mpvSmall),
  'mpv.municipalities': () => meta.municipalities.filter((x) => x.mpvCount > 0).length,
  // loots.<col>:season[:muni][:sp]; '*' = all
  loots: (col, s, m = '*', sp = '*') =>
    sum(
      loots.filter(
        (r) =>
          r.season === n(s) && (m === '*' || r.muni === n(m)) && (sp === '*' || r.sp === n(sp)),
      ),
      (r) => r[col],
    ),
  kita: (col, s) => kita.find((r) => r.season === n(s))?.[col],
  // limits.<col>:season[:muni]
  limits: (col, s, m = '*') =>
    sum(
      limits.filter((r) => r.season === n(s) && (m === '*' || r.muni === n(m))),
      (r) => r[col],
    ),
  // damages.<col>:season:muni:grp (the published cell, null = suppressed)
  damages: (col, s, m, g) => {
    const r = dKey(n(s), n(m), g);
    return r ? r[col] : 'missing';
  },
  'damages.municipalities': (s) =>
    dSeason.filter((r) => r.season === n(s) && r.muni > 0 && r.grp === '*').length,
  'damages.municipalitiesReportersSuppressed': (s) =>
    dSeason.filter((r) => r.season === n(s) && r.muni > 0 && r.grp === '*' && r.reporters === null)
      .length,
  'damages.monthRows': () => dMonth.length,
  // attacked.<col>:season:grp:cls
  attacked: (col, s, g, c) => {
    const r = dAttacked.find((x) => x.season === n(s) && x.grp === g && x.cls === c);
    return r ? r[col] : 'missing';
  },
  'wolves.located': (s, m = '*') =>
    sum(
      wolves.filter((r) => r.season === n(s) && (m === '*' || r.muni === n(m))),
      (r) => r.located,
    ),
  'wolves.municipalities': (s) =>
    new Set(wolves.filter((r) => r.season === n(s)).map((r) => r.muni)).size,
};
function metric(key) {
  const [head, ...args] = key.split(':');
  if (METRICS[head]) return METRICS[head](...args);
  const dot = head.lastIndexOf('.');
  const fn = METRICS[head.slice(0, dot)];
  if (!fn) throw new Error(`unknown metric ${key}`);
  return fn(head.slice(dot + 1), ...args);
}

const checks = JSON.parse(readFileSync(join(HERE, 'checks.json'), 'utf8'));
for (const c of checks.checks) {
  let got;
  try {
    got = metric(c.metric);
  } catch (e) {
    fail(`checks.json ${c.metric}: ${e.message}`);
    continue;
  }
  let type = c.type || 'exact';
  if (type === 'exactOn') type = snapshotDate === c.date ? 'exact' : 'floor';
  const want = c.expected;
  let ok;
  if (type === 'floor')
    ok =
      typeof got === 'number' && typeof want === 'number'
        ? got >= want
        : JSON.stringify(got) === JSON.stringify(want);
  else if (c.tolerance) ok = Math.abs(got - want) <= c.tolerance;
  else ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok)
    fail(
      `checks.json ${c.metric}: got ${JSON.stringify(got)}, ${type === 'floor' ? 'want ≥' : 'want'} ${JSON.stringify(want)}${c.label ? ` (${c.label})` : ''}`,
    );
}

finish();

function finish() {
  if (failures.length) {
    for (const f of failures) console.error(`check: ${f}`);
    console.error(`check: ${failures.length} failure(s) in ${DIR}`);
    process.exit(1);
  }
  console.log(`check: OK (${DIR}, snapshot ${snapshotDate})`);
  process.exit(0);
}
