<template>
  <div
    role="search"
    aria-label="Filtrai"
    class="absolute inset-x-0 z-[35] flex h-14 items-center gap-2 border-b border-line bg-white px-[var(--hub-gutter,16px)]"
    :class="ctx.embed ? 'top-0' : 'top-14'"
  >
    <div class="flex min-w-0 flex-1 items-center gap-2">
      <!-- Apžvalga always shows the current season (§4.4). The branches are element- or
           fragment-rooted: Vue 3.5.29 mis-patches a v-if'd async component that is still
           loading (a quick topic switch; insertBefore error, vuejs/core#15551). -->
      <div v-if="topicKind === 'overview'" class="contents">
        <HuntingHubShellSeasonPopover disabled />
      </div>
      <template v-else-if="topicKind === 'snapshot'">
        <HuntingHubShellSeasonPopover />
        <HuntingHubShellPlacePicker />
        <HuntingHubShellFilterChips />
      </template>
      <!-- Live topics (Vilkai) teleport their own chips here. -->
      <div :id="HUB_SLOTS.filters" class="flex min-w-0 items-center gap-2" />
    </div>

    <div class="flex shrink-0 items-center gap-2">
      <div :id="HUB_SLOTS.filtersEnd" class="flex items-center gap-2" />
      <div v-if="topicKind === 'snapshot' && !ctx.embed" class="contents">
        <HuntingHubShellViewToggle
          :table-open="tableOpen"
          :disabled="!hasTables"
          :controls="tableOpen ? 'hunting-hub-table' : ''"
          @update:table-open="setTableOpen(ctx, $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { HUB_SLOTS, setTableOpen } from './shell';

// Desktop/tablet filter bar, 56 px (§4.1, CONTROLS-10): season, place, topic chips (a display
// switch such as the Briedžių limitai metric at the right end), and the standalone
// "Žemėlapis | Lentelė" switch. Embedded in the WP page (SPEC §4) it is the top row, its
// padding is the site gutter (--hub-gutter, decision D3), and the page's own view switch
// replaces this one.
const ctx = inject(HUB_CTX)!;
const topicKind = computed(() => ctx.topic.value.kind);
const tableOpen = computed(() => ctx.sel.value.table !== null);
const hasTables = computed(() => !!ctx.view.value?.tables.length);
</script>
