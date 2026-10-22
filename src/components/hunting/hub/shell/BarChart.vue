<template>
  <figure class="flex flex-col gap-1.5">
    <figcaption class="text-[13px] font-semibold leading-[18px] text-ink">
      {{ chart.title }}
    </figcaption>

    <!-- Horizontal bars (Laimikiai top species, Stebėjimai species): one grid, so every bar
         shares one baseline and one length scale; "Kitos rūšys" grey, set apart, last. -->
    <div
      v-if="chart.kind === 'hbar'"
      aria-hidden="true"
      class="grid grid-cols-[7.5rem_1fr_3.75rem] items-center gap-x-2 gap-y-1.5 text-xs"
    >
      <template v-for="bar in hbars" :key="`${bar.series || ''}${bar.label}`">
        <span
          class="truncate"
          :class="[bar.other ? 'mt-1.5 text-ink-muted' : 'text-ink']"
          :title="bar.label"
        >
          {{ bar.label }}
        </span>
        <span class="flex h-2.5 items-center" :class="bar.other ? 'mt-1.5' : ''">
          <span
            class="block h-2.5 rounded-r-sm"
            :style="{ width: pct(bar.value), background: barColor(bar) }"
          />
        </span>
        <span class="text-right tabular-nums text-ink" :class="bar.other ? 'mt-1.5' : ''">
          {{ bar.valueLabel }}
        </span>
      </template>
    </div>

    <!-- Columns: one bar per label; stacked: one segment per series. -->
    <div v-else aria-hidden="true" class="flex flex-col gap-1">
      <div class="flex h-[120px] items-end gap-1 border-b border-line-strong">
        <div
          v-for="col in columns"
          :key="col.label"
          class="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
        >
          <!-- Stacked: one column, a segment per series, 1 px white between segments. -->
          <template v-if="chart.kind === 'stacked'">
            <span class="mb-0.5 text-[11px] leading-none tabular-nums text-ink-muted">
              {{ col.totalLabel }}
            </span>
            <span
              class="flex w-full max-w-[28px] flex-col-reverse gap-px"
              :style="{ height: pct(col.total) }"
            >
              <span
                v-for="seg in col.segments"
                :key="seg.series"
                class="block w-full"
                :style="{
                  height: col.total ? `${(seg.value / col.total) * 100}%` : '0',
                  minHeight: seg.value > 0 ? '2px' : '0',
                  background: colorOf(seg.series),
                }"
              />
            </span>
          </template>
          <!-- Columns: one bar per series, side by side, each with its label. -->
          <span v-else class="flex h-full w-full items-end justify-center gap-0.5">
            <span
              v-for="seg in col.segments"
              :key="seg.series"
              class="flex h-full min-w-0 max-w-[28px] flex-1 flex-col items-center justify-end"
            >
              <span class="mb-0.5 text-[11px] leading-none tabular-nums text-ink">
                {{ seg.label }}
              </span>
              <span
                class="block w-full rounded-t-sm"
                :style="{
                  height: pct(seg.value),
                  background:
                    seg.current && !chart.series?.length ? BAR_CURRENT : colorOf(seg.series),
                }"
              />
            </span>
          </span>
        </div>
      </div>
      <div class="flex gap-1">
        <span
          v-for="col in columns"
          :key="col.label"
          class="min-w-0 flex-1 truncate text-center text-[11px] text-ink-muted"
        >
          {{ col.label }}
        </span>
      </div>
      <ul v-if="chart.series?.length" class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink">
        <li v-for="s in chart.series" :key="s.id" class="flex items-center gap-1.5">
          <span
            class="inline-block h-2.5 w-2.5 rounded-sm"
            :style="{ background: colorOf(s.id) }"
          />
          {{ s.label }}
        </li>
      </ul>
    </div>

    <p v-if="chart.note" class="text-xs leading-4 text-ink-muted">{{ chart.note }}</p>

    <!-- Table twin for screen readers (§10). -->
    <table class="sr-only">
      <caption>
        {{
          chart.title
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">Pavadinimas</th>
          <th v-for="s in seriesList" :key="s.id" scope="col">{{ s.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in twinRows" :key="row.label">
          <th scope="row">{{ row.label }}</th>
          <td v-for="s in seriesList" :key="s.id">{{ row.values[s.id] ?? '–' }}</td>
        </tr>
      </tbody>
    </table>
  </figure>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import type { ChartBar, ChartDef } from '@/utils/hunting/hub/types';
import { formatInt } from '@/utils/hunting/dates';
import { BAR_COLOR, BAR_CURRENT, BAR_OTHER, seriesColor } from '@/utils/hunting/hub/colors';

const props = defineProps({
  chart: { type: Object as PropType<ChartDef>, required: true },
});

// Colour follows the entity, never its position (DATAVIZ-03): species and named series get
// their colour from utils/hunting/hub/colors.ts, any other single series the bar teal.
const colorOf = (series?: string) => seriesColor(series);
const barColor = (bar: ChartBar) =>
  bar.other ? BAR_OTHER : bar.current ? BAR_CURRENT : bar.series ? colorOf(bar.series) : BAR_COLOR;

// The residual "Kitos rūšys" bar always last.
const hbars = computed(() => [
  ...props.chart.bars.filter((b) => !b.other),
  ...props.chart.bars.filter((b) => b.other),
]);

interface Column {
  label: string;
  total: number;
  totalLabel: string;
  segments: { series: string; value: number; label: string; current?: boolean }[];
}

const columns = computed<Column[]>(() => {
  const map = new Map<string, Column>();
  for (const bar of props.chart.bars) {
    let col = map.get(bar.label);
    if (!col) {
      col = { label: bar.label, total: 0, totalLabel: '', segments: [] };
      map.set(bar.label, col);
    }
    col.total += bar.value;
    col.segments.push({
      series: bar.series || '',
      value: bar.value,
      label: bar.valueLabel,
      current: bar.current,
    });
  }
  const cols = Array.from(map.values());
  // A column total is computed only when every part is an exact count: suppressed cells
  // ("<3") make the sum of the published parts differ from the real total. The topic may
  // give the total itself (a range such as "113–117").
  cols.forEach((c) => {
    const given = props.chart.totals?.[c.label];
    const exact = c.segments.every((seg) => Number.isInteger(seg.value) && !/</.test(seg.label));
    c.totalLabel = given ?? (c.total && exact ? formatInt(c.total) : '');
  });
  return cols;
});

const max = computed(() => {
  if (props.chart.kind === 'stacked') return Math.max(1, ...columns.value.map((c) => c.total));
  return Math.max(1, ...props.chart.bars.map((b) => b.value));
});

const pct = (v: number) => `${Math.max(0, Math.min(100, (v / max.value) * 100))}%`;

const seriesList = computed(() =>
  props.chart.kind !== 'hbar' && props.chart.series?.length
    ? props.chart.series
    : [{ id: '', label: 'Reikšmė' }],
);

const twinRows = computed(() => {
  const rows = new Map<string, { label: string; values: Record<string, string> }>();
  for (const bar of props.chart.bars) {
    const bySeries = props.chart.kind !== 'hbar' && !!props.chart.series?.length;
    const key = bySeries ? bar.label : `${bar.series || ''}${bar.label}`;
    let row = rows.get(key);
    if (!row) {
      row = { label: bar.label, values: {} };
      rows.set(key, row);
    }
    row.values[bySeries ? bar.series || '' : ''] = bar.valueLabel;
  }
  return Array.from(rows.values());
});
</script>
