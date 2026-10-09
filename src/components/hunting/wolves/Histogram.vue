<template>
  <section :aria-labelledby="`${uid}-title`" class="min-w-0">
    <div class="flex items-center justify-between gap-2 mb-1">
      <h2
        :id="`${uid}-title`"
        ref="titleEl"
        tabindex="-1"
        class="text-sm font-semibold text-gray-900 focus:outline-none"
        :class="compact ? 'sr-only' : ''"
      >
        {{ title }}
      </h2>
      <button
        v-if="ctx.state.history.value.length"
        ref="backEl"
        type="button"
        aria-label="Grįžti į ankstesnį laikotarpį"
        class="ml-auto inline-flex items-center rounded px-2 text-sm font-medium text-blue-800 hover:bg-blue-50 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        :class="large ? 'min-h-[44px]' : 'min-h-[24px]'"
        @click="goBack"
      >
        ‹ Grįžti
      </button>
    </div>

    <div
      v-if="loading"
      class="flex items-end gap-1 animate-pulse"
      :style="{ height: `${barArea + 32}px` }"
      aria-hidden="true"
    >
      <div
        v-for="h in [40, 75, 55, 90, 30]"
        :key="h"
        class="flex-1 rounded-t bg-gray-200"
        :style="{ height: `${(h / 100) * barArea}px` }"
      />
    </div>

    <div
      v-else
      class="overflow-x-auto overscroll-x-contain pt-1 pb-1"
      :class="compact ? '' : '-mx-1 px-1'"
    >
      <ul class="flex items-end gap-0.5 min-w-full" role="list">
        <li
          v-for="(bin, index) in bins"
          :key="bin.key"
          class="flex-1"
          :class="large ? 'min-w-[44px]' : 'min-w-[24px]'"
        >
          <button
            type="button"
            :aria-label="ariaLabelOf(bin)"
            class="group w-full flex flex-col items-center justify-end rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-1"
            :style="{ height: `${barArea + (compact ? 14 : 32)}px` }"
            @click="drill(bin)"
          >
            <span
              v-if="!compact"
              class="text-xxs leading-4 tabular-nums"
              :class="bin.count ? 'text-gray-900 font-semibold' : 'text-gray-500'"
            >
              {{ formatInt(bin.count) }}
            </span>
            <span
              class="block w-full max-w-[40px] rounded-t-sm group-hover:opacity-80"
              :class="bin.count ? 'bg-[#B45309]' : 'bg-gray-300'"
              :style="{ height: `${barHeight(bin.count)}px` }"
            />
            <span class="text-xxs leading-[14px] text-gray-700 whitespace-nowrap">{{
              shortLabel(bin)
            }}</span>
            <span
              v-if="!compact"
              class="text-xxxs leading-[12px] text-gray-500 whitespace-nowrap h-3"
            >
              {{ yearMark(bin, index) }}
            </span>
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
// Clickable count bars (SPEC §6.5): season → month → day. Bins come from the
// shared context (`derived.histogram`, built by utils/hunting/wolves.ts).
import { computed, getCurrentInstance, inject, nextTick, ref } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import type { HistogramBin, PresetId } from '@/utils/hunting/types';

const props = defineProps({
  // Mobile collapsed sheet: 64 px bars, no counts, title only for screen readers.
  compact: { type: Boolean, default: false },
  // Touch layout: 44 px wide targets.
  large: { type: Boolean, default: false },
});

const ctx = inject(WOLVES_CTX)!;
const uid = `wolves-histogram-${getCurrentInstance()?.uid ?? 0}`;
const titleEl = ref<HTMLElement | null>(null);
const backEl = ref<HTMLButtonElement | null>(null);

const SHORT_MONTHS = [
  'saus.',
  'vas.',
  'kov.',
  'bal.',
  'geg.',
  'birž.',
  'liep.',
  'rugp.',
  'rugs.',
  'spal.',
  'lapkr.',
  'gruod.',
];
const MONTH_NAMES = [
  'sausis',
  'vasaris',
  'kovas',
  'balandis',
  'gegužė',
  'birželis',
  'liepa',
  'rugpjūtis',
  'rugsėjis',
  'spalis',
  'lapkritis',
  'gruodis',
];

const numberFormat = new Intl.NumberFormat('lt-LT');
const formatInt = (n: number) => numberFormat.format(n);
const pluralLt = (n: number, forms: [string, string, string]) => {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return forms[0];
  if (a >= 2 && a <= 9 && !(b >= 12 && b <= 19)) return forms[1];
  return forms[2];
};

const bins = computed(() => ctx.derived.histogram.value);
const loading = computed(() => !ctx.data.dataset.value);
const level = computed(() => bins.value[0]?.level ?? 'month');
const title = computed(
  () =>
    (({ season: 'Pagal sezonus', month: 'Pagal mėnesius', day: 'Pagal dienas' }) as const)[
      level.value
    ],
);

const barArea = computed(() => (props.compact ? 40 : 96));
const maxCount = computed(() => Math.max(1, ...bins.value.map((b) => b.count)));
const barHeight = (count: number) =>
  count ? Math.max(4, Math.round((count / maxCount.value) * barArea.value)) : 2;

const monthIndex = (bin: HistogramBin) => Number(bin.interval.from.slice(5, 7)) - 1;
const seasonOf = (bin: HistogramBin) => Number(bin.interval.from.slice(0, 4));

function shortLabel(bin: HistogramBin) {
  if (bin.level === 'season') {
    const s = seasonOf(bin);
    return `${s}/${`${(s + 1) % 100}`.padStart(2, '0')}`;
  }
  if (bin.level === 'month') return SHORT_MONTHS[monthIndex(bin)];
  return `${Number(bin.interval.from.slice(8, 10))}`;
}

// A small year line under the first bar and under every January / 1st of a month.
function yearMark(bin: HistogramBin, index: number) {
  if (bin.level === 'season') return '';
  if (bin.level === 'month') {
    return index === 0 || monthIndex(bin) === 0 ? bin.interval.from.slice(0, 4) : '';
  }
  return index === 0 || bin.interval.from.endsWith('-01') ? SHORT_MONTHS[monthIndex(bin)] : '';
}

function ariaLabelOf(bin: HistogramBin) {
  // Prefer the label built with the bins; fall back to the SPEC §6.5 wording.
  if (bin.ariaLabel && bin.ariaLabel.includes('Rodyti')) return bin.ariaLabel;
  const n = `${formatInt(bin.count)} ${pluralLt(bin.count, ['vilkas', 'vilkai', 'vilkų'])}`;
  if (bin.level === 'season') {
    const s = seasonOf(bin);
    return `${s}/${s + 1} sezonas: ${n}. Rodyti šį sezoną.`;
  }
  if (bin.level === 'month') {
    return `${bin.interval.from.slice(0, 4)} m. ${MONTH_NAMES[monthIndex(bin)]}: ${n}. Rodyti šį mėnesį.`;
  }
  return `${bin.interval.from}: ${n}. Rodyti šią dieną.`;
}

async function drill(bin: HistogramBin) {
  const preset: PresetId = bin.level === 'season' ? `season:${seasonOf(bin)}` : 'custom';
  ctx.state.setInterval(bin.interval, preset, true);
  // The clicked bar is replaced by the next level; keep keyboard focus in the chart.
  await nextTick();
  (backEl.value ?? titleEl.value)?.focus();
}

async function goBack() {
  ctx.state.back();
  await nextTick();
  (backEl.value ?? titleEl.value)?.focus();
}
</script>
