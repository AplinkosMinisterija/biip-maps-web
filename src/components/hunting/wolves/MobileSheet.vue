<template>
  <section
    aria-labelledby="wolves-sheet-title"
    class="fixed inset-x-0 bottom-0 z-30 bg-white rounded-t-xl shadow-[0_-4px_16px_rgba(0,0,0,0.15)] flex flex-col"
    :class="expanded ? (hub ? '' : 'h-[85vh]') : 'min-h-[176px] max-h-[60vh]'"
    :style="expanded && hub ? { height: `calc(100% - ${mobileHeader(embed)}px)` } : undefined"
  >
    <div v-if="!showCard" class="flex shrink-0 justify-center pt-1.5" aria-hidden="true">
      <span class="w-10 h-1 rounded-full bg-line-strong" />
    </div>
    <!-- Hub: the topic question is the sheet's heading (the wolves page: "Rezultatai"). -->
    <div class="flex shrink-0 items-center gap-2 px-5" :class="heading ? 'min-h-[44px]' : ''">
      <h2
        id="wolves-sheet-title"
        :class="heading ? 'flex-1 min-w-0 text-[15px] font-bold leading-5 text-ink' : 'sr-only'"
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
    <div v-if="showCard" class="overflow-y-auto px-5 pb-3 pt-1">
      <HuntingWolvesWolfCard />
    </div>

    <div
      v-else
      id="wolves-sheet-body"
      ref="body"
      class="flex-1 overflow-y-auto px-5 pb-3 flex flex-col gap-3"
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
        <div v-if="expanded" class="contents"><HuntingWolvesSeasonSummary /></div>
        <HuntingWolvesHistogram :compact="!expanded" large :clip-to-window="clipHistogram" />
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
        <HuntingWolvesDebugPanel v-if="ctx.debug" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { mobileHeader } from '@/utils/hunting/hub/layout';
import { VILKAI_H1 } from '@/utils/hunting/hub/topics/vilkai';
import { BTN_SECONDARY } from '@/components/hunting/hub/shell/controls';
import { useMapInert } from '@/components/hunting/hub/shell/sheet';

defineProps({
  // Hub: the histogram shows Oct … Mar plus "Kiti mėn." for a full season (SPEC2 §7).
  clipHistogram: { type: Boolean, default: false },
});

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
// Hub: the expanded sheet covers the whole map below the header; its controls leave the
// Tab order (WCAG 2.4.11).
useMapInert(computed(() => !!hub && expanded.value));

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
