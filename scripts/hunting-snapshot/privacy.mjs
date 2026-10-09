// Disclosure control for the hunting data hub snapshot. Used by build.mjs (on the query output) and by check.mjs
// (on the committed JSON). Node >= 18, no dependencies.
//
// 1. Damages. The SQL nulls every damages count of 1 or 2 (shown as "<3"), but the totals are published on
//    unsuppressed data, so a "<3" cell could be worked out by subtraction (a municipality total of 8 with
//    kanopiniai 7 and vilkai "<3" gives vilkai = 1) or pinned by its bounds (a national total of 4 spread over
//    four municipalities gives 1 each). Two measures prevent that:
//    - `completeDamages`: every row that exists gets all its sibling cells (all six groups of a municipality or
//      of Lietuva, all six groups of a month, all livestock classes of a predator), and a missing count is
//      published as "<3" too. So "<3" means 0, 1 or 2, and a reader cannot tell a small count from none.
//    - `protectDamages`: complementary suppression. While a reader could still pin some cell to exactly 1 or 2,
//      a further cell is withheld (null and named in the row's `hidden` column; the UI shows "neskelbiama").
//      "Some cell" includes derived figures: the remainder of a sum over several unknown cells (a municipality
//      total of 6 with kanopiniai 5 and every other group "<3" gives "the other groups" = 1), and the reports a
//      group did not escalate (reports 5 with 3 escalated gives 2 not escalated).
//    `auditDamages` repeats the reader's derivation on the committed JSON; check.mjs fails when it finds a cell.
// 2. Loots and limits: a municipality with fewer than 3 MPV would publish one or two MPV's own numbers.
//    `poolRows` moves those municipalities' rows into one pooled row per (season[, species]) with the code
//    POOLED_CODE, so national sums stay exact while no published row describes fewer than 3 MPV.

export const POOLED_CODE = 1; // not a municipality code (those have two digits)
export const MIN_MPV = 3;

// ------------------------------------------------------------------------------------------------- damages

export const DAMAGE_GROUPS = ['kanopiniai', 'stumbrai', 'bebrai', 'vilkai', 'lusys', 'lokiai'];
export const LIVESTOCK_CLASSES = [
  'avys',
  'ozkos',
  'galvijai',
  'elniai',
  'alpakos',
  'arkliai',
  'kita',
];
// Groups whose escalation to the eldership is a choice. For predators and bison the letter is automatic, so their
// escalated count (nearly) equals their report count and would reveal withheld report cells: not published.
export const ESCALATION_GROUPS = ['kanopiniai', 'bebrai'];

const ymSeason = (ym) =>
  Number(ym.slice(5)) >= 4 ? Number(ym.slice(0, 4)) : Number(ym.slice(0, 4)) - 1;

const objects = ({ columns, rows }) =>
  rows.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i]])));

const hiddenSet = (row) => new Set(row.hidden ? String(row.hidden).split(',') : []);

/**
 * Fills in the sibling cells of every published damages row (missing count = null, i.e. "<3"), nulls the escalated
 * count of a "<3" report cell and of every group outside ESCALATION_GROUPS, and nulls the animal sum of "<3"
 * livestock lines. Input and output: arrays of row objects.
 */
export function completeDamages({ season, month, attacked }) {
  const out = { season: [], month: [], attacked: [] };
  const sKey = (s, m, g) => `${s}:${m}:${g}`;
  const sIdx = new Map(season.map((r) => [sKey(r.season, r.muni, r.grp), r]));
  const places = [...new Set(season.map((r) => `${r.season}:${r.muni}`))];
  for (const place of places) {
    const [s, m] = place.split(':').map(Number);
    for (const g of ['*', ...DAMAGE_GROUPS]) {
      const r = sIdx.get(sKey(s, m, g)) || {
        season: s,
        muni: m,
        grp: g,
        reports: null,
        reporters: null,
        escalated: null,
      };
      const row = { ...r };
      // A "<3" report cell takes its escalated count with it; a withheld one (named in `hidden`, e.g. on a
      // --reapply of the committed JSON) does not: its escalated count may still be large and published.
      const reportsWithheld = hiddenSet(row).has('reports');
      if ((row.reports === null && !reportsWithheld) || !ESCALATION_GROUPS.includes(g))
        row.escalated = null;
      if (m > 0 && g !== '*') row.reporters = null;
      out.season.push(row);
    }
  }
  const order = (g) => (g === '*' ? '' : g);
  out.season.sort(
    (a, b) => a.season - b.season || a.muni - b.muni || order(a.grp).localeCompare(order(b.grp)),
  );

  const mIdx = new Map(month.map((r) => [`${r.ym}:${r.grp}`, r]));
  for (const ym of [...new Set(month.map((r) => r.ym))].sort())
    for (const g of [...DAMAGE_GROUPS].sort())
      out.month.push({ ...(mIdx.get(`${ym}:${g}`) || { ym, grp: g, reports: null }) });

  const aIdx = new Map(attacked.map((r) => [`${r.season}:${r.grp}:${r.cls}`, r]));
  for (const key of [...new Set(attacked.map((r) => `${r.season}:${r.grp}`))].sort()) {
    const [s, g] = key.split(':');
    for (const cls of ['*', ...[...LIVESTOCK_CLASSES].sort()]) {
      const r = aIdx.get(`${key}:${cls}`) || {
        season: Number(s),
        grp: g,
        cls,
        entries: null,
        animals: null,
      };
      const row = { ...r };
      if (row.entries === null) row.animals = null;
      out.attacked.push(row);
    }
  }
  return out;
}

// The cell model: independent components (one per season, one per season × predator for livestock), each with
// cells id -> { id, row, key, kind, value, hidden } and equations { terms: [[id, coef]], rhs } (Σ coef·x = rhs).
function model(t) {
  const components = new Map();
  const comp = (name) => {
    if (!components.has(name))
      components.set(name, { name, cells: new Map(), eqs: [], lessEq: [], floor: new Map() });
    return components.get(name);
  };
  const cellOf = new Map(); // id -> component
  const add = (c, id, row, key, kind) => {
    c.cells.set(id, { id, row, key, kind, value: row[key], hidden: hiddenSet(row).has(key) });
    cellOf.set(id, c);
  };
  for (const r of t.season) {
    const c = comp(`s:${r.season}`);
    add(c, `s:${r.season}:${r.muni}:${r.grp}:reports`, r, 'reports', 'count');
    if (ESCALATION_GROUPS.includes(r.grp)) {
      const base = `s:${r.season}:${r.muni}:${r.grp}`;
      add(c, `${base}:escalated`, r, 'escalated', 'count');
      // reports not escalated: never published, but derivable as reports − escalated
      c.cells.set(`${base}:nonesc`, {
        id: `${base}:nonesc`,
        row: r,
        key: null,
        kind: 'implicit',
        value: null,
        hidden: false,
      });
      cellOf.set(`${base}:nonesc`, c);
      c.eqs.push({
        terms: [
          [`${base}:escalated`, 1],
          [`${base}:nonesc`, 1],
          [`${base}:reports`, -1],
        ],
        rhs: 0,
      });
    }
    if (r.reporters !== null && r.reporters !== undefined)
      c.floor.set(`s:${r.season}:${r.muni}:${r.grp}:reports`, r.reporters);
  }
  for (const r of t.month)
    add(comp(`s:${ymSeason(r.ym)}`), `m:${r.ym}:${r.grp}:reports`, r, 'reports', 'count');
  for (const r of t.attacked) {
    const c = comp(`a:${r.season}:${r.grp}`);
    add(c, `a:${r.season}:${r.grp}:${r.cls}:entries`, r, 'entries', 'count');
    add(c, `a:${r.season}:${r.grp}:${r.cls}:animals`, r, 'animals', 'animals');
  }

  const sumEq = (c, totalId, partIds) => {
    const terms = partIds.filter((id) => c.cells.has(id)).map((id) => [id, 1]);
    if (c.cells.has(totalId)) terms.push([totalId, -1]);
    if (terms.length) c.eqs.push({ terms, rhs: 0 });
  };
  for (const s of new Set(t.season.map((r) => r.season))) {
    const c = comp(`s:${s}`);
    const munis = [
      ...new Set(t.season.filter((r) => r.season === s && r.muni > 0).map((r) => r.muni)),
    ];
    for (const m of munis) {
      sumEq(
        c,
        `s:${s}:${m}:*:reports`,
        DAMAGE_GROUPS.map((g) => `s:${s}:${m}:${g}:reports`),
      );
    }
    for (const g of DAMAGE_GROUPS) {
      sumEq(
        c,
        `s:${s}:0:${g}:reports`,
        munis.map((m) => `s:${s}:${m}:${g}:reports`),
      );
      const months = t.month.filter((r) => r.grp === g && ymSeason(r.ym) === s);
      if (months.length)
        sumEq(
          c,
          `s:${s}:0:${g}:reports`,
          months.map((r) => `m:${r.ym}:${g}:reports`),
        );
    }
    sumEq(
      c,
      `s:${s}:0:*:reports`,
      DAMAGE_GROUPS.map((g) => `s:${s}:0:${g}:reports`),
    );
    sumEq(
      c,
      `s:${s}:0:*:reports`,
      munis.map((m) => `s:${s}:${m}:*:reports`),
    );
    for (const g of ESCALATION_GROUPS)
      sumEq(
        c,
        `s:${s}:0:${g}:escalated`,
        munis.map((m) => `s:${s}:${m}:${g}:escalated`),
      );
    for (const m of [0, ...munis])
      for (const g of ESCALATION_GROUPS)
        if (c.cells.has(`s:${s}:${m}:${g}:escalated`))
          c.lessEq.push([`s:${s}:${m}:${g}:escalated`, `s:${s}:${m}:${g}:reports`]);
  }
  for (const r of t.attacked.filter((x) => x.cls === '*')) {
    const c = comp(`a:${r.season}:${r.grp}`);
    for (const col of ['entries', 'animals'])
      sumEq(
        c,
        `a:${r.season}:${r.grp}:*:${col}`,
        LIVESTOCK_CLASSES.map((k) => `a:${r.season}:${r.grp}:${k}:${col}`),
      );
  }
  return { components, cellOf };
}

const EPS = 1e-9;

// What a reader can derive about one component: published cells are exact, "<3" is [0, 2], a withheld cell is
// [0, ∞) (an animal sum always [0, ∞) when not published), a report cell is at least its published reporters.
// Then linear algebra (reduced row-echelon form of the equations) and interval propagation over the equations,
// their echelon rows and the inequalities, until nothing changes.
function deriveBounds(c, withheldIds) {
  const lo = new Map();
  const hi = new Map();
  const unknown = [];
  for (const cell of c.cells.values()) {
    const withheld = cell.hidden || withheldIds.has(cell.id);
    if (cell.value !== null && cell.value !== undefined && !withheld) {
      lo.set(cell.id, cell.value);
      hi.set(cell.id, cell.value);
      continue;
    }
    unknown.push(cell.id);
    lo.set(cell.id, 0);
    hi.set(cell.id, withheld || cell.kind !== 'count' ? Infinity : 2);
    const floor = c.floor.get(cell.id);
    if (floor !== undefined) lo.set(cell.id, floor);
  }

  const index = new Map(unknown.map((id, i) => [id, i]));
  const n = unknown.length;
  const matrix = [];
  for (const eq of c.eqs) {
    const row = new Array(n + 1).fill(0);
    let rhs = eq.rhs;
    let any = false;
    for (const [id, coef] of eq.terms) {
      if (index.has(id)) {
        row[index.get(id)] += coef;
        any = true;
      } else rhs -= coef * lo.get(id);
    }
    if (!any) continue;
    row[n] = rhs;
    matrix.push(row);
  }
  let r = 0;
  for (let col = 0; col < n && r < matrix.length; col++) {
    let pivot = -1;
    for (let i = r; i < matrix.length; i++)
      if (
        Math.abs(matrix[i][col]) > EPS &&
        (pivot < 0 || Math.abs(matrix[i][col]) > Math.abs(matrix[pivot][col]))
      )
        pivot = i;
    if (pivot < 0) continue;
    [matrix[r], matrix[pivot]] = [matrix[pivot], matrix[r]];
    const p = matrix[r][col];
    for (let j = col; j <= n; j++) matrix[r][j] /= p;
    for (let i = 0; i < matrix.length; i++) {
      if (i === r || Math.abs(matrix[i][col]) < EPS) continue;
      const f = matrix[i][col];
      for (let j = col; j <= n; j++) matrix[i][j] -= f * matrix[r][j];
    }
    r++;
  }
  const echelon = matrix.slice(0, r).map((row) => ({
    terms: row
      .slice(0, n)
      .map((coef, i) => [unknown[i], coef])
      .filter(([, coef]) => Math.abs(coef) > EPS),
    rhs: row[n],
  }));

  const tighten = (id, newLo, newHi) => {
    let changed = false;
    const l = Math.ceil(newLo - EPS);
    const h = newHi === Infinity ? Infinity : Math.floor(newHi + EPS);
    if (l > lo.get(id)) {
      lo.set(id, l);
      changed = true;
    }
    if (h < hi.get(id)) {
      hi.set(id, h);
      changed = true;
    }
    return changed;
  };
  const constraints = [...c.eqs, ...echelon];
  for (let pass = 0; pass < 100; pass++) {
    let changed = false;
    for (const eq of constraints) {
      for (const [id, coef] of eq.terms) {
        if (lo.get(id) === hi.get(id)) continue;
        let restLo = eq.rhs;
        let restHi = eq.rhs;
        for (const [other, c2] of eq.terms) {
          if (other === id) continue;
          const a = c2 * lo.get(other);
          const b = c2 * hi.get(other);
          restLo -= Math.max(a, b);
          restHi -= Math.min(a, b);
        }
        let xl = restLo / coef;
        let xh = restHi / coef;
        if (coef < 0) [xl, xh] = [xh, xl];
        if (Number.isNaN(xl)) xl = -Infinity;
        if (Number.isNaN(xh)) xh = Infinity;
        if (tighten(id, xl, xh)) changed = true;
      }
    }
    for (const [small, big] of c.lessEq) {
      if (tighten(big, lo.get(small), Infinity)) changed = true;
      if (tighten(small, -Infinity, hi.get(big))) changed = true;
    }
    if (!changed) break;
  }
  return { lo, hi, unknown, constraints };
}

// Sums of two or three unknown cells that the published figures fix, whatever equations a reader combines: the
// indicator vector of the set lies in the row space of the equations, i.e. the cells' null-space rows sum to zero.
// Returns [{ ids, sum }]. Cells already pinned (lo = hi) count as known.
function determinedSmallSums(c, lo, hi, triples) {
  const open = [...c.cells.keys()].filter(
    (id) => lo.get(id) !== hi.get(id) && c.cells.get(id).kind !== 'animals',
  );
  if (open.length < 2) return [];
  const index = new Map(open.map((id, i) => [id, i]));
  const n = open.length;
  const m = [];
  for (const eq of c.eqs) {
    const row = new Array(n + 1).fill(0);
    let rhs = eq.rhs;
    let any = false;
    for (const [id, coef] of eq.terms) {
      if (index.has(id)) {
        row[index.get(id)] += coef;
        any = true;
      } else if (lo.get(id) === hi.get(id)) rhs -= coef * lo.get(id);
      else {
        // an animal cell still open: this equation fixes nothing about count cells alone
        any = false;
        break;
      }
    }
    if (!any) continue;
    row[n] = rhs;
    m.push(row);
  }
  const pivotOf = new Map(); // col -> row
  let r = 0;
  for (let col = 0; col < n && r < m.length; col++) {
    let pivot = -1;
    for (let i = r; i < m.length; i++)
      if (Math.abs(m[i][col]) > EPS && (pivot < 0 || Math.abs(m[i][col]) > Math.abs(m[pivot][col])))
        pivot = i;
    if (pivot < 0) continue;
    [m[r], m[pivot]] = [m[pivot], m[r]];
    const p = m[r][col];
    for (let j = col; j <= n; j++) m[r][j] /= p;
    for (let i = 0; i < m.length; i++) {
      if (i === r || Math.abs(m[i][col]) < EPS) continue;
      const f = m[i][col];
      for (let j = col; j <= n; j++) m[i][j] -= f * m[r][j];
    }
    pivotOf.set(col, r);
    r++;
  }
  const free = [];
  for (let col = 0; col < n; col++) if (!pivotOf.has(col)) free.push(col);
  // null-space row of each cell, and its value in the particular solution (free cells 0)
  const key = (vec) =>
    vec.map((v) => (Math.abs(v) < 1e-7 ? 0 : Math.round(v * 1e6) / 1e6)).join(',');
  const rows = open.map((_, col) => {
    const vec = free.map((f) => (pivotOf.has(col) ? -m[pivotOf.get(col)][f] : f === col ? 1 : 0));
    const value = pivotOf.has(col) ? m[pivotOf.get(col)][n] : 0;
    return { vec, value };
  });
  const byKey = new Map();
  rows.forEach((row, i) => {
    const k = key(row.vec);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(i);
  });
  const out = [];
  const seen = new Set();
  const add = (cols) => {
    const sorted = [...cols].sort((a, b) => a - b);
    const k = sorted.join(':');
    if (seen.has(k)) return;
    seen.add(k);
    const sum = Math.round(sorted.reduce((t, col) => t + rows[col].value, 0) * 1e6) / 1e6;
    out.push({ ids: sorted.map((col) => open[col]), sum });
  };
  for (let i = 0; i < n; i++) {
    for (const j of byKey.get(key(rows[i].vec.map((v) => -v))) || []) if (j > i) add([i, j]);
    if (!triples) continue;
    for (let j = i + 1; j < n; j++) {
      const target = key(rows[i].vec.map((v, t) => -(v + rows[j].vec[t])));
      for (const k of byKey.get(target) || []) if (k > j) add([i, j, k]);
    }
  }
  return out;
}

// The remainder a reader can compute from one equation: when every term still unknown has the same coefficient,
// their sum is fixed. Returns { ids, sum } for two or more unknown count terms, else null.
function remainder(eq, lo, hi, kindOf) {
  const open = eq.terms.filter(([id]) => lo.get(id) !== hi.get(id));
  if (open.length < 2) return null;
  const coef = open[0][1];
  if (open.some(([id, c2]) => Math.abs(c2 - coef) > EPS || kindOf(id) === 'animals')) return null;
  let rest = eq.rhs;
  for (const [id, c2] of eq.terms) if (lo.get(id) === hi.get(id)) rest -= c2 * lo.get(id);
  const sum = Math.round((rest / coef) * 1e6) / 1e6;
  return { ids: open.map(([id]) => id), sum };
}

// What a reader can pin to exactly 1 or 2: a cell (or a derived non-escalated count), or the remainder of a sum
// over several unknown cells; an animal sum counts when it can be pinned to a positive value while its lines are at
// most 2 (it would describe one or two reports). Returns [{ key, ids }] (ids = the cells involved).
function exposures(c, withheldIds, deep = true) {
  const { lo, hi, unknown, constraints } = deriveBounds(c, withheldIds);
  const out = [];
  const seen = new Set();
  for (const id of unknown) {
    if (lo.get(id) !== hi.get(id)) continue;
    const v = lo.get(id);
    if (c.cells.get(id).kind === 'animals') {
      if (v > 0 && hi.get(id.replace(/:animals$/, ':entries')) <= 2)
        out.push({ key: id, ids: [id] });
    } else if (v === 1 || v === 2) out.push({ key: id, ids: [id] });
  }
  const kindOf = (id) => c.cells.get(id).kind;
  const sums = [
    ...constraints.map((eq) => remainder(eq, lo, hi, kindOf)).filter(Boolean),
    ...determinedSmallSums(c, lo, hi, deep),
  ];
  for (const r of sums) {
    if (r.sum !== 1 && r.sum !== 2) continue;
    const key = `sum(${[...r.ids].sort().join('+')})`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, ids: r.ids });
  }
  return out;
}

const tablesToObjects = (tables) => ({
  season: objects(tables.season),
  month: objects(tables.month),
  attacked: objects(tables.attacked),
});

/** Cells of the published damages tables that a reader can pin to a small value (empty = protected). */
export function auditDamages(tables) {
  const { components } = model(tablesToObjects(tables));
  return [...components.values()].flatMap((c) => exposures(c, new Set()).map((e) => e.key));
}

// Which cell to withhold first: a "<3" cell (it carries little), then municipality × group, month and livestock
// class cells, then municipality totals, then national group figures, then national totals; smaller values first.
function rank(cell) {
  if (cell.value === null || cell.value === undefined) return 0;
  const [kind, , a, b] = cell.id.split(':');
  if (kind === 'm') return 1;
  if (kind === 'a') return b === '*' ? 4 : 1;
  if (a !== '0') return b === '*' ? 2 : 1;
  return b === '*' ? 5 : 3;
}

const lexLess = (a, b) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
};

// Trials use the quick check (single cells, equation remainders, pairs); triples are checked once nothing else is
// left, and only then do the trials use them too.
function protectComponent(c, log) {
  const withheld = new Set();
  const hide = (set, id) => {
    set.add(id);
    // an animal sum goes with its lines
    if (id.endsWith(':entries')) set.add(id.replace(/:entries$/, ':animals'));
  };
  let deep = false;
  for (let step = 0; step < 500; step++) {
    let exposed = exposures(c, withheld, deep);
    if (!exposed.length && !deep) {
      exposed = exposures(c, withheld, true);
      deep = exposed.length > 0;
    }
    if (!exposed.length) return withheld;
    const exposedIds = [...new Set(exposed.flatMap((e) => e.ids))];
    // Candidates: cells sharing an equation with an exposed cell; when none of them reduces the exposure, the
    // cells one equation further, and so on.
    let best = null;
    const tried = new Set();
    const frontier = new Set(exposedIds);
    for (let level = 0; level < 8 && !(best && best.score[0] === 0); level++) {
      const near = new Set();
      for (const eq of c.eqs)
        if (eq.terms.some(([id]) => frontier.has(id)))
          for (const [id] of eq.terms) if (!frontier.has(id)) near.add(id);
      if (!near.size) break;
      for (const id of near) {
        frontier.add(id);
        const cell = c.cells.get(id);
        if (withheld.has(id) || cell.hidden || cell.kind === 'implicit' || tried.has(id)) continue;
        tried.add(id);
        const trial = new Set(withheld);
        hide(trial, id);
        const after = exposures(c, trial, deep).length;
        const reduces = after < exposed.length;
        const score = [reduces ? 0 : 1, reduces ? level : after, rank(cell), cell.value ?? 0];
        if (!best || lexLess(score, best.score)) best = { id, score };
      }
    }
    if (!best)
      throw new Error(`protectDamages: cannot protect ${exposed.map((e) => e.key).join(', ')}`);
    hide(withheld, best.id);
    log(`withheld ${best.id}`);
  }
  throw new Error(`protectDamages: no solution for ${c.name}`);
}

/**
 * Completes the damages tables ({columns, rows} each, as built from the SQL output) and adds complementary
 * suppression; returns new tables with a `hidden` column (comma-separated withheld measures, or null).
 */
export function protectDamages(tables, log = () => {}) {
  const t = completeDamages(tablesToObjects(tables));
  const { components } = model(t);
  const withheld = [];
  for (const c of components.values())
    withheld.push(...[...protectComponent(c, log)].map((id) => c.cells.get(id)));

  const byRow = new Map();
  for (const cell of withheld) {
    if (!byRow.has(cell.row)) byRow.set(cell.row, new Set(hiddenSet(cell.row)));
    byRow.get(cell.row).add(cell.key);
  }
  const table = (list, columns) => {
    const cols = [...columns.filter((c) => c !== 'hidden'), 'hidden'];
    return {
      columns: cols,
      rows: list.map((r) => {
        const keys = byRow.get(r) || hiddenSet(r);
        const copy = { ...r };
        for (const k of keys) copy[k] = null;
        copy.hidden = keys.size ? [...keys].sort().join(',') : null;
        return cols.map((c) => copy[c] ?? null);
      }),
    };
  };
  const out = {
    season: table(t.season, tables.season.columns),
    month: table(t.month, tables.month.columns),
    attacked: table(t.attacked, tables.attacked.columns),
  };
  const left = auditDamages(out);
  if (left.length) throw new Error(`protectDamages: still exposed: ${left.join(', ')}`);
  return out;
}

// ------------------------------------------------------------------------------------------- small municipalities

/**
 * Municipalities whose loot and limit rows are pooled: those with 1–2 MPV, plus the smallest others when needed
 * so the pool holds at least MIN_MPV MPV. `areas` = [{ code, mpvCount }].
 */
export function pooledMunicipalities(areas) {
  const withMpv = areas
    .filter((a) => a.mpvCount > 0)
    .sort((a, b) => a.mpvCount - b.mpvCount || a.code - b.code);
  const pool = withMpv.filter((a) => a.mpvCount < MIN_MPV);
  if (!pool.length) return [];
  let total = pool.reduce((s, a) => s + a.mpvCount, 0);
  for (const a of withMpv) {
    if (total >= MIN_MPV) break;
    if (pool.includes(a)) continue;
    pool.push(a);
    total += a.mpvCount;
  }
  return pool.map((a) => a.code).sort((a, b) => a - b);
}

/**
 * Moves the rows of `codes` into POOLED_CODE rows ({columns, rows} table with a `muni` column), summing every
 * other column except the `keys` (e.g. ['season', 'sp']). A nullable sum stays null only when every part is null.
 */
export function poolRows(table, codes, keys) {
  if (!codes.length) return table;
  const pooled = new Set(codes);
  const idx = Object.fromEntries(table.columns.map((c, i) => [c, i]));
  const kept = [];
  const groups = new Map();
  for (const row of table.rows) {
    if (!pooled.has(row[idx.muni])) {
      kept.push(row);
      continue;
    }
    const key = keys.map((k) => row[idx[k]]).join(':');
    if (!groups.has(key))
      groups.set(
        key,
        table.columns.map((c) =>
          keys.includes(c) ? row[idx[c]] : c === 'muni' ? POOLED_CODE : null,
        ),
      );
    const acc = groups.get(key);
    table.columns.forEach((c, i) => {
      if (c === 'muni' || keys.includes(c) || row[i] === null) return;
      acc[i] = (acc[i] ?? 0) + row[i];
    });
  }
  const order = ['season', 'muni', ...keys.filter((k) => k !== 'season')];
  const rows = [...kept, ...groups.values()].sort((a, b) => {
    for (const k of order) {
      const d = a[idx[k]] - b[idx[k]];
      if (d) return d;
    }
    return 0;
  });
  return { columns: table.columns, rows };
}
