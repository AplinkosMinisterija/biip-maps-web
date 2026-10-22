<template>
  <header
    class="absolute inset-x-0 top-0 z-40 flex flex-col gap-1 bg-white px-4 pb-2 shadow-md"
    :class="{ 'pt-2': ctx.embed }"
    :style="{ maxHeight: `${mobileHeader(ctx.embed)}px` }"
  >
    <!-- Embedded, the WP page has the topics, Dalintis and Apie duomenis (SPEC §4). -->
    <div v-if="!ctx.embed" class="flex h-12 items-center justify-between gap-2">
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

    <!-- One row, never scrolling sideways (CONTROLS-07): the season chip keeps its width, the
         place chip takes the rest (truncated), "Filtrai" stays visible at the end. -->
    <div role="search" aria-label="Filtrai" class="flex min-w-0 items-center gap-2">
      <!-- Element-rooted: Vue 3.5.29 mis-patches a v-if'd async component that is still
           loading (a quick topic switch; insertBefore error, vuejs/core#15551). -->
      <div v-if="topicKind === 'overview'" class="contents">
        <HuntingHubShellSeasonSheet disabled />
      </div>
      <template v-else-if="topicKind === 'snapshot'">
        <HuntingHubShellSeasonSheet />
        <HuntingHubShellPlacePicker mobile />
        <HuntingHubShellFilterChip
          v-if="hasDims"
          class="shrink-0"
          touch
          :value="S.filters"
          :badge="activeDims"
          :active="activeDims > 0"
          :chevron="false"
          :sr-label="S.filtersChip(activeDims)"
          aria-haspopup="dialog"
          @click="$emit('filters')"
        />
      </template>
      <!-- Live topics (Vilkai) teleport their own chips here. -->
      <div
        :id="HUB_SLOTS.mobileChips"
        class="flex min-w-0 flex-1 items-center gap-2 empty:hidden"
      />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { S } from '@/utils/hunting/hub/strings';
import { mobileHeader } from '@/utils/hunting/hub/layout';
import { HUB_SLOTS } from './shell';
import { ICON_BTN, ICON_BTN_TOUCH } from './controls';
import { useShare } from './useShare';
import { useActiveDimCount, useDimChips } from './useDimChips';

// Mobile header ≤ 108 px (§4.3): topic menu (H1), Dalintis, Apie; chip row with season,
// place and the filters count. Embedded: the chip row only, ≤ 60 px (SPEC §5.11).
defineEmits(['filters']);

const ctx = inject(HUB_CTX)!;
const share = useShare();
const topicKind = computed(() => ctx.topic.value.kind);
const chips = useDimChips(ctx);
const hasDims = computed(() => chips.value.length > 0);
const activeDims = useActiveDimCount(ctx);

const iconButton = `${ICON_BTN} ${ICON_BTN_TOUCH}`;
</script>
