<template>
  <!-- Collapsed panel while the table drawer is open at ≥ 1280 px (§4.1). -->
  <div class="flex h-full w-full flex-col items-center gap-3 py-3">
    <button
      type="button"
      class="flex h-11 w-11 items-center justify-center rounded-md bg-gray-900 text-white hover:bg-gray-800"
      :class="focusRing"
      :aria-label="`${S.railExpand}: ${title}`"
      :title="S.railExpand"
      aria-controls="hub-panel"
      aria-expanded="false"
      @click="$emit('expand')"
    >
      <UiIcon name="chevron-right" :size="20" aria-hidden="true" />
    </button>
    <span class="text-xs font-semibold text-gray-900 [writing-mode:vertical-rl] rotate-180">
      {{ title }}
    </span>
    <span
      v-if="value"
      class="text-base font-semibold tabular-nums text-gray-900 [writing-mode:vertical-rl] rotate-180"
    >
      {{ value }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { S } from '@/utils/hunting/hub/strings';
import { focusRing } from './shell';

defineProps({
  title: { type: String, required: true },
  value: { type: String, default: '' },
});
defineEmits(['expand']);
</script>
