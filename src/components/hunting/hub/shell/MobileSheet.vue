<template>
  <section
    ref="sheet"
    :aria-labelledby="showsPanel ? 'hub-title' : 'hub-sheet-title'"
    class="hub-sheet fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-xl bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.15)]"
    :class="[
      detent === 'peek' ? 'pt-3.5' : tableShown && detent === 'full' ? 'pt-8' : 'pt-11',
      dragging ? '' : 'transition-[height] duration-200 motion-reduce:transition-none',
    ]"
    :style="{ height: dragHeight !== null ? `${dragHeight}px` : HEIGHTS[detent] }"
  >
    <!-- Handle: the sheet's top 44 px (at the peek it overlaps the question); a tap cycles peek → half → full, a
         drag snaps to the nearest detent. Its name says what the next tap does. -->
    <button
      ref="handle"
      type="button"
      class="absolute inset-x-0 top-0 z-10 flex h-11 touch-none justify-center rounded-t-xl pt-1.5"
      :class="FOCUS_RING_INSET"
      :aria-label="SHEET_HANDLE[detent]"
      :aria-expanded="detent !== 'peek'"
      aria-controls="hub-sheet-body"
      @click="cycle"
      @pointerdown="onDragStart"
    >
      <span class="h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
    </button>
    <!-- Standalone: the table one tap away from the peek (embedded, the WP page's view
         switch does this, SPEC §4). -->
    <button
      v-if="peekTableLink"
      type="button"
      class="absolute right-3 top-0 z-20 h-11 px-2 text-sm font-semibold text-brand underline underline-offset-2"
      :class="FOCUS_RING_INSET"
      @click="setSegment('table')"
    >
      {{ S.segmentTable }}
    </button>

    <!-- The topic question; in the summary the panel's own heading takes its place. With
         the table shown the table's caption is the visible heading and the question only
         names the region (MOBILE-07; the WP tab above already says it). -->
    <h2 v-if="!showsPanel" id="hub-sheet-title" :class="tableShown ? 'sr-only' : titleClass">
      {{ view?.h1 || TOPIC_TABS[ctx.sel.value.topic] }}
    </h2>

    <div id="hub-sheet-body" class="flex min-h-0 flex-1 flex-col">
      <!-- A selected municipality: its card replaces the sheet content (§4.3). -->
      <div v-if="showCard" class="flex-1 overflow-y-auto px-5 pb-3">
        <component :is="areaCard" :topics="topics" @close="onCardClose" />
      </div>

      <template v-else>
        <!-- Peek: the answer (2 lines) and one more line that adds to it (the next sentence or
             the second number, JOURNEYS-04); a tap anywhere opens the sheet. -->
        <div v-if="detent === 'peek'" class="flex flex-col px-5 pb-1">
          <button
            v-if="view"
            type="button"
            class="block w-full rounded text-left"
            :class="FOCUS_RING_INSET"
            aria-controls="hub-sheet-body"
            aria-expanded="false"
            @click="cycle"
          >
            <span class="line-clamp-2 text-sm leading-5 text-ink">
              <NowrapText :text="peekAnswer" />
            </span>
            <span
              v-if="peekSecond"
              class="block truncate text-sm font-semibold leading-5 text-ink tabular-nums"
            >
              <NowrapText :text="peekSecond" />
            </span>
          </button>
          <HuntingHubShellLoadState v-else large :failed="ctx.data.phase.value === 'ready'" />
        </div>

        <template v-else>
          <!-- Standalone only: embedded, the WP page's switch owns the view (SPEC §4) and the
               header's "Filtrai" opens the filters. -->
          <div
            v-if="!ctx.embed"
            role="tablist"
            aria-label="Rodinys"
            class="mx-5 mb-3 w-[calc(100%-40px)] shrink-0"
            :class="[SEG, SEG_TOUCH]"
            @keydown="onTabKeydown"
          >
            <button
              v-for="seg in segments"
              :id="`hub-seg-${seg.id}`"
              :key="seg.id"
              ref="segButtons"
              type="button"
              role="tab"
              :aria-selected="segment === seg.id"
              :aria-controls="`hub-seg-panel-${seg.id}`"
              :tabindex="segment === seg.id ? 0 : -1"
              :disabled="seg.disabled"
              class="flex-1 disabled:opacity-50"
              :class="[SEG_ITEM, segment === seg.id ? SEG_ITEM_ON : '']"
              @click="setSegment(seg.id)"
            >
              {{ seg.label }}
            </button>
          </div>

          <div
            :id="`hub-seg-panel-${segment}`"
            :role="ctx.embed ? undefined : 'tabpanel'"
            :aria-labelledby="ctx.embed ? undefined : `hub-seg-${segment}`"
            class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-3"
          >
            <!-- Element-rooted branches: Vue 3.5.29 mis-patches a v-if'd async component that
                 is still loading (a quick segment switch; insertBefore error, vuejs/core#15551). -->
            <div v-if="segment === 'summary'" class="contents">
              <HuntingHubShellTopicPanel mobile heading-id="hub-title" />
            </div>
            <div v-else-if="segment === 'table' && tableView" class="contents">
              <component :is="tableView" variant="sheet" @close="onTableClose" />
            </div>
          </div>
        </template>
      </template>
    </div>

    <!-- The header's "Filtrai": the topic's filters, full screen. A choice applies at once;
         the footer resets them or goes back to the view, as the Vilkai and Stebėjimai
         sheets (MOBILE-08). -->
    <HuntingHubShellFullSheet :open="filtersOpen" :title="S.segmentFilters" @close="closeFilters">
      <div class="flex flex-col gap-3">
        <HuntingHubShellFilterChips large />
      </div>
      <template #footer>
        <button
          type="button"
          :class="[BTN_SECONDARY, BTN_TOUCH, 'text-base']"
          :disabled="!dimsSet"
          @click="resetDims"
        >
          {{ S.reset }}
        </button>
        <button
          type="button"
          :class="[BTN_PRIMARY, BTN_TOUCH, 'flex-1 text-base']"
          @click="closeFilters"
        >
          {{ ctx.sel.value.table ? SHOW_TABLE : SHOW_MAP }}
        </button>
      </template>
    </HuntingHubShellFullSheet>
  </section>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, inject, nextTick, ref, watch, type PropType } from 'vue';
import type { TopicDef } from '@/utils/hunting/hub/types';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { HUB_MOBILE_PEEK, mobileHeader } from '@/utils/hunting/hub/layout';
import { S, TOPIC_TABS } from '@/utils/hunting/hub/strings';
import { setTableOpen } from './shell';
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TOUCH,
  FOCUS_RING_INSET,
  SEG,
  SEG_ITEM,
  SEG_ITEM_ON,
  SEG_TOUCH,
} from './controls';
import {
  firstSentence,
  nearestDetent,
  nextDetent,
  peekSecondLine,
  SHEET_HANDLE,
  useMapInert,
  useSheetDrag,
  type SheetDetent,
} from './sheet';
import { useDimChips } from './useDimChips';
import NowrapText from './NowrapText.vue';

type Detent = SheetDetent;
type Segment = 'summary' | 'table';

// Mobile bottom sheet (§4.3): peek 96 px (question, answer, one number), half 50 %, full =
// screen minus the header. Standalone, the half and full detents start with a segmented
// Suvestinė | Lentelė; embedded, the WP page's view switch opens the table (full detent)
// and the sheet holds only the summary. The filters open full screen from the header.
defineProps({
  // Topic registry, passed through to the area card ("Kiti rodikliai čia").
  topics: { type: Array as PropType<TopicDef[]>, default: () => [] },
});
// 'detent' (detent: Detent): the sheet's height changed (the shell hides map overlays
// under the full sheet).
const emit = defineEmits(['detent']);

const ctx = inject(HUB_CTX)!;
const view = computed(() => ctx.view.value);

// Height of the mobile header above the sheet (embedded: the chip row only).
const headerHeight = mobileHeader(ctx.embed);

const HEIGHTS: Record<Detent, string> = {
  peek: `${HUB_MOBILE_PEEK}px`,
  half: '50%',
  full: `calc(100% - ${headerHeight}px)`,
};

const detent = ref<Detent>('peek');
const segment = ref<Segment>('summary');

// The full sheet covers the map: its controls leave the Tab order (WCAG 2.4.11).
useMapInert(computed(() => detent.value === 'full'));
watch(detent, (value) => emit('detent', value), { immediate: true });

const components = getCurrentInstance()?.appContext.components || {};
const tableView = 'HuntingHubTableTableView' in components ? 'HuntingHubTableTableView' : null;
const areaCard = 'HuntingHubMapAreaCard' in components ? 'HuntingHubMapAreaCard' : null;
const showCard = computed(
  () => !!areaCard && ctx.sel.value.sav !== null && detent.value !== 'full',
);
// The summary panel is on screen (it brings its own heading, `hub-title`).
const showsPanel = computed(
  () => !showCard.value && detent.value !== 'peek' && segment.value === 'summary',
);
const peekTableLink = computed(
  () => detent.value === 'peek' && !showCard.value && !!view.value?.tables.length && !ctx.embed,
);
const titleClass = computed(() => [
  'shrink-0 truncate px-5 text-[15px] font-bold leading-5 text-ink',
  { 'pr-24': peekTableLink.value, 'mb-2': detent.value !== 'peek' },
]);
// The table is on screen (its caption is the sheet's visible heading).
const tableShown = computed(
  () => !showCard.value && detent.value !== 'peek' && segment.value === 'table' && !!tableView,
);

const segments = computed(() => [
  { id: 'summary' as const, label: S.segmentSummary, disabled: false },
  { id: 'table' as const, label: S.segmentTable, disabled: !view.value?.tables.length },
]);

// The peek's two lines: the first sentence when the answer has more, so the clamp never
// puts its ellipsis after a full stop.
const peekAnswer = computed(() => firstSentence(view.value?.answer || ''));

// The second line never repeats the first: the answer's next sentence ("Daugiausia –
// Kėdainių r. sav. (92), …"), else the second number, else the headline ("129 485
// sumedžiota · +8,5 % nei 2024/2025") when the first line does not state it.
const peekSecond = computed(() =>
  peekSecondLine(view.value?.answer || '', peekAnswer.value, view.value?.kpis || []),
);

// Set while the sheet itself closes the table (see the watch below).
let closedBySheet = false;

// The table segment and the `lentele` URL key are one state.
watch(
  () => ctx.sel.value.table,
  (table) => {
    if (table) {
      segment.value = 'table';
      detent.value = 'full';
    } else {
      if (segment.value === 'table') segment.value = 'summary';
      // Embedded, a table closed from outside the sheet (the WP page's "Žemėlapis", Back,
      // the table's "Rodyti žemėlapyje") asks for the map: a full sheet would still cover
      // it. Lower it to the peek, or to half when a municipality card should show.
      if (ctx.embed && !closedBySheet && detent.value === 'full') {
        detent.value = ctx.sel.value.sav !== null ? 'half' : 'peek';
      }
    }
    closedBySheet = false;
  },
  { immediate: true },
);

// A map tap selects a municipality: open the sheet far enough to show its card.
watch(
  () => ctx.sel.value.sav,
  (code) => {
    if (code !== null && detent.value === 'peek') detent.value = 'half';
  },
  { immediate: true },
);

// Standalone segments: "Suvestinė" keeps the sheet height, "Lentelė" opens the table.
function setSegment(id: Segment) {
  segment.value = id;
  closedBySheet = id !== 'table' && ctx.sel.value.table !== null;
  setTableOpen(ctx, id === 'table');
  if (detent.value === 'peek') detent.value = 'half';
}

// The table's own close button: standalone back to the summary; embedded the map, as the
// WP page's "Žemėlapis" (the watch above lowers the sheet).
function onTableClose() {
  if (ctx.embed) setTableOpen(ctx, false);
  else setSegment('summary');
}

// Lowering the sheet to the peek closes the table (the peek shows the map and the answer).
function setDetent(next: Detent) {
  if (next === 'peek' && ctx.sel.value.table !== null) {
    closedBySheet = true;
    setTableOpen(ctx, false);
  }
  detent.value = next;
}

const segButtons = ref<HTMLButtonElement[]>([]);
function onTabKeydown(event: KeyboardEvent) {
  const list = segButtons.value.filter((b) => !b.disabled);
  const i = list.findIndex((b) => b === document.activeElement);
  if (i < 0) return;
  let next = -1;
  if (event.key === 'ArrowRight') next = (i + 1) % list.length;
  else if (event.key === 'ArrowLeft') next = (i - 1 + list.length) % list.length;
  if (next < 0) return;
  event.preventDefault();
  list[next].focus();
  list[next].click();
}

function cycle() {
  if (consumeClick()) return;
  setDetent(nextDetent(detent.value));
}

// "Filtrai" in the header: a full-screen sheet over everything; an open table stays open
// (embedded, `lentele` is the WP page's view switch). Focus returns to the trigger.
const filtersOpen = ref(false);
let filtersTrigger: HTMLElement | null = null;
function openFilters() {
  const active = document.activeElement;
  filtersTrigger = active instanceof HTMLElement && active !== document.body ? active : null;
  filtersOpen.value = true;
}
async function closeFilters() {
  filtersOpen.value = false;
  await nextTick();
  if (filtersTrigger?.isConnected) filtersTrigger.focus({ preventScroll: true });
  filtersTrigger = null;
}

// "Atstatyti": every dimension of the topic back to its default (the sheet holds no place).
const SHOW_TABLE = 'Rodyti lentelę';
const SHOW_MAP = 'Rodyti žemėlapį';
const dimChips = useDimChips(ctx);
const dimsSet = computed(() => dimChips.value.some((c) => c.value !== c.fallback));
function resetDims() {
  dimChips.value.filter((c) => c.value !== c.fallback).forEach((c) => ctx.setDim(c.key, null));
}

// The area card's ✕ or Esc (it clears the municipality, as on desktop): its button is gone,
// so focus goes to the sheet handle instead of the document (MOBILE-A11Y-10).
const handle = ref<HTMLButtonElement | null>(null);
function onCardClose() {
  nextTick(() => handle.value?.focus({ preventScroll: true }));
}

function openSummary() {
  segment.value = 'summary';
  if (detent.value === 'peek') detent.value = 'half';
}

defineExpose({ openFilters, openSummary });

// ---- Drag on the handle: snaps to the nearest detent.
const sheet = ref<HTMLElement | null>(null);
const { dragging, dragHeight, onDragStart, consumeClick } = useSheetDrag({
  sheet,
  max: () => window.innerHeight - headerHeight,
  onEnd: (h) => setDetent(nearestDetent(h, window.innerHeight - headerHeight)),
});
</script>
