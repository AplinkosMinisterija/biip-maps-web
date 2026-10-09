// Snapshot adapter (SPEC2 §8.4, §9.1): reads the committed aggregate files
// `public/data/hunting/v1/{name}.json` and turns their `{columns, rows}` tables into typed
// rows. This is the phase-2 swap point: an API adapter returning the same tables replaces
// `adapters.<file>` and nothing else changes.
import type {
  AttackedRow,
  DamageMonthRow,
  DamageSeasonRow,
  KitaRow,
  LimitRow,
  LootRow,
  Meta,
  SnapshotData,
  SnapshotFile,
  WolfMuniRow,
} from '../types';

export const SNAPSHOT_TIMEOUT_MS = 15000;

export interface SnapshotTable {
  columns: string[];
  rows: unknown[][];
}
export interface SnapshotBody {
  v: 1;
  snapshotDate: string;
  generatedAt: string;
  tables: Record<string, SnapshotTable>;
  static?: unknown;
}

export class SnapshotFormatError extends Error {}

export const snapshotUrl = (name: SnapshotFile) =>
  `${import.meta.env.BASE_URL}data/hunting/v1/${name}.json`;

const memo = new Map<SnapshotFile, Promise<SnapshotBody>>();

/** Forget loaded files, so the next load fetches again ("Bandyti dar kartą"). */
export function clearSnapshotCache(name?: SnapshotFile) {
  if (name) memo.delete(name);
  else memo.clear();
}

async function fetchSnapshotFile(name: SnapshotFile, signal: AbortSignal): Promise<SnapshotBody> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, SNAPSHOT_TIMEOUT_MS);
  if (signal.aborted) abort();
  signal.addEventListener('abort', abort);
  try {
    const url = snapshotUrl(name);
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    // A missing file is answered with index.html and 200 by the SPA fallback.
    const type = response.headers.get('content-type') || '';
    if (type.indexOf('json') < 0) throw new SnapshotFormatError(`Not JSON (${type}) for ${url}`);
    const body = (await response.json()) as SnapshotBody;
    if (!body || body.v !== 1 || typeof body.snapshotDate !== 'string' || !body.tables) {
      throw new SnapshotFormatError(`Unsupported snapshot format in ${url}`);
    }
    return body;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

/** One raw snapshot file, memoised per name; a failure clears the memo. */
export function loadSnapshotFile(name: SnapshotFile, signal: AbortSignal): Promise<SnapshotBody> {
  let promise = memo.get(name);
  if (!promise) {
    promise = fetchSnapshotFile(name, signal);
    memo.set(name, promise);
    promise.catch(() => {
      if (memo.get(name) === promise) memo.delete(name);
    });
  }
  return promise;
}

/**
 * Rows of a `{columns, rows}` table as objects. `map` names, for every field, the column it
 * comes from; a missing column throws (schema drift), extra columns are ignored.
 */
export function zip<T>(
  table: SnapshotTable | undefined,
  map: Record<string, keyof T>,
  name = 'table',
): T[] {
  if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows)) {
    throw new SnapshotFormatError(`Missing table ${name}`);
  }
  const index = Object.keys(map).map((column) => {
    const i = table.columns.indexOf(column);
    if (i < 0) throw new SnapshotFormatError(`Missing column ${name}.${column}`);
    return [map[column], i] as const;
  });
  return table.rows.map((row) => {
    const out = {} as T;
    index.forEach(([field, i]) => {
      (out as any)[field] = row[i] === undefined ? null : row[i];
    });
    return out;
  });
}

// Identity column map for a list of fields.
function columns<T>(...fields: (keyof T & string)[]) {
  const map = {} as Record<string, keyof T>;
  fields.forEach((f) => (map[f] = f));
  return map;
}

type Tables = SnapshotBody['tables'];

export const parseMeta = (body: SnapshotBody): Meta => {
  const t: Tables = body.tables;
  if (!body.static || typeof body.static !== 'object') {
    throw new SnapshotFormatError('Missing meta.static');
  }
  return {
    v: 1,
    snapshotDate: body.snapshotDate,
    generatedAt: body.generatedAt,
    seasons: zip<Meta['seasons'][number]>(t.seasons, columns('season', 'current'), 'seasons'),
    species: zip<Meta['species'][number]>(
      t.species,
      columns('id', 'name', 'slug', 'formType', 'group', 'isOther'),
      'species',
    ),
    municipalities: zip<Meta['municipalities'][number]>(
      t.municipalities,
      columns('code', 'name', 'county', 'mpvCount', 'mpvHa', 'mpvSmall', 'pooled'),
      'municipalities',
    ),
    static: body.static as Meta['static'],
  };
};

export const parseLoots = (body: SnapshotBody): NonNullable<SnapshotData['loots']> => ({
  rows: zip<LootRow>(
    body.tables.loots,
    columns('season', 'muni', 'sp', 'n', 'paper', 'app', 'm', 'f', 'j', 'dead', 'road'),
    'loots',
  ),
  kita: zip<KitaRow>(body.tables.kita, columns('season', 'n', 'dead'), 'kita'),
});

export const parseLimits = (body: SnapshotBody): LimitRow[] =>
  zip<LimitRow>(
    body.tables.limits,
    columns(
      'season',
      'muni',
      'mpvWithLimit',
      'limM',
      'limFj',
      'usedM',
      'usedFj',
      'leftM',
      'leftFj',
    ),
    'limits',
  );

export const parseDamages = (body: SnapshotBody): NonNullable<SnapshotData['damages']> => ({
  season: zip<DamageSeasonRow>(
    body.tables.season,
    columns('season', 'muni', 'grp', 'reports', 'reporters', 'escalated', 'hidden'),
    'damages.season',
  ),
  month: zip<DamageMonthRow>(
    body.tables.month,
    columns('ym', 'grp', 'reports', 'hidden'),
    'damages.month',
  ),
  attacked: zip<AttackedRow>(
    body.tables.attacked,
    columns('season', 'grp', 'cls', 'entries', 'animals', 'hidden'),
    'damages.attacked',
  ),
});

export const parseWolves = (body: SnapshotBody): WolfMuniRow[] =>
  zip<WolfMuniRow>(body.tables.located, columns('season', 'muni', 'located'), 'wolves.located');

/** What each file contributes to `SnapshotData`, and its snapshot day. */
export interface Loaded<K extends SnapshotFile> {
  snapshotDate: string;
  value: Required<SnapshotData>[K];
}
export type Adapter<K extends SnapshotFile> = (signal: AbortSignal) => Promise<Loaded<K>>;
export type Adapters = { [K in SnapshotFile]: Adapter<K> };

const fileAdapter =
  <K extends SnapshotFile>(name: K, parse: (body: SnapshotBody) => Required<SnapshotData>[K]) =>
  async (signal: AbortSignal): Promise<Loaded<K>> => {
    const body = await loadSnapshotFile(name, signal);
    try {
      return { snapshotDate: body.snapshotDate, value: parse(body) };
    } catch (err) {
      clearSnapshotCache(name);
      throw err;
    }
  };

export const snapshotAdapters: Adapters = {
  meta: fileAdapter('meta', parseMeta),
  loots: fileAdapter('loots', parseLoots),
  limits: fileAdapter('limits', parseLimits),
  damages: fileAdapter('damages', parseDamages),
  wolves: fileAdapter('wolves', parseWolves),
};
