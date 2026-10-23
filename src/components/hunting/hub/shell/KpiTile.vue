<template>
  <div
    role="group"
    :aria-label="kpi.ariaLabel"
    class="flex min-w-0 flex-col gap-1 rounded-lg border border-line bg-white px-3 py-2.5"
  >
    <!-- The site's counter: the number first, in Atkinson Hyperlegible teal (DATAVIZ-07).
         Lines break only between words: numbers keep their (no-break) group spaces. -->
    <span
      aria-hidden="true"
      :class="[
        KPI_VALUE,
        kpi.muted ? '!text-ink-muted' : '',
        long ? 'text-sm leading-5' : SIZES[size],
      ]"
    >
      <!-- A date never breaks at its hyphens ("po 2027-05-15"). -->
      <template v-for="(part, i) in valueParts" :key="i">
        <span v-if="i % 2" class="whitespace-nowrap">{{ part }}</span>
        <template v-else>{{ part }}</template>
      </template>
    </span>
    <!-- The ⓘ sits in the label row, so the value keeps the tile's full width. -->
    <span class="flex items-start gap-1">
      <span aria-hidden="true" :class="LABEL">{{ kpi.label }}</span>
      <button
        v-if="kpi.tooltip"
        ref="tipButton"
        type="button"
        class="flex shrink-0 items-center justify-center rounded-full text-ink-muted hover:text-ink"
        :class="[focusRing, large ? '-m-3 w-11 h-11' : '-m-1 h-6 w-6']"
        :aria-expanded="tipOpen ? 'true' : 'false'"
        :aria-controls="tipOpen ? tipId : undefined"
        :aria-label="`Paaiškinimas: ${kpi.label}`"
        @click="emit('toggle-tip')"
        @keydown.esc="onEsc"
      >
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" stroke-width="1.5" />
          <rect x="9.1" y="8.5" width="1.8" height="6" rx="0.9" fill="currentColor" />
          <circle cx="10" cy="5.8" r="1.1" fill="currentColor" />
        </svg>
      </button>
    </span>
    <span v-if="kpi.sub" aria-hidden="true" class="text-xs leading-4 text-ink-muted">
      {{ kpi.sub }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import type { KpiDef } from '@/utils/hunting/hub/types';
import { KPI_VALUE } from './controls';
import { focusRing } from './shell';

const props = defineProps({
  kpi: { type: Object as PropType<KpiDef>, required: true },
  large: { type: Boolean, default: false },
  // One size for the whole row (KpiStrip picks it from the longest number).
  size: { type: String as PropType<'lg' | 'md' | 'sm'>, default: 'lg' },
  // Toggletip: KpiStrip renders the text under the whole row (inline, never clipped by the
  // panel) and tells the tile whether it is open.
  tipOpen: { type: Boolean, default: false },
  tipId: { type: String, default: '' },
});
const emit = defineEmits(['toggle-tip', 'close-tip']);
const SIZES = { lg: 'text-[28px] leading-8', md: 'text-[22px] leading-7', sm: 'text-lg leading-6' };

const LABEL = 'flex-1 text-[13px] font-medium leading-[18px] text-ink-muted';
function onEsc(event: KeyboardEvent) {
  if (!props.tipOpen) return;
  event.stopPropagation();
  emit('close-tip');
}
// A text value ("po 2027-05-15", "12 · 30 · 4") gets the smaller size, so it fits one line.
const long = computed(() => props.kpi.value.length > 9);
const valueParts = computed(() => props.kpi.value.split(/(\d{4}-\d{2}-\d{2})/));
</script>
