#!/usr/bin/env node
// Builds public/data/hunting/v1/*.json from the CSV outputs of sql/*.sql (see run.sh).
//
// Usage: node scripts/hunting-snapshot/build.mjs <csv-dir> [--date YYYY-MM-DD]
//        node scripts/hunting-snapshot/build.mjs --reapply
//          re-applies the privacy rules (privacy.mjs) to the committed JSON, keeping its snapshotDate and data
//
// Node >= 18, no dependencies. Every CSV column is whitelisted: a column that is not listed in TABLES makes the
// build fail, so a changed query can never publish an extra field by accident.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { POOLED_CODE, pooledMunicipalities, poolRows, protectDamages } from './privacy.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const OUT_DIR = join(ROOT, 'public/data/hunting/v1');
const BOUNDARIES_URL = 'https://boundaries.biip.lt/v1/municipalities/search?size=100';

const int = (v) => {
  if (v === null) return null;
  if (!/^-?\d+$/.test(v)) throw new Error(`not an integer: ${JSON.stringify(v)}`);
  return Number(v);
};
const bool = (v) => {
  if (v === 't' || v === 'true') return true;
  if (v === 'f' || v === 'false') return false;
  throw new Error(`not a boolean: ${JSON.stringify(v)}`);
};
const code = (allowed) => (v) => {
  if (!allowed.includes(v)) throw new Error(`unexpected code: ${JSON.stringify(v)}`);
  return v;
};
const yearMonth = (v) => {
  if (!/^\d{4}-\d{2}$/.test(v)) throw new Error(`not YYYY-MM: ${JSON.stringify(v)}`);
  return v;
};
const shortText = (v) => {
  if (v === null || v.length > 60) throw new Error(`unexpected text: ${JSON.stringify(v)}`);
  return v;
};
const drop = () => undefined;

const GROUPS = ['kanopiniai', 'stumbrai', 'bebrai', 'vilkai', 'lusys', 'lokiai'];
const LIVESTOCK = ['*', 'avys', 'ozkos', 'galvijai', 'elniai', 'alpakos', 'arkliai', 'kita'];

// csv file -> { csv column: [output column, parser] }; output column undefined = read but not published.
const TABLES = {
  '00_seasons': {
    season_id: [undefined, drop],
    season: ['season', int],
    current: ['current', bool],
  },
  '01_species': {
    id: ['id', int],
    name: ['name', shortText],
    form_type: ['formType', code(['HORNED', 'EXTENDED', 'SIMPLE', 'WOLF', 'OTHER'])],
    is_other: ['isOther', bool],
  },
  '10_areas_municipality': {
    muni: ['muni', int],
    mpv_count: ['mpvCount', int],
    mpv_ha: ['mpvHa', int],
    mpv_small: ['mpvSmall', int],
  },
  '20_loots_municipality': {
    season: ['season', int],
    muni: ['muni', int],
    sp: ['sp', int],
    n: ['n', int],
    paper: ['paper', int],
    app: ['app', int],
    m: ['m', int],
    f: ['f', int],
    j: ['j', int],
    dead: ['dead', int],
    road: ['road', int],
  },
  '21_loots_kita': {
    season: ['season', int],
    n: ['n', int],
    dead: ['dead', int],
  },
  '30_limits_municipality': {
    season: ['season', int],
    muni: ['muni', int],
    mpv_with_limit: ['mpvWithLimit', int],
    lim_m: ['limM', int],
    lim_fj: ['limFj', int],
    used_m: ['usedM', int],
    used_fj: ['usedFj', int],
    left_m: ['leftM', int],
    left_fj: ['leftFj', int],
  },
  '40_damages_season': {
    season: ['season', int],
    muni: ['muni', int],
    grp: ['grp', code(['*', ...GROUPS])],
    reports: ['reports', int],
    reporters: ['reporters', int],
    escalated: ['escalated', int],
  },
  '41_damages_month': {
    ym: ['ym', yearMonth],
    grp: ['grp', code(GROUPS)],
    reports: ['reports', int],
  },
  '42_damages_attacked': {
    season: ['season', int],
    grp: ['grp', code(['vilkai', 'lusys', 'lokiai'])],
    cls: ['cls', code(LIVESTOCK)],
    entries: ['entries', int],
    animals: ['animals', int],
  },
  '50_wolves_municipality': {
    season: ['season', int],
    muni: ['muni', int],
    located: ['located', int],
  },
};

function fail(msg) {
  console.error(`build: ${msg}`);
  process.exit(1);
}

// RFC 4180 CSV as written by `psql --csv`: header row, quoted fields when needed, empty unquoted = NULL.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let wasQuoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') {
      quoted = true;
      wasQuoted = true;
    } else if (c === ',' || c === '\n') {
      row.push(field === '' && !wasQuoted ? null : field);
      field = '';
      wasQuoted = false;
      if (c === '\n') {
        rows.push(row);
        row = [];
      }
    } else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) {
    row.push(field === '' && !wasQuoted ? null : field);
    rows.push(row);
  }
  return rows;
}

function readTable(dir, name) {
  const spec = TABLES[name];
  let text;
  try {
    text = readFileSync(join(dir, `${name}.csv`), 'utf8');
  } catch (e) {
    fail(`missing ${name}.csv (${e.message})`);
  }
  const [header, ...body] = parseCsv(text);
  if (!header) fail(`${name}.csv is empty`);
  const unknown = header.filter((h) => !(h in spec));
  if (unknown.length) fail(`${name}.csv: column(s) not in the whitelist: ${unknown.join(', ')}`);
  const missing = Object.keys(spec).filter((h) => !header.includes(h));
  if (missing.length) fail(`${name}.csv: missing column(s): ${missing.join(', ')}`);
  const out = Object.keys(spec).filter((h) => spec[h][0]);
  const columns = out.map((h) => spec[h][0]);
  const rows = body.map((r, i) => {
    if (r.length !== header.length) fail(`${name}.csv line ${i + 2}: ${r.length} fields`);
    return out.map((h) => {
      try {
        return spec[h][1](r[header.indexOf(h)]);
      } catch (e) {
        fail(`${name}.csv line ${i + 2}, ${h}: ${e.message}`);
      }
    });
  });
  return { columns, rows };
}

const objects = ({ columns, rows }) =>
  rows.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i]])));

function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function vilniusToday() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Vilnius' }).format(new Date());
}

async function fetchMunicipalities() {
  const res = await fetch(BOUNDARIES_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) fail(`boundaries API: HTTP ${res.status}`);
  const body = await res.json();
  const items = body?.items;
  if (!Array.isArray(items) || items.length !== 60)
    fail(`boundaries API: expected 60 municipalities, got ${items?.length}`);
  return items
    .map((m) => ({
      code: Number(m.code),
      name: String(m.name),
      county: String(m.county?.name ?? ''),
    }))
    .sort((a, b) => a.code - b.code);
}

// Indented JSON that keeps arrays of plain values on one line.
function pretty(value, indent) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value) && value.every((v) => v === null || typeof v !== 'object'))
    return JSON.stringify(value);
  const inner = indent + '  ';
  const items = Array.isArray(value)
    ? value.map((v) => inner + pretty(v, inner))
    : Object.entries(value).map(([k, v]) => `${inner}${JSON.stringify(k)}: ${pretty(v, inner)}`);
  const [open, close] = Array.isArray(value) ? ['[', ']'] : ['{', '}'];
  return items.length ? `${open}\n${items.join(',\n')}\n${indent}${close}` : open + close;
}

// Compact JSON with one table row per line, so diffs between snapshots stay reviewable.
function serialize(file) {
  const lines = ['{'];
  const head = Object.entries(file).filter(([k]) => k !== 'tables' && k !== 'static');
  for (const [k, v] of head) lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
  lines.push('  "tables": {');
  const names = Object.keys(file.tables);
  names.forEach((name, ti) => {
    const t = file.tables[name];
    lines.push(`    ${JSON.stringify(name)}: {`);
    lines.push(`      "columns": ${JSON.stringify(t.columns)},`);
    if (!t.rows.length) lines.push('      "rows": []');
    else {
      lines.push('      "rows": [');
      t.rows.forEach((r, i) =>
        lines.push(`        ${JSON.stringify(r)}${i < t.rows.length - 1 ? ',' : ''}`),
      );
      lines.push('      ]');
    }
    lines.push(`    }${ti < names.length - 1 ? ',' : ''}`);
  });
  if (file.static) {
    lines.push('  },');
    lines.push(`  "static": ${pretty(file.static, '  ')}`);
  } else lines.push('  }');
  lines.push('}');
  return lines.join('\n') + '\n';
}

// Privacy rules applied after the queries (privacy.mjs): municipalities with fewer than 3 MPV are pooled in the
// loot and limit tables (and flagged in meta), and the damages tables get complete sibling cells and
// complementary suppression.
function applyPrivacy(files) {
  const muni = files.meta.tables.municipalities;
  const col = (name) => muni.columns.indexOf(name);
  const pooled = pooledMunicipalities(
    muni.rows.map((r) => ({ code: r[col('code')], mpvCount: r[col('mpvCount')] })),
  );
  const base = muni.columns.filter((c) => c !== 'pooled');
  files.meta.tables.municipalities = {
    columns: [...base, 'pooled'],
    rows: muni.rows.map((r) => [...base.map((c) => r[col(c)]), pooled.includes(r[col('code')])]),
  };
  files.loots.tables.loots = poolRows(files.loots.tables.loots, pooled, ['season', 'sp']);
  files.limits.tables.limits = poolRows(files.limits.tables.limits, pooled, ['season']);
  if (pooled.length)
    console.log(`build: pooled municipalities ${pooled.join(', ')} into code ${POOLED_CODE}`);
  files.damages.tables = protectDamages(files.damages.tables, (m) => console.log(`build: ${m}`));
  return files;
}

function writeFiles(files) {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const [name, file] of Object.entries(files)) {
    writeFileSync(join(OUT_DIR, `${name}.json`), serialize(file));
    const n = Object.values(file.tables).map((x) => x.rows.length);
    console.log(`build: ${name}.json (${n.join(' / ')} rows)`);
  }
}

function reapply() {
  const files = Object.fromEntries(
    ['meta', 'loots', 'limits', 'damages', 'wolves'].map((name) => [
      name,
      JSON.parse(readFileSync(join(OUT_DIR, `${name}.json`), 'utf8')),
    ]),
  );
  writeFiles(applyPrivacy(files));
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--reapply') return reapply();
  const dir = args[0];
  if (!dir || dir.startsWith('--')) fail('usage: build.mjs <csv-dir> [--date YYYY-MM-DD]');
  const di = args.indexOf('--date');
  const today = vilniusToday();
  const snapshotDate = di >= 0 ? args[di + 1] : today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshotDate || '')) fail('--date must be YYYY-MM-DD');
  if (snapshotDate !== today)
    console.warn(
      `build: --date ${snapshotDate} differs from today (${today}); the SQL always cuts at today`,
    );
  const generatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  const t = Object.fromEntries(Object.keys(TABLES).map((n) => [n, readTable(dir, n)]));
  const metaStatic = JSON.parse(readFileSync(join(HERE, 'meta-static.json'), 'utf8'));

  // species groups: explicit id lists, '*' = every species not listed elsewhere; 'Kita' has no group.
  const groups = Object.entries(metaStatic.speciesGroups);
  const rest = groups.find(([, ids]) => ids === '*')?.[0] ?? null;
  const groupOf = (id, isOther) => {
    if (isOther) return null;
    const hit = groups.find(([, ids]) => Array.isArray(ids) && ids.includes(id));
    return hit ? hit[0] : rest;
  };
  const species = objects(t['01_species']).map((s) => [
    s.id,
    s.name,
    slugify(s.name),
    s.formType,
    groupOf(s.id, s.isOther),
    s.isOther,
  ]);
  const slugs = species.map((s) => s[2]);
  if (new Set(slugs).size !== slugs.length) fail('species slugs are not unique');

  const boundaries = await fetchMunicipalities();
  const areas = new Map(objects(t['10_areas_municipality']).map((a) => [a.muni, a]));
  for (const code of areas.keys())
    if (!boundaries.some((b) => b.code === code))
      fail(`hunting areas reference unknown municipality ${code}`);
  const municipalities = boundaries.map((b) => {
    const a = areas.get(b.code);
    return [b.code, b.name, b.county, a?.mpvCount ?? 0, a?.mpvHa ?? 0, a?.mpvSmall ?? 0];
  });

  const base = { v: 1, snapshotDate, generatedAt };
  const files = {
    meta: {
      ...base,
      tables: {
        seasons: t['00_seasons'],
        species: { columns: ['id', 'name', 'slug', 'formType', 'group', 'isOther'], rows: species },
        municipalities: {
          columns: ['code', 'name', 'county', 'mpvCount', 'mpvHa', 'mpvSmall'],
          rows: municipalities,
        },
      },
      static: metaStatic,
    },
    loots: { ...base, tables: { loots: t['20_loots_municipality'], kita: t['21_loots_kita'] } },
    limits: { ...base, tables: { limits: t['30_limits_municipality'] } },
    damages: {
      ...base,
      tables: {
        season: t['40_damages_season'],
        month: t['41_damages_month'],
        attacked: t['42_damages_attacked'],
      },
    },
    wolves: { ...base, tables: { located: t['50_wolves_municipality'] } },
  };

  writeFiles(applyPrivacy(files));
}

main().catch((e) => fail(e.stack || String(e)));
