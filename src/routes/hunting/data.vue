<template>
  <div
    class="hunting-hub font-hub"
    :class="{
      'hunting-hub--mobile': isMobile,
      'hunting-hub--desktop': !isMobile && !isProductionHost,
      'hunting-hub--rail': railed && !isMobile,
      'hunting-hub--drawer': drawerOpen,
      'hunting-hub--overview': topicKind === 'overview',
      'hunting-hub--embed': embed,
    }"
    :style="cssVars"
  >
    <HuntingWolvesProductionGate v-if="isProductionHost" />

    <template v-else-if="ctx">
      <!-- The answer, announced once per change (§10). -->
      <p class="sr-only" aria-live="polite">{{ announced }}</p>

      <!-- Desktop and tablet (≥ 768 px): top bar, filter bar, floating panel (§4.1, §4.2).
           Embedded in the WP page, the page renders the title, topics and view switch. -->
      <template v-if="!isMobile">
        <HuntingHubShellTopBar v-if="!embed" />
        <!-- Apžvalga has no filters (D8): no bar with a dead season pill. -->
        <HuntingHubShellFilterBar v-if="topicKind !== 'overview'" />

        <template v-if="topicKind === 'snapshot'">
          <HuntingHubShellPanelFrame
            :railed="railed"
            :rail-title="railTitle"
            :rail-value="railValue"
          >
            <HuntingHubShellTopicPanel />
          </HuntingHubShellPanelFrame>

          <!-- Table: drawer ≥ 1280 px, replaces the map 768–1279 px; it positions itself and
               shows while `lentele` is set. -->
          <component :is="T4.tableView" v-if="T4.tableView" />

          <div
            v-if="sav !== null && T4.areaCard && !mapHidden"
            role="complementary"
            class="hub-card absolute z-30"
          >
            <component :is="T4.areaCard" :topics="topicList" focus-on-open />
          </div>
          <div v-if="T4.legend && !mapHidden" class="hub-legend absolute z-20">
            <component :is="T4.legend" />
          </div>
          <component :is="T4.mapMessage" v-if="T4.mapMessage && isMapMessage && !mapHidden" />
          <component :is="T4.mapTooltip" v-if="T4.mapTooltip && !mapHidden" />
        </template>
      </template>

      <!-- Mobile (< 768 px): header ≤ 108 px and a bottom sheet (§4.3). Embedded, the header
           keeps only the chip row, and the live topics (Vilkai, Stebėjimai) and Apžvalga (no
           filters, D8) need none of it. The header's "Filtrai" opens the sheet's full-screen
           filters. -->
      <template v-else>
        <HuntingHubShellMobileHeader
          v-if="!(embed && (topicKind === 'live' || topicKind === 'overview'))"
          @filters="sheet?.openFilters()"
        />
        <template v-if="topicKind === 'snapshot'">
          <HuntingHubShellMobileSheet
            ref="sheet"
            :topics="topicList"
            @detent="(detent: string) => (sheetFull = detent === 'full')"
          />
          <!-- Not under the full sheet: its buttons would take focus behind it. -->
          <component :is="T4.mapMessage" v-if="T4.mapMessage && isMapMessage && !sheetFull" />
        </template>
      </template>

      <!-- Live topic (Vilkai, Stebėjimai; LIVE_HOSTS): the host renders its own panel, table,
           card and controls, and may teleport its chips into the shell slots (HUB_SLOTS).
           Keyed by topic, so a switch between two live topics always replaces the host. -->
      <component :is="liveHost" v-if="topicKind === 'live' && liveHost" :key="liveHostKey" />
      <!-- The live topic's snapshot fallback map (Vilkai without /wolfs): legend and tooltip. -->
      <template v-if="topicKind === 'live' && ctx.liveMap.value && !isMobile">
        <div v-if="T4.legend" class="hub-legend absolute z-20">
          <component :is="T4.legend" />
        </div>
        <component :is="T4.mapTooltip" v-if="T4.mapTooltip" />
      </template>

      <HuntingHubShellOverviewCards
        v-if="topicKind === 'overview'"
        :topics="topics"
        :large="isMobile"
      />

      <HuntingHubShellAboutDialog ref="about" :topics="topics" />
    </template>

    <!-- Last in the DOM so keyboard users reach the panel before the map controls. -->
    <UiMap
      :show-scale-line="true"
      :projection="projection3857"
      :class="{ invisible: mapHidden }"
      :aria-hidden="topicKind === 'overview' ? 'true' : undefined"
      :inert="topicKind === 'overview' ? true : undefined"
    />
  </div>
</template>

<script setup lang="ts">
// The site's fonts (medziokle.biip.lt): Noto Sans for text and controls, Atkinson
// Hyperlegible for headline numbers (the home page counters). Self-hosted, latin-ext included.
import '@fontsource/noto-sans/400.css';
import '@fontsource/noto-sans/500.css';
import '@fontsource/noto-sans/600.css';
import '@fontsource/noto-sans/700.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import {
  computed,
  getCurrentInstance,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  toRaw,
  watch,
} from 'vue';
import { useRoute } from 'vue-router';
import { useWindowSize, watchDebounced } from '@vueuse/core';
import { projection3857, vectorPositron } from '@/utils';
import { HUB_CTX, type AboutOpenOptions, type HubContext } from '@/composables/hunting/hub/context';
import type { TopicDef, TopicId } from '@/utils/hunting/hub/types';
import {
  HUB_TOP_EMBED,
  hubCssVars,
  hubTop,
  MOBILE_MAX,
  mobileHeader,
  tableReplacesMap,
} from '@/utils/hunting/hub/layout';
import { embedFocusAllowed } from '@/utils/hunting/hub/embed';
import { S, TOPIC_ORDER, TOPIC_SUBTITLES, TOPIC_TABS } from '@/utils/hunting/hub/strings';
import { seasonOfDay } from '@/utils/hunting/dates';
import { useHubState } from '@/composables/hunting/hub/useHubState';
import { LIVE_HOSTS, TOPICS } from '@/utils/hunting/hub/topics';
import { HUB_SHELL, type HubShell } from '@/components/hunting/hub/shell/shell';

const mapLayers: any = inject('mapLayers');
const route = useRoute();

// Until the PO signs off, production shows only a notice and makes no data requests (§2.1).
const hostname = window.location.hostname;
const isProductionHost = hostname === 'maps.biip.lt';

const { width } = useWindowSize();
const isMobile = computed(() => width.value <= MOBILE_MAX);

// ---- Topic registry. A topic whose module is not there yet gets a placeholder, so the shell
// still renders its tab (with the load error state). Topics with a live host are live.
const hasLiveHost = (id: TopicId) => typeof LIVE_HOSTS[id] === 'string';
function placeholderTopic(id: TopicId): TopicDef {
  return {
    id,
    tab: TOPIC_TABS[id],
    menuSubtitle: TOPIC_SUBTITLES[id],
    kind: id === 'apzvalga' ? 'overview' : hasLiveHost(id) ? 'live' : 'snapshot',
    files: id === 'apzvalga' ? ['meta', 'loots', 'limits', 'damages', 'wolves'] : ['meta'],
    seasons: (meta) => meta.seasons.map((s) => s.season).sort((a, b) => b - a),
    seasonState: () => 'galutinis',
    defaultSeason: (_meta, today) => seasonOfDay(today),
    dims: [],
    defaultTable: '',
    about: { source: [], meaning: [], missing: [], compare: [] },
  };
}

const found = Object.fromEntries(TOPICS.map((t) => [t.id, t])) as Partial<
  Record<TopicId, TopicDef>
>;
const topics = Object.fromEntries(
  TOPIC_ORDER.map((id) => [id, found[id] || placeholderTopic(id)]),
) as Record<TopicId, TopicDef>;
const topicList = TOPIC_ORDER.map((id) => topics[id]);

// ---- About dialog (opened through the context).
type AboutDialog = {
  open: (topic?: TopicId, opts?: AboutOpenOptions) => void;
  close: (byUser?: boolean) => void;
};
const about = ref<AboutDialog | null>(null);
const sheet = ref<{ openFilters(): void } | null>(null);
const sheetFull = ref(false);

const openAbout = (topic?: TopicId, opts?: AboutOpenOptions) => about.value?.open(topic, opts);
const closeAbout = () => about.value?.close(false);

const ctx: HubContext | null = isProductionHost ? null : useHubState({ openAbout, closeAbout });
// Embedded in the WP "Medžioklės duomenys" page (SPEC §5); never on the production host.
const embed = !!ctx?.embed;

// In embed, programmatic focus only while the iframe document has focus, and without
// scrolling the parent page (SPEC §5.8).
function focusElement(el: HTMLElement) {
  if (!embed) return el.focus();
  if (embedFocusAllowed(true)) el.focus({ preventScroll: true });
}

// ---- Shell services for live topic hosts (Vilkai, Stebėjimai).
const panelHeadingId = 'hub-title';
const shell: HubShell = {
  shareOverride: ref(null),
  width,
  focusHeading: () => {
    const el = document.getElementById(panelHeadingId);
    if (el) focusElement(el);
  },
};

if (ctx) {
  provide(HUB_CTX, ctx);
  provide(HUB_SHELL, shell);
}

// The base layer: the map's first 'loadend' clears App.vue's loading overlay, also behind
// the production gate (same pattern as wolves.vue).
if (!mapLayers.baseLayers?.some((l: any) => l?.id === vectorPositron.id)) {
  mapLayers.addBaseLayer(vectorPositron.id);
}

// Choropleth (T4, §8.5): one layer for the snapshot topics, hidden while a live topic or
// Apžvalga is active. Called here, after provide, when the composable is present.
const choroplethModules = import.meta.glob('@/composables/hunting/hub/useChoropleth.ts', {
  eager: true,
});
if (ctx) {
  Object.values(choroplethModules).forEach((mod: any) => mod?.useChoropleth?.(ctx));
}

// The WP embed bridge (T4, SPEC §5.4), loaded the same way: the build passes without it.
// It gets the local `shell`, because inject() does not see this component's own provide.
const bridgeModules = import.meta.glob('@/composables/hunting/hub/useEmbedBridge.ts', {
  eager: true,
});
if (ctx?.embed) {
  Object.values(bridgeModules).forEach((mod: any) => mod?.useEmbedBridge?.(ctx, shell));
}

// ---- Optional components of the other tasks, resolved by their global names.
const registered = getCurrentInstance()?.appContext.components || {};
const pick = (name: string) => (name in registered ? name : null);
const T4 = {
  tableView: pick('HuntingHubTableTableView'),
  areaCard: pick('HuntingHubMapAreaCard'),
  legend: pick('HuntingHubMapChoroplethLegend'),
  mapMessage: pick('HuntingHubMapMapMessage'),
  mapTooltip: pick('HuntingHubMapMapTooltip'),
};
// The selected live topic's host (LIVE_HOSTS); Vilkai also under its older component name.
// A live topic whose host is not registered (yet) shows only the shell.
const liveHost = computed(() => {
  const id = ctx?.sel.value.topic;
  if (!id || !hasLiveHost(id)) return null;
  return pick(LIVE_HOSTS[id]) || (id === 'vilkai' ? pick('HuntingHubTopicsVilkaiTopic') : null);
});
const liveHostKey = computed(() => ctx?.sel.value.topic ?? '');

// ---- Layout state.
const topicKind = computed(() => ctx?.topic.value.kind ?? 'overview');
const tableOpen = computed(() => !!ctx && ctx.sel.value.table !== null);
const sav = computed(() => ctx?.sel.value.sav ?? null);
const railed = computed(() => !!ctx && topicKind.value === 'snapshot' && ctx.layout.railed.value);
const drawerOpen = computed(() => railed.value);
const mapHidden = computed(
  () =>
    !isMobile.value &&
    topicKind.value === 'snapshot' &&
    tableReplacesMap(width.value, tableOpen.value, embed),
);
const isMapMessage = computed(() => ctx?.view.value?.map.kind === 'message');

const railTitle = computed(() => (ctx ? TOPIC_TABS[ctx.sel.value.topic] : ''));
const railValue = computed(() => ctx?.view.value?.kpis[0]?.value || '');

// Apžvalga starts right under what is above it: nothing when embedded (the WP bar is outside
// the frame), the top bar (desktop) or the mobile header standalone. No filter bar (D8).
const overviewTop = () => {
  if (embed) return 0;
  return isMobile.value ? mobileHeader(false) : hubTop(false) - HUB_TOP_EMBED;
};
const cssVars = computed(() => ({
  ...hubCssVars(width.value, embed),
  '--hub-overview-top': `${overviewTop()}px`,
}));

// ---- Focus: a topic switch moves focus to the panel H1 (desktop; §10). On phones focus
// stays on the topic menu, which is where the switch happened. Embedded, a switch made on
// the WP page keeps focus there (SPEC §5.8).
if (ctx) {
  watch(
    () => ctx.sel.value.topic,
    async () => {
      if (isMobile.value) return;
      if (embed && !embedFocusAllowed(true)) return;
      await nextTick();
      const started = performance.now();
      const tryFocus = () => {
        const el = document.getElementById(panelHeadingId);
        if (el) return focusElement(el);
        if (performance.now() - started < 3000) requestAnimationFrame(tryFocus);
      };
      tryFocus();
    },
  );
}

// ---- The answer: live region (debounced 500 ms) and the map region label (§8.6, §10).
const announced = ref('');
const answer = computed(() => ctx?.view.value?.answer || '');
if (ctx) {
  watchDebounced(
    answer,
    (value) => {
      announced.value = value;
    },
    { debounce: 500 },
  );
}

// ---- Map view: keep Lithuania inside the area the shell leaves free. The choropleth keeps
// the padding in sync while it is shown; the shell sets it on load and when the map comes
// back from Apžvalga or a live topic, then centres Lithuania unless the URL or a place says
// otherwise.
function recentre() {
  const map = mapLayers.map ? toRaw(mapLayers.map) : null;
  if (!ctx || !map) return;
  map.getView().padding = [...ctx.layout.mapPadding.value];
  if (ctx.sel.value.sav === null) mapLayers.centerMap();
}

if (ctx) {
  onMounted(async () => {
    await mapLayers.waitForLoaded;
    await nextTick();
    if (topicKind.value === 'live') return;
    if (route.query.x && route.query.y) {
      const map = mapLayers.map ? toRaw(mapLayers.map) : null;
      if (map) map.getView().padding = [...ctx.layout.mapPadding.value];
      return;
    }
    recentre();
  });
  watch(topicKind, (kind, previous) => {
    if (kind === 'snapshot' && previous !== 'snapshot') nextTick(recentre);
  });
}

const mapElement = () => mapLayers.map?.getTargetElement?.() as HTMLElement | undefined;
const setMapLabel = (text: string) => {
  const el = mapElement();
  if (!el) return;
  if (!text) {
    el.removeAttribute('role');
    el.removeAttribute('aria-label');
    return;
  }
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', S.mapRegion(text));
};

// ---- Page metadata (§8.6): title, lang and noindex, restored on leave.
const previousTitle = document.title;
const previousLang = document.documentElement.lang;
const robots = document.createElement('meta');
robots.name = 'robots';
robots.content = 'noindex';
let stopMeta: (() => void) | undefined;

onMounted(() => {
  document.documentElement.lang = 'lt';
  document.head.appendChild(robots);
  if (!ctx) {
    document.title = S.documentTitle(S.appTitle);
    return;
  }
  stopMeta = watch(
    [() => ctx.sel.value.topic, answer],
    ([topic, text]) => {
      document.title = S.documentTitle(TOPIC_TABS[topic]);
      // Live topics label the map themselves.
      if (ctx.topic.value.kind !== 'live') setMapLabel(text);
    },
    { immediate: true },
  );
});

onBeforeUnmount(() => {
  document.title = previousTitle;
  document.documentElement.lang = previousLang;
  robots.remove();
  stopMeta?.();
  setMapLabel('');
});
</script>

<style scoped>
.hub-card {
  top: calc(var(--hub-top) + var(--hub-gap));
  right: 16px;
  width: 360px;
  max-width: calc(100vw - var(--hub-panel-w) - 48px);
  max-height: calc(100% - var(--hub-top) - 120px);
  overflow-y: auto;
  border-radius: 0.5rem;
}
.hunting-hub--rail .hub-card {
  right: calc(var(--hub-drawer-w) + var(--hub-gap) + 8px);
}
.hub-legend {
  left: calc(var(--hub-content-left) + 8px);
  bottom: 40px;
}
.hunting-hub--rail .hub-legend {
  left: calc(var(--hub-rail-w) + 2 * var(--hub-gap) + 8px);
}
</style>

<style>
/* The site's text font, on body so content teleported out of the hub root (popovers,
   sheets, dialogs) gets it too. */
body:has(.hunting-hub) {
  font-family: 'Noto Sans', ui-sans-serif, system-ui, sans-serif;
  color: #121926;
}
.hunting-hub input[type='checkbox'],
.hunting-hub input[type='radio'] {
  accent-color: #004650;
}
/* UiMap's own controls sit under the shell; move them clear (§4). */
.hunting-hub--desktop #mapControlsRT {
  transform: translateY(var(--hub-top));
}
.hunting-hub--desktop:not(.hunting-hub--overview) .bottomLeft {
  transform: translateX(calc(var(--hub-content-left) - var(--hub-gap)));
}
.hunting-hub--rail .bottomLeft {
  transform: translateX(calc(var(--hub-rail-w) + var(--hub-gap))) !important;
}
.hunting-hub--drawer #mapControlsRT {
  transform: translate(calc(-1 * (var(--hub-drawer-w) + var(--hub-gap))), var(--hub-top));
}
.hunting-hub--drawer .rightBottom {
  transform: translateX(calc(-1 * (var(--hub-drawer-w) + var(--hub-gap))));
}
.hunting-hub--mobile #mapControlsRT {
  transform: translateY(var(--hub-overview-top));
}
.hunting-hub--mobile .bottomLeft,
.hunting-hub--mobile .rightBottom {
  transform: translateY(-96px);
}
/* 44 px touch targets for the map controls on phones (§4.3). */
.hunting-hub--mobile .ol-control button,
.hunting-hub--mobile .rightBottom button {
  width: 44px !important;
  height: 44px !important;
}
</style>
