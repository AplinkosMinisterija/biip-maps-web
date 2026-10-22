<template>
  <div v-if="ctx" class="hub-steb" :style="cssVars">
    <!-- The answer, announced once per change. -->
    <p class="sr-only" aria-live="polite">{{ announced }}</p>

    <!-- Desktop and tablet (≥ 768 px), STEB-SPEC §3.1. -->
    <template v-if="!isMobile">
      <!-- Filter bar under the shell's 56 px top bar (embedded: at the top). -->
      <div
        role="search"
        :aria-label="SS.filtersLabel"
        class="absolute inset-x-0 z-40 flex h-14 items-center gap-2 border-b border-line bg-white px-[var(--hub-gutter,16px)]"
        :class="embed ? 'top-0' : 'top-14'"
      >
        <StebFilters />
        <!-- Embedded, the WP page's view switch opens and closes the table. -->
        <div
          v-if="!embed"
          role="group"
          aria-label="Rodinys"
          class="ml-auto flex shrink-0 gap-1 rounded-lg bg-gray-100 p-1"
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
            :aria-controls="tableOpen ? 'steb-table-drawer' : undefined"
            :disabled="!hasTable"
            @click="openTableByUser"
          >
            <UiIcon name="document" :size="16" aria-hidden="true" />
            {{ S.viewTable }}
          </button>
        </div>
      </div>

      <section
        v-if="!railed"
        id="hub-panel"
        aria-labelledby="hub-title"
        class="absolute bottom-2 left-[var(--hub-panel-left)] top-[calc(var(--hub-top)+8px)] z-30 w-[var(--hub-panel-w)] overflow-y-auto rounded-lg bg-white shadow-lg"
      >
        <div class="p-4">
          <StebPanel />
        </div>
      </section>

      <!-- ≥ 1280 px with the table open (standalone): the panel collapses to a 56 px rail. -->
      <aside
        v-else
        id="hub-panel"
        :aria-label="SS.segmentSummary"
        class="absolute bottom-0 left-0 top-[var(--hub-top)] z-30 flex w-14 flex-col items-center gap-3 bg-white py-3 shadow-lg"
      >
        <button
          type="button"
          :aria-label="S.railExpand"
          :title="S.railExpand"
          class="flex h-11 w-11 items-center justify-center rounded text-gray-800 hover:bg-gray-100"
          :class="focusRing"
          @click="setTable(false)"
        >
          <UiIcon name="chevron-right" :size="20" aria-hidden="true" />
        </button>
        <p class="rotate-180 text-sm font-semibold text-gray-900 [writing-mode:vertical-rl]">
          <span class="tabular-nums">{{ railCount }}</span>
          {{ railLabel }}
        </p>
      </aside>

      <!-- Table: a drawer next to the rail (≥ 1280 px) or in place of the map. -->
      <StebTable
        v-if="tableOpen"
        ref="tableRef"
        :drawer-class="drawerClass"
        @show-on-map="onShowOnMap"
        @close="setTable(false)"
      />

      <div v-if="!replacesMap" class="absolute bottom-10 z-20" :class="legendLeft">
        <StebLegend />
      </div>

      <div
        v-if="hasSelection && !replacesMap"
        class="absolute bottom-10 z-30"
        :class="railed ? 'right-[576px]' : 'right-12'"
      >
        <div class="w-[360px] max-w-[calc(100vw-32px)]">
          <StebCard />
        </div>
      </div>
    </template>

    <!-- Mobile (< 768 px): the chip row under the shell's topic menu (embedded: at the top)
         and the bottom sheet. -->
    <template v-else>
      <div
        role="search"
        :aria-label="SS.filtersLabel"
        class="absolute inset-x-0 z-30 flex h-[60px] min-w-0 items-center gap-2 bg-white px-4 py-2 shadow-md"
        :class="embed ? 'top-0' : 'top-14'"
      >
        <StebFilters mobile />
      </div>
      <StebSheet ref="sheet" />
      <!-- Phone legend above the collapsed sheet (DATAVIZ-01). -->
      <div
        v-if="!tableOpen"
        class="absolute left-3 z-20 bottom-[calc(var(--hub-mobile-peek,96px)+8px)]"
      >
        <StebLegend phone />
      </div>
    </template>

    <!-- Loading pill over the map. -->
    <div
      v-if="loadingPill"
      class="pointer-events-none absolute right-0 z-20 flex justify-center"
      :class="isMobile ? 'left-0' : 'left-[var(--hub-content-left)]'"
      :style="{ top: `${pillTop}px` }"
    >
      <p role="status" class="rounded-full bg-white px-4 py-2 text-sm text-gray-900 shadow">
        {{ SS.loading }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Stebėjimai tab of the hunting data hub (STEB-SPEC §3, §4.5): citizen observations of
// wolves, lynx, bears and bison, read live from the environment's public proxy. Built like
// the Vilkai host: this component owns its filters, URL keys, data, map layers, table and
// card; unmounting it (a topic switch) disposes the layers, watchers and requests. The
// shell renders its 56 px top bar (tabs, Dalintis, Apie); everything below it is drawn
// here, positioned with the `--hub-*` variables of `utils/hunting/hub/layout.ts`.
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  watch,
  watchEffect,
  type Ref,
} from 'vue';
import { useElementSize, useMediaQuery, useWindowSize, watchDebounced } from '@vueuse/core';
import { HUB_CTX, type EmbedLiveControls } from '@/composables/hunting/hub/context';
import { useStebData } from '@/composables/hunting/hub/stebejimai/useStebData';
import { useStebMap } from '@/composables/hunting/hub/stebejimai/useStebMap';
import {
  STEB_CTX,
  useStebState,
  type StebContext,
} from '@/composables/hunting/hub/stebejimai/useStebState';
import { formatDateTime, formatInt, todayVilnius } from '@/utils/hunting/dates';
import {
  hubCssVars,
  hubTop,
  isRailed,
  mapPadding,
  mobileHeader,
  tableReplacesMap,
} from '@/utils/hunting/hub/layout';
import { S } from '@/utils/hunting/hub/strings';
import { SS } from '@/utils/hunting/hub/stebejimai/strings';
import StebCard from './StebCard.vue';
import StebFilters from './StebFilters.vue';
import StebLegend from './StebLegend.vue';
import StebPanel from './StebPanel.vue';
import StebSheet from './StebSheet.vue';
import StebTable from './StebTable.vue';

const mapLayers: any = inject('mapLayers');
// Optional: outside the hub the component runs with its own defaults.
const hub = inject(HUB_CTX, null);
// Embedded in the WP data page: no own view switch, no rail, the WP bar on top.
const embed = !!hub?.embed;
const hostname = window.location.hostname;
const isProductionHost = hub ? hub.isProductionHost : hostname === 'maps.biip.lt';
const isMobile: Ref<boolean> = hub ? hub.isMobile : useMediaQuery('(max-width: 767px)');
const { width } = useWindowSize();

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
const viewButton = `px-3 min-h-[32px] rounded-md text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${focusRing}`;
const viewButtonActive = 'bg-brand text-white';
const viewButtonIdle = 'text-gray-900 hover:bg-white';

// The shell renders only the production gate on maps.biip.lt; never start requests there.
function createContext(): StebContext {
  const today = hub?.today ?? todayVilnius();
  const data = useStebData({ enabled: true });
  return useStebState({
    hub,
    data,
    today,
    embed,
    debug: hub ? hub.debug : false,
    isProductionHost,
    isMobile,
    parentOrigin: hub?.parentOrigin ?? null,
    hostname,
  });
}
const ctx = isProductionHost ? null : createContext();

const tableOpen = computed(() => !!ctx?.state.tableOpen.value);
const hasTable = computed(() => !!ctx && ctx.data.phase.value !== 'error');
const railed = computed(() => !isMobile.value && isRailed(width.value, tableOpen.value, embed));
const replacesMap = computed(
  () => !isMobile.value && tableReplacesMap(width.value, tableOpen.value, embed),
);
const cssVars = computed(() => hubCssVars(width.value, embed));
const hasSelection = computed(() => !!ctx?.state.selection.value);

if (ctx) {
  provide(STEB_CTX, ctx);
  useStebMap(ctx, { padding: () => mapPadding(width.value, tableOpen.value, embed) });
}

// ---- The answer, announced (debounced) and as the map region's label.
const announced = ref('');
const answerText = computed(() =>
  ctx && ctx.derived.ready.value ? ctx.derived.answer.value.text : '',
);
watchDebounced(answerText, (text) => (announced.value = text), { debounce: 500 });

// ---- Rail and drawer geometry (as the Vilkai host).
const railCount = computed(() =>
  ctx?.derived.ready.value ? formatInt(ctx.derived.filtered.value.length) : '—',
);
const railLabel = computed(() =>
  ctx?.derived.ready.value ? SS.railLabel(ctx.derived.filtered.value.length) : '',
);
// Embedded, the table's content ends at the site container's right edge (D3), clear of the
// site's accessibility button: the right gutter minus the rows' own 16 px padding.
const EMBED_DRAWER_RIGHT = 'pr-[calc(var(--hub-gutter,24px)-16px)]';
const drawerClass = computed(() =>
  railed.value
    ? 'absolute right-0 top-[var(--hub-top)] bottom-0 w-[var(--hub-drawer-w)] z-30 bg-white shadow-lg flex flex-col'
    : `absolute right-0 top-[var(--hub-top)] bottom-0 left-[var(--hub-content-left)] z-30 bg-white shadow-lg flex flex-col${embed ? ` ${EMBED_DRAWER_RIGHT}` : ''}`,
);
const legendLeft = computed(() =>
  railed.value ? 'left-[64px]' : 'left-[var(--hub-content-left)]',
);
const loadingPill = computed(
  () => !!ctx && !ctx.derived.ready.value && ctx.data.phase.value !== 'error' && !replacesMap.value,
);
const pillTop = computed(() => (isMobile.value ? mobileHeader(embed) : hubTop(embed)) + 12);

function setTable(open: boolean) {
  ctx?.state.setTable(open);
}

// The user opened the table with the view switch: keyboard users land on its tabs.
const tableRef = ref<{ focusTab(): void } | null>(null);
function openTableByUser() {
  setTable(true);
  nextTick(() => tableRef.value?.focusTab());
}

// "Rodyti žemėlapyje" where the table covers the map (embedded at every width, standalone
// 768–1279 px): close it first.
function onShowOnMap() {
  if (!railed.value && !isMobile.value) setTable(false);
}

// Closing the table removes the focused element; give focus back to the view switch.
const tableToggle = ref<HTMLButtonElement | null>(null);
watch(tableOpen, (open, wasOpen) => {
  if (open || !wasOpen || isMobile.value) return;
  nextTick(() => {
    const active = document.activeElement;
    if (!active || active === document.body) tableToggle.value?.focus();
  });
});

// ---- UiMap controls: keep them clear of the bars, the rail/drawer and the sheet. The map
// is the shell's element, so the state goes on <body> as classes (removed on unmount).
const sheet = ref<any>(null);
const { height: sheetHeight } = useElementSize(sheet, undefined, { box: 'border-box' });
const BODY_CLASSES = [
  'hub-steb--desktop',
  'hub-steb--mobile',
  'hub-steb--railed',
  'hub-steb--replace',
];
watchEffect(() => {
  if (!ctx) return;
  const body = document.body.classList;
  body.toggle('hub-steb--desktop', !isMobile.value);
  body.toggle('hub-steb--mobile', isMobile.value);
  body.toggle('hub-steb--railed', railed.value);
  body.toggle('hub-steb--replace', replacesMap.value);
  document.body.style.setProperty('--hub-steb-sheet', `${sheetHeight.value}px`);
});

// ---- Map region label on the shared map element, restored on leave.
const mapElement = () => mapLayers?.map?.getTargetElement?.() as HTMLElement | undefined;
let previousMapLabel: string | null = null;
let previousMapRole: string | null = null;
let stopLabelWatch: (() => void) | undefined;

// ---- Embedded: the WP page's view switch opens and closes the table through the bridge
// (STEB-SPEC §4.5). Registered while this topic is mounted.
const liveControls: EmbedLiveControls = {
  setTableOpen(open: boolean, table?: string) {
    if (!ctx) return;
    // The error state has no table: keep the map, which `hasTable` reports.
    if (open && ctx.data.phase.value === 'error') {
      ctx.state.setTable(false);
      return;
    }
    ctx.state.setTable(open, table);
  },
  hasTable,
  // Read from the state directly: the URL write comes after its debounce.
  table: computed(() =>
    ctx && hasTable.value && ctx.state.tableOpen.value ? ctx.state.table.value : null,
  ),
  provenance: computed(() => {
    const at = ctx?.data.fetchedAt.value;
    const ready = ctx?.data.phase.value === 'ready';
    return {
      kind: 'live' as const,
      asOf: null,
      text: at && ready ? SS.provenance(formatDateTime(at)) : undefined,
    };
  }),
};

onMounted(() => {
  if (!ctx) return;
  if (hub && embed) hub.embedLive.value = liveControls;
  // A switch that opened the table (setTopic `openTable`) wrote `lentele` with a router
  // navigation that may land after this component read the URL: open it here.
  const pick = hub?.sel.value.table;
  if (pick && !ctx.state.tableOpen.value) liveControls.setTableOpen(true, pick);

  const el = mapElement();
  previousMapLabel = el?.getAttribute('aria-label') ?? null;
  previousMapRole = el?.getAttribute('role') ?? null;
  stopLabelWatch = watch(
    answerText,
    (text) => {
      const target = mapElement();
      if (!target) return;
      target.setAttribute('role', 'region');
      target.setAttribute('aria-label', S.mapRegion(text || SS.h1));
    },
    { immediate: true },
  );
});

onBeforeUnmount(() => {
  if (hub && hub.embedLive.value === liveControls) hub.embedLive.value = null;
  BODY_CLASSES.forEach((name) => document.body.classList.remove(name));
  document.body.style.removeProperty('--hub-steb-sheet');
  stopLabelWatch?.();
  const el = mapElement();
  if (!el) return;
  if (previousMapLabel !== null) el.setAttribute('aria-label', previousMapLabel);
  else el.removeAttribute('aria-label');
  if (previousMapRole !== null) el.setAttribute('role', previousMapRole);
  else el.removeAttribute('role');
});

const openAbout = () => hub?.openAbout();
defineExpose({ openAbout, railed });
</script>

<style>
/* UiMap's own controls: below the bars (embedded: 56 px; the hub sets --hub-top /
   --hub-mobile-header), right of the panel or rail, left of the drawer, above the mobile
   sheet. Same offsets as the Vilkai host's rules. */
body.hub-steb--desktop #mapControlsRT {
  transform: translateY(var(--hub-top, 112px));
}
body.hub-steb--desktop .bottomLeft {
  transform: translateX(calc(var(--hub-content-left, 396px) - 8px));
}
body.hub-steb--railed .bottomLeft {
  transform: translateX(64px);
}
body.hub-steb--railed #mapControlsRT {
  transform: translate(-560px, var(--hub-top, 112px));
}
body.hub-steb--railed .rightBottom {
  transform: translateX(-560px);
}
body.hub-steb--mobile #mapControlsRT {
  transform: translateY(var(--hub-mobile-header, 108px));
}
body.hub-steb--mobile .rightBottom {
  transform: translateY(calc(-1 * var(--hub-steb-sheet, 0px)));
}
/* The scale line above the phone legend. */
body.hub-steb--mobile .bottomLeft {
  transform: translateY(calc(-1 * (var(--hub-steb-sheet, 0px) + 56px)));
}
/* 44 px touch targets on phones. */
body.hub-steb--mobile .ol-control button,
body.hub-steb--mobile .rightBottom button {
  width: 44px !important;
  height: 44px !important;
}
</style>
