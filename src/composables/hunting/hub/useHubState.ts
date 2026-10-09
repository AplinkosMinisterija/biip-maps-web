// State of the hunting data hub (SPEC2 §2.3, §8.3, §8.6): parses the URL into the
// selection, validates it once meta and the topic's files are loaded, writes it back
// (topic and place with router.push, everything else with a debounced router.replace,
// never a default value), loads the topic's snapshot files and builds its view.
// While the live Vilkai topic is shown, the wolves state owns the URL; the hub writes only
// `tema` and mirrors `sezonas`, `sav`, `lentele` read-only.
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { useRoute, useRouter, type LocationQuery } from 'vue-router';
import { useMediaQuery, useWindowSize } from '@vueuse/core';
import type { HubContext, LiveMap } from '@/composables/hunting/hub/context';
import { useSnapshot } from '@/composables/hunting/hub/useSnapshot';
import { seasonLabel, seasonOfDay, todayVilnius } from '@/utils/hunting/dates';
import { isRailed, mapPadding } from '@/utils/hunting/hub/layout';
import { S } from '@/utils/hunting/hub/strings';
import { parseSeasonKey, seasonKey } from '@/utils/hunting/hub/time';
import { DEFAULT_TOPIC, TOPICS, getTopic, hasTopic } from '@/utils/hunting/hub/topics';
import {
  DIM_KEYS,
  WOLVES_TABLES,
  keptQuery,
  parseSav,
  queryString,
  querySignature,
  wolvesCarry,
  type SeasonCarry,
} from '@/utils/hunting/hub/url';
import type {
  HubSelection,
  Meta,
  SnapshotData,
  TopicDef,
  TopicId,
  TopicView,
} from '@/utils/hunting/hub/types';

export const URL_DEBOUNCE_MS = 300;
export const PRODUCTION_HOST = 'maps.biip.lt';
export const STAGING_HOST = 'staging-maps.biip.lt';

// Where an explicit season came from: the URL, the user, or a topic switch (§3.4 notices).
type SeasonOrigin = 'url' | 'user' | 'carry' | 'carryRange';

// Every dim key any topic declares (plus the spec's), so a topic switch drops them all.
const allDimKeys = () =>
  Array.from(
    new Set([
      ...DIM_KEYS,
      ...TOPICS.reduce<string[]>((keys, t) => {
        t.dims.forEach((d) => keys.push(d.key));
        return keys;
      }, []),
    ]),
  );

const hasFiles = (data: SnapshotData | null, topic: TopicDef) =>
  !!data && topic.files.every((f) => f === 'meta' || (data as any)[f] !== undefined);

export interface HubStateOptions {
  today?: string; // Vilnius day; defaults to the real one
  openAbout?: (topic?: TopicId) => void; // the shell's About dialog
}

export function useHubState(opts: HubStateOptions = {}): HubContext {
  const route = useRoute();
  const router = useRouter();
  const routePath = route.path;
  const today = opts.today || todayVilnius();
  const hostname = window.location.hostname;
  const isProductionHost = hostname === PRODUCTION_HOST;
  const isStagingHost = hostname === STAGING_HOST;
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isWide = useMediaQuery('(min-width: 1280px)');
  const { width } = useWindowSize();
  const debug = queryString(route.query, 'debug') === '1';
  const dimKeys = allDimKeys();

  // ---- Choices (unvalidated until meta / the topic's files are loaded).
  const topicId = ref<TopicId>(DEFAULT_TOPIC);
  const seasonPick = ref<number | null>(null);
  let seasonOrigin: SeasonOrigin = 'url';
  const savPick = ref<number | null>(null);
  const dimPicks = ref<Record<string, string>>({});
  const tablePick = ref<string | null>(null);
  const notice = ref<string | null>(null);
  // Read the URL before anything loads, so only the requested topic's files are fetched.
  applyQuery(route.query);

  const topic = computed(() => getTopic(topicId.value));
  const isLive = () => topic.value.kind === 'live';
  const isOverview = () => topic.value.kind === 'overview';

  const data = useSnapshot({ primary: () => topic.value.files });
  const meta = computed<Meta | null>(() => data.snapshot.value?.meta || null);
  const filesReady = computed(() => hasFiles(data.snapshot.value, topic.value));

  // ---- Effective selection.
  const offered = computed(() => (meta.value ? topic.value.seasons(meta.value) : []));
  const defaultSeason = computed(() =>
    meta.value ? topic.value.defaultSeason(meta.value, today) : seasonOfDay(today),
  );
  const season = computed(() => {
    const pick = seasonPick.value;
    if (isOverview()) return defaultSeason.value;
    if (pick === null) return defaultSeason.value;
    if (isLive() || !meta.value) return pick;
    return offered.value.indexOf(pick) >= 0 ? pick : defaultSeason.value;
  });
  const validSav = (code: number | null) =>
    code === null || !meta.value || meta.value.municipalities.some((m) => m.code === code);
  const sav = computed(() => {
    if (isOverview()) return null;
    return validSav(savPick.value) ? savPick.value : null;
  });

  const baseSel = computed<HubSelection>(() => ({
    topic: topic.value.id,
    season: season.value,
    sav: sav.value,
    dims: {},
    table: null,
  }));

  // Dim values: defaults, overridden by valid picks. Options need the topic's files.
  const dimDefaults = computed(() => {
    const out: Record<string, string> = {};
    if (!meta.value) return out;
    topic.value.dims.forEach((d) => (out[d.key] = d.default(baseSel.value, meta.value!)));
    return out;
  });
  const dimValid = (key: string, value: string) => {
    const dim = topic.value.dims.find((d) => d.key === key);
    if (!dim) return false;
    if (!filesReady.value) return true; // provisional until the data is there
    const sel = { ...baseSel.value, dims: { ...dimDefaults.value } };
    return dim.options(data.snapshot.value!, sel).some((o) => o.value === value);
  };
  const dims = computed(() => {
    const out = { ...dimDefaults.value };
    Object.keys(dimPicks.value).forEach((key) => {
      if (dimValid(key, dimPicks.value[key])) out[key] = dimPicks.value[key];
    });
    return out;
  });

  const sel = computed<HubSelection>(() => ({
    ...baseSel.value,
    dims: dims.value,
    table: isOverview() ? null : tableOf(),
  }));

  // The view does not depend on the open table (`sel.table` is null inside `view()`), so
  // `tableOf` can validate the table against the view's tables without a cycle.
  const view = computed<TopicView | null>(() => {
    const t = topic.value;
    if (t.kind !== 'snapshot' || !t.view || !meta.value || !filesReady.value) return null;
    try {
      return t.view(data.snapshot.value!, { ...baseSel.value, dims: dims.value, table: null });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[hunting/hub] ${t.id}.view() failed`, err);
      return null;
    }
  });
  function tableOf() {
    const pick = tablePick.value;
    if (pick === null) return null;
    if (isLive()) return WOLVES_TABLES.indexOf(pick) >= 0 ? pick : null;
    const v = view.value;
    if (!v) return pick;
    return v.tables.some((t) => t.id === pick) ? pick : null;
  }

  // ---- Layout.
  const tableOpen = computed(() => sel.value.table !== null);
  const railed = computed(() => isRailed(width.value, tableOpen.value));
  const padding = computed(() => mapPadding(width.value, tableOpen.value));

  // ---- URL → state.
  function applyQuery(query: LocationQuery) {
    const tema = queryString(query, 'tema');
    topicId.value = hasTopic(tema) ? tema : DEFAULT_TOPIC;
    const live = getTopic(topicId.value).kind === 'live';
    const overview = getTopic(topicId.value).kind === 'overview';
    seasonPick.value = overview ? null : parseSeasonKey(queryString(query, 'sezonas'));
    seasonOrigin = 'url';
    savPick.value = overview ? null : parseSav(queryString(query, 'sav'));
    const lentele = queryString(query, 'lentele');
    tablePick.value = overview || !lentele ? null : lentele;
    const picks: Record<string, string> = {};
    if (!live && !overview) {
      getTopic(topicId.value).dims.forEach((d) => {
        const value = queryString(query, d.key);
        if (value) picks[d.key] = value;
      });
    }
    dimPicks.value = picks;
    notice.value = null;
  }

  // ---- State → URL.
  const hubSignatureKeys = () =>
    isLive()
      ? ['tema']
      : ['tema', 'sezonas', 'sav', 'lentele', ...topic.value.dims.map((d) => d.key)];

  function urlQuery(explicit = false): Record<string, string> {
    const out: Record<string, string> = {};
    const id = topic.value.id;
    if (id !== DEFAULT_TOPIC && id !== 'apzvalga') out.tema = id;
    if (isOverview()) return out;
    if (explicit || season.value !== defaultSeason.value) out.sezonas = seasonKey(season.value);
    if (sav.value !== null) out.sav = String(sav.value);
    topic.value.dims.forEach((d) => {
      const value = dims.value[d.key];
      if (value !== undefined && value !== dimDefaults.value[d.key]) out[d.key] = value;
    });
    if (sel.value.table) out.lentele = sel.value.table;
    return out;
  }

  const fullQuery = (explicit = false): LocationQuery => ({
    ...keptQuery(route.query, dimKeys),
    ...urlQuery(explicit),
  });

  let lastSignature = '';
  let urlTimer: ReturnType<typeof setTimeout> | undefined;

  function write(mode: 'push' | 'replace', query: LocationQuery) {
    clearTimeout(urlTimer);
    urlTimer = undefined;
    // Never write hub keys onto another route (a change just before leaving).
    if (route.path !== routePath) return;
    lastSignature = querySignature(query, hubSignatureKeys());
    router[mode]({ query });
  }

  const pushNow = () => write('push', fullQuery());
  function scheduleReplace() {
    if (isLive()) return; // the wolves state writes its own keys
    clearTimeout(urlTimer);
    urlTimer = setTimeout(() => write('replace', fullQuery()), URL_DEBOUNCE_MS);
  }

  // Back/forward or a link: re-read the hub keys when they differ from what we wrote.
  let previousQuery: LocationQuery = { ...route.query };
  watch(
    () => route.query,
    (query) => {
      if (route.path !== routePath) return;
      const previous = previousQuery;
      previousQuery = { ...query };
      const tema = queryString(query, 'tema');
      const sameTopic = (hasTopic(tema) ? tema : DEFAULT_TOPIC) === topicId.value;
      if (sameTopic && isLive()) {
        // Mirror the wolves keys, only when they change (x/y/z writes must not reset them).
        const changed = (key: string) => queryString(query, key) !== queryString(previous, key);
        if (changed('sezonas')) seasonPick.value = parseSeasonKey(queryString(query, 'sezonas'));
        if (changed('sav')) savPick.value = parseSav(queryString(query, 'sav'));
        if (changed('lentele')) tablePick.value = queryString(query, 'lentele') || null;
        return;
      }
      if (urlTimer) {
        // A map x/y/z write leaves the hub keys as they were: our pending write still wins.
        // Back/forward or a link changed them: the URL wins and the pending write is dropped.
        if (
          querySignature(query, hubSignatureKeys()) === querySignature(previous, hubSignatureKeys())
        )
          return;
        clearTimeout(urlTimer);
        urlTimer = undefined;
      }
      if (sameTopic && querySignature(query, hubSignatureKeys()) === lastSignature) return;
      applyQuery(query);
      lastSignature = querySignature(query, hubSignatureKeys());
    },
  );

  // ---- Validation once data is there: drop invalid picks silently, notices for carries.
  function validateSeason() {
    if (!meta.value || isLive() || isOverview()) return false;
    const pick = seasonPick.value;
    if (pick === null) return false;
    const label = seasonLabel(pick);
    const ok = offered.value.indexOf(pick) >= 0;
    if (seasonOrigin === 'carryRange' || (seasonOrigin === 'carry' && !ok)) {
      notice.value = ok
        ? S.noticeSeasonOnly(label)
        : S.noticeSeasonMissing(topic.value.tab, label, seasonLabel(defaultSeason.value));
    }
    if (seasonOrigin === 'carry' || seasonOrigin === 'carryRange') seasonOrigin = 'url';
    if (!ok) {
      seasonPick.value = null;
      return true;
    }
    return false;
  }

  function validatePicks() {
    if (isLive()) return;
    let dropped = validateSeason();
    if (meta.value && !validSav(savPick.value)) {
      savPick.value = null;
      dropped = true;
    }
    if (filesReady.value) {
      const picks = { ...dimPicks.value };
      Object.keys(picks).forEach((key) => {
        if (!dimValid(key, picks[key])) {
          delete picks[key];
          dropped = true;
        }
      });
      if (dropped) dimPicks.value = picks;
    }
    if (view.value && tablePick.value !== null && tableOf() === null) {
      tablePick.value = null;
      dropped = true;
    }
    if (dropped && route.path === routePath) scheduleReplace();
  }
  watch([meta, topicId, filesReady, view], validatePicks);

  // ---- Loading: the visible topic's files (§8.3). Production makes no data requests.
  if (!isProductionHost) {
    watch(
      topic,
      (t) => {
        data.ensure(t.files);
      },
      { immediate: true },
    );
  }

  // ---- Setters.
  function carryFromCurrent(): SeasonCarry | null {
    if (isOverview()) return null;
    if (isLive()) {
      const fromUrl = wolvesCarry(route.query, today);
      if (fromUrl) return fromUrl;
      return seasonPick.value !== null ? { season: seasonPick.value, fromRange: false } : null;
    }
    // Only an explicit choice travels; an untouched topic leaves the target its default.
    if (seasonPick.value === null || season.value === defaultSeason.value) return null;
    return { season: season.value, fromRange: false };
  }

  function setTopic(id: TopicId) {
    const target = hasTopic(id) ? id : DEFAULT_TOPIC;
    if (target === topicId.value) return;
    const carry = carryFromCurrent();
    const carriedSav = isOverview() ? null : sav.value;
    const targetDef = getTopic(target);
    topicId.value = target;
    dimPicks.value = {};
    tablePick.value = null;
    notice.value = null;
    const overview = targetDef.kind === 'overview';
    savPick.value = overview ? null : carriedSav;
    seasonPick.value = overview || !carry ? null : carry.season;
    seasonOrigin = carry?.fromRange ? 'carryRange' : 'carry';
    if (targetDef.kind === 'live') {
      // The wolves state reads these on mount and owns them from then on.
      const query: LocationQuery = { ...keptQuery(route.query, dimKeys) };
      if (target !== DEFAULT_TOPIC) query.tema = target;
      if (carriedSav !== null) query.sav = String(carriedSav);
      if (carry) query.sezonas = seasonKey(carry.season);
      write('push', query);
      previousQuery = { ...query };
      return;
    }
    validateSeason();
    pushNow();
  }

  function setSeason(s: number) {
    if (!Number.isInteger(s)) return;
    if (!isLive() && meta.value && offered.value.indexOf(s) < 0) return;
    seasonPick.value = s;
    seasonOrigin = 'user';
    notice.value = null;
    scheduleReplace();
  }

  function setSav(code: number | null) {
    if (isOverview()) return;
    if (code !== null && (!Number.isInteger(code) || !validSav(code))) return;
    savPick.value = code;
    if (!isLive()) pushNow();
  }

  function setDim(key: string, value: string | null) {
    if (!topic.value.dims.some((d) => d.key === key)) return;
    const picks = { ...dimPicks.value };
    if (value === null || value === dimDefaults.value[key]) delete picks[key];
    else if (dimValid(key, value)) picks[key] = value;
    else return;
    dimPicks.value = picks;
    scheduleReplace();
  }

  function setTable(tab: string | null) {
    if (isOverview()) return;
    tablePick.value = tab;
    scheduleReplace();
  }

  // Absolute link for "Dalintis": the period always explicit (§2.3), except on Apžvalga.
  const shareUrl = () => {
    const query = isLive() ? route.query : fullQuery(true);
    return new URL(router.resolve({ path: routePath, query }).href, window.location.href).href;
  };

  const openAbout = (id?: TopicId) => opts.openAbout?.(id ?? topicId.value);

  const liveMap = shallowRef<LiveMap | null>(null);

  lastSignature = querySignature(route.query, hubSignatureKeys());
  onScopeDispose(() => clearTimeout(urlTimer));

  return {
    today,
    isProductionHost,
    isStagingHost,
    isMobile,
    isWide,
    debug,
    sel,
    topic,
    data,
    view,
    notice,
    liveMap,
    layout: { railed, mapPadding: padding },
    setTopic,
    setSeason,
    setSav,
    setDim,
    setTable,
    shareUrl,
    openAbout,
  };
}
