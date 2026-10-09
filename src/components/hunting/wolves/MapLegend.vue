<template>
  <section
    aria-labelledby="wolves-legend-title"
    class="bg-white rounded-lg shadow text-sm text-gray-900 p-3 max-w-[280px]"
  >
    <h2 v-if="!isCollapsible" id="wolves-legend-title" class="font-semibold">Legenda</h2>
    <h2 v-else id="wolves-legend-title" class="font-semibold">
      <button
        type="button"
        class="flex items-center gap-1 min-h-[44px] w-full text-left rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        :aria-expanded="open"
        aria-controls="wolves-legend-items"
        @click="open = !open"
      >
        Legenda <span aria-hidden="true">{{ open ? '▴' : '▾' }}</span>
      </button>
    </h2>

    <div v-show="!isCollapsible || open" id="wolves-legend-items">
      <ul class="mt-2 space-y-2">
        <li class="flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" class="shrink-0">
            <circle cx="13" cy="13" r="7" :fill="WOLF_COLOR" stroke="#fff" stroke-width="2" />
          </svg>
          <span>Sumedžiotas vilkas</span>
        </li>
        <li class="flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" class="shrink-0">
            <circle cx="13" cy="13" r="12" :fill="WOLF_COLOR" stroke="#fff" stroke-width="2" />
            <text x="13" y="17" text-anchor="middle" font-size="12" font-weight="600" fill="#fff">
              12
            </text>
          </svg>
          <span>12 – vilkų skaičius grupėje (priartinkite arba paspauskite)</span>
        </li>
        <li class="flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" class="shrink-0">
            <line
              x1="3"
              y1="13"
              x2="23"
              y2="13"
              :stroke="MUNICIPALITY_OUTLINE_COLOR"
              stroke-width="2"
            />
          </svg>
          <span>Savivaldybių ribos</span>
        </li>
      </ul>
      <p class="mt-2 text-xs text-gray-600">Vieta rodoma apytiksliai (~1 km).</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { MUNICIPALITY_OUTLINE_COLOR, WOLF_COLOR } from '@/utils/hunting/layers';

const props = defineProps({
  // Hub (SPEC2 §7): always a toggle chip, collapsed by default below 1280 px.
  collapsible: { type: Boolean, default: false },
});

// Wolves page: collapsible below 1024 px (SPEC §8.5), open by default on desktop.
const query =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia(props.collapsible ? '(max-width: 1279px)' : '(max-width: 1023px)')
    : null;
const isCollapsible = ref(props.collapsible || !!query?.matches);
const open = ref(!query?.matches);

const onChange = (e: MediaQueryListEvent) => {
  isCollapsible.value = props.collapsible || e.matches;
  open.value = !e.matches;
};
query?.addEventListener?.('change', onChange);
onBeforeUnmount(() => query?.removeEventListener?.('change', onChange));
</script>
