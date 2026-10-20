// Loads the public observations for the Stebėjimai topic (STEB-SPEC §2): page 1, then the
// remaining pages (at most MAX_PAGES) four at a time, each with a 15 s timeout, all aborted
// when the topic unmounts. All-or-nothing: any failed page (HTTP error, non-JSON response,
// no `rows` array, timeout) is an error and no number is shown from a partial read. Only
// `STEB_FIELDS` are requested (`observationsUrl`) and parsed (`parseObservationRow`).
import { getCurrentScope, onScopeDispose, ref, shallowRef, type Ref, type ShallowRef } from 'vue';
import {
  compareRecords,
  MAX_PAGES,
  MAX_ROWS,
  observationsUrl,
  PAGE_SIZE,
  PAGE_TIMEOUT_MS,
  PARALLEL_PAGES,
  parseObservationRow,
  type StebRecord,
} from '@/utils/hunting/hub/stebejimai/model';

export type StebPhase = 'idle' | 'loading' | 'ready' | 'error';

export interface StebData {
  phase: Ref<StebPhase>;
  /** Parsed rows, newest first (at most MAX_ROWS). */
  records: ShallowRef<StebRecord[]>;
  /** `total` the API reported. */
  total: Ref<number>;
  /** The API has more rows than were read (§3.9). */
  truncated: Ref<boolean>;
  fetchedAt: Ref<Date | null>;
  /** Technical reason of the last failure (debug panel only). */
  error: Ref<string | null>;
  /** Requests of the last load and its duration (debug panel). */
  requests: Ref<number>;
  fetchMs: Ref<number | null>;
  reload(): void;
}

interface Page {
  rows: unknown[];
  total: number;
  totalPages: number;
}

class PageError extends Error {}

async function fetchPage(page: number, outer: AbortSignal): Promise<Page> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, PAGE_TIMEOUT_MS);
  if (outer.aborted) abort();
  outer.addEventListener('abort', abort);
  try {
    const response = await fetch(observationsUrl(page), { signal: controller.signal });
    if (response.status !== 200) throw new PageError(`HTTP ${response.status} (page ${page})`);
    const type = response.headers.get('content-type') || '';
    if (!/\bjson\b/i.test(type)) throw new PageError(`not JSON: "${type}" (page ${page})`);
    const body: any = await response.json();
    if (!body || typeof body !== 'object' || !Array.isArray(body.rows)) {
      throw new PageError(`no rows (page ${page})`);
    }
    const total = Number.isInteger(body.total) && body.total >= 0 ? body.total : body.rows.length;
    const pageSize =
      Number.isInteger(body.pageSize) && body.pageSize > 0 ? body.pageSize : PAGE_SIZE;
    const totalPages =
      Number.isInteger(body.totalPages) && body.totalPages >= 0
        ? body.totalPages
        : Math.ceil(total / pageSize);
    return { rows: body.rows, total, totalPages };
  } finally {
    clearTimeout(timer);
    outer.removeEventListener('abort', abort);
  }
}

/**
 * Every page of `/observations` (§2): rows deduplicated by id, newest first; when the API
 * has more than MAX_PAGES pages, the newest MAX_ROWS rows and `truncated`.
 */
export async function fetchAllObservations(signal: AbortSignal) {
  let requests = 1;
  const first = await fetchPage(1, signal);
  const last = Math.min(Math.max(first.totalPages, 1), MAX_PAGES);
  const pages: unknown[][] = [first.rows];
  for (let start = 2; start <= last; start += PARALLEL_PAGES) {
    const batch: number[] = [];
    for (let p = start; p < start + PARALLEL_PAGES && p <= last; p++) batch.push(p);
    requests += batch.length;
    const bodies = await Promise.all(batch.map((p) => fetchPage(p, signal)));
    bodies.forEach((b, i) => {
      // A changed total means rows were added or removed while the pages were read, so the
      // offsets moved and a row may have been skipped or repeated.
      if (b.total !== first.total) {
        throw new PageError(`total changed while reading (page ${batch[i]})`);
      }
      pages.push(b.rows);
    });
  }

  const byKey = new Map<string, StebRecord>();
  let index = 0;
  pages.forEach((rows) =>
    rows.forEach((raw) => {
      const record = parseObservationRow(raw, index++);
      if (record && !byKey.has(record.key)) byKey.set(record.key, record);
    }),
  );
  const all = Array.from(byKey.values()).sort(compareRecords);
  const truncated = first.totalPages > MAX_PAGES || all.length > MAX_ROWS;
  // All-or-nothing also when every page answered: fewer unique rows than the source's total
  // (a repeated page, a row that moved across a page boundary) is an error, not a smaller list.
  if (!truncated && all.length < first.total) {
    throw new PageError(`incomplete read: ${all.length} of ${first.total} rows`);
  }
  return {
    records: truncated ? all.slice(0, MAX_ROWS) : all,
    total: Math.max(first.total, all.length),
    truncated,
    requests,
  };
}

export function useStebData(options: { enabled: boolean }): StebData {
  const phase = ref<StebPhase>('idle');
  const records = shallowRef<StebRecord[]>([]);
  const total = ref(0);
  const truncated = ref(false);
  const fetchedAt = ref<Date | null>(null);
  const error = ref<string | null>(null);
  const requests = ref(0);
  const fetchMs = ref<number | null>(null);

  let scope = new AbortController();
  let current: AbortController | null = null;
  let disposed = false;

  async function load() {
    if (!options.enabled || disposed) return;
    current?.abort();
    const controller = new AbortController();
    current = controller;
    const onScopeAbort = () => controller.abort();
    scope.signal.addEventListener('abort', onScopeAbort);
    phase.value = 'loading';
    error.value = null;
    const started = Date.now();
    try {
      const result = await fetchAllObservations(controller.signal);
      if (controller !== current || controller.signal.aborted) return;
      records.value = result.records;
      total.value = result.total;
      truncated.value = result.truncated;
      requests.value = result.requests;
      fetchedAt.value = new Date();
      fetchMs.value = Date.now() - started;
      phase.value = 'ready';
    } catch (err) {
      if (controller !== current || disposed) return;
      // Never a partial read: the error state shows no numbers (§2).
      records.value = [];
      total.value = 0;
      truncated.value = false;
      error.value =
        err instanceof Error ? (err.name === 'AbortError' ? 'timeout' : err.message) : String(err);
      phase.value = 'error';
      // eslint-disable-next-line no-console
      console.warn('[hunting/hub] observations load failed', err);
    } finally {
      scope.signal.removeEventListener('abort', onScopeAbort);
    }
  }

  function reload() {
    if (disposed) return;
    if (scope.signal.aborted) scope = new AbortController();
    load();
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      disposed = true;
      scope.abort();
    });
  }

  load();

  return { phase, records, total, truncated, fetchedAt, error, requests, fetchMs, reload };
}
