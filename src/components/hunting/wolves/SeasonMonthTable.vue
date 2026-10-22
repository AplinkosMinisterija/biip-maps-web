<template>
  <div class="flex flex-col gap-3 text-sm text-ink">
    <div v-if="isLoading" class="flex flex-col gap-2" aria-hidden="true">
      <div v-for="i in 5" :key="i" class="h-6 rounded bg-page animate-pulse" />
    </div>

    <div v-else class="overflow-x-auto max-w-full">
      <table :class="TABLE">
        <caption class="sr-only">
          Sumedžioti vilkai pagal sezonus ir mėnesius (visi sezonai, naujausi pirmi)
        </caption>
        <thead>
          <tr>
            <th scope="col" :class="[TH, STICKY_FIRST, 'z-30 pl-0']">Sezonas</th>
            <th
              v-for="month in MONTH_COLUMNS"
              :key="month.value"
              scope="col"
              :class="[TH, NUM_COMPACT]"
            >
              <abbr :title="month.full" class="no-underline">{{ month.short }}</abbr>
            </th>
            <th scope="col" :class="[TH, NUM_COMPACT]">Kiti mėn.</th>
            <!-- Short visible headers so the table fits the 520 px drawer; full names for screen readers. -->
            <th scope="col" :class="[TH, NUM_COMPACT]">
              <span aria-hidden="true" title="Iš viso (su vieta)">Iš viso</span>
              <span class="sr-only">Iš viso (su vieta)</span>
            </th>
            <th scope="col" :class="[TH, NUM_COMPACT]">Limitas</th>
            <th v-if="showPaperRows" scope="col" :class="[TH, NUM_COMPACT, 'pr-0']">
              <span aria-hidden="true" title="Be vietos (įrašai)">Be vietos</span>
              <span class="sr-only">Be vietos (įrašai)</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.season" :class="TR">
            <!-- The season is the row's action; the month counts are plain numbers. -->
            <th
              scope="row"
              :class="[TD, TD_BG, STICKY_FIRST, 'pl-0 font-normal whitespace-nowrap']"
            >
              <button
                type="button"
                :class="ROW_ACTION"
                :aria-label="`${row.label} sezonas: ${wolves(row.total)}. Rodyti šį sezoną.`"
                @click="selectSeason(row.season)"
              >
                {{ row.label }}
              </button>
            </th>
            <td
              v-for="month in MONTH_COLUMNS"
              :key="month.value"
              :class="[TD, TD_BG, NUM_COMPACT, row.months[month.value] ? '' : 'text-ink-muted']"
            >
              {{ formatInt(row.months[month.value]) }}
            </td>
            <td :class="[TD, TD_BG, NUM_COMPACT]">{{ formatInt(row.other) }}</td>
            <td :class="[TD, TD_BG, NUM_COMPACT, 'font-semibold']">
              {{ formatInt(row.total) }}
            </td>
            <td :class="[TD, TD_BG, NUM_COMPACT]">
              <template v-if="row.limit === NOT_APPROVED">
                <span aria-hidden="true" title="Nepatvirtintas">Nepatv.</span>
                <span class="sr-only">Nepatvirtintas</span>
              </template>
              <template v-else-if="row.limit === DASH">
                <span aria-hidden="true">{{ DASH }}</span>
                <span class="sr-only">limito šiame puslapyje nėra</span>
              </template>
              <template v-else>{{ row.limit }}</template>
            </td>
            <td v-if="showPaperRows" :class="[TD, TD_BG, NUM_COMPACT, 'pr-0']">
              {{ formatInt(row.paperRows) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ul :class="FOOTNOTES">
      <li>„Kiti mėn.“ – įrašai, kurių data balandžio–rugsėjo mėn.</li>
      <li v-if="showPaperRows">
        „Be vietos“ – popieriniais lapais pateiktos suvestinės: viena eilutė gali reikšti kelis
        vilkus, todėl į sumas jos neįtraukiamos.
      </li>
      <li v-if="rows.some((r) => r.limit === DASH)">
        „{{ DASH }}“ – šio sezono limito šiame puslapyje nėra.
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import type { Interval, WolfRecord } from '@/utils/hunting/types';

import { formatInt, pluralLt, WOLVES } from '@/utils/hunting/dates';
import { WOLF_LIMITS } from '@/utils/hunting/labels';
import { DASH } from '@/utils/hunting/hub/topics/common';
import {
  FOOTNOTES,
  ROW_ACTION,
  STICKY_FIRST,
  TABLE,
  TD,
  TD_BG,
  TH,
  TR,
} from '@/components/hunting/hub/table/spec';

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

const NOT_APPROVED = 'Nepatvirtintas';
const wolves = (n: number) => `${formatInt(n)} ${pluralLt(n, WOLVES)}`;

const ctx = inject(WOLVES_CTX)!;
const { state, data } = ctx;

const isLoading = computed(
  () => !data.dataset.value && ['loading', 'slow'].includes(data.phase.value),
);
// E3 failed → the paper rows cannot be attributed to seasons: hide the column (§10). Hidden
// too while every season has 0 such rows, so the column does not suggest missing wolves (J-04).
const showPaperRows = computed(
  () => data.seasons.value.length > 0 && rows.value.some((r) => r.paperRows > 0),
);

function limitLabel(season: number): string {
  if (season === ctx.currentSeason) {
    const limit = data.totals.value?.wolfLimit;
    if (limit === undefined || limit === null) return DASH;
    return limit === 0 ? NOT_APPROVED : formatInt(limit);
  }
  return WOLF_LIMITS[season] ? formatInt(WOLF_LIMITS[season]) : DASH;
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

function selectSeason(season: number) {
  const interval: Interval = { from: `${season}-04-01`, to: `${season + 1}-03-31` };
  state.setInterval(interval, `season:${season}`, true);
}

// Twelve narrow numeric columns must fit the 520 px drawer: less padding than NUM.
const NUM_COMPACT = 'w-[1%] whitespace-nowrap px-1.5 text-right tabular-nums';
</script>
