<template>
  <div class="shrink-0">
    <button
      ref="trigger"
      type="button"
      aria-haspopup="dialog"
      :aria-expanded="isOpen ? 'true' : 'false'"
      :aria-label="S.seasonChip(seasonLabel(season))"
      :disabled="disabled || !options.length"
      class="inline-flex h-11 max-w-full items-center gap-1 rounded-full border border-gray-900 bg-white px-4 text-base font-medium text-gray-900 disabled:border-gray-300 disabled:text-gray-700"
      :class="focusRing"
      @click="isOpen = true"
    >
      <span class="truncate">{{ seasonLabel(season) }}</span>
      <span v-if="!disabled" aria-hidden="true" class="text-sm">▾</span>
    </button>

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
import { focusRing } from './shell';
import { useSeasonOptions } from './useSeasonOptions';

// Mobile season chip opening a full-screen radio list (§4.3).
defineProps({
  disabled: { type: Boolean, default: false },
});

const ctx = inject(HUB_CTX)!;
const season = computed(() => ctx.sel.value.season);
const options = useSeasonOptions(ctx);
const trigger = ref<HTMLButtonElement | null>(null);
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
