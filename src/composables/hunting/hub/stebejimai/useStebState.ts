// State of the Stebėjimai topic (STEB-SPEC §3.3): filters (period, species, fact, place),
// the open table, the selected records, and everything derived from them. The URL is read
// when the state is created; until the first own write or user filter change, later
// changes of the topic's keys are adopted too (the hub's `setTopic` writes `sav`,
// `sezonas`, `lentele` with a router navigation that can land after this setup). Writes
// go through a debounced `router.replace` with only the non-default keys, keeping every
// other key (x, y, z, embed, parent, debug, unknown ones).
import {
  computed,
  onScopeDispose,
  ref,
  watch,
  type ComputedRef,
  type InjectionKey,
  type Ref,
} from 'vue';
import { useRoute, useRouter, type LocationQuery } from 'vue-router';
import type { HubContext } from '@/composables/hunting/hub/context';
import { seasonOfDay } from '@/utils/hunting/dates';
import { keptQuery } from '@/utils/hunting/hub/url';
import {
  answerText,
  compareLt,
  compareSpecies,
  filterRecords,
  FIRST_SEASON,
  NOT_SET_LABEL,
  NOT_SET_SLUG,
  parsePeriod,
  periodLabel as labelOfPeriod,
  periodQuery,
  recordPageUrl,
  samePeriod,
  STEB_DEFAULT_TABLE,
  STEB_FAKTAS_RE,
  STEB_GYVUNAS_RE,
  STEB_TABLES,
  STEB_URL_KEYS,
  type MuniCodeOf,
  type Query,
  type StebAnswer,
  type StebPeriod,
  type StebRecord,
  type StebTableId,
} from '@/utils/hunting/hub/stebejimai/model';
import { SS } from '@/utils/hunting/hub/stebejimai/strings';
import type { StebData } from './useStebData';

export const URL_DEBOUNCE_MS = 300;
const TOPIC_ID = 'stebejimai';

export interface StebOption {
  key: string;
  label: string;
  /** Rows of this option under the other active filters. */
  n: number;
}
export interface StebPlace {
  code: number;
  name: string;
}
export interface StebSelection {
  keys: string[];
  index: number;
}
export type MetaStatus = 'pending' | 'ready' | 'failed';

export interface StebContext {
  today: string;
  embed: boolean;
  debug: boolean;
  isProductionHost: boolean;
  isMobile: Ref<boolean>;
  hub: HubContext | null;
  data: StebData;
  meta: {
    status: ComputedRef<MetaStatus>;
    codeOf: MuniCodeOf;
    nameOf(code: number): string | null;
  };
  state: {
    period: Ref<StebPeriod>;
    gyvunas: Ref<string | null>;
    faktas: Ref<string | null>;
    sav: Ref<number | null>;
    tableOpen: Ref<boolean>;
    table: Ref<StebTableId>;
    selection: Ref<StebSelection | null>;
    /** A record to centre on (table "Rodyti žemėlapyje"); `seq` makes repeats count. */
    zoomRequest: Ref<{ key: string; seq: number } | null>;
    /** Bumped when the user picks a place: the map fits the filtered points. */
    fitRequest: Ref<number>;
    setPeriod(period: StebPeriod): void;
    setSpecies(slug: string | null): void;
    setFact(slug: string | null): void;
    setPlace(code: number | null): void;
    /** Open (on `table` when it is one of the tables) or close the table. */
    setTable(open: boolean, table?: string | null): void;
    reset(): void;
    select(keys: string[], opts?: { zoom?: boolean }): void;
    clearSelection(): void;
    linkOf(record: StebRecord): string | null;
  };
  derived: {
    /** Data loaded and, with a place filter, meta settled. */
    ready: ComputedRef<boolean>;
    records: ComputedRef<StebRecord[]>;
    filtered: ComputedRef<StebRecord[]>;
    answer: ComputedRef<StebAnswer>;
    sentence: ComputedRef<string>;
    periodLabel: ComputedRef<string>;
    speciesLabel: ComputedRef<string>;
    factLabel: ComputedRef<string>;
    placeLabel: ComputedRef<string>;
    speciesOptions: ComputedRef<StebOption[]>;
    factOptions: ComputedRef<StebOption[]>;
    placeOptions: ComputedRef<StebPlace[]>;
    withoutPoint: ComputedRef<number>;
    /** Species, fact and place filters set (the mobile "Filtrai (n)"). */
    activeCount: ComputedRef<number>;
    isDefault: ComputedRef<boolean>;
    years: ComputedRef<number[]>;
    seasons: ComputedRef<number[]>;
  };
}

export const STEB_CTX: InjectionKey<StebContext> = Symbol('huntingStebejimai');

const queryString = (query: Query, key: string) => {
  const value = query[key];
  return typeof value === 'string' ? value : undefined;
};
const parseGyvunas = (value: unknown) =>
  typeof value === 'string' && STEB_GYVUNAS_RE.test(value) ? value : null;
const parseFaktas = (value: unknown) =>
  typeof value === 'string' && STEB_FAKTAS_RE.test(value) ? value : null;
const parseSavKey = (value: unknown) =>
  typeof value === 'string' && /^\d{1,3}$/.test(value) ? Number(value) : null;
const parseTable = (value: unknown): StebTableId | null =>
  typeof value === 'string' && STEB_TABLES.indexOf(value) >= 0 ? (value as StebTableId) : null;

const PERIOD_KEYS = ['nuo', 'iki', 'laikotarpis', 'sezonas'];

export function useStebState(opts: {
  hub: HubContext | null;
  data: StebData;
  today: string;
  embed: boolean;
  debug: boolean;
  isProductionHost: boolean;
  isMobile: Ref<boolean>;
  parentOrigin: string | null;
  hostname: string;
}): StebContext {
  const { hub, data, today } = opts;
  const route = useRoute();
  const router = useRouter();
  const routePath = route.path;

  // ---- URL → state (§3.3).
  const initial = route.query as Query;
  const period = ref<StebPeriod>(parsePeriod(initial, today));
  const gyvunas = ref<string | null>(parseGyvunas(initial.gyvunas));
  const faktas = ref<string | null>(parseFaktas(initial.faktas));
  const sav = ref<number | null>(parseSavKey(initial.sav));
  const initialTable = parseTable(initial.lentele);
  const tableOpen = ref(initialTable !== null);
  const table = ref<StebTableId>(initialTable || STEB_DEFAULT_TABLE);
  const selection = ref<StebSelection | null>(null);
  const zoomRequest = ref<{ key: string; seq: number } | null>(null);
  const fitRequest = ref(0);

  // Late route changes are adopted until the first own write or user filter change; only
  // the keys that changed are applied, so an x/y/z write never resets a filter.
  let adopting = true;
  let previousQuery: LocationQuery = { ...route.query };
  watch(
    () => route.query,
    (query) => {
      const previous = previousQuery;
      previousQuery = { ...query };
      if (!adopting || route.path !== routePath) return;
      if (queryString(query, 'tema') !== TOPIC_ID) return;
      const changed = (key: string) => queryString(query, key) !== queryString(previous, key);
      if (PERIOD_KEYS.some(changed)) {
        const next = parsePeriod(query, today);
        if (!samePeriod(next, period.value)) period.value = next;
      }
      if (changed('gyvunas')) gyvunas.value = parseGyvunas(query.gyvunas);
      if (changed('faktas')) faktas.value = parseFaktas(query.faktas);
      if (changed('sav')) sav.value = parseSavKey(query.sav);
      if (changed('lentele')) {
        const t = parseTable(query.lentele);
        if (t) table.value = t;
        tableOpen.value = t !== null;
      }
    },
  );

  // ---- Meta: municipality names and codes (from the hub's snapshot meta).
  const metaFailed = ref(false);
  const metaMunicipalities = computed(() => hub?.data.snapshot.value?.meta?.municipalities || null);
  const metaStatus = computed<MetaStatus>(() => {
    if (metaMunicipalities.value) return 'ready';
    if (!hub || metaFailed.value || hub.data.phase.value === 'error') return 'failed';
    return 'pending';
  });
  if (hub && !opts.isProductionHost) {
    hub.data.ensure(['meta']).catch((err) => {
      metaFailed.value = true;
      // eslint-disable-next-line no-console
      console.warn('[hunting/hub] meta load failed', err);
    });
  }
  const codeByName = computed(() => {
    const map = new Map<string, number>();
    (metaMunicipalities.value || []).forEach((m) => map.set(m.name.trim(), m.code));
    return map;
  });
  const nameByCode = computed(() => {
    const map = new Map<number, string>();
    (metaMunicipalities.value || []).forEach((m) => map.set(m.code, m.name));
    return map;
  });
  const codeOf: MuniCodeOf = (name) => (name ? (codeByName.value.get(name.trim()) ?? null) : null);
  const nameOf = (code: number) => nameByCode.value.get(code) ?? null;

  // ---- Derived.
  const records = computed(() => data.records.value);
  const filtersNow = () => ({
    period: period.value,
    gyvunas: gyvunas.value,
    faktas: faktas.value,
    sav: sav.value,
  });
  const filtered = computed(() => filterRecords(records.value, filtersNow(), today, codeOf));
  const ready = computed(
    () => data.phase.value === 'ready' && (sav.value === null || metaStatus.value !== 'pending'),
  );
  const answer = computed(() => answerText(filtered.value, period.value, today));

  // Options with the count of rows under the other active filters (§3.3).
  function options(
    field: 'speciesSlug' | 'factSlug',
    label: 'species' | 'fact',
    others: ReturnType<typeof filtersNow>,
  ): StebOption[] {
    const under = filterRecords(records.value, others, today, codeOf);
    const counts = new Map<string, number>();
    under.forEach((r) => counts.set(r[field], (counts.get(r[field]) || 0) + 1));
    const seen = new Map<string, StebOption>();
    records.value.forEach((r) => {
      const key = r[field];
      if (seen.has(key)) return;
      const text = key === NOT_SET_SLUG ? NOT_SET_LABEL : r[label] || NOT_SET_LABEL;
      seen.set(key, { key, label: text, n: 0 });
    });
    const list = Array.from(seen.values()).map((o) => ({ ...o, n: counts.get(o.key) || 0 }));
    // A value from the URL that no loaded row has stays listed until validation drops it.
    return list;
  }
  const speciesOptions = computed(() =>
    options('speciesSlug', 'species', { ...filtersNow(), gyvunas: null }).sort(compareSpecies),
  );
  const factOptions = computed(() =>
    options('factSlug', 'fact', { ...filtersNow(), faktas: null }).sort((a, b) => {
      const missing = Number(a.key === NOT_SET_SLUG) - Number(b.key === NOT_SET_SLUG);
      return missing || compareLt(a.label, b.label);
    }),
  );
  const placeOptions = computed<StebPlace[]>(() => {
    const byCode = new Map<number, StebPlace>();
    records.value.forEach((r) => {
      const code = codeOf(r.municipality);
      if (code === null || byCode.has(code)) return;
      byCode.set(code, { code, name: nameOf(code) || r.municipality || `${code}` });
    });
    const current = sav.value;
    if (current !== null && !byCode.has(current) && nameOf(current)) {
      byCode.set(current, { code: current, name: nameOf(current)! });
    }
    return Array.from(byCode.values()).sort((a, b) => compareLt(a.name, b.name));
  });

  const periodLabel = computed(() => labelOfPeriod(period.value, today));
  const optionLabel = (list: StebOption[], key: string | null) =>
    key === null ? null : list.find((o) => o.key === key)?.label || key;
  const speciesLabel = computed(
    () => optionLabel(speciesOptions.value, gyvunas.value) || SS.allSpeciesLower,
  );
  const factLabel = computed(
    () => optionLabel(factOptions.value, faktas.value) || SS.allFactsLower,
  );
  const placeLabel = computed(() => {
    if (sav.value === null) return SS.allPlacesLower;
    return nameOf(sav.value) || `savivaldybė ${sav.value}`;
  });
  const sentence = computed(() =>
    SS.sentence(periodLabel.value, speciesLabel.value, factLabel.value, placeLabel.value),
  );
  const withoutPoint = computed(() => filtered.value.filter((r) => r.x === null).length);
  const activeCount = computed(
    () =>
      Number(gyvunas.value !== null) + Number(faktas.value !== null) + Number(sav.value !== null),
  );
  const isDefault = computed(() => period.value.kind === 'all' && activeCount.value === 0);

  // Years and seasons offered by the period picker: from the oldest record (not before
  // 2017) to today (§3.3).
  const oldestYear = computed(() => {
    let oldest = '';
    for (const r of records.value) if (r.day && (!oldest || r.day < oldest)) oldest = r.day;
    const thisYear = Number(today.slice(0, 4));
    return oldest ? Math.min(thisYear, Math.max(2017, Number(oldest.slice(0, 4)))) : thisYear;
  });
  const years = computed(() => {
    const list: number[] = [];
    for (let y = Number(today.slice(0, 4)); y >= oldestYear.value; y--) list.push(y);
    return list;
  });
  const seasons = computed(() => {
    const current = seasonOfDay(today);
    const first = Math.max(
      FIRST_SEASON,
      Math.min(current, seasonOfDay(`${oldestYear.value}-01-01`)),
    );
    const list: number[] = [];
    for (let s = current; s >= first; s--) list.push(s);
    const p = period.value;
    if (p.kind === 'season' && list.indexOf(p.season) < 0) list.push(p.season);
    return list;
  });

  // ---- Setters. A filter change by the user ends the adoption of late URL changes.
  const touch = () => {
    adopting = false;
  };
  function setPeriod(next: StebPeriod) {
    touch();
    if (!samePeriod(next, period.value)) period.value = next;
  }
  function setSpecies(slug: string | null) {
    touch();
    gyvunas.value = slug !== null && STEB_GYVUNAS_RE.test(slug) ? slug : null;
  }
  function setFact(slug: string | null) {
    touch();
    faktas.value = slug !== null && STEB_FAKTAS_RE.test(slug) ? slug : null;
  }
  function setPlace(code: number | null) {
    touch();
    sav.value = code !== null && Number.isInteger(code) ? code : null;
    fitRequest.value++;
  }
  function setTable(open: boolean, pick?: string | null) {
    const t = parseTable(pick);
    if (open && t) table.value = t;
    tableOpen.value = open;
  }
  function reset() {
    touch();
    period.value = { kind: 'all' };
    gyvunas.value = null;
    faktas.value = null;
    if (sav.value !== null) fitRequest.value++;
    sav.value = null;
  }
  function select(keys: string[], selectOpts: { zoom?: boolean } = {}) {
    if (!keys.length) return;
    selection.value = { keys, index: 0 };
    if (selectOpts.zoom)
      zoomRequest.value = { key: keys[0], seq: (zoomRequest.value?.seq || 0) + 1 };
  }
  function clearSelection() {
    selection.value = null;
  }
  const linkOf = (record: StebRecord) => recordPageUrl(record.id, opts.parentOrigin, opts.hostname);

  // A filter change that removes the shown record closes the card (§3.3).
  watch(filtered, (list) => {
    const sel = selection.value;
    const current = sel?.keys[sel.index];
    if (current && !list.some((r) => r.key === current)) selection.value = null;
  });

  // The error state has no table (`hasTable` false, §3.9).
  watch(
    () => data.phase.value,
    (phase) => {
      if (phase === 'error') tableOpen.value = false;
    },
  );

  // ---- State → URL (§3.3).
  const ownQuery = (): Record<string, string> => {
    const out: Record<string, string> = { ...periodQuery(period.value) };
    if (gyvunas.value !== null) out.gyvunas = gyvunas.value;
    if (faktas.value !== null) out.faktas = faktas.value;
    if (sav.value !== null) out.sav = String(sav.value);
    if (tableOpen.value) out.lentele = table.value;
    return out;
  };
  const signature = (query: Query) =>
    STEB_URL_KEYS.map((key) => `${key}=${queryString(query, key) ?? ''}`).join('&');

  let urlTimer: ReturnType<typeof setTimeout> | undefined;
  function writeUrl() {
    urlTimer = undefined;
    // Never on another route or after a switch to another topic.
    if (route.path !== routePath || queryString(route.query, 'tema') !== TOPIC_ID) return;
    const own = ownQuery();
    if (signature(route.query) === signature(own)) return;
    adopting = false;
    const query: LocationQuery = {
      ...keptQuery(route.query, [...STEB_URL_KEYS]),
      tema: TOPIC_ID,
      ...own,
    };
    router.replace({ query });
  }
  function scheduleWrite() {
    clearTimeout(urlTimer);
    urlTimer = setTimeout(writeUrl, URL_DEBOUNCE_MS);
  }
  watch([period, gyvunas, faktas, sav, tableOpen, table], scheduleWrite);
  onScopeDispose(() => clearTimeout(urlTimer));

  // ---- Validation after the data (and meta) load: values no loaded row or meta knows are
  // dropped with one replace write; a known place with no rows stays (§3.3).
  watch(
    [() => data.phase.value, metaStatus, () => data.records.value],
    ([phase, status]) => {
      if (phase !== 'ready') return;
      const slugs = (field: 'speciesSlug' | 'factSlug') =>
        new Set(records.value.map((r) => r[field]));
      if (gyvunas.value !== null && !slugs('speciesSlug').has(gyvunas.value)) gyvunas.value = null;
      if (faktas.value !== null && !slugs('factSlug').has(faktas.value)) faktas.value = null;
      if (sav.value !== null && status !== 'pending') {
        if (status === 'failed' || !nameByCode.value.has(sav.value)) sav.value = null;
      }
      if (status !== 'pending') scheduleWrite();
    },
    { immediate: true },
  );

  return {
    today,
    embed: opts.embed,
    debug: opts.debug,
    isProductionHost: opts.isProductionHost,
    isMobile: opts.isMobile,
    hub,
    data,
    meta: { status: metaStatus, codeOf, nameOf },
    state: {
      period,
      gyvunas,
      faktas,
      sav,
      tableOpen,
      table,
      selection,
      zoomRequest,
      fitRequest,
      setPeriod,
      setSpecies,
      setFact,
      setPlace,
      setTable,
      reset,
      select,
      clearSelection,
      linkOf,
    },
    derived: {
      ready,
      records,
      filtered,
      answer,
      sentence,
      periodLabel,
      speciesLabel,
      factLabel,
      placeLabel,
      speciesOptions,
      factOptions,
      placeOptions,
      withoutPoint,
      activeCount,
      isDefault,
      years,
      seasons,
    },
  };
}
