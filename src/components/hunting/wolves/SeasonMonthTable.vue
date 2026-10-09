<template>
  <div class="flex flex-col gap-3 text-sm text-gray-900">
    <div v-if="isLoading" class="flex flex-col gap-2" aria-hidden="true">
      <div v-for="i in 5" :key="i" class="h-6 rounded bg-gray-100 animate-pulse" />
    </div>

    <div v-else class="overflow-x-auto max-w-full">
      <table class="min-w-full border-collapse text-left text-sm">
        <caption class="sr-only">
          Sumedžioti vilkai pagal sezonus ir mėnesius (visi sezonai, naujausi pirmi)
        </caption>
        <thead>
          <tr class="border-b border-gray-200 text-xs text-gray-600">
            <th scope="col" :class="[stickyClass, 'py-2 pr-2 font-semibold']">Sezonas</th>
            <th
              v-for="month in MONTH_COLUMNS"
              :key="month.value"
              scope="col"
              class="py-2 px-1 font-semibold text-right"
            >
              <abbr :title="month.full" class="no-underline">{{ month.short }}</abbr>
            </th>
            <th scope="col" class="py-2 px-1 font-semibold text-right">Kiti mėn.</th>
            <th scope="col" class="py-2 px-1 font-semibold text-right">Iš viso (su vieta)</th>
            <th scope="col" class="py-2 px-1 font-semibold text-right">Limitas</th>
            <th v-if="showPaperRows" scope="col" class="py-2 pl-1 font-semibold text-right">
              Be vietos (įrašai)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.season" class="border-b border-gray-100">
            <th scope="row" :class="[stickyClass, 'py-1 pr-2 font-semibold whitespace-nowrap']">
              <button
                type="button"
                :class="cellButtonClass"
                :aria-label="`${row.label} sezonas: ${row.total}. Rodyti šį sezoną.`"
                @click="selectSeason(row.season)"
              >
                {{ row.label }}
              </button>
            </th>
            <td
              v-for="month in MONTH_COLUMNS"
              :key="month.value"
              class="py-1 px-1 text-right tabular-nums"
            >
              <button
                v-if="row.months[month.value]"
                type="button"
                :class="cellButtonClass"
                :aria-label="`${monthYear(row.season, month.value)} m. ${month.full.toLowerCase()}: ${row.months[month.value]}. Rodyti šį mėnesį.`"
                @click="selectMonth(row.season, month.value)"
              >
                {{ formatInt(row.months[month.value]) }}
              </button>
              <span v-else class="text-gray-500">0</span>
            </td>
            <td class="py-1 px-1 text-right tabular-nums">{{ formatInt(row.other) }}</td>
            <td class="py-1 px-1 text-right tabular-nums font-semibold">
              {{ formatInt(row.total) }}
            </td>
            <td class="py-1 px-1 text-right tabular-nums whitespace-nowrap">{{ row.limit }}</td>
            <td v-if="showPaperRows" class="py-1 pl-1 text-right tabular-nums">
              {{ formatInt(row.paperRows) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="text-xs text-gray-600">
      „Kiti mėn.“ – įrašai, kurių data balandžio–rugsėjo mėn.
      <template v-if="showPaperRows">
        „Be vietos“ – popieriniais lapais pateiktos suvestinės: viena eilutė gali reikšti kelis
        vilkus, todėl į sumas jos neįtraukiamos.
      </template>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import type { Interval, WolfRecord } from '@/utils/hunting/types';

import { formatInt } from '@/utils/hunting/dates';
import { WOLF_LIMITS } from '@/utils/hunting/labels';

// Wolf hunting months in season order; April–September go to "Kiti mėn.".
const MONTH_COLUMNS = [
  { value: 10, short: 'Spal.', full: 'Spalis' },
  { value: 11, short: 'Lapkr.', full: 'Lapkritis' },
  { value: 12, short: 'Gruod.', full: 'Gruodis' },
  { value: 1, short: 'Saus.', full: 'Sausis' },
  { value: 2, short: 'Vas.', full: 'Vasaris' },
  { value: 3, short: 'Kov.', full: 'Kovas' },
];

interface PivotRow {
  season: number;
  label: string;
  months: Record<number, number>;
  other: number;
  total: number;
  limit: string;
  paperRows: number;
}

const pad = (n: number) => `${n}`.padStart(2, '0');

const ctx = inject(WOLVES_CTX)!;
const { state, data } = ctx;

const isLoading = computed(
  () => !data.dataset.value && ['loading', 'slow'].includes(data.phase.value),
);
// E3 failed → the paper rows cannot be attributed to seasons: hide the column (§10).
const showPaperRows = computed(() => data.seasons.value.length > 0);

function limitLabel(season: number): string {
  if (season === ctx.currentSeason) {
    const limit = data.totals.value?.wolfLimit;
    if (limit === undefined || limit === null) return '—';
    return limit === 0 ? 'Nepatvirtintas' : formatInt(limit);
  }
  return WOLF_LIMITS[season] ? formatInt(WOLF_LIMITS[season]) : '—';
}

// Over ALL records (ignores the interval), newest season first.
const rows = computed<PivotRow[]>(() => {
  const dataset = data.dataset.value;
  if (!dataset) return [];

  const bySeason: Record<number, WolfRecord[]> = {};
  for (const record of dataset.records) {
    if (!bySeason[record.season]) bySeason[record.season] = [];
    bySeason[record.season].push(record);
  }

  const seasons = Object.keys(bySeason).map(Number);
  const first = seasons.length ? Math.min(...seasons) : ctx.currentSeason;
  const last = Math.max(ctx.currentSeason, ...seasons);

  const result: PivotRow[] = [];
  for (let season = last; season >= first; season--) {
    const months: Record<number, number> = { 10: 0, 11: 0, 12: 0, 1: 0, 2: 0, 3: 0 };
    let other = 0;
    const records = bySeason[season] || [];
    for (const record of records) {
      const month = Number(record.day.slice(5, 7));
      if (month in months) months[month]++;
      else other++;
    }
    result.push({
      season,
      label: `${season}/${season + 1}`,
      months,
      other,
      total: records.length,
      limit: limitLabel(season),
      paperRows: dataset.paperRowsBySeason[season] || 0,
    });
  }
  return result;
});

const monthYear = (season: number, month: number) => (month >= 4 ? season : season + 1);

function selectSeason(season: number) {
  const interval: Interval = { from: `${season}-04-01`, to: `${season + 1}-03-31` };
  state.setInterval(interval, `season:${season}`, true);
}

function selectMonth(season: number, month: number) {
  const year = monthYear(season, month);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const interval: Interval = {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
  state.setInterval(interval, 'custom', true);
}

const stickyClass = 'sticky left-0 z-10 bg-white';
const cellButtonClass =
  'min-h-[24px] min-w-[24px] rounded px-1 font-semibold text-blue-800 underline decoration-dotted underline-offset-2 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2';
</script>
