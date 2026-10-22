<template>
  <section :aria-labelledby="`${uid}-title`" class="min-w-0">
    <div class="flex items-center justify-between gap-2 mb-1">
      <h2
        :id="`${uid}-title`"
        ref="titleEl"
        tabindex="-1"
        class="text-[13px] font-semibold leading-[18px] text-ink focus:outline-none"
        :class="compact ? 'sr-only' : ''"
      >
        {{ title }}
      </h2>
      <button
        v-if="ctx.state.history.value.length"
        ref="backEl"
        type="button"
        aria-label="Grįžti į ankstesnį laikotarpį"
        class="ml-auto inline-flex shrink-0 items-center whitespace-nowrap rounded px-2 text-sm font-medium text-brand hover:bg-brand-50 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        :class="large ? 'min-h-[44px]' : 'min-h-[24px]'"
        @click="goBack"
      >
        ‹ Grįžti
      </button>
    </div>

    <!-- The bars filter the list: say so (J-16). -->
    <p v-if="!compact && !loading && hint" class="mb-1 text-xs text-ink-muted">{{ hint }}</p>

    <div
      v-if="loading"
      class="flex items-end gap-1 animate-pulse motion-reduce:animate-none"
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
      ref="stripEl"
      class="relative overflow-x-auto overscroll-x-contain pt-1 pb-1"
      :class="compact ? '' : '-mx-1 px-1'"
      :style="{
        ...(moreRight ? FADE_RIGHT : {}),
        paddingTop: dayLabels.maxLift ? `${4 + dayLabels.maxLift * DAY_LINE}px` : undefined,
      }"
      @scroll.passive="measure"
    >
      <ul class="flex items-end gap-0.5 min-w-full" role="list">
        <li v-for="(bin, index) in bins" :key="bin.key" class="flex-1" :class="minWidth">
          <button
            type="button"
            :aria-label="ariaLabelOf(bin)"
            class="group w-full cursor-pointer flex flex-col items-center justify-end rounded hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            :style="{ height: `${barArea + (compact ? 14 : 32)}px` }"
            @click="drill(bin)"
          >
            <span
              v-if="!compact && bin.level !== 'day'"
              class="text-xxs leading-4 tabular-nums"
              :class="bin.count ? 'text-ink font-semibold' : 'text-ink-muted'"
            >
              {{ formatInt(bin.count) }}
            </span>
            <!-- Days: every non-empty day has its count; a label that would touch a
                 neighbour's label or bar moves up a line (dayLabels). -->
            <span v-else-if="!compact" class="relative block h-4 w-full">
              <span
                v-if="bin.count"
                class="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-semibold leading-3 text-ink tabular-nums"
                :class="dayLabels.small ? 'text-xxxs' : 'text-xxs'"
                :style="{ bottom: `${(dayLabels.lift[index] || 0) * DAY_LINE}px` }"
              >
                {{ formatInt(bin.count) }}
              </span>
            </span>
            <span
              class="block w-full max-w-[40px] rounded-t-sm group-hover:opacity-80"
              :class="bin.count ? '' : 'bg-line'"
              :style="{
                height: `${barHeight(bin.count)}px`,
                background: bin.count ? WOLF_COLOR : undefined,
              }"
            />
            <span class="text-xxs leading-[14px] text-ink-muted whitespace-nowrap">{{
              showLabel(bin, index) ? shortLabel(bin) : ''
            }}</span>
            <span
              v-if="!compact"
              class="text-xxxs leading-[12px] text-ink-muted whitespace-nowrap h-3"
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
import { computed, getCurrentInstance, inject, nextTick, ref, watch } from 'vue';
import { useResizeObserver } from '@vueuse/core';
import { WOLVES_CTX } from '@/composables/hunting/context';
import type { HistogramBin, PresetId } from '@/utils/hunting/types';
import { formatInt, pluralLt, WOLVES } from '@/utils/hunting/dates';
import { MONTH_NAMES, MONTH_SHORT } from '@/utils/hunting/labels';
import { histogram, isOtherMonthsBin } from '@/utils/hunting/wolves';
import { WOLF_COLOR } from '@/utils/hunting/layers';

const props = defineProps({
  // Mobile collapsed sheet: 64 px bars, no counts, title only for screen readers.
  compact: { type: Boolean, default: false },
  // Touch layout: 44 px wide targets.
  large: { type: Boolean, default: false },
  // Hub (SPEC2 §7): a full season shows Oct … Mar plus one "Kiti mėn." bar.
  clipToWindow: { type: Boolean, default: false },
});

const ctx = inject(WOLVES_CTX)!;
const uid = `wolves-histogram-${getCurrentInstance()?.uid ?? 0}`;
const titleEl = ref<HTMLElement | null>(null);
const backEl = ref<HTMLButtonElement | null>(null);

const bins = computed(() =>
  props.clipToWindow && ctx.data.dataset.value
    ? histogram(ctx.derived.filtered.value, ctx.state.interval.value, { clipToWindow: true })
    : ctx.derived.histogram.value,
);

// When the bars overflow (phones, the day level), start the strip at the first non-empty
// bar: a season starts with six empty months (Apr–Sep) before the wolf window.
const stripEl = ref<HTMLElement | null>(null);
function scrollToFirstBar() {
  const el = stripEl.value;
  if (!el || el.scrollWidth <= el.clientWidth) return;
  const first = bins.value.findIndex((b) => b.count > 0);
  const item = el.querySelectorAll('li')[Math.max(first, 0)] as HTMLElement | undefined;
  el.scrollLeft = item ? Math.max(0, item.offsetLeft - 4) : 0;
}
watch(() => bins.value.map((b) => b.key).join('|'), scrollToFirstBar, { flush: 'post' });
// The strip gets its width only after layout (and again when the sheet expands).
useResizeObserver(stripEl, () => {
  scrollToFirstBar();
  measure();
});

// Bars hidden to the right fade out, so the strip shows that it scrolls (J-13).
const FADE_RIGHT = {
  maskImage: 'linear-gradient(to right, #000 85%, transparent)',
  WebkitMaskImage: 'linear-gradient(to right, #000 85%, transparent)',
};
const moreRight = ref(false);
// Bar width and bar-to-bar distance in px, for the day labels.
const slot = ref({ width: 0, pitch: 0 });
function measure() {
  const el = stripEl.value;
  moreRight.value = !!el && el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  const items = el?.querySelectorAll('li');
  if (!items || items.length < 2) return;
  const width = (items[0] as HTMLElement).offsetWidth;
  const pitch = (items[1] as HTMLElement).offsetLeft - (items[0] as HTMLElement).offsetLeft;
  if (width !== slot.value.width || pitch !== slot.value.pitch) slot.value = { width, pitch };
}
watch(
  () => bins.value.map((b) => b.key).join('|'),
  () => nextTick(measure),
  { flush: 'post' },
);
const loading = computed(() => !ctx.data.dataset.value);
const level = computed(() => bins.value[0]?.level ?? 'month');
// One caption pattern: "{what} pagal {dimension} · {period}" (DATAVIZ-25).
const title = computed(() => {
  const base = (
    {
      season: 'Sumedžioti vilkai pagal sezonus',
      month: 'Sumedžioti vilkai pagal mėnesius',
      day: 'Sumedžioti vilkai pagal dienas',
    } as const
  )[level.value];
  if (level.value === 'season') return base;
  const s = ctx.derived.intervalSeason.value;
  return `${base} · ${s != null ? `${s}/${s + 1}` : ctx.derived.periodLabel.value}`;
});
const hint = computed(() =>
  level.value === 'month'
    ? 'Spustelėkite mėnesį – bus rodomi tik jo įrašai.'
    : level.value === 'season'
      ? 'Spustelėkite sezoną – bus rodomi tik jo įrašai.'
      : '',
);

// The day level fits the whole month in the panel: no minimum bar width with a mouse; touch
// keeps 24 px targets and the fade shows the rest (J-13).
const minWidth = computed(() => {
  if (level.value === 'day') return props.large ? 'min-w-[24px]' : 'min-w-0';
  return props.large ? 'min-w-[44px]' : 'min-w-[24px]';
});
// Days: labels on 1, 5, 10, 15, 20, 25 and the last day.
function showLabel(bin: HistogramBin, index: number) {
  if (bin.level !== 'day') return true;
  const day = Number(bin.interval.from.slice(8, 10));
  return [1, 5, 10, 15, 20, 25].includes(day) || index === bins.value.length - 1;
}

// The hub's clipped panel histogram is lower so it ends above y = 600 at 1440 × 900.
const barArea = computed(() => (props.compact ? 40 : props.clipToWindow ? 68 : 96));
const maxCount = computed(() => Math.max(1, ...bins.value.map((b) => b.count)));
const barHeight = (count: number) =>
  count ? Math.max(4, Math.round((count / maxCount.value) * barArea.value)) : 2;

// Day counts: a count on every non-empty day, in a smaller font when the bars are narrow.
// Left to right, each label sits on its bar, or as many 12 px lines higher as it takes to
// keep clear of the labels before it and of the neighbouring bars (a label may be wider than
// its bar). The strip gets that much more room on top.
const DAY_LINE = 12;
const dayLabels = computed(() => {
  const lift: number[] = [];
  const { width, pitch } = slot.value;
  if (props.compact || level.value !== 'day' || !pitch) return { lift, maxLift: 0, small: false };
  const small = pitch < 16;
  const digitW = (small ? 9.6 : 11) * 0.62; // Noto Sans 600 tabular digits
  const placed: { x: number; w: number; bottom: number }[] = [];
  const list = bins.value;
  list.forEach((bin, i) => {
    if (!bin.count) return;
    const x = i * pitch;
    const w = formatInt(bin.count).length * digitW + 2;
    const base = barHeight(bin.count);
    let up = 0;
    for (; up < 4; up++) {
      const bottom = base + up * DAY_LINE;
      const hitsBar = list.some(
        (other, k) =>
          k !== i &&
          Math.abs(k - i) * pitch - width / 2 < w / 2 &&
          bottom < barHeight(other.count) + 1,
      );
      const hitsLabel = placed.some(
        (p) => Math.abs(p.x - x) < (p.w + w) / 2 && Math.abs(p.bottom - bottom) < DAY_LINE,
      );
      if (!hitsBar && !hitsLabel) break;
    }
    lift[i] = up;
    placed.push({ x, w, bottom: base + up * DAY_LINE });
  });
  return { lift, maxLift: Math.max(0, ...lift.filter((v) => v !== undefined)), small };
});

// 1..12, the index into MONTH_SHORT / MONTH_NAMES.
const monthIndex = (bin: HistogramBin) => Number(bin.interval.from.slice(5, 7));
const seasonOf = (bin: HistogramBin) => Number(bin.interval.from.slice(0, 4));

function shortLabel(bin: HistogramBin) {
  if (isOtherMonthsBin(bin)) return bin.label;
  if (bin.level === 'season') {
    const s = seasonOf(bin);
    return `${s}/${`${(s + 1) % 100}`.padStart(2, '0')}`;
  }
  if (bin.level === 'month') return MONTH_SHORT[monthIndex(bin)];
  return `${Number(bin.interval.from.slice(8, 10))}`;
}

// A small year line under the first bar and under every January / 1st of a month.
function yearMark(bin: HistogramBin, index: number) {
  if (bin.level === 'season' || isOtherMonthsBin(bin)) return '';
  if (bin.level === 'month') {
    return index === 0 || monthIndex(bin) === 1 ? bin.interval.from.slice(0, 4) : '';
  }
  // Days of one month: the caption names the period; a month mark only where months change.
  if (index === 0) return '';
  return bin.interval.from.endsWith('-01') ? MONTH_SHORT[monthIndex(bin)] : '';
}

function ariaLabelOf(bin: HistogramBin) {
  // Prefer the label built with the bins; fall back to the SPEC §6.5 wording.
  if (bin.ariaLabel && bin.ariaLabel.includes('Rodyti')) return bin.ariaLabel;
  const n = `${formatInt(bin.count)} ${pluralLt(bin.count, WOLVES)}`;
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
