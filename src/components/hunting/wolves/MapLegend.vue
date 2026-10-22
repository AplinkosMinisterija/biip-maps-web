<template>
  <section
    aria-labelledby="wolves-legend-title"
    :class="
      phone && !open
        ? ''
        : 'w-[min(280px,calc(100vw-88px))] max-h-[50vh] overflow-y-auto rounded-lg bg-white p-3 text-sm text-ink shadow-[0_1px_3px_rgba(18,25,38,0.12)]'
    "
  >
    <!-- Phone, collapsed: one 44 px control with the symbol (DATAVIZ-01). -->
    <h2 v-if="phone && !open" id="wolves-legend-title">
      <button
        type="button"
        class="flex min-h-[44px] items-center gap-2 rounded-full border border-line-strong bg-white px-4 text-sm font-semibold text-ink shadow-[0_1px_3px_rgba(18,25,38,0.12)]"
        :class="FOCUS_RING"
        :aria-expanded="false"
        aria-controls="wolves-legend-items"
        @click="open = true"
      >
        Legenda
        <span
          class="h-2.5 w-2.5 rounded-full"
          :style="{ background: WOLF_COLOR }"
          aria-hidden="true"
        />
        <span class="font-normal text-ink-muted">{{ TITLE }}</span>
        <UiIcon name="chevron-up" :size="16" aria-hidden="true" />
      </button>
    </h2>
    <div v-else class="flex items-start gap-2">
      <h2
        id="wolves-legend-title"
        class="min-w-0 flex-1 text-[13px] font-semibold leading-[18px] text-ink"
      >
        {{ TITLE }}
      </h2>
      <button
        v-if="isCollapsible"
        type="button"
        class="-mr-1 -mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full text-ink hover:bg-brand-50"
        :class="[FOCUS_RING, phone ? '-my-2 h-11 w-11' : 'h-6 w-6']"
        :aria-expanded="open"
        aria-controls="wolves-legend-items"
        :aria-label="open ? 'Suskleisti legendą' : 'Išskleisti legendą'"
        @click="open = !open"
      >
        <UiIcon :name="open ? 'chevron-down' : 'chevron-up'" :size="16" aria-hidden="true" />
      </button>
    </div>

    <div v-show="!isCollapsible || open" id="wolves-legend-items">
      <ul class="mt-2 space-y-1.5 text-xs leading-4">
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
      <p class="mt-2 text-xs text-ink-muted">Vieta rodoma apytiksliai (~1 km).</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { FOCUS_RING } from '@/components/hunting/hub/shell/controls';
import { MUNICIPALITY_OUTLINE_COLOR, WOLF_COLOR } from '@/utils/hunting/layers';

const props = defineProps({
  // Hub (SPEC2 §7): always a toggle, collapsed by default below 1280 px.
  collapsible: { type: Boolean, default: false },
  // Hub on phones: a 44 px "Legenda" control floating over the map, collapsed by default.
  phone: { type: Boolean, default: false },
});

// The marks' name, as the choropleth legend names its metric (one title pattern).
const TITLE = 'Sumedžioti vilkai';

// Wolves page: collapsible below 1024 px (SPEC §8.5), open by default on desktop.
const query =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia(props.collapsible ? '(max-width: 1279px)' : '(max-width: 1023px)')
    : null;
const isCollapsible = ref(props.phone || props.collapsible || !!query?.matches);
const open = ref(!props.phone && !query?.matches);

const onChange = (e: MediaQueryListEvent) => {
  if (props.phone) return;
  isCollapsible.value = props.collapsible || e.matches;
  open.value = !e.matches;
};
query?.addEventListener?.('change', onChange);
onBeforeUnmount(() => query?.removeEventListener?.('change', onChange));
</script>
