<template>
  <div v-if="ctx" class="hub-vilkai" :style="cssVars">
    <!-- Desktop and tablet (≥ 768 px), SPEC2 §4.1, §6.2. -->
    <template v-if="!isMobile">
      <!-- Filter bar under the shell's 56 px top bar. -->
      <div
        role="search"
        aria-label="Vilkų filtrai"
        class="absolute inset-x-0 top-14 h-12 z-40 bg-white border-b border-gray-200 px-2 flex items-center gap-2"
      >
        <HuntingHubTopicsVilkaiChipPopover
          :label="`Laikotarpis: ${ctx.derived.periodLabel.value}`"
          title="Laikotarpis"
          :active="!isDefaultPeriod"
          panel-class="w-[400px]"
        >
          <HuntingWolvesPeriodFilter :show-season-note="false" />
        </HuntingHubTopicsVilkaiChipPopover>
        <HuntingHubTopicsVilkaiChipPopover
          :label="S.placeChip(placeName)"
          title="Vieta"
          :active="ctx.state.sav.value !== null"
          panel-class="w-[320px]"
        >
          <HuntingWolvesMunicipalitySelect />
        </HuntingHubTopicsVilkaiChipPopover>
        <HuntingHubTopicsVilkaiChipPopover
          :label="attrCount ? S.moreFilters(attrCount) : 'Daugiau filtrų'"
          title="Daugiau filtrų"
          :active="attrCount > 0"
          panel-class="w-[440px]"
        >
          <HuntingWolvesMoreFilters embedded />
        </HuntingHubTopicsVilkaiChipPopover>

        <div
          v-if="!fallback"
          role="group"
          aria-label="Rodinys"
          class="ml-auto flex rounded-lg bg-gray-100 p-1 gap-1"
        >
          <button
            type="button"
            :class="[viewButton, !tableOpen ? viewButtonActive : viewButtonIdle]"
            :aria-pressed="!tableOpen"
            @click="setTable(false)"
          >
            <UiIcon name="map" :size="16" aria-hidden="true" />
            {{ S.viewMap }}
          </button>
          <button
            ref="tableToggle"
            type="button"
            :class="[viewButton, tableOpen ? viewButtonActive : viewButtonIdle]"
            :aria-pressed="tableOpen"
            :aria-controls="tableOpen ? 'wolves-table-drawer' : undefined"
            @click="setTable(true)"
          >
            <UiIcon name="document" :size="16" aria-hidden="true" />
            {{ S.viewTable }}
          </button>
        </div>
      </div>

      <!-- Panel: the answer first, the chart right under the KPIs (SPEC2 §7). -->
      <section
        v-if="!railed"
        id="hub-panel"
        aria-labelledby="hub-vilkai-title"
        class="absolute left-2 top-[calc(var(--hub-top)+8px)] bottom-2 w-[var(--hub-panel-w)] z-30 bg-white rounded-lg shadow-lg overflow-y-auto"
      >
        <div class="p-4 flex flex-col gap-3">
          <!-- The badge shares the H1 row so the status line keeps the full panel width and
               the histogram stays above y = 600 at 1440 × 900 (SPEC2 §14). -->
          <div class="flex items-start justify-between gap-2">
            <h1
              id="hub-vilkai-title"
              tabindex="-1"
              class="text-xl font-semibold text-gray-900 focus:outline-none"
            >
              {{ VILKAI_H1 }}
            </h1>
            <span
              v-if="showStagingBadge"
              class="mt-1 shrink-0"
              :class="badgeClass"
              :title="BANDOMOJI_TOOLTIP"
              :aria-label="`${BADGE_LABELS.bandomoji}. ${BANDOMOJI_TOOLTIP}`"
            >
              {{ BADGE_LABELS.bandomoji }}
            </span>
          </div>
          <HuntingWolvesStatusCard variant="line" />

          <!-- Plain wrappers: the branches swap async components, keep their parents stable. -->
          <div v-if="fallback" class="flex flex-col gap-3">
            <HuntingHubTopicsVilkaiVilkaiFallback
              v-if="fallbackSnapshot"
              :snapshot="fallbackSnapshot"
              @view="(view: TopicView) => (fallbackView = view)"
            />
            <p v-else role="status" class="text-sm text-gray-700">{{ S.loading }}</p>
          </div>
          <div v-else class="flex flex-col gap-3">
            <HuntingWolvesFilterSentence />
            <HuntingWolvesLoadState placement="panel" :show-timestamp="false" />
            <HuntingWolvesSeasonSummary />
            <HuntingWolvesHistogram clip-to-window />
          </div>

          <footer class="flex flex-col gap-1 text-xs text-gray-600">
            <p v-if="!fallback && provenanceTime">
              {{ S.provenanceLive(provenanceTime) }} ·
              <button type="button" :class="linkButton" @click="openAbout">
                {{ S.provenanceLink }}
              </button>
            </p>
            <p>
              {{ S.prototypeLine }}
              <template v-if="FEEDBACK_URL">
                ·
                <a :href="FEEDBACK_URL" target="_blank" rel="noopener" :class="linkButton">
                  {{ S.prototypeFeedback }}
                  <span class="sr-only">(atidaroma naujame lange)</span>
                </a>
              </template>
            </p>
          </footer>
          <HuntingWolvesDebugPanel v-if="ctx.debug" />
        </div>
      </section>

      <!-- ≥ 1280 px with the table open: the panel collapses to a 56 px rail (SPEC2 §4.1). -->
      <aside
        v-else
        id="hub-panel"
        aria-label="Suvestinė"
        class="absolute left-0 top-[var(--hub-top)] bottom-0 w-14 z-30 bg-white shadow-lg flex flex-col items-center gap-3 py-3"
      >
        <button
          type="button"
          :aria-label="S.railExpand"
          :title="S.railExpand"
          class="w-11 h-11 flex items-center justify-center rounded text-gray-800 hover:bg-gray-100"
          :class="focusRing"
          @click="setTable(false)"
        >
          <UiIcon name="chevron-right" :size="20" aria-hidden="true" />
        </button>
        <p class="[writing-mode:vertical-rl] rotate-180 text-sm font-semibold text-gray-900">
          <span class="tabular-nums">{{ railCount }}</span>
          {{ railLabel }}
        </p>
      </aside>

      <!-- Table: a drawer next to the rail (≥ 1280 px) or in place of the map (768–1279 px). -->
      <HuntingWolvesTableDrawer compact :drawer-class="drawerClass" @show-on-map="onShowOnMap" />

      <div v-if="!replacesMap && !fallback" class="absolute bottom-10 z-20" :class="legendLeft">
        <HuntingWolvesMapLegend collapsible />
      </div>

      <div
        v-if="hasSelection && !replacesMap"
        class="absolute bottom-10 z-30"
        :class="railed ? 'right-[576px]' : 'right-12'"
      >
        <div class="w-[360px] max-w-[calc(100vw-32px)]">
          <HuntingWolvesWolfCard />
        </div>
      </div>
    </template>

    <!-- Mobile (< 768 px): the chip row completes the shell's 56 px header to 108 px. -->
    <template v-else>
      <div
        class="absolute inset-x-0 top-14 z-30 h-[52px] bg-white shadow-md px-3 py-1 flex items-center gap-2"
      >
        <HuntingWolvesPeriodSheet />
      </div>
      <HuntingWolvesMobileSheet ref="sheet" clip-histogram>
        <div class="flex items-start gap-2">
          <div class="flex-1 min-w-0"><HuntingWolvesStatusCard variant="line" /></div>
          <span v-if="showStagingBadge" :class="badgeClass" :title="BANDOMOJI_TOOLTIP">
            {{ BADGE_LABELS.bandomoji }}
          </span>
        </div>
        <HuntingHubTopicsVilkaiVilkaiFallback
          v-if="fallback && fallbackSnapshot"
          :snapshot="fallbackSnapshot"
          @view="(view: TopicView) => (fallbackView = view)"
        />
        <p v-if="!prototypeDismissed" class="flex items-center gap-2 text-xs text-gray-600">
          <span class="flex-1">
            {{ S.prototypeLine }}
            <template v-if="FEEDBACK_URL">
              ·
              <a :href="FEEDBACK_URL" target="_blank" rel="noopener" :class="linkButton">
                {{ S.prototypeFeedback }}
              </a>
            </template>
          </span>
          <button
            type="button"
            :aria-label="`${S.close}: ${S.prototypeLine}`"
            class="w-11 h-11 flex items-center justify-center rounded text-gray-700 hover:bg-gray-100"
            :class="focusRing"
            @click="dismissPrototype"
          >
            <UiIcon name="close" :size="16" aria-hidden="true" />
          </button>
        </p>
      </HuntingWolvesMobileSheet>
    </template>

    <!-- The loading pill and the empty-result card, below the shell's bars. -->
    <div class="absolute inset-x-0 bottom-0 top-[var(--hub-top)] z-20 pointer-events-none">
      <HuntingWolvesLoadState placement="map" />
    </div>

    <HuntingWolvesAboutData ref="about">
      <section>
        <h4 class="font-semibold text-gray-900">{{ ABOUT_HEADINGS.compare }}</h4>
        <p>{{ VILKAI_COMPARE }}</p>
      </section>
    </HuntingWolvesAboutData>
  </div>
</template>

<script setup lang="ts">
// Vilkai tab of the hunting data hub (SPEC2 §6.2, §7). Hosts the wolves page's context and
// components inside the hub shell: the context is created here exactly as in
// `routes/hunting/wolves.vue` (plus the municipality watcher), so unmounting this component
// (a topic switch) disposes the wolves layers, watchers and requests. The shell renders
// its 56 px top bar (tabs, Dalintis, Apie); everything below it is drawn here, positioned
// against the shell root with the `--hub-*` variables of `utils/hunting/hub/layout.ts`.
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  shallowRef,
  watch,
  watchEffect,
  type Ref,
} from 'vue';
import { useElementSize, useMediaQuery, useWindowSize } from '@vueuse/core';
import { WOLVES_CTX, type WolvesContext } from '@/composables/hunting/context';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { HUB_SHELL } from '@/components/hunting/hub/shell/shell';
import { useWolvesData } from '@/composables/hunting/useWolvesData';
import { useWolvesMap } from '@/composables/hunting/useWolvesMap';
import { useWolvesState } from '@/composables/hunting/useWolvesState';
import {
  formatInt,
  formatTime,
  pluralLt,
  seasonInterval,
  seasonOfDay,
  todayVilnius,
} from '@/utils/hunting/dates';
import { assignMunicipalities, loadMunicipalityIndex } from '@/utils/hunting/municipalities';
import {
  HUB_MOBILE_HEADER,
  HUB_MOBILE_PEEK,
  hubCssVars,
  isRailed,
  mapPadding,
  tableReplacesMap,
} from '@/utils/hunting/hub/layout';
import {
  ABOUT_HEADINGS,
  BADGE_LABELS,
  BANDOMOJI_TOOLTIP,
  FEEDBACK_URL,
  P_HUNTED,
  S,
} from '@/utils/hunting/hub/strings';
import type { SnapshotData, TopicView } from '@/utils/hunting/hub/types';
import { VILKAI_COMPARE, VILKAI_H1, type VilkaiCarry } from '@/utils/hunting/hub/topics/vilkai';

const mapLayers: any = inject('mapLayers');
// Optional: the component also runs outside the hub (with its own defaults).
const hub = inject(HUB_CTX, null);
const shell = inject(HUB_SHELL, null);

const isProductionHost = hub ? hub.isProductionHost : window.location.hostname === 'maps.biip.lt';
const isMobile: Ref<boolean> = hub ? hub.isMobile : useMediaQuery('(max-width: 767px)');
const { width } = useWindowSize();
// The shell hides non-final figures behind a badge; the live tab always reads the
// environment's own API, so every non-production host gets "Bandomoji aplinka" (SPEC2 §5).
const showStagingBadge = !isProductionHost;

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2';
const viewButton = `px-3 min-h-[32px] rounded-md text-sm font-semibold flex items-center gap-2 ${focusRing}`;
const viewButtonActive = 'bg-gray-900 text-white';
const viewButtonIdle = 'text-gray-900 hover:bg-white';
const linkButton = `font-semibold text-blue-800 underline rounded ${focusRing}`;
const badgeClass =
  'shrink-0 rounded border border-gray-400 bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-800';

// ---- Wolves context, as wolves.vue createContext() (SPEC2 §6.2).
const wolfDraft = ref<{ total: number; date: string } | null>(null);

function createContext(): WolvesContext {
  const today = hub?.today ?? todayVilnius();
  const currentSeason = seasonOfDay(today);
  const data = {
    ...useWolvesData({ today }),
    municipalityStatus: ref<'pending' | 'ready' | 'failed'>('pending'),
  };
  const { state, derived, debug } = useWolvesState({ today, currentSeason, data });
  return { today, currentSeason, data, state, derived, isMobile, debug, wolfDraft };
}

// The shell renders only the production gate on maps.biip.lt; never start requests there.
const ctx = isProductionHost ? null : createContext();
const tableOpen = computed(() => !!ctx?.state.tableOpen.value);
const railed = computed(() => !isMobile.value && isRailed(width.value, tableOpen.value));
const replacesMap = computed(
  () => !isMobile.value && tableReplacesMap(width.value, tableOpen.value),
);
const cssVars = computed(() => hubCssVars(width.value));

// The wolves sheet is taller than the hub's 96 px peek (status line, histogram): on phones
// the map keeps Lithuania above the collapsed sheet. While the sheet is expanded (table)
// the padding stays put, so the map does not jump behind it.
const sheet = ref<any>(null);
const { height: sheetHeight } = useElementSize(sheet, undefined, { box: 'border-box' });
let collapsedSheet = HUB_MOBILE_PEEK;
function viewPadding(open: boolean): number[] {
  if (!isMobile.value) return mapPadding(width.value, open);
  if (!open && sheetHeight.value) collapsedSheet = Math.max(HUB_MOBILE_PEEK, sheetHeight.value);
  return [HUB_MOBILE_HEADER, 0, collapsedSheet, 0];
}

if (ctx) {
  provide(WOLVES_CTX, ctx);
  useWolvesMap(ctx, { padding: () => viewPadding(ctx.state.tableOpen.value) });

  // Municipality per record after the dataset is on screen (as wolves.vue, SPEC §9).
  let municipalityIndex: Awaited<ReturnType<typeof loadMunicipalityIndex>> | null = null;
  const status = ctx.data.municipalityStatus!;
  const dataset = ctx.data.dataset;
  watch(
    dataset,
    async (value) => {
      if (!value || status.value === 'failed') return;
      if (value.records.every((r) => r.municipalityCode !== undefined)) {
        status.value = 'ready';
        return;
      }
      try {
        municipalityIndex = municipalityIndex || (await loadMunicipalityIndex());
      } catch (err) {
        status.value = 'failed';
        ctx.state.sav.value = null;
        // eslint-disable-next-line no-console
        console.warn('[hunting/hub] municipality lookup failed', err);
        return;
      }
      if (dataset.value !== value) return;
      const sav = ctx.state.sav.value;
      if (sav != null && !municipalityIndex.byCode[sav]) ctx.state.sav.value = null;
      assignMunicipalities(value.records, municipalityIndex);
      dataset.value = { ...value, records: value.records.slice() };
      status.value = 'ready';
    },
    { immediate: true },
  );
}

// ---- Snapshot: the draft limit (meta) and the fallback (wolves.json) (SPEC2 §6.2, §7).
const snapshot = computed<SnapshotData | null>(() => hub?.data.snapshot.value ?? null);
const fallback = computed(() => ctx?.data.phase.value === 'error');
const fallbackSnapshot = computed(() => (snapshot.value?.wolves ? snapshot.value : null));
// The fallback's map content, for the hub's choropleth (see the integration notes).
const fallbackView = shallowRef<TopicView | null>(null);

const ensure = (files: ('meta' | 'wolves')[]) => {
  hub?.data.ensure(files).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('[hunting/hub] snapshot load failed', err);
  });
};
watch(
  () => snapshot.value?.meta,
  (meta) => {
    const season = meta?.static?.wolves?.seasons?.[String(ctx?.currentSeason)];
    wolfDraft.value = season && !season.limit && season.draft ? season.draft : null;
  },
  { immediate: true },
);
watch(fallback, (failed) => {
  if (!failed) return;
  ensure(['meta', 'wolves']);
  // The fallback panel shows its own table; the live drawer would have no data.
  setTable(false);
});
// The fallback's municipality choropleth is drawn by the hub (its legend and tooltip too).
watch(
  [fallback, fallbackView, () => ctx?.state.sav.value ?? null],
  ([failed, view, sav]) => {
    if (!hub) return;
    const map = failed && view ? view.map : null;
    hub.liveMap.value =
      map && map.kind === 'choropleth'
        ? {
            def: map,
            sav,
            select: (code) => {
              if (ctx) ctx.state.sav.value = code;
            },
          }
        : null;
  },
  { immediate: true },
);

// ---- Filter bar labels.
const isDefaultPeriod = computed(() => {
  if (!ctx) return true;
  const def = seasonInterval(ctx.derived.defaultSeason.value);
  const { from, to } = ctx.state.interval.value;
  return from === def.from && to === def.to;
});
const attrCount = computed(() => {
  const attrs = ctx?.state.attrs.value;
  return attrs ? attrs.age.length + attrs.sex.length + attrs.method.length : 0;
});
const municipalityNames = shallowRef<Record<number, string>>({});
const placeName = computed(() => {
  const sav = ctx?.state.sav.value;
  if (sav == null) return S.placeAll;
  return municipalityNames.value[sav] || `${sav}`;
});

// ---- Rail: the answer's number, vertical.
const railCount = computed(() =>
  ctx?.data.dataset.value ? formatInt(ctx.derived.filtered.value.length) : '—',
);
const railLabel = computed(() =>
  ctx?.data.dataset.value
    ? `${pluralLt(ctx.derived.filtered.value.length, P_HUNTED)} · ${ctx.derived.periodLabel.value}`
    : '',
);

const drawerClass = computed(() =>
  railed.value
    ? 'absolute right-0 top-[var(--hub-top)] bottom-0 w-[var(--hub-drawer-w)] z-30 bg-white shadow-lg flex flex-col'
    : 'absolute right-0 top-[var(--hub-top)] bottom-0 left-[calc(var(--hub-panel-w)+16px)] z-30 bg-white shadow-lg flex flex-col',
);
const legendLeft = computed(() =>
  railed.value ? 'left-[64px]' : 'left-[calc(var(--hub-panel-w)+16px)]',
);

const hasSelection = computed(() => !!ctx?.state.selection.value);
const provenanceTime = computed(() => {
  const at = ctx?.data.fetchedAt.value;
  return at ? formatTime(at) : '';
});

function setTable(open: boolean) {
  if (ctx) ctx.state.tableOpen.value = open;
}

// "Rodyti žemėlapyje" below 1280 px: the table covers the map, so close it (SPEC2 §4.1).
function onShowOnMap() {
  if (!railed.value && !isMobile.value) setTable(false);
}

// Closing the table (its button, Esc or the rail) removes the focused element; give focus
// back to the toggle, as on the wolves page.
const tableToggle = ref<HTMLButtonElement | null>(null);
watch(tableOpen, (open, wasOpen) => {
  if (open || !wasOpen || isMobile.value) return;
  nextTick(() => {
    const active = document.activeElement;
    if (!active || active === document.body) tableToggle.value?.focus();
  });
});

// ---- About: the wolves dialog with the comparison paragraph.
const about = ref<{ open: () => void } | null>(null);
const openAbout = () => about.value?.open();

// ---- Mobile prototype note, dismissed once per browser (SPEC2 §4.3).
const PROTOTYPE_KEY = 'hunting-hub:prototype-dismissed';
const prototypeDismissed = ref(false);
try {
  prototypeDismissed.value = window.localStorage.getItem(PROTOTYPE_KEY) === '1';
} catch (err) {
  prototypeDismissed.value = false;
}
function dismissPrototype() {
  prototypeDismissed.value = true;
  try {
    window.localStorage.setItem(PROTOTYPE_KEY, '1');
  } catch (err) {
    // Storage blocked: the note stays hidden for this visit only.
  }
}

// ---- UiMap controls: keep them clear of the bars, the rail/drawer and the sheet. The map
// is the shell's element, so the state goes on <body> as classes (removed on unmount).
const BODY_CLASSES = [
  'hub-vilkai--desktop',
  'hub-vilkai--mobile',
  'hub-vilkai--railed',
  'hub-vilkai--replace',
];
watchEffect(() => {
  if (!ctx) return;
  const body = document.body.classList;
  body.toggle('hub-vilkai--desktop', !isMobile.value);
  body.toggle('hub-vilkai--mobile', isMobile.value);
  body.toggle('hub-vilkai--railed', railed.value);
  body.toggle('hub-vilkai--replace', replacesMap.value);
  document.body.style.setProperty('--hub-vilkai-sheet', `${sheetHeight.value}px`);
});

// ---- Map region label (SPEC2 §8.6) on the shared map element, restored on leave.
const mapElement = () => mapLayers?.map?.getTargetElement?.() as HTMLElement | undefined;
let previousMapLabel: string | null = null;
let stopLabelWatch: (() => void) | undefined;

let unmounted = false;

onMounted(async () => {
  if (!ctx) return;
  ensure(['meta']);
  // "Dalintis" in the shell copies the wolves link (period always explicit).
  if (shell) shell.shareOverride.value = shareUrl;
  previousMapLabel = mapElement()?.getAttribute('aria-label') ?? null;
  try {
    const index = await loadMunicipalityIndex();
    municipalityNames.value = Object.fromEntries(index.list.map((m) => [m.code, m.name]));
  } catch (err) {
    // Without the polygons the chip shows the code; the select hides itself.
  }
  // Left the tab while the index was loading: no watcher may outlive the component.
  if (unmounted) return;
  stopLabelWatch = watch(
    ctx.derived.sentence,
    (sentence) => {
      const el = mapElement();
      if (!el) return;
      el.setAttribute('role', 'region');
      el.setAttribute('aria-label', S.mapRegion(sentence.replace(/^Rodoma:\s*/, '')));
    },
    { immediate: true },
  );
});

onBeforeUnmount(() => {
  unmounted = true;
  if (hub) hub.liveMap.value = null;
  if (shell && shell.shareOverride.value === shareUrl) shell.shareOverride.value = null;
  BODY_CLASSES.forEach((name) => document.body.classList.remove(name));
  document.body.style.removeProperty('--hub-vilkai-sheet');
  stopLabelWatch?.();
  const el = mapElement();
  if (el && previousMapLabel !== null) el.setAttribute('aria-label', previousMapLabel);
  else el?.removeAttribute('aria-label');
});

// ---- For the shell: share link, About, and the carry-over to another topic (SPEC2 §2.3).
function carry(): VilkaiCarry {
  if (!ctx) return { season: null, sav: null, dayRange: false };
  const season = ctx.derived.intervalSeason.value;
  return {
    season: season ?? seasonOfDay(ctx.state.interval.value.to),
    sav: ctx.state.sav.value,
    dayRange: season === null,
  };
}
const shareUrl = () => (ctx ? ctx.state.shareUrl() : window.location.href);

defineExpose({ openAbout, shareUrl, carry, railed, fallbackView });
</script>

<style>
/* UiMap's own controls (SPEC2 §4): below the 104 px bars, right of the panel or rail, left
   of the drawer, above the mobile sheet. */
body.hub-vilkai--desktop #mapControlsRT {
  transform: translateY(104px);
}
body.hub-vilkai--desktop .bottomLeft {
  transform: translateX(336px);
}
@media (min-width: 1024px) {
  body.hub-vilkai--desktop .bottomLeft {
    transform: translateX(376px);
  }
}
@media (min-width: 1280px) {
  body.hub-vilkai--desktop .bottomLeft {
    transform: translateX(396px);
  }
}
body.hub-vilkai--railed .bottomLeft {
  transform: translateX(64px);
}
body.hub-vilkai--railed #mapControlsRT {
  transform: translate(-560px, 104px);
}
body.hub-vilkai--railed .rightBottom {
  transform: translateX(-560px);
}
body.hub-vilkai--mobile #mapControlsRT {
  transform: translateY(108px);
}
body.hub-vilkai--mobile .bottomLeft,
body.hub-vilkai--mobile .rightBottom {
  transform: translateY(calc(-1 * var(--hub-vilkai-sheet, 0px)));
}
/* 44 px touch targets on phones, as on the wolves page. */
body.hub-vilkai--mobile .ol-control button,
body.hub-vilkai--mobile .rightBottom button {
  width: 44px !important;
  height: 44px !important;
}
</style>
