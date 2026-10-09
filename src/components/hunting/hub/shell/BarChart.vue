<template>
  <figure class="flex flex-col gap-1">
    <figcaption class="text-xs font-semibold text-gray-900">{{ chart.title }}</figcaption>

    <!-- Horizontal bars with value labels (Laimikiai top species). -->
    <div v-if="chart.kind === 'hbar'" aria-hidden="true" class="flex flex-col gap-1">
      <div
        v-for="bar in chart.bars"
        :key="`${bar.series || ''}${bar.label}`"
        class="grid grid-cols-[7.5rem_1fr_auto] items-center gap-2 text-xs"
      >
        <span class="truncate text-gray-800" :title="bar.label">{{ bar.label }}</span>
        <span class="h-3 rounded-sm bg-gray-100">
          <span class="block h-3 rounded-sm bg-blue-700" :style="{ width: pct(bar.value) }" />
        </span>
        <span class="tabular-nums text-gray-900">{{ bar.valueLabel }}</span>
      </div>
    </div>

    <!-- Columns: one bar per label; stacked: one segment per series. -->
    <div v-else aria-hidden="true" class="flex flex-col gap-1">
      <div class="flex h-[120px] items-end gap-1 border-b border-gray-400">
        <div
          v-for="col in columns"
          :key="col.label"
          class="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
        >
          <!-- Stacked: one column, a segment per series. -->
          <template v-if="chart.kind === 'stacked'">
            <span class="mb-0.5 text-[10px] leading-none tabular-nums text-gray-800">
              {{ col.totalLabel }}
            </span>
            <span
              class="flex w-full max-w-[28px] flex-col-reverse"
              :style="{ height: pct(col.total) }"
            >
              <span
                v-for="seg in col.segments"
                :key="seg.series"
                class="block w-full"
                :style="{
                  height: col.total ? `${(seg.value / col.total) * 100}%` : '0',
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
              <span class="mb-0.5 text-[10px] leading-none tabular-nums text-gray-800">
                {{ seg.label }}
              </span>
              <span
                class="block w-full rounded-t-sm"
                :style="{ height: pct(seg.value), background: colorOf(seg.series) }"
              />
            </span>
          </span>
        </div>
      </div>
      <div class="flex gap-1">
        <span
          v-for="col in columns"
          :key="col.label"
          class="min-w-0 flex-1 truncate text-center text-[10px] text-gray-700"
        >
          {{ col.label }}
        </span>
      </div>
      <ul v-if="chart.series?.length" class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-800">
        <li v-for="s in chart.series" :key="s.id" class="flex items-center gap-1">
          <span
            class="inline-block h-3 w-3 rounded-sm border border-gray-500"
            :style="{ background: colorOf(s.id) }"
          />
          {{ s.label }}
        </li>
      </ul>
    </div>

    <p v-if="chart.note" class="text-xs text-gray-700">{{ chart.note }}</p>

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
import type { ChartDef } from '@/utils/hunting/hub/types';
import { formatInt } from '@/utils/hunting/dates';

const props = defineProps({
  chart: { type: Object as PropType<ChartDef>, required: true },
});

// Series colours: dark enough for 3:1 against white; the legend names each series.
// Neighbours in the Žala order (stumbrai/lūšys, bebrai/lokiai) differ in hue, not only shade.
const PALETTE = ['#1d4ed8', '#c2410c', '#15803d', '#7e22ce', '#be185d', '#4b5563', '#0f766e'];
const colorOf = (series?: string) => {
  const list = props.chart.series || [];
  const i = Math.max(
    0,
    list.findIndex((s) => s.id === series),
  );
  return PALETTE[i % PALETTE.length];
};

interface Column {
  label: string;
  total: number;
  totalLabel: string;
  segments: { series: string; value: number; label: string }[];
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
    col.segments.push({ series: bar.series || '', value: bar.value, label: bar.valueLabel });
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
