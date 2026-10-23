<template>
  <section
    ref="sheetEl"
    :aria-labelledby="showsPanel ? 'hub-title' : 'steb-sheet-title'"
    class="fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-xl bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.15)]"
    :class="[
      detent === 'peek' && !showCard ? 'pt-3.5' : 'pt-11',
      showCard && dragHeight === null ? 'max-h-[60%]' : '',
      dragging ? '' : 'transition-[height] duration-200 motion-reduce:transition-none',
    ]"
    :style="{ height: sheetHeight }"
  >
    <!-- Handle: the sheet's top 44 px (at the peek it overlaps the question); a tap cycles
         peek → half → full and a drag snaps to the nearest one, as the hub's sheet; with a
         record card open a tap (or a drag down) closes the card (the sheet then shows its
         detent again), and the handle says so. -->
    <button
      type="button"
      class="absolute inset-x-0 top-0 z-10 flex h-11 touch-none justify-center rounded-t-xl pt-1.5"
      :class="FOCUS_RING_INSET"
      :aria-label="handleLabel"
      :aria-expanded="showCard ? undefined : detent !== 'peek'"
      aria-controls="steb-sheet-body"
      @click="cycle"
      @pointerdown="onDragStart"
    >
      <span class="h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
    </button>
    <!-- Standalone: the table one tap away from the peek; embedded, the WP page's switch
         does this. -->
    <button
      v-if="peekTableLink"
      type="button"
      class="absolute right-3 top-0 z-20 h-11 px-2 text-sm font-semibold text-brand underline underline-offset-2"
      :class="FOCUS_RING_INSET"
      @click="setSegment('table')"
    >
      {{ SS.segmentTable }}
    </button>

    <!-- The topic question; in the summary the panel's own heading takes its place. -->
    <h2
      v-if="!showsPanel"
      id="steb-sheet-title"
      class="shrink-0 truncate px-5 text-[15px] font-bold leading-5 text-ink"
      :class="{ 'pr-24': peekTableLink, 'mb-2': detent !== 'peek' }"
    >
      {{ SS.h1 }}
    </h2>

    <div id="steb-sheet-body" class="flex min-h-0 flex-1 flex-col">
      <!-- A selected record: its card replaces the sheet content. -->
      <div v-if="showCard" class="overflow-y-auto px-5 pb-3">
        <StebCard sheet />
      </div>

      <!-- Peek: the answer in two lines; a tap opens the sheet. -->
      <div v-else-if="detent === 'peek'" class="flex flex-col gap-1 px-5 pb-1">
        <template v-if="ctx.data.phase.value === 'error'">
          <p class="text-sm font-medium text-ink">{{ SS.loadError }}</p>
          <button
            type="button"
            class="min-h-[44px] self-start rounded-full border border-brand bg-white px-4 text-sm font-semibold text-brand hover:bg-brand-50"
            :class="FOCUS_RING"
            @click="ctx.data.reload()"
          >
            {{ SS.retry }}
          </button>
        </template>
        <p v-else-if="!ctx.derived.ready.value" role="status" class="text-sm text-ink-muted">
          {{ SS.loading }}
        </p>
        <button
          v-else
          type="button"
          class="block w-full rounded text-left"
          :class="FOCUS_RING_INSET"
          aria-controls="steb-sheet-body"
          aria-expanded="false"
          @click="cycle"
        >
          <span class="line-clamp-2 text-sm leading-5 text-ink">
            <NowrapText :text="peekText" />
          </span>
        </button>
      </div>

      <template v-else>
        <!-- Standalone only: embedded, the WP page's switch owns the view. -->
        <div
          v-if="!ctx.embed"
          role="tablist"
          :aria-label="SS.segmentsLabel"
          class="mx-5 mb-3 w-[calc(100%-40px)] shrink-0"
          :class="[SEG, SEG_TOUCH]"
          @keydown="onTabKeydown"
        >
          <button
            v-for="seg in segments"
            :id="`steb-seg-${seg.id}`"
            :key="seg.id"
            ref="segButtons"
            type="button"
            role="tab"
            :aria-selected="segment === seg.id"
            :aria-controls="`steb-seg-panel-${seg.id}`"
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
          :id="`steb-seg-panel-${segment}`"
          :role="ctx.embed ? undefined : 'tabpanel'"
          :aria-labelledby="ctx.embed ? undefined : `steb-seg-${segment}`"
          class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-3"
        >
          <!-- Element-rooted branches (no fragment swaps; see the hub's MobileSheet). -->
          <div v-if="segment === 'summary'" class="flex flex-col gap-3">
            <StebPanel mobile />
          </div>
          <div v-else class="flex flex-col">
            <StebTable variant="sheet" @show-on-map="onShowOnMap" @close="onTableClose" />
          </div>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
// Mobile bottom sheet of the Stebėjimai topic (STEB-SPEC §3.1), modelled on the hub's
// sheet: peek = the question and the answer; half/full = the summary (standalone with
// Suvestinė | Lentelė); a selected record shows its card. The table and `lentele` are one
// state (`tableOpen`): the WP page's "Lentelė" expands the sheet to it at the full detent,
// "Žemėlapis" lowers it back to the peek.
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue';
import { STEB_CTX } from '@/composables/hunting/hub/stebejimai/useStebState';
import { HUB_MOBILE_PEEK, mobileHeader } from '@/utils/hunting/hub/layout';
import { SS } from '@/utils/hunting/hub/stebejimai/strings';
import {
  FOCUS_RING,
  FOCUS_RING_INSET,
  SEG,
  SEG_ITEM,
  SEG_ITEM_ON,
  SEG_TOUCH,
} from '@/components/hunting/hub/shell/controls';
import {
  firstSentence,
  SHEET_HANDLE,
  useMapInert,
  type SheetDetent,
} from '@/components/hunting/hub/shell/sheet';
import NowrapText from '@/components/hunting/hub/shell/NowrapText.vue';
import StebCard from './StebCard.vue';
import StebPanel from './StebPanel.vue';
import StebTable from './StebTable.vue';

type Detent = SheetDetent;
type Segment = 'summary' | 'table';

const ctx = inject(STEB_CTX)!;

const HEIGHTS: Record<Detent, string> = {
  peek: `${HUB_MOBILE_PEEK}px`,
  half: '50%',
  full: `calc(100% - ${mobileHeader(ctx.embed)}px)`,
};

const detent = ref<Detent>(ctx.state.tableOpen.value ? 'full' : 'peek');
const segment = computed<Segment>(() => (ctx.state.tableOpen.value ? 'table' : 'summary'));
const hasTable = computed(() => ctx.data.phase.value !== 'error');
const showCard = computed(() => !!ctx.state.selection.value && !ctx.state.tableOpen.value);
// The summary panel is on screen (it brings its own heading, `hub-title`).
const showsPanel = computed(
  () => !showCard.value && detent.value !== 'peek' && segment.value === 'summary',
);
const peekTableLink = computed(
  () => detent.value === 'peek' && !showCard.value && !ctx.embed && hasTable.value,
);
// The full sheet covers the map: its controls leave the Tab order (WCAG 2.4.11).
useMapInert(computed(() => !showCard.value && detent.value === 'full'));

const segments = computed(() => [
  { id: 'summary' as const, label: SS.segmentSummary, disabled: false },
  { id: 'table' as const, label: SS.segmentTable, disabled: !hasTable.value },
]);

const handleLabel = computed(() => {
  if (showCard.value) return SS.closeRecord;
  return SHEET_HANDLE[detent.value];
});

const peekText = computed(() => {
  if (!ctx.derived.records.value.length) {
    return ctx.isProductionHost ? SS.noRecordsProd : SS.noRecordsTest;
  }
  // The first sentence when there are more: no clamp ellipsis after a full stop.
  return firstSentence(ctx.derived.answer.value.text);
});

// Set while the sheet's own segment closes the table (it keeps the sheet height).
let closedBySheet = false;
watch(
  () => ctx.state.tableOpen.value,
  (open) => {
    if (open) detent.value = 'full';
    // Closed from outside the sheet (the WP "Žemėlapis", "Rodyti žemėlapyje"): show the map.
    else if (!closedBySheet) detent.value = 'peek';
    closedBySheet = false;
  },
);

function setSegment(id: Segment) {
  if (id === 'table' && !hasTable.value) return;
  closedBySheet = id === 'summary' && ctx.state.tableOpen.value;
  ctx.state.setTable(id === 'table');
  if (id === 'table') detent.value = 'full';
  else if (detent.value === 'peek') detent.value = 'half';
}

// The table's own close button: standalone back to the summary; embedded the map, as the
// WP page's "Žemėlapis" (the watch above lowers the sheet).
function onTableClose() {
  if (ctx.embed) ctx.state.setTable(false);
  else setSegment('summary');
}

// Lowering the sheet to the peek closes the table (the peek has no segments).
function setDetent(next: Detent) {
  if (next === 'peek' && ctx.state.tableOpen.value) {
    closedBySheet = true;
    ctx.state.setTable(false);
  }
  detent.value = next;
}

function cycle() {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  if (showCard.value) {
    ctx.state.clearSelection();
    return;
  }
  setDetent(detent.value === 'peek' ? 'half' : detent.value === 'half' ? 'full' : 'peek');
}

// ---- Drag on the handle (the hub's MobileSheet logic).
const sheetEl = ref<HTMLElement | null>(null);
const dragging = ref(false);
const dragHeight = ref<number | null>(null);
const sheetHeight = computed(() => {
  if (dragHeight.value !== null) return `${dragHeight.value}px`;
  return showCard.value ? 'auto' : HEIGHTS[detent.value];
});
const headerHeight = mobileHeader(ctx.embed);
// A drag down this far with a card open closes the card.
const CARD_DISMISS_PX = 40;
let startY = 0;
let startH = 0;
let suppressClick = false;

function onDragStart(event: PointerEvent) {
  if (!sheetEl.value) return;
  startY = event.clientY;
  startH = sheetEl.value.getBoundingClientRect().height;
  dragging.value = true;
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragEnd);
  window.addEventListener('pointercancel', onDragEnd);
}

function removeDragListeners() {
  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup', onDragEnd);
  window.removeEventListener('pointercancel', onDragEnd);
}
onBeforeUnmount(removeDragListeners);

function onDragMove(event: PointerEvent) {
  const dy = startY - event.clientY;
  if (Math.abs(dy) < 6 && dragHeight.value === null) return;
  const max = window.innerHeight - headerHeight;
  dragHeight.value = Math.max(HUB_MOBILE_PEEK, Math.min(max, startH + dy));
}

function onDragEnd() {
  removeDragListeners();
  dragging.value = false;
  const h = dragHeight.value;
  dragHeight.value = null;
  if (h === null) return;
  // The click that ends a drag must not also cycle the detent or close the card.
  suppressClick = true;
  setTimeout(() => (suppressClick = false), 100);
  if (showCard.value) {
    if (h < startH - CARD_DISMISS_PX) ctx.state.clearSelection();
    return;
  }
  const full = window.innerHeight - headerHeight;
  const half = window.innerHeight / 2;
  const options: [Detent, number][] = [
    ['peek', HUB_MOBILE_PEEK],
    ['half', half],
    ['full', full],
  ];
  setDetent(options.reduce((a, b) => (Math.abs(b[1] - h) < Math.abs(a[1] - h) ? b : a))[0]);
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

// "Rodyti žemėlapyje" in the sheet: close the table so the map and the card show.
function onShowOnMap() {
  ctx.state.setTable(false);
}
</script>
