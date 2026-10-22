<template>
  <section
    aria-labelledby="steb-legend-title"
    :class="
      phone && !open
        ? ''
        : 'w-[min(280px,calc(100vw-88px))] max-h-[50vh] overflow-y-auto rounded-lg bg-white p-3 text-sm text-ink shadow-[0_1px_3px_rgba(18,25,38,0.12)]'
    "
  >
    <!-- Phone, collapsed: one 44 px control with the species dots (DATAVIZ-01). -->
    <h2 v-if="phone && !open" id="steb-legend-title">
      <button
        type="button"
        class="flex min-h-[44px] items-center gap-2 rounded-full border border-line-strong bg-white px-4 text-sm font-semibold text-ink shadow-[0_1px_3px_rgba(18,25,38,0.12)]"
        :class="FOCUS_RING"
        :aria-expanded="false"
        aria-controls="steb-legend-items"
        @click="open = true"
      >
        Legenda
        <span class="flex items-center gap-1" aria-hidden="true">
          <span
            v-for="row in rows"
            :key="row.key"
            class="h-2.5 w-2.5 rounded-full"
            :style="{ background: row.color }"
          />
        </span>
        <span class="sr-only">{{ SS.legendTitle }}</span>
        <UiIcon name="chevron-up" :size="16" aria-hidden="true" />
      </button>
    </h2>
    <div v-else class="flex items-start gap-2">
      <h2
        id="steb-legend-title"
        class="min-w-0 flex-1 text-[13px] font-semibold leading-[18px] text-ink"
      >
        {{ SS.legendTitle }}
      </h2>
      <button
        type="button"
        class="-mr-1 -mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full text-ink hover:bg-brand-50"
        :class="[FOCUS_RING, phone ? '-my-2 h-11 w-11' : 'h-6 w-6']"
        :aria-expanded="open"
        aria-controls="steb-legend-items"
        :aria-label="open ? 'Suskleisti legendą' : 'Išskleisti legendą'"
        @click="open = !open"
      >
        <UiIcon :name="open ? 'chevron-down' : 'chevron-up'" :size="16" aria-hidden="true" />
      </button>
    </div>

    <div v-show="open" id="steb-legend-items">
      <ul class="mt-2 space-y-1.5 text-xs leading-4">
        <li v-for="row in rows" :key="row.key" class="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" class="shrink-0">
            <circle cx="10" cy="10" r="7" :fill="row.color" stroke="#fff" stroke-width="2" />
          </svg>
          <span class="flex-1">{{ row.label }}</span>
          <!-- The panel's chart carries the counts on desktop; on phones it is in the sheet. -->
          <span v-if="phone" class="tabular-nums text-ink-muted">{{ formatInt(row.n) }}</span>
        </li>
        <li class="flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" class="shrink-0">
            <circle cx="13" cy="13" r="12" fill="#fff" stroke="#fff" stroke-width="2" />
            <circle
              v-for="arc in sampleArcs"
              :key="arc.color"
              cx="13"
              cy="13"
              r="10"
              fill="none"
              :stroke="arc.color"
              stroke-width="4"
              :stroke-dasharray="`${arc.length} ${RING_C}`"
              :stroke-dashoffset="arc.offset"
              transform="rotate(-90 13 13)"
            />
            <text
              x="13"
              y="17"
              text-anchor="middle"
              font-size="11"
              font-weight="700"
              :fill="STEB_MIXED_TEXT"
            >
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
// (colour and name; the count on phones, where the chart is in the sheet), "Kita rūšis" for
// any other species, and the cluster symbol: a mixed cluster is ringed by its species.
// Collapsible; collapsed by default below 1280 px and always on phones (`phone`).
import { computed, inject, onBeforeUnmount, ref } from 'vue';
import { STEB_CTX } from '@/composables/hunting/hub/stebejimai/useStebState';
import { FOCUS_RING } from '@/components/hunting/hub/shell/controls';
import { formatInt } from '@/utils/hunting/dates';
import { speciesSummary } from '@/utils/hunting/hub/stebejimai/model';
import {
  isKnownSpecies,
  speciesColor,
  STEB_MIXED_TEXT,
  STEB_OTHER_COLOR,
} from '@/utils/hunting/hub/stebejimai/layers';
import { SS } from '@/utils/hunting/hub/stebejimai/strings';

const props = defineProps({
  phone: { type: Boolean, default: false },
});

const ctx = inject(STEB_CTX)!;

const query =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(max-width: 1279px)')
    : null;
const open = ref(!props.phone && !query?.matches);
const onChange = (e: MediaQueryListEvent) => {
  if (!props.phone) open.value = !e.matches;
};
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

// The cluster sample: a ring split between the first two species colours (3 : 2).
const RING_C = 2 * Math.PI * 10;
const sampleArcs = computed(() => {
  const colors = ['vilkas', 'lusis'].map(speciesColor);
  const a = RING_C * 0.6;
  return [
    { color: colors[0], length: a - 1, offset: 0 },
    { color: colors[1], length: RING_C - a - 1, offset: -a },
  ];
});
</script>
