// TODO-INTEGRATE: this whole file is a temporary stand-in for modules owned by
// other tasks (T1 data core, T4 map). It exists only so that the T2 shell builds
// and can be exercised on its own. When integrating, point every import of
// '@/composables/hunting/t2Stubs' at the real module named in the section
// header below, then delete this file.
import { computed, onBeforeUnmount, ref } from 'vue';
import WKB from 'ol/format/WKB';
import type { Point } from 'ol/geom';
import { medziokleApiHost } from '@/config';
import type { WolvesContext } from '@/composables/hunting/context';
import type {
  HistogramBin,
  Interval,
  SeasonInfo,
  StatusModel,
  WolfApiRow,
  WolfRecord,
  WolfSource,
  WolfTotals,
  WolvesDataset,
} from '@/utils/hunting/types';

// ---------------------------------------------------------------------------
// TODO-INTEGRATE: '@/utils/hunting/dates' (T1)
// ---------------------------------------------------------------------------
const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Vilnius',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
export const vilniusDay = (iso: string) => dayFormat.format(new Date(iso));
export const recordDay = (source: WolfSource, iso: string) =>
  source === 'biomon' ? iso.slice(0, 10) : vilniusDay(iso);
export const todayVilnius = () => vilniusDay(new Date().toISOString());
export const seasonOfDay = (day: string) => {
  const year = Number(day.slice(0, 4));
  return Number(day.slice(5, 7)) >= 4 ? year : year - 1;
};
export const seasonInterval = (s: number): Interval => ({
  from: `${s}-04-01`,
  to: `${s + 1}-03-31`,
});
export const seasonLabel = (s: number) => `${s}/${s + 1}`;
export function pluralLt(n: number, forms: [string, string, string]) {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return forms[0];
  if (a >= 2 && a <= 9 && !(b >= 12 && b <= 19)) return forms[1];
  return forms[2];
}
export const formatInt = (n: number) => new Intl.NumberFormat('lt-LT').format(n);
const dateTimeFormat = new Intl.DateTimeFormat('lt-LT', {
  timeZone: 'Europe/Vilnius',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
export const formatDateTime = (d: Date) => {
  const parts: Record<string, string> = {};
  dateTimeFormat.formatToParts(d).forEach((p) => (parts[p.type] = p.value));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
};

// ---------------------------------------------------------------------------
// TODO-INTEGRATE: '@/utils/hunting/labels' (T1)
// ---------------------------------------------------------------------------
export const WOLF_LIMITS: Record<number, number> = { 2024: 341, 2025: 307 };
export const AM_WOLVES_URL =
  'https://am.lrv.lt/lt/veiklos-sritys-1/gamtos-apsauga/medziokle/sumedzioti-vilkai/';
export const AGE_LABELS: Record<string, string> = {
  ADULT: 'Suaugęs',
  TWO_YEAR: 'Vyresnis nei 1 m.',
  ONE_YEAR: 'Jauniklis iki 1 m.',
};
export const SEX_LABELS: Record<string, string> = { MALE: 'Patinas', FEMALE: 'Patelė' };
export const METHOD_LABELS: Record<string, string> = {
  TYKOJAMOJI: 'Tykojamoji',
  VAROMOJI: 'Varomoji',
  SU_VELIAVELEMIS: 'Su vėliavėlėmis',
  OTHER: 'Kita',
};

// ---------------------------------------------------------------------------
// TODO-INTEGRATE: '@/utils/hunting/wolves' (T1)
// ---------------------------------------------------------------------------
export function normalise(
  rows: WolfApiRow[],
  seasons: SeasonInfo[],
  today: string,
  apiTotal = rows.length,
): WolvesDataset {
  const startById: Record<number, number> = {};
  seasons.forEach((s) => (startById[s.id] = s.start));
  const wkb = new WKB();
  const seen = new Set<string>();
  const records: WolfRecord[] = [];
  const out: WolvesDataset = {
    records,
    paperRowsBySeason: {},
    paperRowsUnknownSeason: 0,
    excludedBadDate: 0,
    duplicateIdsDropped: 0,
    possibleDuplicatePairs: 0,
    apiTotal,
    minYear: Number(today.slice(0, 4)),
  };
  rows.forEach((row) => {
    if (!row.geom) {
      const start = row.seasonId != null ? startById[row.seasonId] : undefined;
      if (start == null) out.paperRowsUnknownSeason++;
      else out.paperRowsBySeason[start] = (out.paperRowsBySeason[start] || 0) + 1;
      return;
    }
    if (seen.has(row.id)) {
      out.duplicateIdsDropped++;
      return;
    }
    seen.add(row.id);
    const day = recordDay(row.source, row.registeredAt);
    if (day < '2017-04-01' || day > today) {
      out.excludedBadDate++;
      return;
    }
    const season = seasonOfDay(day);
    const [rawX, rawY] = (wkb.readGeometry(row.geom) as Point).getCoordinates();
    records.push({
      id: row.id,
      source: row.source,
      day,
      season,
      inWolfWindow: day >= `${season}-10-15` && day <= `${season + 1}-03-31`,
      age: row.age,
      sex: row.category,
      method: row.wolfHuntingType,
      packMember: row.isPackMember,
      packAmount: row.packAmount,
      x: Math.floor(rawX / 1000) * 1000 + 500,
      y: Math.floor(rawY / 1000) * 1000 + 500,
      rawX,
      rawY,
    });
    out.minYear = Math.min(out.minYear, Number(day.slice(0, 4)));
  });
  records.sort((a, b) => (a.day === b.day ? a.id.localeCompare(b.id) : a.day < b.day ? 1 : -1));
  return out;
}

export function filterRecords(
  records: WolfRecord[],
  opts: {
    interval: Interval;
    sav?: number | null;
    age?: string[];
    sex?: string[];
    method?: string[];
  },
): WolfRecord[] {
  const matches = (list: string[] | undefined, value: string | null) =>
    !list?.length || list.includes(value ?? 'nenurodyta');
  return records.filter(
    (r) =>
      opts.interval.from <= r.day &&
      r.day <= opts.interval.to &&
      (opts.sav == null || r.municipalityCode === opts.sav) &&
      matches(opts.age, r.age) &&
      matches(opts.sex, r.sex) &&
      matches(opts.method, r.method),
  );
}

// Minimal: month bins only. The real implementation picks season/month/day.
export function histogram(filtered: WolfRecord[], interval: Interval): HistogramBin[] {
  const counts: Record<string, number> = {};
  filtered.forEach((r) => (counts[r.day.slice(0, 7)] = (counts[r.day.slice(0, 7)] || 0) + 1));
  const bins: HistogramBin[] = [];
  let [y, m] = interval.from.slice(0, 7).split('-').map(Number);
  const end = interval.to.slice(0, 7);
  while (`${y}-${String(m).padStart(2, '0')}` <= end && bins.length < 240) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    bins.push({
      key,
      level: 'month',
      label: key,
      ariaLabel: key,
      count: counts[key] || 0,
      interval: { from: `${key}-01`, to: last },
    });
    m === 12 ? ((m = 1), y++) : m++;
  }
  return bins;
}

export function statusModel(
  totals: WolfTotals | null,
  totalsFailed: boolean,
  records: WolfRecord[],
  today: string,
): StatusModel {
  const cur = seasonOfDay(today);
  const wolfStartDay = `${cur}-10-15`;
  const points = records.filter((r) => r.season === cur).length;
  const base = {
    seasonStart: cur,
    seasonLabel: seasonLabel(cur),
    wolfStartDay,
    points,
  };
  if (totalsFailed || !totals) {
    return { ...base, state: 'unavailable', limit: null, hunted: null, remaining: null };
  }
  const L = totals.wolfLimit;
  const h = totals.wolfAmount;
  const taken = Math.max(h, points);
  const remaining = L - taken;
  const common = { ...base, limit: L, hunted: h, remaining: L > 0 ? remaining : null };
  if (L === 0) return { ...common, state: 'notApproved' };
  if (today < wolfStartDay) return { ...common, state: 'beforeStart' };
  if (h >= L || points >= L) return { ...common, state: 'exhausted' };
  if (remaining <= Math.max(10, Math.ceil(0.05 * L))) return { ...common, state: 'littleLeft' };
  return { ...common, state: 'ongoing' };
}

// ---------------------------------------------------------------------------
// TODO-INTEGRATE: '@/utils/hunting/selfcheck' (T1)
// ---------------------------------------------------------------------------
export function runSelfChecks(): { name: string; ok: boolean }[] {
  return [
    { name: 'pluralLt(1)', ok: pluralLt(1, ['a', 'b', 'c']) === 'a' },
    { name: 'pluralLt(12)', ok: pluralLt(12, ['a', 'b', 'c']) === 'c' },
    { name: 'vilniusDay 22:24Z', ok: vilniusDay('2025-10-18T22:24:00Z') === '2025-10-19' },
  ];
}

// ---------------------------------------------------------------------------
// TODO-INTEGRATE: '@/composables/hunting/useWolvesData' (T1)
// No cache, no paging guard, no timeouts: only enough to drive the UI.
// ---------------------------------------------------------------------------
export function useWolvesData(today: string): WolvesContext['data'] & {
  fetchMs: { value: number | null };
} {
  const phase = ref<'loading' | 'slow' | 'ready' | 'error'>('loading');
  const dataset = ref<WolvesDataset | null>(null);
  const totals = ref<WolfTotals | null>(null);
  const totalsFailed = ref(false);
  const seasons = ref<SeasonInfo[]>([]);
  const fetchedAt = ref<Date | null>(null);
  const fromCache = ref<'fresh' | 'stale' | null>(null);
  const error = ref<string | null>(null);
  const fetchMs = ref<number | null>(null);
  const controller = new AbortController();

  const getJson = async (path: string) => {
    const res = await fetch(`${medziokleApiHost}${path}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const reloadTotals = async () => {
    totalsFailed.value = false;
    totals.value = null;
    try {
      const t = await getJson('/statistics/totals');
      totals.value = { wolfAmount: t.wolfAmount, wolfLimit: t.wolfLimit };
    } catch (err) {
      totalsFailed.value = true;
    }
  };

  const loadSeasons = async () => {
    try {
      const rows = await getJson('/lootsByMunicipality/seasons');
      seasons.value = rows.map((s: any) => ({
        id: s.id,
        start: Number(String(s.startDate).slice(0, 4)),
        name: s.name,
        current: !!s.current,
      }));
    } catch (err) {
      seasons.value = [];
    }
  };

  const reload = async () => {
    phase.value = 'loading';
    error.value = null;
    const started = performance.now();
    const slowTimer = setTimeout(() => phase.value === 'loading' && (phase.value = 'slow'), 10000);
    try {
      const fields =
        'id,registeredAt,source,age,category,wolfHuntingType,isPackMember,packAmount,seasonId,geom';
      const [body] = await Promise.all([
        getJson(`/wolfs?fields=${fields}&pageSize=3000&page=1&sort=id`),
        seasonsReady,
      ]);
      dataset.value = normalise(body.rows, seasons.value, today, body.total);
      fetchedAt.value = new Date();
      fetchMs.value = Math.round(performance.now() - started);
      phase.value = 'ready';
    } catch (err) {
      console.error(err);
      error.value = 'Nepavyko įkelti vilkų duomenų. Patikrinkite ryšį arba bandykite vėliau.';
      phase.value = 'error';
    } finally {
      clearTimeout(slowTimer);
    }
  };

  const seasonsReady = loadSeasons();
  reloadTotals();
  reload();
  onBeforeUnmount(() => controller.abort());

  return {
    phase,
    dataset,
    totals,
    totalsFailed,
    seasons,
    fetchedAt,
    fromCache,
    error,
    fetchMs,
    reload,
    reloadTotals,
  };
}

// ---------------------------------------------------------------------------
// TODO-INTEGRATE: '@/composables/hunting/useWolvesMap' (T4)
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useWolvesMap(ctx: WolvesContext) {
  return { ready: computed(() => false) };
}
