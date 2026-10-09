<template>
  <div
    role="search"
    aria-label="Filtrai"
    class="absolute inset-x-0 top-14 z-[35] flex h-12 items-center gap-2 border-b border-gray-200 bg-white px-4"
  >
    <div class="flex min-w-0 flex-1 items-center gap-2">
      <template v-if="topicKind === 'overview'">
        <!-- Apžvalga always shows the current season (§4.4). -->
        <HuntingHubShellSeasonPopover disabled />
      </template>
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
      <HuntingHubShellViewToggle
        v-if="topicKind === 'snapshot'"
        :table-open="tableOpen"
        :disabled="!hasTables"
        :controls="tableOpen ? 'hunting-hub-table' : ''"
        @update:table-open="setTableOpen(ctx, $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { HUB_SLOTS, setTableOpen } from './shell';

// Desktop/tablet filter bar, 48 px (§4.1): season, place, topic chips, and the
// "Žemėlapis | Lentelė" switch at the right end.
const ctx = inject(HUB_CTX)!;
const topicKind = computed(() => ctx.topic.value.kind);
const tableOpen = computed(() => ctx.sel.value.table !== null);
const hasTables = computed(() => !!ctx.view.value?.tables.length);
</script>
