<template>
  <div
    v-if="hover"
    aria-hidden="true"
    class="pointer-events-none absolute z-20 rounded bg-gray-900 px-2 py-1 text-xs font-semibold text-white shadow whitespace-nowrap"
    :style="{ left: `${hover.x + 12}px`, top: `${hover.y + 12}px` }"
  >
    {{ hover.text }}
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { HUB_CHOROPLETH_CTX } from '@/composables/hunting/hub/useChoropleth';

// Desktop hover tooltip "{name} · {value}" (SPEC2 §8.5). Mouse only and aria-hidden:
// keyboard and screen reader users get the same values from the place picker and the table.
// Place it inside the map container's positioned parent (coordinates are map pixels).
const choropleth = inject(HUB_CHOROPLETH_CTX)!;
const hover = computed(() => choropleth.hover.value);
</script>
