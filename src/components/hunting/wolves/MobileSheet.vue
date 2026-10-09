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
          class="min-h-[44px] min-w-[44px] px-3 flex items-center gap-1 rounded text-sm font-semibold text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
          :aria-expanded="expanded"
          aria-controls="wolves-sheet-body"
          @click="toggle"
        >
          {{ expanded ? 'Mažiau' : 'Daugiau' }}
          <UiIcon :name="expanded ? 'chevron-down' : 'chevron-up'" :size="16" aria-hidden="true" />
        </button>
      </div>

      <div id="wolves-sheet-body" class="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-3">
        <HuntingWolvesFilterSentence />
        <HuntingWolvesLoadState placement="panel" />
        <HuntingWolvesSeasonSummary v-if="expanded" />
        <HuntingWolvesHistogram :compact="!expanded" large />
        <template v-if="expanded">
          <HuntingWolvesMoreFilters large />
          <HuntingWolvesMunicipalitySelect />
          <HuntingWolvesTableDrawer variant="sheet" @show-on-map="collapse" />
          <HuntingWolvesDebugPanel v-if="ctx.debug" />
        </template>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';

const ctx = inject(WOLVES_CTX)!;

// On mobile the expanded sheet is the table view, so it shares `tableOpen`
// with the desktop drawer and the `lentele` URL key (§5.2).
const expanded = computed(() => ctx.state.tableOpen.value);
const showCard = computed(() => !!ctx.state.selection.value && !expanded.value);

const toggle = () => {
  ctx.state.tableOpen.value = !ctx.state.tableOpen.value;
};

// "Rodyti žemėlapyje" in the sheet: collapse it so the map and the card show (§6.7).
const collapse = () => {
  ctx.state.tableOpen.value = false;
};
</script>
