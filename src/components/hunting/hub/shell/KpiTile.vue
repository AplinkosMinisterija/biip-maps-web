<template>
  <div
    role="group"
    :aria-label="kpi.ariaLabel"
    class="relative flex min-w-0 flex-col gap-0.5 rounded-md border border-gray-200 p-2"
    :class="kpi.muted ? 'bg-gray-50 text-gray-600' : 'bg-white text-gray-900'"
  >
    <!-- Lines break only between words: numbers keep their (no-break) group spaces. -->
    <span aria-hidden="true" class="text-lg font-semibold leading-tight tabular-nums">
      {{ kpi.value }}
    </span>
    <!-- The ⓘ sits in the label row, so the value keeps the tile's full width. -->
    <span class="flex items-start gap-1">
      <span aria-hidden="true" class="flex-1 text-xs leading-snug text-gray-700">{{
        kpi.label
      }}</span>
      <button
        v-if="kpi.tooltip"
        ref="tipButton"
        type="button"
        class="flex shrink-0 items-center justify-center rounded-full text-gray-600 hover:text-gray-900"
        :class="[focusRing, large ? '-m-3 w-11 h-11' : 'w-4 h-4']"
        :aria-expanded="tipOpen"
        :aria-label="`Paaiškinimas: ${kpi.label}`"
        @click="tipOpen = !tipOpen"
        @keydown.esc.stop="tipOpen = false"
        @blur="tipOpen = false"
      >
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" stroke-width="1.5" />
          <rect x="9.1" y="8.5" width="1.8" height="6" rx="0.9" fill="currentColor" />
          <circle cx="10" cy="5.8" r="1.1" fill="currentColor" />
        </svg>
      </button>
    </span>
    <span v-if="kpi.sub" aria-hidden="true" class="text-xs leading-snug text-gray-700">
      {{ kpi.sub }}
    </span>
    <!-- Toggletip: the text is announced when it opens (role="status"). -->
    <span role="status" class="contents">
      <span
        v-if="tipOpen && kpi.tooltip"
        class="absolute left-0 top-full z-20 mt-1 w-64 max-w-[80vw] rounded-md bg-gray-900 p-2 text-xs font-normal text-white shadow-lg"
      >
        {{ kpi.tooltip }}
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, type PropType } from 'vue';
import type { KpiDef } from '@/utils/hunting/hub/types';
import { focusRing } from './shell';

defineProps({
  kpi: { type: Object as PropType<KpiDef>, required: true },
  large: { type: Boolean, default: false },
});

const tipOpen = ref(false);
</script>
