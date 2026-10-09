<template>
  <section
    v-if="def"
    aria-labelledby="hub-legend-title"
    class="bg-white rounded-lg shadow text-sm text-gray-900 p-2 max-w-[320px]"
  >
    <h2 id="hub-legend-title" class="font-semibold">
      <button
        type="button"
        class="flex items-center gap-1 min-h-[24px] max-md:min-h-[44px] w-full px-1 text-left text-xs rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        :aria-expanded="open"
        aria-controls="hub-legend-items"
        @click="open = !open"
      >
        <UiIcon name="legend" :size="16" aria-hidden="true" class="shrink-0" />
        <span class="flex-1">{{ S.legendChip(def.legendTitle) }}</span>
        <span aria-hidden="true">{{ open ? '▴' : '▾' }}</span>
      </button>
    </h2>

    <div v-show="open" id="hub-legend-items" class="px-1 pb-1">
      <ul class="mt-2 flex flex-col gap-1">
        <li v-for="item in items" :key="item.key" class="flex items-center gap-2">
          <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true" class="shrink-0">
            <defs v-if="item.fill === 'dotted'">
              <pattern :id="dotId" width="6" height="6" patternUnits="userSpaceOnUse">
                <rect width="6" height="6" :fill="CHOROPLETH_EMPTY_FILL" />
                <circle cx="3" cy="3" r="1.3" :fill="DOT_FILL" />
              </pattern>
            </defs>
            <defs v-if="item.fill === 'hatched'">
              <pattern
                :id="hatchId"
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="6" height="6" :fill="CHOROPLETH_EMPTY_FILL" />
                <line x1="0" y1="0" x2="0" y2="6" :stroke="HATCH_LINE" stroke-width="2" />
              </pattern>
            </defs>
            <rect
              x="0.5"
              y="0.5"
              width="19"
              height="13"
              :fill="
                item.fill === 'hatched'
                  ? `url(#${hatchId})`
                  : item.fill === 'dotted'
                    ? `url(#${dotId})`
                    : item.fill
              "
              :stroke="CHOROPLETH_OUTLINE"
              stroke-width="1"
            />
          </svg>
          <span class="tabular-nums">{{ item.label }}</span>
        </li>
      </ul>
      <p v-if="def.note" class="mt-2 text-xs text-gray-700">{{ def.note }}</p>
      <p v-if="!def.note?.includes(S.legendFixedClasses)" class="mt-2 text-xs text-gray-600">
        {{ S.legendFixedClasses }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import {
  CHOROPLETH_EMPTY_FILL,
  CHOROPLETH_OUTLINE,
  DOT_FILL,
  HATCH_LINE,
  HUB_CHOROPLETH_CTX,
  legendItems,
} from '@/composables/hunting/hub/useChoropleth';
import { S } from '@/utils/hunting/hub/strings';

// Legend chip of the hub choropleth (SPEC2 §6, §12): "Legenda: {title}", collapsed by
// default below 1280 px. Swatches carry text labels; "Nėra MPV" is hatched, never colour only.
const ctx = inject(HUB_CTX)!;
const choropleth = inject(HUB_CHOROPLETH_CTX)!;

const hatchId = 'hub-legend-hatch';
const dotId = 'hub-legend-dots';
const def = computed(() => choropleth.def.value);
const codes = computed(() =>
  (ctx.data.snapshot.value?.meta.municipalities || []).map((m) => m.code),
);
const items = computed(() => (def.value ? legendItems(def.value, codes.value) : []));

const open = ref(ctx.isWide.value);
watch(
  () => ctx.isWide.value,
  (wide) => (open.value = wide),
);
</script>
