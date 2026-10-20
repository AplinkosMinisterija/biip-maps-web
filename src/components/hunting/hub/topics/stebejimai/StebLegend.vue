<template>
  <section
    aria-labelledby="steb-legend-title"
    class="max-w-[280px] rounded-lg bg-white p-3 text-sm text-gray-900 shadow"
  >
    <h2 id="steb-legend-title" class="font-semibold">
      <button
        type="button"
        class="flex min-h-[44px] w-full items-center gap-1 rounded text-left"
        :class="focusRing"
        :aria-expanded="open"
        aria-controls="steb-legend-items"
        @click="open = !open"
      >
        {{ SS.legendTitle }} <span aria-hidden="true">{{ open ? '▴' : '▾' }}</span>
      </button>
    </h2>

    <div v-show="open" id="steb-legend-items">
      <ul class="mt-1 space-y-2">
        <li v-for="row in rows" :key="row.key" class="flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" class="shrink-0">
            <circle cx="13" cy="13" r="7" :fill="row.color" stroke="#fff" stroke-width="2" />
          </svg>
          <span class="flex-1">{{ row.label }}</span>
          <span class="tabular-nums text-gray-700">{{ formatInt(row.n) }}</span>
        </li>
        <li class="flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" class="shrink-0">
            <circle
              cx="13"
              cy="13"
              r="12"
              :fill="STEB_MIXED_COLOR"
              stroke="#fff"
              stroke-width="2"
            />
            <text x="13" y="17" text-anchor="middle" font-size="12" font-weight="600" fill="#fff">
              5
            </text>
          </svg>
          <span>{{ SS.legendCluster }} ({{ SS.legendClusterHint }})</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
// Map legend of the Stebėjimai topic (STEB-SPEC §3.4): one row per species on the map
// (colour, name, count), "Kita rūšis" for any other species, and the cluster symbol.
// Collapsible; collapsed by default below 1280 px, as the Vilkai legend in the hub.
import { computed, inject, onBeforeUnmount, ref } from 'vue';
import { STEB_CTX } from '@/composables/hunting/hub/stebejimai/useStebState';
import { formatInt } from '@/utils/hunting/dates';
import { speciesSummary } from '@/utils/hunting/hub/stebejimai/model';
import {
  isKnownSpecies,
  speciesColor,
  STEB_MIXED_COLOR,
  STEB_OTHER_COLOR,
} from '@/utils/hunting/hub/stebejimai/layers';
import { SS } from '@/utils/hunting/hub/stebejimai/strings';

const ctx = inject(STEB_CTX)!;
const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2';

const query =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(max-width: 1279px)')
    : null;
const open = ref(!query?.matches);
const onChange = (e: MediaQueryListEvent) => (open.value = !e.matches);
query?.addEventListener?.('change', onChange);
onBeforeUnmount(() => query?.removeEventListener?.('change', onChange));

// Only the rows drawn on the map (with a point).
const rows = computed(() => {
  const located = ctx.derived.filtered.value.filter((r) => r.x !== null);
  const known: { key: string; label: string; n: number; color: string }[] = [];
  let other = 0;
  speciesSummary(located).forEach((g) => {
    if (isKnownSpecies(g.key)) known.push({ ...g, color: speciesColor(g.key) });
    else other += g.n;
  });
  if (other)
    known.push({ key: '-other', label: SS.legendOther, n: other, color: STEB_OTHER_COLOR });
  return known;
});
</script>
