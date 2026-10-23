<template>
  <div v-if="ctx" class="hub-vilkai" :style="cssVars">
    <!-- The answer, announced once per change (the panel's own lines are not live). -->
    <p class="sr-only" aria-live="polite">{{ announced }}</p>

    <!-- Desktop and tablet (≥ 768 px), SPEC2 §4.1, §6.2. -->
    <template v-if="!isMobile">
      <!-- Filter bar under the shell's 56 px top bar (embedded: at the top, SPEC §4): the same
           56 px bar, gutter and chips as the other topics (CONTROLS-10). -->
      <div
        role="search"
        aria-label="Vilkų filtrai"
        class="absolute inset-x-0 h-14 z-40 bg-white border-b border-line px-[var(--hub-gutter,16px)] flex items-center gap-2"
        :class="embed ? 'top-0' : 'top-14'"
      >
        <!-- Until the records arrive the chips wait (disabled, no period guessed from the
             calendar): the default season depends on the data (J-05, J-17). -->
        <fieldset
          :disabled="loadingData"
          class="contents"
          :class="loadingData ? '[&>*]:opacity-60' : ''"
        >
          <!-- The snapshot fallback: the chip shows and picks the copy's season, so there is
               one season control (JOURNEYS-11). Element-rooted branches (async components). -->
          <div v-if="fallback" class="contents">
            <HuntingHubTopicsVilkaiFallbackSeasonChip
              :seasons="fallbackSeasons"
              :model-value="fallbackSeason"
              @update:model-value="setFallbackSeason"
            />
          </div>
          <div v-else class="contents">
            <HuntingHubTopicsVilkaiChipPopover
              name="Laikotarpis"
              :value="loadingData ? '…' : ctx.derived.periodLabel.value"
              title="Laikotarpis"
              :active="!loadingData && !isDefaultPeriod"
              shrinkable
              panel-class="w-[400px]"
            >
              <HuntingWolvesPeriodFilter :show-season-note="false" />
            </HuntingHubTopicsVilkaiChipPopover>
          </div>
          <HuntingHubShellPlacePicker
            :model-value="ctx.state.sav.value"
            :items="municipalityList"
            @update:model-value="onPlace"
          />
          <HuntingHubTopicsVilkaiChipPopover
            name=""
            :value="S.moreFilters(attrCount)"
            title="Daugiau filtrų"
            :active="attrCount > 0"
            :disabled="fallback"
            :disabled-hint="S_LIVE_ONLY"
            panel-class="w-[440px]"
          >
            <HuntingWolvesMoreFilters embedded />
          </HuntingHubTopicsVilkaiChipPopover>
          <button
            v-if="!isDefaultFilters"
            type="button"
            :class="[BTN_TEXT, 'shrink-0 whitespace-nowrap']"
            @click="ctx.state.reset()"
          >
            {{ S.resetFilters }}
          </button>
        </fieldset>

        <!-- Embedded, the WP page's view switch opens and closes the table (SPEC §4). -->
        <div
          v-if="!fallback && !embed"
          role="group"
          aria-label="Rodinys"
          class="ml-auto shrink-0"
          :class="SEG"
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

      <!-- Panel: the answer first, the chart right under the KPIs (SPEC2 §7); as tall as its
           content, up to the bottom of the frame (D18). -->
      <section
        v-if="!railed"
        id="hub-panel"
        ref="panelEl"
        aria-labelledby="hub-vilkai-title"
        class="absolute left-[var(--hub-panel-left)] top-[calc(var(--hub-top)+8px)] max-h-[calc(100%-var(--hub-top)-16px)] w-[var(--hub-panel-w)] z-30 bg-white rounded-lg shadow-lg overflow-y-auto overscroll-contain"
        :class="panelMore ? MORE_BELOW_MASK : ''"
      >
        <div
          :ref="(node) => trackPanel(node as HTMLElement | null)"
          class="relative overflow-hidden p-4 flex flex-col gap-3"
        >
          <h1
            id="hub-vilkai-title"
            tabindex="-1"
            class="text-xl font-semibold text-ink focus:outline-none"
          >
            {{ VILKAI_H1 }}
          </h1>
          <!-- Plain wrappers: the branches swap async components, keep their parents stable. -->
          <div v-if="fallback" class="flex flex-col gap-3">
            <HuntingWolvesStatusCard variant="line" />
            <HuntingHubTopicsVilkaiVilkaiFallback
              v-if="fallbackSnapshot"
              :snapshot="fallbackSnapshot"
              @view="(view: TopicView) => (fallbackView = view)"
            />
            <p v-else role="status" class="text-sm text-gray-700">{{ S.loading }}</p>
          </div>
          <div v-else class="flex flex-col gap-3">
            <!-- The other topics' anatomy (AnswerBlock): badge, then the answer (VISUAL-19). -->
            <div class="flex flex-col gap-1">
              <p v-if="seasonBadge"><HuntingHubShellStateBadge :badge="seasonBadge" /></p>
              <HuntingWolvesFilterSentence />
            </div>
            <HuntingWolvesLoadState placement="panel" :show-timestamp="false" />
            <!-- One loading line (the answer) until the records arrive; then the current
                 season's status, named as such, below the answer of the chosen period. -->
            <div v-if="!loadingData" class="flex flex-col gap-3">
              <HuntingWolvesStatusCard variant="line" />
              <HuntingWolvesSeasonSummary />
              <HuntingWolvesHistogram clip-to-window />
            </div>
          </div>

          <footer
            v-if="!embed && !fallback && provenanceTime"
            class="flex flex-col gap-1 text-xs text-ink-muted"
          >
            <p>
              {{ S.provenanceLive(provenanceTime) }} ·
              <button type="button" :class="linkButton" @click="openAbout">
                {{ S.provenanceLink }}
              </button>
            </p>
          </footer>
          <HuntingWolvesDebugPanel v-if="ctx.debug" />
        </div>
      </section>

      <!-- ≥ 1280 px with the table open: the panel collapses to the 56 px rail (D14), the same
           floating rail as the other topics; it closes the table. -->
      <aside
        v-else
        id="hub-panel"
        aria-label="Suvestinė"
        class="absolute left-[var(--hub-panel-left)] top-[calc(var(--hub-top)+8px)] w-14 z-30 bg-white rounded-lg shadow-lg overflow-hidden"
      >
        <HuntingHubShellPanelRail :title="railTitle" :value="railCount" @expand="setTable(false)" />
      </aside>

      <!-- Table: in place of the map, right of the rail (≥ 1280 px) or of the panel (D14). -->
      <HuntingWolvesTableDrawer compact :drawer-class="drawerClass" @show-on-map="onShowOnMap" />
      <!-- Embedded, the snapshot fallback's table opens from the WP view switch, in place of
           the map like the live table. -->
      <section
        v-if="fallbackTableShown && fallbackTable"
        aria-labelledby="hub-vilkai-fallback-table-title"
        :class="drawerClass"
        @keydown.esc="closeFallbackTable(true)"
      >
        <div class="flex flex-wrap items-start justify-between gap-3 px-4 pb-2 pt-4">
          <h2
            id="hub-vilkai-fallback-table-title"
            tabindex="-1"
            class="text-base font-bold leading-[22px] text-ink focus:outline-none"
          >
            {{ fallbackTable.title }}
          </h2>
          <div class="contents">
            <HuntingHubTableCsvButton
              :table="fallbackTable"
              :caption="fallbackTable.title"
              :sort="fallbackSort"
              :provenance="fallbackView?.provenance"
            />
          </div>
        </div>
        <div class="flex min-h-0 flex-1 flex-col px-4 py-3">
          <HuntingHubTableDataTable
            fill
            :table="fallbackTable"
            :caption="fallbackTable.title || ''"
            :sort="fallbackSort"
            :selected-sav="ctx.state.sav.value"
            @update:sort="(next: SortState | null) => (fallbackSort = next)"
            @show-on-map="onFallbackShowOnMap"
          />
        </div>
      </section>

      <div v-if="!replacesMap && !fallback" class="absolute bottom-10 z-20" :class="legendLeft">
        <HuntingWolvesMapLegend collapsible />
      </div>

      <!-- Top right on the container edge, as the other topics' cards (VISUAL-10); under a
           desktop table the map is hidden (D14), so the card only shows with the map. -->
      <div
        v-if="hasSelection && !replacesMap"
        class="absolute top-[calc(var(--hub-top)+8px)] right-[var(--hub-gutter,16px)] z-30"
      >
        <div class="w-[360px] max-w-[calc(100vw-32px)]">
          <HuntingWolvesWolfCard />
        </div>
      </div>
    </template>

    <!-- Mobile (< 768 px): the chip row completes the shell's 56 px header to 108 px
         (embedded: the chip row alone, at the top). Same row as the other topics
         (CONTROLS-04): [Laikotarpis] [Vieta] [Filtrai (n)]. -->
    <template v-else>
      <div
        role="search"
        aria-label="Vilkų filtrai"
        class="absolute inset-x-0 z-30 h-[60px] bg-white shadow-md px-4 py-2 flex min-w-0 items-center gap-2"
        :class="embed ? 'top-0' : 'top-14'"
      >
        <!-- Until the records arrive: a disabled chip, no period guessed from the calendar
             (J-05, J-17); element-rooted v-if branches (async components). -->
        <fieldset
          :disabled="loadingData"
          class="contents"
          :class="loadingData ? '[&>*]:opacity-60' : ''"
        >
          <div v-if="loadingData" class="contents">
            <button
              type="button"
              disabled
              class="inline-flex h-11 shrink-0 items-center gap-1 rounded-full border border-line-strong bg-white px-3 text-base text-ink"
            >
              Laikotarpis: …
            </button>
          </div>
          <div v-else-if="fallback" class="contents">
            <HuntingHubTopicsVilkaiFallbackSeasonChip
              mobile
              :seasons="fallbackSeasons"
              :model-value="fallbackSeason"
              @update:model-value="setFallbackSeason"
            />
          </div>
          <div v-else class="contents"><HuntingWolvesPeriodSheet compact class="shrink-0" /></div>
          <HuntingHubShellPlacePicker
            mobile
            :model-value="ctx.state.sav.value"
            :items="municipalityList"
            @update:model-value="onPlace"
          />
          <HuntingHubShellFilterChip
            ref="filtersTrigger"
            class="shrink-0"
            touch
            :value="S.filters"
            :badge="attrCount"
            :active="attrCount > 0"
            :chevron="false"
            :disabled="fallback"
            :title="fallback ? S_LIVE_ONLY : undefined"
            :sr-label="S.filtersChip(attrCount)"
            aria-haspopup="dialog"
            @click="openFilters"
          />
        </fieldset>
        <HuntingHubShellFullSheet :open="filtersOpen" :title="S.filters" @close="closeFilters">
          <HuntingWolvesMoreFilters v-model:draft="attrsDraft" large embedded staged />
          <!-- Staged: the map redraws only with "Rodyti N vilkų" (CONTROLS-17); the actions
               are pinned below the list (MOBILE-09). -->
          <template #footer>
            <button
              type="button"
              :class="[BTN_SECONDARY, BTN_TOUCH, 'text-base']"
              @click="attrsDraft = { age: [], sex: [], method: [] }"
            >
              {{ S.reset }}
            </button>
            <button
              type="button"
              :class="[BTN_PRIMARY, BTN_TOUCH, 'flex-1 text-base']"
              @click="applyFilters"
            >
              {{ draftLabel }}
            </button>
          </template>
        </HuntingHubShellFullSheet>
      </div>
      <HuntingWolvesMobileSheet
        ref="sheet"
        clip-histogram
        :inert="fallbackTableShown ? true : undefined"
        @detent="(detent: SheetDetent) => (sheetDetent = detent)"
      >
        <template #status>
          <div v-if="!loadingData" class="min-w-0">
            <HuntingWolvesStatusCard variant="line" />
          </div>
        </template>
        <HuntingHubTopicsVilkaiVilkaiFallback
          v-if="fallback && fallbackSnapshot"
          :snapshot="fallbackSnapshot"
          @view="(view: TopicView) => (fallbackView = view)"
        />
      </HuntingWolvesMobileSheet>
      <!-- Embedded, the snapshot fallback's table from the WP view switch: below the chip
           row, over the map and the sheet, as cards (D7). -->
      <section
        v-if="fallbackTableShown && fallbackTable"
        aria-labelledby="hub-vilkai-fallback-table-title"
        class="absolute inset-x-0 bottom-0 top-[var(--hub-mobile-header)] z-40 flex flex-col gap-3 overflow-y-auto overscroll-contain bg-white px-4 pb-3 pt-4"
        @keydown.esc="closeFallbackTable(true)"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <h2
            id="hub-vilkai-fallback-table-title"
            tabindex="-1"
            class="text-[15px] font-bold leading-5 text-ink focus:outline-none"
          >
            {{ fallbackTable.title }}
          </h2>
          <div class="contents">
            <HuntingHubTableCsvButton
              :table="fallbackTable"
              :caption="fallbackTable.title"
              :sort="fallbackSort"
              :provenance="fallbackView?.provenance"
            />
          </div>
        </div>
        <HuntingHubTableCardList
          :table="fallbackTable"
          :caption="fallbackTable.title || ''"
          :sort="fallbackSort"
          :selected-sav="ctx.state.sav.value"
          @update:sort="(next: SortState | null) => (fallbackSort = next)"
          @show-on-map="onFallbackShowOnMap"
        />
      </section>
      <!-- Phone legend above the collapsed sheet (DATAVIZ-01); the fallback map uses the
           shell's choropleth legend. Not under a sheet that covers the map (MOBILE-02). -->
      <div
        v-if="!fallback && !tableOpen && !mapCovered"
        class="absolute left-3 z-20 bottom-[calc(var(--hub-vilkai-sheet,176px)+8px)]"
      >
        <HuntingWolvesMapLegend phone />
      </div>
    </template>

    <!-- The loading pill and the empty-result card, below the shell's bars (inert under the
         expanded phone sheet, which covers them). -->
    <div
      class="absolute inset-x-0 bottom-0 top-[var(--hub-top)] z-20 pointer-events-none"
      :inert="isMobile && mapCovered ? true : undefined"
    >
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
  toRaw,
  watch,
  watchEffect,
  type Ref,
} from 'vue';
import { useElementSize, useMediaQuery, useWindowSize, watchDebounced } from '@vueuse/core';
import { WOLVES_CTX, type WolvesContext } from '@/composables/hunting/context';
import { HUB_CTX, type EmbedLiveControls } from '@/composables/hunting/hub/context';
import { HUB_SHELL } from '@/components/hunting/hub/shell/shell';
import { useWolvesData } from '@/composables/hunting/useWolvesData';
import { useWolvesMap } from '@/composables/hunting/useWolvesMap';
import { useWolvesState } from '@/composables/hunting/useWolvesState';
import { WOLVES_MUNICIPALITY_OUTLINE_LAYER_ID } from '@/utils/hunting/layers';
import {
  formatDateTime,
  formatInt,
  pluralLt,
  seasonInterval,
  seasonOfDay,
  todayVilnius,
  WOLVES_ACC,
} from '@/utils/hunting/dates';
import { assignMunicipalities, loadMunicipalityIndex } from '@/utils/hunting/municipalities';
import {
  HUB_MOBILE_PEEK,
  hubCssVars,
  isRailed,
  mapPadding,
  mobileHeader,
  tableReplacesMap,
} from '@/utils/hunting/hub/layout';
import { ABOUT_HEADINGS, S, TOPIC_TABS } from '@/utils/hunting/hub/strings';
import type { SnapshotData, TableDef, TopicView } from '@/utils/hunting/hub/types';
import type { SortState } from '@/components/hunting/hub/table/sort';
import { embedFocusAllowed } from '@/utils/hunting/hub/embed';
import { mapCovered, useMapInert, type SheetDetent } from '@/components/hunting/hub/shell/sheet';
import { MORE_BELOW_MASK, useMoreBelow } from '@/components/hunting/hub/shell/useMoreBelow';
import {
  VILKAI_COMPARE,
  VILKAI_H1,
  vilkaiFallbackSeasons,
  type VilkaiCarry,
} from '@/utils/hunting/hub/topics/vilkai';
import { WOLVES_TABLES } from '@/utils/hunting/hub/url';
import { filterRecords } from '@/utils/hunting/wolves';
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT,
  BTN_TOUCH,
  FOCUS_RING as focusRing,
  SEG,
  SEG_ITEM,
  SEG_ITEM_ON,
} from '@/components/hunting/hub/shell/controls';

const mapLayers: any = inject('mapLayers');
// Optional: the component also runs outside the hub (with its own defaults).
const hub = inject(HUB_CTX, null);
const shell = inject(HUB_SHELL, null);
// Embedded in the WP data page (SPEC §4): no own view toggle, no rail, the WP bar on top.
const embed = !!hub?.embed;

const isProductionHost = hub ? hub.isProductionHost : window.location.hostname === 'maps.biip.lt';
const isMobile: Ref<boolean> = hub ? hub.isMobile : useMediaQuery('(max-width: 767px)');
const { width } = useWindowSize();

// Standalone "Žemėlapis | Lentelė" switch: the segmented control of the vocabulary.
const viewButton = `${SEG_ITEM} gap-2`;
const viewButtonActive = SEG_ITEM_ON;
const viewButtonIdle = '';
const linkButton = `font-semibold text-brand underline rounded ${focusRing}`;

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
// The records are on their way (the snapshot fallback takes over when they fail): the
// default season is not known yet, so nothing may show a period or a count (J-05, J-17).
const loadingData = computed(() => !!ctx && !ctx.data.dataset.value && !fallback.value);
const railed = computed(() => !isMobile.value && isRailed(width.value, tableOpen.value, embed));
const replacesMap = computed(
  () => !isMobile.value && tableReplacesMap(width.value, tableOpen.value, embed),
);
const cssVars = computed(() => hubCssVars(width.value, embed));

// On phones the map keeps Lithuania above the sheet (the wolves sheet measures itself: the
// peek, the half detent or a wolf's card). While the sheet covers the map (the table, the
// full detent) the padding stays put, so the map does not jump behind it.
const sheet = ref<any>(null);
const sheetDetent = ref<SheetDetent>('peek');
const { height: sheetHeight } = useElementSize(sheet, undefined, { box: 'border-box' });
let collapsedSheet = HUB_MOBILE_PEEK;
function viewPadding(open: boolean): number[] {
  if (!isMobile.value) return mapPadding(width.value, open, embed);
  if (!open && sheetDetent.value !== 'full' && sheetHeight.value) {
    collapsedSheet = Math.max(HUB_MOBILE_PEEK, sheetHeight.value);
  }
  return [mobileHeader(embed), 0, collapsedSheet, 0];
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

// ---- The answer, announced (debounced) in one live region: the filter sentence, or the
// fallback's answer; nothing while the records load (the map's loading pill says so).
const announced = ref('');
const answerText = computed(() => {
  if (!ctx) return '';
  if (fallback.value) return fallbackView.value?.answer || '';
  return ctx.data.dataset.value ? ctx.derived.sentence.value : '';
});
watchDebounced(answerText, (text) => (announced.value = text), { debounce: 500 });

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
  if (!failed) {
    // The live data is back ("Bandyti gauti gyvus duomenis"): an open fallback table becomes
    // the live municipality table.
    if (fallbackTableOpen.value && ctx) {
      fallbackTableOpen.value = false;
      ctx.state.tableTab.value = 'savivaldybes';
      setTable(true);
    }
    return;
  }
  ensure(['meta', 'wolves']);
  // The live drawer would have no data. Embedded, a table that was open (a `lentele` link,
  // the WP view switch) becomes the fallback's table; standalone the panel shows it.
  if (embed && tableOpen.value) fallbackTableOpen.value = true;
  setTable(false);
});

// The fallback's season: the wolves period when it is a closed season of the copy, else the
// newest one (as VilkaiFallback); a pick sets the wolves period, so the URL keeps it.
const fallbackSeasons = computed(() =>
  fallbackSnapshot.value ? vilkaiFallbackSeasons(fallbackSnapshot.value) : [],
);
const fallbackSeason = computed<number | null>(() => {
  const current = ctx?.derived.intervalSeason.value ?? null;
  return current !== null && fallbackSeasons.value.includes(current)
    ? current
    : (fallbackSeasons.value[0] ?? null);
});
function setFallbackSeason(season: number) {
  ctx?.state.setInterval(seasonInterval(season), `season:${season}`);
}
// The attribute filters need the live records.
const S_LIVE_ONLY = 'Galima tik su gyvais duomenimis';

// ---- Embedded fallback table (the municipality table of the wolves.json copy), opened and
// closed by the WP page's view switch through the bridge.
const fallbackTable = computed<TableDef | null>(() => fallbackView.value?.tables[0] ?? null);
const fallbackTableOpen = ref(false);
const fallbackTableShown = computed(() => embed && fallback.value && fallbackTableOpen.value);
const fallbackSort = ref<SortState | null>(null);
// On phones it covers the map: the map's controls leave the Tab order (WCAG 2.4.11).
useMapInert(computed(() => isMobile.value && fallbackTableShown.value));
function closeFallbackTable(byKey = false) {
  fallbackTableOpen.value = false;
  // Esc removed the focused element: give focus to the panel heading (desktop) instead.
  if (byKey) nextTick(() => document.getElementById('hub-vilkai-title')?.focus());
}
// "Rodyti žemėlapyje": the table gives way to the map with the municipality selected.
function onFallbackShowOnMap(code: number) {
  fallbackTableOpen.value = false;
  if (ctx) ctx.state.sav.value = code;
}
// Opened: keyboard users land on its heading (embedded: only while the frame has focus,
// without scrolling the WP page, SPEC §5.8).
watch(fallbackTableShown, (shown) => {
  if (!shown || !embedFocusAllowed(embed)) return;
  nextTick(() =>
    document.getElementById('hub-vilkai-fallback-table-title')?.focus({ preventScroll: true }),
  );
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

// "Sezonas vyksta" while the shown period is the current season (the live data is never
// preliminary); none for a past season or a custom date range.
const seasonBadge = computed(() =>
  ctx && !loadingData.value && ctx.derived.intervalSeason.value === ctx.currentSeason
    ? ('vyksta' as const)
    : undefined,
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
const isDefaultFilters = computed(
  () => isDefaultPeriod.value && attrCount.value === 0 && ctx?.state.sav.value == null,
);
// The place picker's list (the municipality boundaries index, loaded on mount).
const placeIndex = shallowRef<Awaited<ReturnType<typeof loadMunicipalityIndex>> | null>(null);
const municipalityList = computed(() =>
  (placeIndex.value?.list || []).map((m) => ({ code: m.code, name: m.name })),
);
// The place picker sets the municipality; the watch below moves the map.
function onPlace(code: number | null) {
  if (ctx) ctx.state.sav.value = code;
}
// Every municipality change zooms to it, or back to Lithuania (JOURNEYS-03): the picker, a
// deep link (?sav=82), the table's "Rodyti žemėlapyje", Back/Forward. After the map has
// loaded and the DOM settled (on phones the full-screen picker has closed), so the view has
// its real size and padding.
if (ctx) {
  watch(
    () => [ctx.state.sav.value, placeIndex.value] as const,
    async ([code, index], previous) => {
      if (!mapLayers || !index) return;
      const [oldCode, oldIndex] = previous || [undefined, null];
      if (oldIndex && code === oldCode) return;
      await mapLayers.waitForLoaded;
      await nextTick();
      if (unmounted || ctx.state.sav.value !== code) return;
      const info = code != null ? index.byCode[code] : null;
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (info) {
        mapLayers.zoomToExtent(info.extent3857, { animate: !reduceMotion, maxZoom: 12 });
        if (ctx.debug) checkOutline(info.name);
      } else if (code == null && oldIndex && oldCode != null) mapLayers.centerMap();
    },
    { immediate: true },
  );
}
// ?debug=1: once the map has drawn the place, exactly one municipality is outlined, and it
// is the chosen one (JOURNEYS-03).
function checkOutline(name: string) {
  const map = mapLayers?.map ? toRaw(mapLayers.map) : null;
  const layer = map
    ?.getLayers()
    .getArray()
    .find((l: any) => l.get('id') === WOLVES_MUNICIPALITY_OUTLINE_LAYER_ID);
  if (!map || !layer) return;
  map.once('rendercomplete', () => {
    const extent = map.getView().calculateExtent(map.getSize());
    const names = [
      ...new Set(
        (layer.getSource().getFeaturesInExtent(extent) as any[])
          .filter((f) => f.getGeometry()?.getType() !== 'Point' && layer.getStyleFunction()(f, 1))
          .map((f) => `${f.get('name') || ''}`),
      ),
    ];
    const ok = names.length === 1 && names[0] === name;
    // eslint-disable-next-line no-console
    (ok ? console.info : console.error)(
      `[hunting/hub] savitikra: pažymėta savivaldybė ${ok ? 'OK' : 'KLAIDA'} (${names.join(', ') || '–'})`,
    );
  });
}

// ---- Phone Filtrai sheet: the attribute filters, staged until "Rodyti N vilkų".
type Attrs = { age: string[]; sex: string[]; method: string[] };
const filtersOpen = ref(false);
const filtersTrigger = ref<{ focus(): void } | null>(null);
const attrsDraft = ref<Attrs>({ age: [], sex: [], method: [] });
function openFilters() {
  if (!ctx) return;
  attrsDraft.value = { ...ctx.state.attrs.value };
  filtersOpen.value = true;
}
function closeFilters() {
  filtersOpen.value = false;
  nextTick(() => filtersTrigger.value?.focus());
}
function applyFilters() {
  if (ctx && JSON.stringify(attrsDraft.value) !== JSON.stringify(ctx.state.attrs.value)) {
    ctx.state.attrs.value = { ...attrsDraft.value };
  }
  closeFilters();
}
const draftLabel = computed(() => {
  const records = ctx?.data.dataset.value?.records;
  if (!ctx || !records) return 'Rodyti';
  const n = filterRecords(records, {
    interval: ctx.state.interval.value,
    sav: ctx.state.sav.value,
    ...attrsDraft.value,
  }).length;
  return `Rodyti ${formatInt(n)} ${pluralLt(n, WOLVES_ACC)}`;
});
watch(isMobile, (mobile) => {
  if (!mobile) filtersOpen.value = false;
});

// ---- Panel height (D18) and rail: the topic and the answer's number, vertical.
const panelEl = ref<HTMLElement | null>(null);
const { more: panelMore, track: trackPanel } = useMoreBelow(panelEl);
const railTitle = TOPIC_TABS.vilkai;
const railCount = computed(() =>
  ctx?.data.dataset.value ? formatInt(ctx.derived.filtered.value.length) : '',
);

// The table pane (D14), as the snapshot topics' TableView: right of the rail or the panel to
// the window edge, the content to the right gutter (the gutter minus the rows' 16 px padding).
const drawerClass = computed(
  () =>
    `absolute right-0 top-[var(--hub-top)] bottom-0 z-30 bg-white flex flex-col pr-[max(0px,calc(var(--hub-gutter,16px)-16px))] ${
      railed.value ? 'left-[var(--hub-table-left)]' : 'left-[var(--hub-content-left)]'
    }`,
);
// The legend's place matches the snapshot topics' (data.vue .hub-legend), VISUAL-21.
const legendLeft = 'left-[calc(var(--hub-content-left)+8px)]';

const hasSelection = computed(() => !!ctx?.state.selection.value);
const provenanceTime = computed(() => {
  const at = ctx?.data.fetchedAt.value;
  return at ? formatDateTime(at) : '';
});

function setTable(open: boolean) {
  if (ctx) ctx.state.tableOpen.value = open;
}

// "Rodyti žemėlapyje": the table covers the map at every desktop width (D14), so close it.
function onShowOnMap() {
  if (!isMobile.value) setTable(false);
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

// ---- Embedded: the WP page's view switch opens and closes the table through the bridge
// (SPEC §5.4, §5.11); Back/Forward also name the table. Registered while this topic is
// mounted.
// The fallback's table id (`vilkaiFallbackView`), one of WOLVES_TABLES.
const FALLBACK_TABLE = 'savivaldybes';
const liveControls: EmbedLiveControls = {
  setTableOpen(open: boolean, table?: string) {
    // The live drawer would be empty while the API fails: the fallback has one table (its
    // municipalities), whichever table was asked for.
    if (fallback.value) {
      fallbackTableOpen.value = open;
      setTable(false);
      return;
    }
    if (open && ctx && table && WOLVES_TABLES.indexOf(table) >= 0) {
      ctx.state.tableTab.value = table as typeof ctx.state.tableTab.value;
    }
    setTable(open);
  },
  // While the copy loads its table is not known yet: report it, as the live topic does.
  hasTable: computed(() => !fallback.value || !fallbackView.value || !!fallbackTable.value),
  table: computed(() => {
    if (!ctx) return null;
    if (fallback.value) return fallbackTableShown.value ? FALLBACK_TABLE : null;
    return ctx.state.tableOpen.value ? ctx.state.tableTab.value : null;
  }),
  // The fallback shows the wolves.json copy: report its date, so the WP provenance line
  // does not say "live" next to the hub's snapshot notice.
  provenance: computed(() => {
    if (fallback.value) {
      const asOf =
        fallbackView.value?.provenance.asOf || snapshot.value?.meta?.snapshotDate || null;
      return {
        kind: 'snapshot' as const,
        asOf,
        text: asOf ? S.provenanceSnapshot(asOf) : undefined,
      };
    }
    const at = ctx?.data.fetchedAt.value;
    return {
      kind: 'live' as const,
      asOf: null,
      text: at ? S.provenanceLive(formatDateTime(at)) : undefined,
    };
  }),
};

onMounted(async () => {
  if (hub && embed) {
    hub.embedLive.value = liveControls;
    // A switch that opened the table (an overview card's "Lentelė", setTopic `openTable`)
    // wrote `lentele` to the URL, but when this component's chunk is already loaded the
    // wolves state reads the URL before the router has applied it: open the table here.
    const pick = hub.sel.value.table;
    if (ctx && pick && !ctx.state.tableOpen.value) liveControls.setTableOpen(true, pick);
  }
  if (!ctx) return;
  ensure(['meta']);
  // "Dalintis" in the shell copies the wolves link (period always explicit).
  if (shell) shell.shareOverride.value = shareUrl;
  previousMapLabel = mapElement()?.getAttribute('aria-label') ?? null;
  try {
    placeIndex.value = await loadMunicipalityIndex();
  } catch (err) {
    // Without the polygons the place chip is disabled (an empty list).
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
  if (hub && hub.embedLive.value === liveControls) hub.embedLive.value = null;
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
/* UiMap's own controls (SPEC2 §4): below the 112 px bars (embedded: 56 px; the shell sets
   --hub-top / --hub-mobile-header), right of the panel, above the mobile sheet. An open table
   hides the map (data.vue `.hub-map`, `hub-vilkai--replace`). */
body.hub-vilkai--desktop #mapControlsRT {
  transform: translateY(var(--hub-top, 112px));
}
body.hub-vilkai--desktop .bottomLeft {
  transform: translateX(calc(var(--hub-content-left, 396px) - 8px));
}
body.hub-vilkai--mobile #mapControlsRT {
  transform: translateY(var(--hub-mobile-header, 108px));
}
body.hub-vilkai--mobile .rightBottom {
  transform: translateY(calc(-1 * var(--hub-vilkai-sheet, 0px)));
}
/* The scale line above the phone legend. */
body.hub-vilkai--mobile .bottomLeft {
  transform: translateY(calc(-1 * (var(--hub-vilkai-sheet, 0px) + 56px)));
}
/* 44 px touch targets on phones, as on the wolves page. */
body.hub-vilkai--mobile .ol-control button,
body.hub-vilkai--mobile .rightBottom button {
  width: 44px !important;
  height: 44px !important;
}
</style>
