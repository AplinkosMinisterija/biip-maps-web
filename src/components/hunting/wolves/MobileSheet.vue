<template>
  <section
    ref="sheetEl"
    aria-labelledby="wolves-sheet-title"
    class="fixed inset-x-0 bottom-0 z-30 bg-white rounded-t-xl shadow-[0_-4px_16px_rgba(0,0,0,0.15)] flex flex-col"
    :class="sheetClass"
    :style="sheetStyle"
  >
    <!-- Hub, embedded: the hub sheets' handle (MOBILE-04): the top 44 px (at the peek it
         overlaps the heading); a tap cycles peek → half → full, a drag snaps to the nearest
         detent; with a wolf's card open a tap closes the card. -->
    <button
      v-if="detents"
      type="button"
      class="absolute inset-x-0 top-0 z-10 flex h-11 touch-none justify-center rounded-t-xl pt-1.5"
      :class="FOCUS_RING_INSET"
      :aria-label="handleLabel"
      :aria-expanded="showCard ? undefined : detent !== 'peek'"
      aria-controls="wolves-sheet-body"
      @click="cycle"
      @pointerdown="onDragStart"
    >
      <span class="h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
    </button>
    <div v-else-if="!showCard" class="flex shrink-0 justify-center pt-1.5" aria-hidden="true">
      <span class="w-10 h-1 rounded-full bg-line-strong" />
    </div>
    <!-- Hub: the topic question is the sheet's heading (the wolves page: "Rezultatai"). -->
    <div
      class="flex shrink-0 items-center gap-2 px-5"
      :class="
        heading && !detents
          ? 'min-h-[44px]'
          : detents && detent !== 'peek' && !expanded
            ? 'mb-2'
            : ''
      "
    >
      <!-- With the table (embedded) its caption is the visible heading (MOBILE-07). -->
      <h2
        id="wolves-sheet-title"
        :class="
          heading && !(detents && expanded)
            ? 'flex-1 min-w-0 text-[15px] font-bold leading-5 text-ink'
            : 'sr-only'
        "
      >
        {{ heading || 'Rezultatai' }}
      </h2>
      <!-- Embedded, the WP page's view switch opens and closes the table (SPEC §4). -->
      <button
        v-if="!showCard && !embed"
        type="button"
        class="ml-auto shrink-0 h-11"
        :class="BTN_SECONDARY"
        :aria-expanded="expanded"
        aria-controls="wolves-sheet-body"
        @click="toggle"
      >
        {{ expanded ? 'Žemėlapis' : 'Lentelė' }}
        <UiIcon :name="expanded ? 'chevron-down' : 'chevron-up'" :size="16" aria-hidden="true" />
      </button>
    </div>

    <!-- The selected wolf replaces the collapsed content (§7.3). -->
    <div v-if="showCard" class="overflow-y-auto px-5 pb-3" :class="detents ? '' : 'pt-1'">
      <HuntingWolvesWolfCard />
    </div>

    <!-- Hub, embedded, at the peek: the answer line only (two lines), as the other topics'
         96 px peek; the status line and the chart are one tap up (MOBILE-04, VISUAL-16). -->
    <div
      v-else-if="detents && detent === 'peek'"
      id="wolves-sheet-body"
      class="flex min-h-0 flex-col gap-1 px-5 pb-1 pt-1 [&_p]:line-clamp-2"
    >
      <HuntingWolvesFilterSentence />
      <HuntingWolvesLoadState placement="panel" :show-timestamp="false" />
    </div>

    <div
      v-else
      id="wolves-sheet-body"
      ref="body"
      class="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-3 flex flex-col gap-3"
      @wheel.passive="stopAlign"
      @touchstart.passive="stopAlign"
      @pointerdown="stopAlign"
      @keydown="stopAlign"
    >
      <!-- Hub: its fallback and notes (empty on the wolves page). -->
      <slot />
      <HuntingWolvesFilterSentence />
      <!-- Embedded, the WP header line is the one place of the provenance (D9). -->
      <HuntingWolvesLoadState placement="panel" :show-timestamp="!embed" />
      <!-- Hub: the current season's status line, below the answer. -->
      <slot name="status" />
      <!-- Hub: one loading line (the answer) until the records arrive, no empty tiles. -->
      <div v-if="!waiting" class="contents">
        <!-- An element-rooted branch: Vue 3.5.29 patches a v-if'd async component that is
             still loading with the wrong parent (insertBefore error), e.g. when the Vilkai
             fallback closes the sheet right after it opened (vuejs/core#15551). -->
        <div v-if="open" class="contents"><HuntingWolvesSeasonSummary /></div>
        <HuntingWolvesHistogram :compact="!open" large :clip-to-window="clipHistogram" />
      </div>
      <!-- Also element-rooted, not a <template>: removing a fragment removes the loading
           placeholders of its async components, and in Vue 3.5.29 the first page load then
           never finishes when one of them arrives (the loader stays). Embedded, the place
           and the other filters are in the header's "Filtrai". -->
      <div v-if="expanded" class="contents">
        <div v-if="!embed" class="contents">
          <HuntingWolvesMoreFilters large />
          <HuntingWolvesMunicipalitySelect />
        </div>
        <HuntingWolvesTableDrawer variant="sheet" @show-on-map="collapse" />
      </div>
      <div v-if="open && ctx.debug" class="contents"><HuntingWolvesDebugPanel /></div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { HUB_MOBILE_PEEK, mobileHeader } from '@/utils/hunting/hub/layout';
import { VILKAI_H1 } from '@/utils/hunting/hub/topics/vilkai';
import { BTN_SECONDARY, FOCUS_RING_INSET } from '@/components/hunting/hub/shell/controls';
import {
  nearestDetent,
  nextDetent,
  SHEET_HANDLE,
  useMapInert,
  useSheetDrag,
  type SheetDetent,
} from '@/components/hunting/hub/shell/sheet';

defineProps({
  // Hub: the histogram shows Oct … Mar plus "Kiti mėn." for a full season (SPEC2 §7).
  clipHistogram: { type: Boolean, default: false },
});
// 'detent' (detent: SheetDetent): the sheet's height changed (hub, embedded).
const emit = defineEmits(['detent']);

const ctx = inject(WOLVES_CTX)!;
// The hub's context (the Vilkai tab); null on the wolves page.
const hub = inject(HUB_CTX, null);
// Inside the hub embedded in the WP data page (SPEC §4); false on the wolves page.
const embed = !!hub?.embed;
const heading = hub ? VILKAI_H1 : '';

// On mobile the expanded sheet is the table view, so it shares `tableOpen`
// with the desktop drawer and the `lentele` URL key (§5.2).
const expanded = computed(() => ctx.state.tableOpen.value);
const showCard = computed(() => !!ctx.state.selection.value && !expanded.value);
// Hub: until the records arrive the answer line says so, without tiles or bars.
const waiting = computed(() => !!hub && !ctx.data.dataset.value);

// ---- Hub, embedded: the detents of the hub's sheets (MOBILE-04). Peek 96 px (the heading
// and the answer line), half = the answer, the season's status and the chart (≤ 60 %),
// full = the screen below the chip row with the season summary; the table (the WP page's
// "Lentelė") opens at the full detent, and lowering the sheet to the peek closes it.
// Standalone the sheet keeps its two states and its own "Lentelė" button.
const detents = embed;
const detent = ref<SheetDetent>(expanded.value ? 'full' : 'peek');
// The full content (season summary, the full chart): the table, or the full detent.
const open = computed(() => expanded.value || (detents && detent.value === 'full'));
watch(detent, (value) => emit('detent', value), { immediate: true });

// Hub: the full sheet covers the whole map below the header; its controls leave the Tab
// order (WCAG 2.4.11).
useMapInert(computed(() => !!hub && (expanded.value || (detents && detent.value === 'full'))));

const headerHeight = mobileHeader(embed);
const fullHeight = `calc(100% - ${headerHeight}px)`;
const sheetEl = ref<HTMLElement | null>(null);
const { dragging, dragHeight, onDragStart, consumeClick } = useSheetDrag({
  sheet: sheetEl,
  max: () => window.innerHeight - headerHeight,
  onEnd: (h, startH) => {
    if (showCard.value) {
      if (h < startH - CARD_DISMISS_PX) ctx.state.clearSelection();
      return;
    }
    setDetent(nearestDetent(h, window.innerHeight - headerHeight));
  },
});
// A drag down this far with a card open closes the card.
const CARD_DISMISS_PX = 40;

const sheetClass = computed(() => {
  if (!detents) {
    return expanded.value ? (hub ? '' : 'h-[85vh]') : 'min-h-[176px] max-h-[60vh]';
  }
  const auto = dragHeight.value === null && (showCard.value || detent.value === 'half');
  return [
    detent.value === 'peek' && !showCard.value ? 'pt-3.5' : expanded.value ? 'pt-8' : 'pt-11',
    auto ? 'max-h-[60%]' : '',
    dragging.value ? '' : 'transition-[height] duration-200 motion-reduce:transition-none',
  ];
});
const sheetStyle = computed(() => {
  if (!detents) return expanded.value && hub ? { height: fullHeight } : undefined;
  if (dragHeight.value !== null) return { height: `${dragHeight.value}px` };
  if (showCard.value || detent.value === 'half') return undefined;
  return { height: detent.value === 'peek' ? `${HUB_MOBILE_PEEK}px` : fullHeight };
});

const handleLabel = computed(() =>
  showCard.value ? 'Uždaryti kortelę' : SHEET_HANDLE[detent.value],
);

// Set while the sheet itself closes the table (lowered to the peek): keep that detent.
let closedBySheet = false;
watch(expanded, (table) => {
  if (!detents) return;
  if (table) detent.value = 'full';
  // Closed from outside the sheet (the WP "Žemėlapis", "Rodyti žemėlapyje"): the map.
  else if (!closedBySheet) detent.value = 'peek';
  closedBySheet = false;
});

function setDetent(next: SheetDetent) {
  if (next === 'peek' && expanded.value) {
    closedBySheet = true;
    ctx.state.tableOpen.value = false;
  }
  detent.value = next;
}

function cycle() {
  if (consumeClick()) return;
  if (showCard.value) {
    ctx.state.clearSelection();
    return;
  }
  setDetent(nextDetent(detent.value));
}

// Set by the sheet's own button: it keeps the wolves page behaviour (the expanded sheet
// opens at the top, where the filters are).
let ownToggle = false;
const toggle = () => {
  ownToggle = true;
  ctx.state.tableOpen.value = !ctx.state.tableOpen.value;
};

// Embedded, the WP page's "Lentelė" (or a WP link with `lentele`) opens this sheet as the
// table view (SPEC §3.2 F): bring the table to the top of the sheet body instead of leaving
// it below the summary, the histogram and the filters. The blocks above it grow while the
// data loads, so keep it there for ALIGN_MS after the expansion and after each data change,
// until the user touches the sheet or collapses it.
const ALIGN_MS = 3000;
const body = ref<HTMLElement | null>(null);
let alignWanted = false;
let alignRaf = 0;
function stopAlign() {
  alignWanted = false;
  if (alignRaf) cancelAnimationFrame(alignRaf);
  alignRaf = 0;
}
function alignTable() {
  stopAlign();
  alignWanted = true;
  const until = performance.now() + ALIGN_MS;
  const step = () => {
    alignRaf = 0;
    const el = body.value;
    const table = el?.querySelector<HTMLElement>('[aria-labelledby="wolves-table-sheet-title"]');
    if (el && table) {
      // Scroll the sheet body only: scrollIntoView would also scroll the WP page.
      const delta = table.getBoundingClientRect().top - el.getBoundingClientRect().top;
      if (Math.abs(delta) > 1) el.scrollTop += delta;
    }
    if (performance.now() < until) alignRaf = requestAnimationFrame(step);
  };
  alignRaf = requestAnimationFrame(step);
}
watch(
  expanded,
  (open) => {
    const byOwnButton = ownToggle;
    ownToggle = false;
    if (embed && open && !byOwnButton) alignTable();
    else stopAlign();
  },
  { immediate: true },
);
watch(
  [
    () => ctx.data.phase.value,
    () => ctx.data.dataset.value,
    () => ctx.data.municipalityStatus?.value,
  ],
  () => {
    if (alignWanted) alignTable();
  },
);
onBeforeUnmount(stopAlign);

// "Rodyti žemėlapyje" in the sheet: collapse it so the map and the card show (§6.7).
const collapse = () => {
  ctx.state.tableOpen.value = false;
};
</script>
