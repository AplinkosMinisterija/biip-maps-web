<template>
  <section
    ref="sheetEl"
    aria-labelledby="steb-sheet-title"
    class="fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-xl bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.15)]"
    :class="[
      showCard && dragHeight === null ? 'max-h-[60%]' : '',
      dragging ? '' : 'transition-[height] duration-200 motion-reduce:transition-none',
    ]"
    :style="{ height: sheetHeight }"
  >
    <h2 id="steb-sheet-title" class="sr-only">{{ SS.h1 }}</h2>

    <!-- Handle: a tap cycles peek → half → full and a drag snaps to the nearest one, as the
         hub's sheet; with a record card open a tap (or a drag down) closes the card (the
         sheet then shows its detent again), and the handle says so. -->
    <button
      type="button"
      class="flex h-6 w-full shrink-0 touch-none items-center justify-center rounded-t-xl"
      :class="focusRing"
      :aria-label="handleLabel"
      :aria-expanded="showCard ? undefined : detent !== 'peek'"
      aria-controls="steb-sheet-body"
      @click="cycle"
      @pointerdown="onDragStart"
    >
      <span class="h-1 w-10 rounded-full bg-gray-300" aria-hidden="true" />
    </button>
    <!-- The table one tap away from the peek; embedded, the WP page's switch does this. -->
    <button
      v-if="detent === 'peek' && !showCard && !ctx.embed && hasTable"
      type="button"
      class="absolute right-2 top-0 flex h-6 items-center gap-1 rounded px-2 text-xs font-semibold text-brand underline"
      :class="focusRing"
      @click="setSegment('table')"
    >
      {{ SS.segmentTable }}
    </button>

    <div id="steb-sheet-body" class="flex min-h-0 flex-1 flex-col">
      <!-- A selected record: its card replaces the sheet content. -->
      <div v-if="showCard" class="overflow-y-auto px-3 pb-3">
        <StebCard sheet />
      </div>

      <!-- Peek: the answer in two lines. -->
      <div v-else-if="detent === 'peek'" class="flex flex-col gap-1 px-3 pb-2">
        <template v-if="ctx.data.phase.value === 'error'">
          <p class="text-sm font-medium text-gray-900">{{ SS.loadError }}</p>
          <button
            type="button"
            class="min-h-[44px] self-start rounded-md border border-gray-400 bg-white px-3 text-sm font-semibold text-gray-900"
            :class="focusRing"
            @click="ctx.data.reload()"
          >
            {{ SS.retry }}
          </button>
        </template>
        <p v-else-if="!ctx.derived.ready.value" role="status" class="text-sm text-gray-700">
          {{ SS.loading }}
        </p>
        <p v-else class="line-clamp-2 text-sm leading-snug text-gray-900">{{ peekText }}</p>
      </div>

      <template v-else>
        <div
          role="tablist"
          :aria-label="SS.segmentsLabel"
          class="mx-3 mb-2 grid shrink-0 grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1"
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
            class="min-h-[44px] rounded-md text-sm font-semibold disabled:opacity-50"
            :class="[focusRing, segment === seg.id ? 'bg-brand text-white' : 'text-gray-900']"
            @click="setSegment(seg.id)"
          >
            {{ seg.label }}
          </button>
        </div>
        <div
          :id="`steb-seg-panel-${segment}`"
          role="tabpanel"
          :aria-labelledby="`steb-seg-${segment}`"
          class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3"
        >
          <!-- Element-rooted branches (no fragment swaps; see the hub's MobileSheet). -->
          <div v-if="segment === 'summary'" class="flex flex-col gap-3">
            <StebPanel mobile />
          </div>
          <div v-else class="flex flex-col">
            <StebTable variant="sheet" @show-on-map="onShowOnMap" @close="setSegment('summary')" />
          </div>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
// Mobile bottom sheet of the Stebėjimai topic (STEB-SPEC §3.1), modelled on the wolves and
// hub sheets: peek = the answer; half/full = Suvestinė | Lentelė; a selected record shows
// its card. The table segment and `lentele` are one state (`tableOpen`): the WP page's
// "Lentelė" expands the sheet to it, "Žemėlapis" lowers it back to the peek.
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue';
import { STEB_CTX } from '@/composables/hunting/hub/stebejimai/useStebState';
import { HUB_MOBILE_PEEK, mobileHeader } from '@/utils/hunting/hub/layout';
import { SS } from '@/utils/hunting/hub/stebejimai/strings';
import StebCard from './StebCard.vue';
import StebPanel from './StebPanel.vue';
import StebTable from './StebTable.vue';

type Detent = 'peek' | 'half' | 'full';
type Segment = 'summary' | 'table';

const ctx = inject(STEB_CTX)!;
const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

const HEIGHTS: Record<Detent, string> = {
  peek: `${HUB_MOBILE_PEEK}px`,
  half: '50%',
  full: `calc(100% - ${mobileHeader(ctx.embed)}px)`,
};

const detent = ref<Detent>(ctx.state.tableOpen.value ? 'full' : 'peek');
const segment = computed<Segment>(() => (ctx.state.tableOpen.value ? 'table' : 'summary'));
const hasTable = computed(() => ctx.data.phase.value !== 'error');
const showCard = computed(() => !!ctx.state.selection.value && !ctx.state.tableOpen.value);

const segments = computed(() => [
  { id: 'summary' as const, label: SS.segmentSummary, disabled: false },
  { id: 'table' as const, label: SS.segmentTable, disabled: !hasTable.value },
]);

const handleLabel = computed(() => {
  if (showCard.value) return SS.closeRecord;
  return detent.value === 'full' ? SS.sheetCollapse : SS.sheetExpand;
});

const peekText = computed(() => {
  if (!ctx.derived.records.value.length) {
    return ctx.isProductionHost ? SS.noRecordsProd : SS.noRecordsTest;
  }
  return ctx.derived.answer.value.text;
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
