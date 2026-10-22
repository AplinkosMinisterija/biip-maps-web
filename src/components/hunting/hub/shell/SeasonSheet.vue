<template>
  <div class="shrink-0">
    <!-- The value alone on phones; the name stays in the accessible name. -->
    <HuntingHubShellFilterChip
      ref="trigger"
      touch
      :value="seasonLabel(season)"
      :open="isOpen"
      :sr-label="S.seasonChip(seasonLabel(season))"
      aria-haspopup="dialog"
      :aria-expanded="isOpen ? 'true' : 'false'"
      :disabled="disabled || !options.length"
      @click="isOpen = true"
    />

    <HuntingHubShellFullSheet
      :open="isOpen"
      :title="S.season"
      initial-focus="input:checked"
      @close="close"
    >
      <div @pointerdown="byPointer = true" @keydown.enter.prevent="close">
        <HuntingHubShellSeasonOptions
          name="hub-season-sheet"
          large
          :options="options"
          :model-value="season"
          @update:model-value="pick"
        />
      </div>
    </HuntingHubShellFullSheet>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, ref, watch } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { S } from '@/utils/hunting/hub/strings';
import { seasonLabel } from '@/utils/hunting/dates';
import { useSeasonOptions } from './useSeasonOptions';

// Mobile season chip opening a full-screen radio list (§4.3).
defineProps({
  disabled: { type: Boolean, default: false },
});

const ctx = inject(HUB_CTX)!;
const season = computed(() => ctx.sel.value.season);
const options = useSeasonOptions(ctx);
const trigger = ref<{ focus(): void } | null>(null);
const isOpen = ref(false);

function close() {
  isOpen.value = false;
  nextTick(() => trigger.value?.focus());
}

// A tap applies and closes; arrow keys apply at once and Enter closes.
const byPointer = ref(false);
function pick(s: number) {
  ctx.setSeason(s);
  if (byPointer.value) close();
  byPointer.value = false;
}

watch(
  () => ctx.isMobile.value,
  (mobile) => {
    if (!mobile) isOpen.value = false;
  },
);
</script>
