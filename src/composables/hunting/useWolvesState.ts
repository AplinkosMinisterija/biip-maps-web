import { computed, ref, watch } from 'vue';
import { useRoute, useRouter, type LocationQuery } from 'vue-router';
import type { WolvesContext } from '@/composables/hunting/context';
import type { Interval, PresetId } from '@/utils/hunting/types';
// TODO-INTEGRATE: import these from '@/utils/hunting/dates'.
import { formatInt, pluralLt, seasonInterval, seasonOfDay } from '@/composables/hunting/t2Stubs';
// TODO-INTEGRATE: import these from '@/utils/hunting/labels'.
import { AGE_LABELS, METHOD_LABELS, SEX_LABELS } from '@/composables/hunting/t2Stubs';
// TODO-INTEGRATE: import these from '@/utils/hunting/wolves'.
import { filterRecords, histogram, statusModel } from '@/composables/hunting/t2Stubs';

type TableTab = 'irasai' | 'sezonai' | 'savivaldybes';
type Attrs = { age: string[]; sex: string[]; method: string[] };

// The earliest plausible record; anything before it is a data entry error (§4.3).
export const MIN_DAY = '2017-04-01';
const FIRST_SEASON = seasonOfDay(MIN_DAY);
const HISTORY_MAX = 5;
const URL_DEBOUNCE_MS = 300;
const TABLE_TABS: TableTab[] = ['irasai', 'sezonai', 'savivaldybes'];
// Keys this page owns in the query; everything else (x, y, z, …) is left alone.
const OWN_KEYS = [
  'nuo',
  'iki',
  'sezonas',
  'laikotarpis',
  'lentele',
  'sav',
  'amzius',
  'lytis',
  'budas',
];
const ATTR_KEYS: Record<keyof Attrs, string> = { age: 'amzius', sex: 'lytis', method: 'budas' };
const NOT_SET = 'nenurodyta';

// Day arithmetic on 'yyyy-MM-dd' strings, in UTC so no local time zone leaks in (§4.2).
export function shiftDay(day: string, days: number) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function isValidDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10) === value;
}

const sameInterval = (a: Interval, b: Interval) => a.from === b.from && a.to === b.to;

const queryString = (query: LocationQuery, key: string) => {
  const value = query[key];
  return typeof value === 'string' ? value : undefined;
};

export function useWolvesState(opts: {
  today: string;
  currentSeason: number;
  data: WolvesContext['data'];
}): { state: WolvesContext['state']; derived: WolvesContext['derived']; debug: boolean } {
  const { today, currentSeason: cur, data } = opts;
  const route = useRoute();
  const router = useRouter();

  const presetInterval = (preset: PresetId): Interval | null => {
    if (preset === 'last30') return { from: shiftDay(today, -29), to: today };
    if (preset === 'all') return { from: MIN_DAY, to: today };
    const match = /^season:(\d{4})$/.exec(preset);
    return match ? seasonInterval(Number(match[1])) : null;
  };

  // Which chip an interval corresponds to, so a hand-picked full season lights up its chip.
  const presetOf = (interval: Interval): PresetId => {
    for (let s = cur; s >= FIRST_SEASON; s--) {
      if (sameInterval(interval, seasonInterval(s))) return `season:${s}`;
    }
    if (sameInterval(interval, presetInterval('last30')!)) return 'last30';
    if (sameInterval(interval, presetInterval('all')!)) return 'all';
    return 'custom';
  };

  // §4.4: the current season once it has a located in-window wolf, else the previous one.
  // Before the data arrives, guess from the calendar (the guess is replaced on load).
  const defaultSeason = computed(() => {
    const records = data.dataset.value?.records;
    if (!records) return today < `${cur}-10-15` ? cur - 1 : cur;
    return records.some((r) => r.season === cur && r.inWolfWindow) ? cur : cur - 1;
  });

  // ---- Parse the URL once (§5.2). Invalid values fall back to defaults silently.
  const query = route.query;
  let initialInterval: Interval | null = null;
  let initialPreset: PresetId | null = null;

  const nuo = queryString(query, 'nuo');
  const iki = queryString(query, 'iki');
  const sezonas = queryString(query, 'sezonas');
  const laikotarpis = queryString(query, 'laikotarpis');
  if (isValidDay(nuo) && isValidDay(iki) && nuo <= iki && nuo >= MIN_DAY) {
    initialInterval = { from: nuo, to: iki };
  } else if (sezonas) {
    const match = /^(\d{4})-(\d{4})$/.exec(sezonas);
    const start = match ? Number(match[1]) : NaN;
    if (match && Number(match[2]) === start + 1 && start >= FIRST_SEASON && start <= cur) {
      initialInterval = seasonInterval(start);
      initialPreset = `season:${start}`;
    }
  } else if (laikotarpis === '30d' || laikotarpis === 'visi') {
    initialPreset = laikotarpis === '30d' ? 'last30' : 'all';
    initialInterval = presetInterval(initialPreset);
  }

  const lentele = queryString(query, 'lentele');
  const savRaw = queryString(query, 'sav');
  const parseAttr = (key: string) =>
    (queryString(query, key) || '')
      .split(',')
      .filter((v) => v === NOT_SET || /^[A-Z][A-Z_]*$/.test(v));

  // Whether the interval came from the URL or the user; if not, it follows defaultSeason.
  let userChosen = !!initialInterval;

  const interval = ref<Interval>(initialInterval || seasonInterval(defaultSeason.value));
  const preset = ref<PresetId>(initialPreset || presetOf(interval.value));
  const history = ref<Interval[]>([]);
  const tableOpen = ref(TABLE_TABS.includes(lentele as TableTab));
  const tableTab = ref<TableTab>(tableOpen.value ? (lentele as TableTab) : 'irasai');
  const selection = ref<{ ids: string[]; index: number } | null>(null);
  const sav = ref<number | null>(savRaw && /^\d+$/.test(savRaw) ? Number(savRaw) : null);
  const attrs = ref<Attrs>({
    age: parseAttr('amzius'),
    sex: parseAttr('lytis'),
    method: parseAttr('budas'),
  });
  const mapExtent3346 = ref<[number, number, number, number] | null>(null);
  const zoomRequest = ref<{ ids: string[]; seq: number } | null>(null);
  const returnFocus = ref<HTMLElement | null>(null);
  const debug = queryString(query, 'debug') === '1';

  watch(defaultSeason, (season) => {
    if (userChosen) return;
    interval.value = seasonInterval(season);
    preset.value = `season:${season}`;
  });

  function setInterval(next: Interval, nextPreset?: PresetId, pushHistory = false) {
    if (!isValidDay(next.from) || !isValidDay(next.to) || next.to < next.from) return;
    const clamped = { from: next.from < MIN_DAY ? MIN_DAY : next.from, to: next.to };
    if (pushHistory) {
      history.value = [...history.value, interval.value].slice(-HISTORY_MAX);
    } else {
      history.value = [];
    }
    userChosen = true;
    interval.value = clamped;
    preset.value =
      nextPreset &&
      nextPreset !== 'custom' &&
      sameInterval(presetInterval(nextPreset) || clamped, clamped)
        ? nextPreset
        : presetOf(clamped);
  }

  function back() {
    const previous = history.value[history.value.length - 1];
    if (!previous) return;
    history.value = history.value.slice(0, -1);
    interval.value = previous;
    preset.value = presetOf(previous);
  }

  function reset() {
    userChosen = false;
    history.value = [];
    interval.value = seasonInterval(defaultSeason.value);
    preset.value = `season:${defaultSeason.value}`;
    sav.value = null;
    attrs.value = { age: [], sex: [], method: [] };
    selection.value = null;
  }

  function select(ids: string[], selectOpts: { zoom?: boolean } = {}) {
    if (!ids.length) return;
    const active = document.activeElement;
    returnFocus.value = active instanceof HTMLElement && active !== document.body ? active : null;
    selection.value = { ids, index: 0 };
    if (selectOpts.zoom) {
      zoomRequest.value = { ids, seq: (zoomRequest.value?.seq || 0) + 1 };
    }
  }

  function clearSelection() {
    selection.value = null;
  }

  // ---- Derived values.
  const records = computed(() => data.dataset.value?.records || []);

  const filtered = computed(() =>
    filterRecords(records.value, {
      interval: interval.value,
      sav: sav.value,
      age: attrs.value.age,
      sex: attrs.value.sex,
      method: attrs.value.method,
    }),
  );

  const intervalSeason = computed(() => {
    const season = seasonOfDay(interval.value.from);
    return sameInterval(interval.value, seasonInterval(season)) ? season : null;
  });

  const seasonList = computed(() => {
    const minYear = data.dataset.value?.minYear;
    const first = minYear ? Math.max(FIRST_SEASON, seasonOfDay(`${minYear}-01-01`)) : FIRST_SEASON;
    const list: number[] = [];
    for (let s = cur; s >= first; s--) list.push(s);
    return list;
  });

  const histogramBins = computed(() =>
    data.dataset.value ? histogram(filtered.value, interval.value) : [],
  );

  const status = computed(() =>
    statusModel(data.totals.value, data.totalsFailed.value, records.value, today),
  );

  const periodLabel = computed(() => {
    const { from, to } = interval.value;
    if (preset.value === 'last30') return `paskutinės 30 d. (${from} – ${to})`;
    if (preset.value === 'all') return 'visi sezonai';
    if (intervalSeason.value != null) {
      return `${intervalSeason.value}/${intervalSeason.value + 1} sezonas`;
    }
    return from === to ? from : `${from} – ${to}`;
  });

  const placeLabel = computed(() => {
    if (sav.value == null) return 'visa Lietuva';
    const match = records.value.find((r) => r.municipalityCode === sav.value);
    return match?.municipalityName || `savivaldybė ${sav.value}`;
  });

  const attrsLabel = computed(() => {
    const label = (codes: string[], labels: Record<string, string>, notSet: string) =>
      codes.map((code) => (code === NOT_SET ? notSet : labels[code] || code));
    return [
      ...label(attrs.value.age, AGE_LABELS, 'Amžius nenurodytas'),
      ...label(attrs.value.sex, SEX_LABELS, 'Lytis nenurodyta'),
      ...label(attrs.value.method, METHOD_LABELS, 'Būdas nenurodytas'),
    ].join(', ');
  });

  const sentence = computed(() => {
    const count = data.dataset.value
      ? `${formatInt(filtered.value.length)} ${pluralLt(filtered.value.length, [
          'sumedžiotas vilkas',
          'sumedžioti vilkai',
          'sumedžiotų vilkų',
        ])}`
      : '—';
    const parts = [`Rodoma: ${count}`, periodLabel.value, placeLabel.value];
    if (attrsLabel.value) parts.push(attrsLabel.value);
    return parts.join(' · ');
  });

  const isDefaultView = computed(
    () =>
      sameInterval(interval.value, seasonInterval(defaultSeason.value)) &&
      sav.value == null &&
      !attrs.value.age.length &&
      !attrs.value.sex.length &&
      !attrs.value.method.length,
  );

  // A filter change that removes the shown wolf closes the card (§5.1, §8.3).
  watch(filtered, (list) => {
    const current = selection.value?.ids[selection.value.index];
    if (current && !list.some((r) => r.id === current)) selection.value = null;
  });

  // ---- Write the URL (§5.2): router.replace, debounced, only non-default keys.
  const urlQuery = () => {
    const out: Record<string, string> = {};
    const p = preset.value;
    const season = /^season:(\d{4})$/.exec(p);
    if (season) {
      const s = Number(season[1]);
      if (s !== defaultSeason.value) out.sezonas = `${s}-${s + 1}`;
    } else if (p === 'last30') {
      out.laikotarpis = '30d';
    } else if (p === 'all') {
      out.laikotarpis = 'visi';
    } else {
      out.nuo = interval.value.from;
      out.iki = interval.value.to;
    }
    if (tableOpen.value) out.lentele = tableTab.value;
    if (sav.value != null) out.sav = String(sav.value);
    (Object.keys(ATTR_KEYS) as (keyof Attrs)[]).forEach((key) => {
      if (attrs.value[key].length) out[ATTR_KEYS[key]] = attrs.value[key].join(',');
    });
    return out;
  };

  let urlTimer: ReturnType<typeof setTimeout> | undefined;
  watch(
    [interval, preset, tableOpen, tableTab, sav, attrs],
    () => {
      clearTimeout(urlTimer);
      urlTimer = setTimeout(() => {
        const kept: LocationQuery = {};
        Object.keys(route.query).forEach((key) => {
          if (!OWN_KEYS.includes(key)) kept[key] = route.query[key];
        });
        router.replace({ query: { ...kept, ...urlQuery() } });
      }, URL_DEBOUNCE_MS);
    },
    { deep: true },
  );

  return {
    debug,
    state: {
      interval,
      preset,
      history,
      tableOpen,
      tableTab,
      selection,
      sav,
      attrs,
      mapExtent3346,
      setInterval,
      back,
      reset,
      select,
      clearSelection,
      zoomRequest,
      returnFocus,
    },
    derived: {
      filtered,
      intervalSeason,
      defaultSeason,
      histogram: histogramBins,
      status,
      sentence,
      periodLabel,
      seasonList,
      isDefaultView,
    },
  };
}
