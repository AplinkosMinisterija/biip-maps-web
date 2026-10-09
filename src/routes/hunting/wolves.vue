<template>
  <div
    class="wolves-page"
    :class="{
      'wolves-page--mobile': isMobile,
      'wolves-page--desktop': !isMobile && !isProductionHost,
      'wolves-page--drawer': tableOpen && !isMobile,
    }"
    :style="{ '--wolves-top': `${topBarHeight}px`, '--wolves-bottom': `${sheetHeight}px` }"
  >
    <HuntingWolvesProductionGate v-if="isProductionHost" />

    <template v-else>
      <!-- Desktop and tablet (≥ 768 px): left panel floating over the map (§7.1, §7.2). -->
      <section
        v-if="!isMobile"
        aria-labelledby="wolves-title"
        class="absolute left-2 top-2 bottom-2 w-[360px] lg:w-[400px] z-30 bg-white rounded-lg shadow-lg overflow-y-auto"
      >
        <div class="p-4 flex flex-col gap-4">
          <HuntingWolvesPrototypeBanner />
          <header class="flex flex-wrap items-center justify-between gap-2">
            <h1 id="wolves-title" class="text-xl font-semibold text-gray-900">Sumedžioti vilkai</h1>
            <div class="flex gap-2 shrink-0">
              <button type="button" :class="headerButton" @click="share">
                <UiIcon name="link" :size="16" aria-hidden="true" />
                Dalintis
              </button>
              <button type="button" :class="headerButton" @click="openAbout">
                <UiIcon name="document" :size="16" aria-hidden="true" />
                Apie duomenis
              </button>
            </div>
          </header>
          <HuntingWolvesStatusCard />
          <HuntingWolvesPeriodFilter />
          <hr class="border-gray-200" />
          <HuntingWolvesFilterSentence />
          <HuntingWolvesLoadState placement="panel" />
          <HuntingWolvesSeasonSummary />
          <HuntingWolvesHistogram />
          <HuntingWolvesMoreFilters />
          <HuntingWolvesMunicipalitySelect />
          <HuntingWolvesDebugPanel v-if="debug" />
        </div>
      </section>

      <template v-if="!isMobile">
        <div class="absolute bottom-10 left-[376px] lg:left-[416px] z-20">
          <HuntingWolvesMapLegend />
        </div>

        <!-- Positions itself and carries id="wolves-table-drawer" (§6.6). -->
        <HuntingWolvesTableDrawer />

        <div
          class="absolute right-12 flex flex-col items-end gap-2"
          :class="
            tableOpen ? 'bottom-20 z-40 lg:bottom-10 lg:z-30 lg:right-[576px]' : 'bottom-10 z-30'
          "
        >
          <div v-if="hasSelection" class="w-[360px] max-w-[calc(100vw-32px)]">
            <HuntingWolvesWolfCard />
          </div>
          <button
            ref="tableToggle"
            type="button"
            class="px-4 py-2 rounded bg-white shadow-md text-sm font-semibold text-gray-900 hover:bg-gray-100 flex items-center gap-2"
            :class="focusRing"
            :aria-expanded="tableOpen"
            aria-controls="wolves-table-drawer"
            @click="toggleTable"
          >
            <UiIcon name="document" :size="16" aria-hidden="true" />
            {{ tableOpen ? 'Slėpti lentelę' : 'Lentelė' }}
          </button>
        </div>
      </template>

      <!-- Mobile (< 768 px): top bar plus a bottom sheet (§7.3). -->
      <template v-else>
        <header
          ref="topBar"
          class="absolute top-0 inset-x-0 z-30 bg-white shadow-md px-3 pb-2 flex flex-col gap-2"
        >
          <div class="flex items-center justify-between h-12">
            <h1 id="wolves-title" class="text-lg font-semibold text-gray-900">Sumedžioti vilkai</h1>
            <div class="flex gap-1">
              <button
                type="button"
                aria-label="Dalintis"
                :class="[iconButton, focusRing]"
                @click="share"
              >
                <UiIcon name="link" :size="20" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Apie duomenis"
                :class="[iconButton, focusRing]"
                @click="openAbout"
              >
                <UiIcon name="document" :size="20" aria-hidden="true" />
              </button>
            </div>
          </div>
          <HuntingWolvesPeriodSheet />
          <HuntingWolvesStatusCard />
          <HuntingWolvesPrototypeBanner dismissible />
        </header>
        <HuntingWolvesMobileSheet ref="sheet" />
      </template>

      <HuntingWolvesLoadState placement="map" />
      <HuntingWolvesAboutData ref="about" />
    </template>

    <!-- Last in the DOM so keyboard users reach the panel before the map controls. -->
    <UiMap :show-scale-line="true" :projection="projection3857" />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import { useElementSize, useMediaQuery } from '@vueuse/core';
import { projection3857, vectorPositron } from '@/utils';
import { WOLVES_CTX, type WolvesContext } from '@/composables/hunting/context';
import { useWolvesState } from '@/composables/hunting/useWolvesState';
import { seasonOfDay, todayVilnius } from '@/utils/hunting/dates';
import { useWolvesData } from '@/composables/hunting/useWolvesData';
import { useWolvesMap } from '@/composables/hunting/useWolvesMap';
import { assignMunicipalities, loadMunicipalityIndex } from '@/utils/hunting/municipalities';

const mapLayers: any = inject('mapLayers');
const eventBus: any = inject('eventBus');

// Until the PO signs off, production shows only a notice and makes no data requests (§6.10).
const isProductionHost = window.location.hostname === 'maps.biip.lt';
const isMobile = useMediaQuery('(max-width: 767px)');

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2';
const headerButton = `px-2 py-1 min-h-[24px] rounded border border-gray-300 text-xs font-semibold text-gray-800 hover:bg-gray-100 flex items-center gap-1 ${focusRing}`;
const iconButton =
  'w-11 h-11 flex items-center justify-center rounded text-gray-800 hover:bg-gray-100';

function createContext(): WolvesContext {
  const today = todayVilnius();
  const currentSeason = seasonOfDay(today);
  const data = {
    ...useWolvesData({ today }),
    municipalityStatus: ref<'pending' | 'ready' | 'failed'>('pending'),
  };
  const { state, derived, debug } = useWolvesState({ today, currentSeason, data });
  return { today, currentSeason, data, state, derived, isMobile, debug };
}

const ctx = isProductionHost ? null : createContext();
if (ctx) {
  provide(WOLVES_CTX, ctx);
  useWolvesMap(ctx);

  // P1 (§9): municipality per record, after the dataset is on screen. The UI
  // works without it; a failure only hides the municipality features.
  let municipalityIndex: Awaited<ReturnType<typeof loadMunicipalityIndex>> | null = null;
  const status = ctx.data.municipalityStatus!;
  const dataset = ctx.data.dataset;
  watch(
    dataset,
    async (value) => {
      if (!value || status.value === 'failed') return;
      // Nothing left to assign (an empty dataset included): the tab must not stay pending.
      if (value.records.every((r) => r.municipalityCode !== undefined)) {
        status.value = 'ready';
        return;
      }
      try {
        municipalityIndex = municipalityIndex || (await loadMunicipalityIndex());
      } catch (err) {
        status.value = 'failed';
        // A `sav` from the URL cannot be honoured without the polygons (§5.2: ignore it).
        ctx.state.sav.value = null;
        // eslint-disable-next-line no-console
        console.warn('[hunting/wolves] municipality lookup failed', err);
        return;
      }
      if (dataset.value !== value) return;
      // Codes from the URL that are not a municipality are ignored (§5.2).
      const sav = ctx.state.sav.value;
      if (sav != null && !municipalityIndex.byCode[sav]) ctx.state.sav.value = null;
      assignMunicipalities(value.records, municipalityIndex);
      // Publish a new dataset object with a new records array: the derived computeds
      // (records → filtered → map, histogram, sentence) only re-run when their input
      // changes identity, so an in-place update plus triggerRef would leave them stale.
      dataset.value = { ...value, records: value.records.slice() };
      status.value = 'ready';
    },
    { immediate: true },
  );
} else {
  // Production gate: no wolves layers and no data requests, but the map still needs a
  // base layer so its first 'loadend' fires and App.vue removes the loading overlay.
  if (!mapLayers.baseLayers?.some((l: any) => l?.id === vectorPositron.id)) {
    mapLayers.addBaseLayer(vectorPositron.id);
  }
}

const debug = !!ctx?.debug;
const tableOpen = computed(() => !!ctx?.state.tableOpen.value);
const hasSelection = computed(() => !!ctx?.state.selection.value);

const toggleTable = () => {
  if (ctx) ctx.state.tableOpen.value = !ctx.state.tableOpen.value;
};

// Closing the drawer (its button or Esc) removes the focused element; give focus back
// to the toggle so keyboard users are not dropped on <body> (§6.6).
const tableToggle = ref<HTMLButtonElement | null>(null);
watch(tableOpen, (open, wasOpen) => {
  if (open || !wasOpen || isMobile.value) return;
  nextTick(() => {
    const active = document.activeElement;
    if (!active || active === document.body) tableToggle.value?.focus();
  });
});

// ---- "Apie duomenis" and "Dalintis".
const about = ref<{ open: () => void } | null>(null);
const openAbout = () => about.value?.open();

async function share() {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(ctx ? ctx.state.shareUrl() : window.location.href);
    eventBus.emit('uiToast', { type: 'success', title: 'Nuoroda nukopijuota' });
  } catch (err) {
    eventBus.emit('uiToast', {
      type: 'danger',
      title: 'Nepavyko nukopijuoti. Nukopijuokite adresą iš naršyklės adreso juostos.',
    });
  }
}

// ---- Mobile: keep the map controls clear of the top bar and the bottom sheet.
const topBar = ref<HTMLElement | null>(null);
const sheet = ref<any>(null);
const { height: topBarHeight } = useElementSize(topBar, undefined, { box: 'border-box' });
const { height: sheetHeight } = useElementSize(sheet, undefined, { box: 'border-box' });

// ---- Map region label (§12.5) on the shared map element.
const mapElement = () => mapLayers.map?.getTargetElement?.() as HTMLElement | undefined;
let stopLabelWatch: (() => void) | undefined;

// ---- Page metadata (§6.10): title, lang and noindex, restored on leave.
const previousTitle = document.title;
const previousLang = document.documentElement.lang;
const robots = document.createElement('meta');
robots.name = 'robots';
robots.content = 'noindex';

onMounted(() => {
  document.title = 'Sumedžioti vilkai – BĮIP žemėlapiai';
  document.documentElement.lang = 'lt';
  document.head.appendChild(robots);

  if (ctx) {
    stopLabelWatch = watch(
      ctx.derived.sentence,
      (sentence) => {
        const el = mapElement();
        if (!el) return;
        el.setAttribute('role', 'region');
        el.setAttribute('aria-label', `Žemėlapis: ${sentence.replace(/^Rodoma:\s*/, '')}`);
      },
      { immediate: true },
    );
  }
});

onBeforeUnmount(() => {
  document.title = previousTitle;
  document.documentElement.lang = previousLang;
  robots.remove();
  stopLabelWatch?.();
  const el = mapElement();
  el?.removeAttribute('role');
  el?.removeAttribute('aria-label');
});
</script>

<style>
/* UiMap's own controls sit under the floating panels; move them clear (§7). */
.wolves-page--desktop .bottomLeft {
  transform: translateX(368px);
}
@media (min-width: 1024px) {
  .wolves-page--desktop .bottomLeft {
    transform: translateX(408px);
  }
}
.wolves-page--drawer #mapControlsRT,
.wolves-page--drawer .rightBottom {
  transform: translateX(calc(-1 * min(100vw - 24px, 520px)));
}
.wolves-page--mobile #mapControlsRT {
  transform: translateY(var(--wolves-top, 0px));
}
.wolves-page--mobile .bottomLeft,
.wolves-page--mobile .rightBottom {
  transform: translateY(calc(-1 * var(--wolves-bottom, 0px)));
}
/* §12.11: UiMap's own controls are 28 px (set with !important); make them 44 px touch
   targets on phones. */
.wolves-page--mobile .ol-control button,
.wolves-page--mobile .rightBottom button {
  width: 44px !important;
  height: 44px !important;
}
</style>
