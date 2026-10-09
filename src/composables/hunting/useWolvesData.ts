// Loads the public wolf data (SPEC §1 E1–E3, §11): wolves with a paging guard and a
// localStorage cache (stale-while-revalidate), the current-season totals (never
// cached) and the season list. Requests time out and are aborted on unmount.
import { getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue';
import { medziokleApiHost } from '@/config';
import type { SeasonInfo, WolfApiRow, WolfTotals, WolvesDataset } from '@/utils/hunting/types';
import { formatInt, seasonOfDay, todayVilnius } from '@/utils/hunting/dates';
import { normalise } from '@/utils/hunting/wolves';

export const WOLF_FIELDS = [
  'id',
  'registeredAt',
  'source',
  'age',
  'category',
  'wolfHuntingType',
  'isPackMember',
  'packAmount',
  'seasonId',
  'geom',
];
const PAGE_SIZE = 3000;

export const WOLVES_TIMEOUT_MS = 60000;
export const SMALL_TIMEOUT_MS = 15000;
export const SLOW_AFTER_MS = 10000;

export const CACHE_KEY = 'hunting-wolves:v1';
export const CACHE_FRESH_MS = 15 * 60 * 1000;
export const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const ERROR_LOAD = 'Nepavyko įkelti vilkų duomenų. Patikrinkite ryšį arba bandykite vėliau.';
export const errorIncomplete = (fetched: number, total: number) =>
  `Nepavyko įkelti visų įrašų (${formatInt(fetched)} iš ${formatInt(total)}). ` +
  'Skaičiai nerodomi, kad nebūtų klaidinantys.';

interface CacheEntry {
  v: 1;
  base: string;
  fetchedAt: string;
  total: number;
  rows: WolfApiRow[];
}

interface WolvesPage {
  rows: WolfApiRow[];
  total: number;
  page: number;
  totalPages: number;
}

class IncompleteError extends Error {
  constructor(
    public fetched: number,
    public total: number,
  ) {
    super(`incomplete: ${fetched} of ${total}`);
  }
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

// fetch + JSON with a timeout; also aborts when `outer` aborts (unmount).
async function getJson<T>(url: string, timeoutMs: number, outer: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, timeoutMs);
  if (outer.aborted) abort();
  outer.addEventListener('abort', abort);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (response.status !== 200) throw new Error(`HTTP ${response.status} for ${url}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
    outer.removeEventListener('abort', abort);
  }
}

const wolvesUrl = (page: number) =>
  `${medziokleApiHost}/wolfs?fields=${WOLF_FIELDS.join(',')}` +
  `&pageSize=${PAGE_SIZE}&page=${page}&sort=id`;

const isPage = (body: any): body is WolvesPage =>
  !!body && Array.isArray(body.rows) && Number.isFinite(body.total);

// All pages of E1; the whole load shares one 60 s budget. Requires
// distinct ids === total, otherwise throws IncompleteError.
async function fetchAllWolves(signal: AbortSignal) {
  const deadline = Date.now() + WOLVES_TIMEOUT_MS;
  const remaining = () => Math.max(1, deadline - Date.now());
  const rows: WolfApiRow[] = [];

  let body = await getJson<WolvesPage>(wolvesUrl(1), remaining(), signal);
  if (!isPage(body)) throw new Error('Unexpected wolves response');
  rows.push(...body.rows);
  const total = body.total;
  const totalPages = Number(body.totalPages) || 1;
  for (let page = 2; page <= totalPages; page++) {
    body = await getJson<WolvesPage>(wolvesUrl(page), remaining(), signal);
    if (!isPage(body)) throw new Error('Unexpected wolves response');
    rows.push(...body.rows);
  }

  const distinct = new Set(rows.map((r) => r.id)).size;
  if (distinct !== total) throw new IncompleteError(distinct, total);
  return { rows, total };
}

async function fetchTotals(signal: AbortSignal): Promise<WolfTotals> {
  const body = await getJson<any>(
    `${medziokleApiHost}/statistics/totals`,
    SMALL_TIMEOUT_MS,
    signal,
  );
  // Only wolfAmount and wolfLimit; never wolfAmountTotal (double count, SPEC §1 E2).
  if (!body || !Number.isFinite(body.wolfAmount) || !Number.isFinite(body.wolfLimit)) {
    throw new Error('Unexpected totals response');
  }
  return { wolfAmount: body.wolfAmount, wolfLimit: body.wolfLimit };
}

async function fetchSeasons(signal: AbortSignal): Promise<SeasonInfo[]> {
  const body = await getJson<any>(
    `${medziokleApiHost}/lootsByMunicipality/seasons`,
    SMALL_TIMEOUT_MS,
    signal,
  );
  const list: any[] = Array.isArray(body) ? body : Array.isArray(body?.rows) ? body.rows : null;
  if (!list) throw new Error('Unexpected seasons response');
  return list
    .filter((s) => s && Number.isFinite(s.id) && typeof s.startDate === 'string')
    .map((s) => {
      const start = Number(s.startDate.slice(0, 4));
      return {
        id: s.id,
        start,
        name: typeof s.name === 'string' && s.name ? s.name : `${start}/${start + 1}`,
        current: s.current === true,
      };
    });
}

// ---------------------------------------------------------------------------
// Cache (every storage access may throw: private mode, quota, blocked storage)
// ---------------------------------------------------------------------------

function readCache(): CacheEntry | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    const fetchedAt = Date.parse(entry?.fetchedAt);
    if (
      entry?.v !== 1 ||
      entry.base !== medziokleApiHost ||
      !Array.isArray(entry.rows) ||
      !Number.isFinite(fetchedAt) ||
      Date.now() - fetchedAt > CACHE_MAX_AGE_MS
    ) {
      return null;
    }
    return entry;
  } catch (e) {
    return null;
  }
}

function writeCache(rows: WolfApiRow[], total: number, fetchedAt: Date) {
  try {
    const entry: CacheEntry = {
      v: 1,
      base: medziokleApiHost,
      fetchedAt: fetchedAt.toISOString(),
      total,
      rows,
    };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch (e) {
    // Not caching is fine.
  }
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export interface UseWolvesDataOptions {
  today?: string; // local 'yyyy-MM-dd'; defaults to todayVilnius()
  immediate?: boolean; // start loading at once (default true)
}

export function useWolvesData(options: UseWolvesDataOptions = {}) {
  const today = options.today || todayVilnius();

  const phase = ref<'loading' | 'slow' | 'ready' | 'error'>('loading');
  const dataset = shallowRef<WolvesDataset | null>(null);
  const totals = ref<WolfTotals | null>(null);
  const totalsFailed = ref(false);
  const seasons = shallowRef<SeasonInfo[]>([]);
  const seasonsFailed = ref(false);
  const fetchedAt = ref<Date | null>(null);
  // 'fresh' / 'stale': the shown rows came from the cache. After a successful
  // background refresh it becomes null and `refreshedAt` is set.
  const fromCache = ref<'fresh' | 'stale' | null>(null);
  const refreshedAt = ref<Date | null>(null);
  // User-facing message. With a dataset still shown (stale cache) it means the
  // refresh failed and the old data stays visible.
  const error = ref<string | null>(null);
  const fetchMs = ref<number | null>(null);

  let rows: WolfApiRow[] | null = null;
  let apiTotal = 0;
  let scopeController = new AbortController();
  let wolvesController: AbortController | null = null;
  let totalsController: AbortController | null = null;
  let slowTimer: ReturnType<typeof setTimeout> | null = null;

  const rebuild = () => {
    if (!rows) return;
    dataset.value = normalise(rows, seasons.value, today, apiTotal);
  };

  const childController = () => {
    const controller = new AbortController();
    scopeController.signal.addEventListener('abort', () => controller.abort());
    return controller;
  };

  const clearSlowTimer = () => {
    if (slowTimer) clearTimeout(slowTimer);
    slowTimer = null;
  };

  async function loadWolves(background: boolean) {
    wolvesController?.abort();
    const controller = (wolvesController = childController());
    if (!background) {
      phase.value = 'loading';
      error.value = null;
      clearSlowTimer();
      slowTimer = setTimeout(() => {
        if (phase.value === 'loading') phase.value = 'slow';
      }, SLOW_AFTER_MS);
    }

    const started = Date.now();
    try {
      const result = await fetchAllWolves(controller.signal);
      if (controller.signal.aborted) return;
      const now = new Date();
      rows = result.rows;
      apiTotal = result.total;
      rebuild();
      writeCache(result.rows, result.total, now);
      if (fromCache.value) refreshedAt.value = now;
      fetchedAt.value = now;
      fromCache.value = null;
      fetchMs.value = Date.now() - started;
      error.value = null;
      phase.value = 'ready';
    } catch (e) {
      if (scopeController.signal.aborted || controller !== wolvesController) return;
      error.value = e instanceof IncompleteError ? errorIncomplete(e.fetched, e.total) : ERROR_LOAD;
      // With cached rows on screen, keep them (SPEC §10); otherwise no partial numbers.
      phase.value = dataset.value ? 'ready' : 'error';
      // eslint-disable-next-line no-console
      console.warn('[hunting/wolves] wolves load failed', e);
    } finally {
      if (controller === wolvesController) clearSlowTimer();
    }
  }

  async function loadSeasons() {
    try {
      seasons.value = await fetchSeasons(childController().signal);
      seasonsFailed.value = false;
      const current = seasons.value.find((s) => s.current);
      if (current && current.start !== seasonOfDay(today)) {
        // eslint-disable-next-line no-console
        console.warn('[hunting/wolves] current season mismatch', current.start, seasonOfDay(today));
      }
      rebuild();
    } catch (e) {
      if (scopeController.signal.aborted) return;
      seasonsFailed.value = true;
    }
  }

  async function reloadTotals() {
    totalsController?.abort();
    const controller = (totalsController = childController());
    try {
      totals.value = await fetchTotals(controller.signal);
      totalsFailed.value = false;
    } catch (e) {
      if (scopeController.signal.aborted || controller !== totalsController) return;
      totals.value = null;
      totalsFailed.value = true;
    }
  }

  function start() {
    reloadTotals();
    loadSeasons();

    const cached = readCache();
    if (cached) {
      const cachedAt = new Date(cached.fetchedAt);
      rows = cached.rows;
      apiTotal = Number.isFinite(cached.total) ? cached.total : cached.rows.length;
      rebuild();
      fetchedAt.value = cachedAt;
      phase.value = 'ready';
      if (Date.now() - cachedAt.getTime() < CACHE_FRESH_MS) {
        fromCache.value = 'fresh';
        return;
      }
      fromCache.value = 'stale';
      loadWolves(true);
      return;
    }
    loadWolves(false);
  }

  // Manual retry ("Bandyti dar kartą"): wolves (keeping any shown data) and,
  // if it failed, the season list.
  function reload() {
    if (scopeController.signal.aborted) scopeController = new AbortController();
    if (seasonsFailed.value) loadSeasons();
    loadWolves(!!dataset.value);
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      clearSlowTimer();
      scopeController.abort();
    });
  }

  if (options.immediate !== false) start();

  return {
    phase,
    dataset,
    totals,
    totalsFailed,
    seasons,
    seasonsFailed,
    fetchedAt,
    fromCache,
    refreshedAt,
    error,
    fetchMs,
    reload,
    reloadTotals,
    start,
  };
}
