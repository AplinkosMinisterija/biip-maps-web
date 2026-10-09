<template>
  <section
    ref="sheet"
    aria-labelledby="hub-sheet-title"
    class="hub-sheet fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-xl bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.15)]"
    :class="dragging ? '' : 'transition-[height] duration-200 motion-reduce:transition-none'"
    :style="{ height: dragHeight !== null ? `${dragHeight}px` : HEIGHTS[detent] }"
  >
    <!-- Handle: tap cycles peek → half → full, drag snaps to the nearest detent. -->
    <button
      type="button"
      class="flex h-6 w-full shrink-0 touch-none items-center justify-center rounded-t-xl"
      :class="focusRing"
      :aria-label="detent === 'full' ? 'Suskleisti skydelį' : 'Išskleisti skydelį'"
      :aria-expanded="detent !== 'peek'"
      aria-controls="hub-sheet-body"
      @click="cycle"
      @pointerdown="onDragStart"
    >
      <span class="h-1 w-10 rounded-full bg-gray-300" aria-hidden="true" />
    </button>
    <!-- The table one tap away from the peek (the handle alone does not say it is there). -->
    <button
      v-if="detent === 'peek' && !showCard && view?.tables.length"
      type="button"
      class="absolute right-2 top-0 flex h-6 items-center gap-1 rounded px-2 text-xs font-semibold text-blue-800 underline"
      :class="focusRing"
      @click="setSegment('table')"
    >
      {{ S.segmentTable }}
    </button>

    <h2 id="hub-sheet-title" class="sr-only">{{ view?.h1 || TOPIC_TABS[ctx.sel.value.topic] }}</h2>

    <div id="hub-sheet-body" class="flex min-h-0 flex-1 flex-col">
      <!-- A selected municipality: its card replaces the sheet content (§4.3). -->
      <div v-if="showCard" class="flex-1 overflow-y-auto px-3 pb-3">
        <component :is="areaCard" :topics="topics" />
      </div>

      <template v-else>
        <!-- Peek: the answer (2 lines) and one number. -->
        <div v-if="detent === 'peek'" class="flex flex-col gap-1 px-3 pb-2">
          <template v-if="view">
            <p class="line-clamp-2 text-sm leading-snug text-gray-900">{{ view.answer }}</p>
            <p v-if="headline" class="text-sm font-semibold tabular-nums text-gray-900">
              {{ headline }}
            </p>
          </template>
          <HuntingHubShellLoadState v-else large :failed="ctx.data.phase.value === 'ready'" />
        </div>

        <template v-else>
          <div
            role="tablist"
            aria-label="Rodinys"
            class="mx-3 mb-2 grid shrink-0 grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1"
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
              class="min-h-[44px] rounded-md text-sm font-semibold disabled:opacity-50"
              :class="[focusRing, segment === seg.id ? 'bg-gray-900 text-white' : 'text-gray-900']"
              @click="setSegment(seg.id)"
            >
              {{ seg.label }}
            </button>
          </div>

          <div
            :id="`hub-seg-panel-${segment}`"
            role="tabpanel"
            :aria-labelledby="`hub-seg-${segment}`"
            class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3"
          >
            <HuntingHubShellTopicPanel v-if="segment === 'summary'" mobile heading-id="hub-title" />
            <component
              :is="tableView"
              v-else-if="segment === 'table' && tableView"
              variant="sheet"
              @close="setSegment('summary')"
            />
            <div v-else-if="segment === 'filters'" class="flex flex-col gap-3">
              <HuntingHubShellFilterChips large />
            </div>
          </div>
        </template>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  inject,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
  type PropType,
} from 'vue';
import type { TopicDef } from '@/utils/hunting/hub/types';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { HUB_MOBILE_HEADER, HUB_MOBILE_PEEK } from '@/utils/hunting/hub/layout';
import { S, TOPIC_TABS } from '@/utils/hunting/hub/strings';
import { focusRing, setTableOpen } from './shell';

type Detent = 'peek' | 'half' | 'full';
type Segment = 'summary' | 'table' | 'filters';

// Mobile bottom sheet (§4.3): peek 96 px (answer + one number), half 50 %, full = screen
// minus the header; from the half detent a segmented tablist Suvestinė | Lentelė | Filtrai.
defineProps({
  // Topic registry, passed through to the area card ("Kiti rodikliai čia").
  topics: { type: Array as PropType<TopicDef[]>, default: () => [] },
});

const ctx = inject(HUB_CTX)!;
const view = computed(() => ctx.view.value);

const HEIGHTS: Record<Detent, string> = {
  peek: `${HUB_MOBILE_PEEK}px`,
  half: '50%',
  full: `calc(100% - ${HUB_MOBILE_HEADER}px)`,
};

const detent = ref<Detent>('peek');
const segment = ref<Segment>('summary');

const components = getCurrentInstance()?.appContext.components || {};
const tableView = 'HuntingHubTableTableView' in components ? 'HuntingHubTableTableView' : null;
const areaCard = 'HuntingHubMapAreaCard' in components ? 'HuntingHubMapAreaCard' : null;
const showCard = computed(
  () => !!areaCard && ctx.sel.value.sav !== null && detent.value !== 'full',
);

const segments = computed(() => [
  { id: 'summary' as const, label: S.segmentSummary, disabled: false },
  { id: 'table' as const, label: S.segmentTable, disabled: !view.value?.tables.length },
  { id: 'filters' as const, label: S.segmentFilters, disabled: false },
]);

const headline = computed(() => {
  const kpi = view.value?.kpis[0];
  if (!kpi) return '';
  return [`${kpi.value} ${kpi.label}`, kpi.sub].filter(Boolean).join(' · ');
});

// The table segment and the `lentele` URL key are one state.
watch(
  () => ctx.sel.value.table,
  (table) => {
    if (table) {
      segment.value = 'table';
      detent.value = 'full';
    } else if (segment.value === 'table') {
      segment.value = 'summary';
    }
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

function setSegment(id: Segment) {
  segment.value = id;
  setTableOpen(ctx, id === 'table');
  if (detent.value === 'peek') detent.value = 'half';
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
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  detent.value = detent.value === 'peek' ? 'half' : detent.value === 'half' ? 'full' : 'peek';
}

// "Filtrai" in the header opens the sheet on the filters segment.
async function openFilters() {
  segment.value = 'filters';
  setTableOpen(ctx, false);
  if (detent.value === 'peek') detent.value = 'half';
  await nextTick();
  document.getElementById('hub-seg-filters')?.focus();
}

function openSummary() {
  segment.value = 'summary';
  if (detent.value === 'peek') detent.value = 'half';
}

defineExpose({ openFilters, openSummary });

// ---- Drag on the handle.
const sheet = ref<HTMLElement | null>(null);
const dragging = ref(false);
const dragHeight = ref<number | null>(null);
let startY = 0;
let startH = 0;
let suppressClick = false;

function onDragStart(event: PointerEvent) {
  if (!sheet.value) return;
  startY = event.clientY;
  startH = sheet.value.getBoundingClientRect().height;
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
  const max = window.innerHeight - HUB_MOBILE_HEADER;
  dragHeight.value = Math.max(HUB_MOBILE_PEEK, Math.min(max, startH + dy));
}

function onDragEnd() {
  removeDragListeners();
  dragging.value = false;
  const h = dragHeight.value;
  dragHeight.value = null;
  if (h === null) return;
  // The click that ends a drag must not also cycle the detent.
  suppressClick = true;
  setTimeout(() => (suppressClick = false), 100);
  const full = window.innerHeight - HUB_MOBILE_HEADER;
  const half = window.innerHeight / 2;
  const options: [Detent, number][] = [
    ['peek', HUB_MOBILE_PEEK],
    ['half', half],
    ['full', full],
  ];
  detent.value = options.reduce((a, b) => (Math.abs(b[1] - h) < Math.abs(a[1] - h) ? b : a))[0];
}
</script>
