<template>
  <section
    aria-labelledby="wolves-sheet-title"
    class="fixed inset-x-0 bottom-0 z-30 bg-white rounded-t-xl shadow-[0_-4px_16px_rgba(0,0,0,0.15)] flex flex-col"
    :class="expanded ? 'h-[85vh]' : 'min-h-[176px] max-h-[60vh]'"
  >
    <h2 id="wolves-sheet-title" class="sr-only">Rezultatai</h2>

    <!-- The selected wolf replaces the collapsed content (§7.3). -->
    <div v-if="showCard" class="overflow-y-auto p-3">
      <HuntingWolvesWolfCard />
    </div>

    <template v-else>
      <div class="flex items-center justify-between px-3 pt-1">
        <span class="w-10 h-1 rounded-full bg-gray-300" aria-hidden="true" />
        <button
          type="button"
          class="min-h-[44px] min-w-[44px] px-4 flex items-center gap-2 rounded-lg bg-brand text-white text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          :aria-expanded="expanded"
          aria-controls="wolves-sheet-body"
          @click="toggle"
        >
          {{ expanded ? 'Žemėlapis' : 'Lentelė' }}
          <UiIcon :name="expanded ? 'chevron-down' : 'chevron-up'" :size="16" aria-hidden="true" />
        </button>
      </div>

      <div
        id="wolves-sheet-body"
        ref="body"
        class="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-3"
        @wheel.passive="stopAlign"
        @touchstart.passive="stopAlign"
        @pointerdown="stopAlign"
        @keydown="stopAlign"
      >
        <!-- Hub: its status line and prototype note (empty on the wolves page). -->
        <slot />
        <HuntingWolvesFilterSentence />
        <HuntingWolvesLoadState placement="panel" />
        <!-- An element-rooted branch: Vue 3.5.29 patches a v-if'd async component that is
             still loading with the wrong parent (insertBefore error), e.g. when the Vilkai
             fallback closes the sheet right after it opened (vuejs/core#15551). -->
        <div v-if="expanded" class="contents"><HuntingWolvesSeasonSummary /></div>
        <HuntingWolvesHistogram :compact="!expanded" large :clip-to-window="clipHistogram" />
        <!-- Also element-rooted, not a <template>: removing a fragment removes the loading
             placeholders of its async components, and in Vue 3.5.29 the first page load then
             never finishes when one of them arrives (the loader stays). -->
        <div v-if="expanded" class="contents">
          <HuntingWolvesMoreFilters large />
          <HuntingWolvesMunicipalitySelect />
          <HuntingWolvesTableDrawer variant="sheet" @show-on-map="collapse" />
          <HuntingWolvesDebugPanel v-if="ctx.debug" />
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { HUB_CTX } from '@/composables/hunting/hub/context';

defineProps({
  // Hub: the histogram shows Oct … Mar plus "Kiti mėn." for a full season (SPEC2 §7).
  clipHistogram: { type: Boolean, default: false },
});

const ctx = inject(WOLVES_CTX)!;
// Inside the hub embedded in the WP data page (SPEC §4); false on the wolves page.
const embed = !!inject(HUB_CTX, null)?.embed;

// On mobile the expanded sheet is the table view, so it shares `tableOpen`
// with the desktop drawer and the `lentele` URL key (§5.2).
const expanded = computed(() => ctx.state.tableOpen.value);
const showCard = computed(() => !!ctx.state.selection.value && !expanded.value);

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
