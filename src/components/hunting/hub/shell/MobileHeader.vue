<template>
  <header
    class="absolute inset-x-0 top-0 z-40 flex flex-col gap-1 bg-white px-3 pb-2 shadow-md"
    :style="{ maxHeight: `${HUB_MOBILE_HEADER}px` }"
  >
    <div class="flex h-12 items-center justify-between gap-2">
      <HuntingHubShellTopicMenu />
      <div class="flex shrink-0 gap-1">
        <button type="button" :aria-label="S.share" :class="iconButton" @click="share">
          <UiIcon name="link" :size="20" aria-hidden="true" />
        </button>
        <button
          type="button"
          :aria-label="S.about"
          aria-haspopup="dialog"
          :class="iconButton"
          @click="ctx.openAbout()"
        >
          <UiIcon name="document" :size="20" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div role="search" aria-label="Filtrai" class="flex items-center gap-2 overflow-x-auto">
      <HuntingHubShellSeasonSheet v-if="topicKind === 'overview'" disabled />
      <template v-else-if="topicKind === 'snapshot'">
        <HuntingHubShellSeasonSheet />
        <HuntingHubShellPlacePicker mobile />
        <button
          v-if="hasDims"
          type="button"
          :aria-label="S.filtersChip(activeDims)"
          class="flex h-11 shrink-0 items-center gap-1 rounded-full border border-gray-900 bg-white px-4 text-base font-medium text-gray-900"
          :class="focusRing"
          @click="$emit('filters')"
        >
          <UiIcon name="filter" :size="18" aria-hidden="true" />
          <span v-if="activeDims" aria-hidden="true">{{ activeDims }}</span>
        </button>
      </template>
      <!-- Live topics (Vilkai) teleport their own chips here. -->
      <div :id="HUB_SLOTS.mobileChips" class="flex min-w-0 items-center gap-2" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { S } from '@/utils/hunting/hub/strings';
import { HUB_MOBILE_HEADER } from '@/utils/hunting/hub/layout';
import { focusRing, HUB_SLOTS } from './shell';
import { useShare } from './useShare';
import { useActiveDimCount, useDimChips } from './useDimChips';

// Mobile header ≤ 108 px (§4.3): topic menu (H1), Dalintis, Apie; chip row with season,
// place and the filters count.
defineEmits(['filters']);

const ctx = inject(HUB_CTX)!;
const share = useShare();
const topicKind = computed(() => ctx.topic.value.kind);
const chips = useDimChips(ctx);
const hasDims = computed(() => chips.value.length > 0);
const activeDims = useActiveDimCount(ctx);

const iconButton = `w-11 h-11 flex items-center justify-center rounded text-gray-800 hover:bg-gray-100 ${focusRing}`;
</script>
