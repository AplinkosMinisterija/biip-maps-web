<template>
  <div class="flex flex-col gap-3 text-sm text-gray-900">
    <div class="overflow-x-auto max-w-full">
      <table class="min-w-full border-collapse text-left text-sm">
        <caption class="sr-only">
          {{
            `Sumedžioti vilkai pagal savivaldybes: ${periodLabel}`
          }}
        </caption>
        <thead>
          <tr class="border-b border-gray-200 text-xs text-gray-600">
            <th
              scope="col"
              :class="[stickyClass, 'py-2 pr-2 font-semibold bg-white']"
              :aria-sort="ariaSort('name')"
            >
              <button type="button" :class="sortButtonClass" @click="toggleSort('name')">
                Savivaldybė <span aria-hidden="true">{{ sortArrow('name') }}</span>
              </button>
            </th>
            <th
              scope="col"
              class="py-2 px-1 font-semibold text-right"
              :aria-sort="ariaSort('count')"
            >
              <button type="button" :class="sortButtonClass" @click="toggleSort('count')">
                Vilkų <span aria-hidden="true">{{ sortArrow('count') }}</span>
              </button>
            </th>
            <th scope="col" class="py-2 px-1 font-semibold text-right">Suaugę</th>
            <th scope="col" class="py-2 px-1 font-semibold text-right">Jaunikliai</th>
            <th scope="col" class="py-2 px-1 font-semibold text-right">Patinai</th>
            <th scope="col" class="py-2 px-1 font-semibold text-right">Patelės</th>
            <th scope="col" class="py-2 pl-1 font-semibold text-right">Paskutinis</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in visibleRows"
            :key="row.code ?? 'none'"
            class="border-b border-gray-100"
            :class="row.code !== null && row.code === state.sav.value ? 'bg-blue-50' : ''"
          >
            <th
              scope="row"
              :class="[
                stickyClass,
                'py-1 pr-2 font-normal',
                row.code !== null && row.code === state.sav.value ? 'bg-blue-50' : 'bg-white',
              ]"
            >
              <button
                v-if="row.code !== null"
                type="button"
                :class="cellButtonClass"
                :aria-pressed="row.code === state.sav.value"
                :aria-label="`${row.name}: ${row.count}. Rodyti šią savivaldybę.`"
                @click="selectMunicipality(row.code)"
              >
                {{ row.name }}
              </button>
              <span v-else class="text-gray-700">{{ row.name }}</span>
            </th>
            <td class="py-1 px-1 text-right tabular-nums font-semibold">
              {{ formatInt(row.count) }}
            </td>
            <td class="py-1 px-1 text-right tabular-nums">{{ formatInt(row.adults) }}</td>
            <td class="py-1 px-1 text-right tabular-nums">{{ formatInt(row.juniors) }}</td>
            <td class="py-1 px-1 text-right tabular-nums">{{ formatInt(row.males) }}</td>
            <td class="py-1 px-1 text-right tabular-nums">{{ formatInt(row.females) }}</td>
            <td class="py-1 pl-1 text-right tabular-nums whitespace-nowrap">
              {{ row.lastDay || '—' }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="border-t-2 border-gray-300 font-semibold">
            <th scope="row" :class="[stickyClass, 'py-2 pr-2 bg-white']">Iš viso Lietuvoje</th>
            <td class="py-2 px-1 text-right tabular-nums">{{ formatInt(totals.count) }}</td>
            <td class="py-2 px-1 text-right tabular-nums">{{ formatInt(totals.adults) }}</td>
            <td class="py-2 px-1 text-right tabular-nums">{{ formatInt(totals.juniors) }}</td>
            <td class="py-2 px-1 text-right tabular-nums">{{ formatInt(totals.males) }}</td>
            <td class="py-2 px-1 text-right tabular-nums">{{ formatInt(totals.females) }}</td>
            <td class="py-2 pl-1 text-right tabular-nums whitespace-nowrap">
              {{ totals.lastDay || '—' }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <button
      v-if="zeroCount > 0"
      type="button"
      class="self-start min-h-[44px] md:min-h-[24px] rounded px-2 text-sm font-semibold text-blue-800 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
      :aria-expanded="showZero"
      @click="showZero = !showZero"
    >
      {{
        showZero
          ? 'Slėpti savivaldybes be sumedžiotų vilkų'
          : `Rodyti savivaldybes be sumedžiotų vilkų (${zeroCount})`
      }}
    </button>

    <p class="text-xs text-gray-600">
      Savivaldybė nustatyta pagal sumedžiojimo vietą; prie ribų galimas nedidelis netikslumas.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref, shallowRef } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { loadMunicipalityIndex, type MunicipalityIndex } from '@/utils/hunting/municipalities';
import type { WolfRecord } from '@/utils/hunting/types';

interface Row {
  code: number | null;
  name: string;
  count: number;
  adults: number;
  juniors: number;
  males: number;
  females: number;
  lastDay: string | null;
}

const formatInt = (n: number) => new Intl.NumberFormat('lt-LT').format(n);
const emptyRow = (code: number | null, name: string): Row => ({
  code,
  name,
  count: 0,
  adults: 0,
  juniors: 0,
  males: 0,
  females: 0,
  lastDay: null,
});

const ctx = inject(WOLVES_CTX)!;
const { state, derived, data } = ctx;
const mapLayers: any = inject('mapLayers');

const index = shallowRef<MunicipalityIndex | null>(null);
onMounted(async () => {
  try {
    index.value = await loadMunicipalityIndex();
  } catch (err) {
    // The table still works from the records' own names; zero rows are unknown then.
    index.value = null;
  }
});

const showZero = ref(false);
const sortKey = ref<'count' | 'name'>('count');
const sortDir = ref<'asc' | 'desc'>('desc');

const periodLabel = computed(() => {
  const season = derived.intervalSeason.value;
  const { from, to } = state.interval.value;
  if (season !== null) return `${season}/${season + 1} sezonas`;
  return from === to ? from : `${from} – ${to}`;
});

// The table compares municipalities, so it ignores the `sav` filter: the interval and the
// attribute filters (§4.7 semantics) are applied here to all records.
const matches = (list: string[], value: string | null) =>
  !list.length || list.includes(value === null ? 'nenurodyta' : value);
const base = computed<WolfRecord[]>(() => {
  const records = data.dataset.value?.records || [];
  const { from, to } = state.interval.value;
  const { age, sex, method } = state.attrs.value;
  return records.filter(
    (r) =>
      from <= r.day &&
      r.day <= to &&
      matches(age, r.age) &&
      matches(sex, r.sex) &&
      matches(method, r.method),
  );
});

const aggregate = (row: Row, record: WolfRecord) => {
  row.count++;
  if (record.age === 'ADULT') row.adults++;
  if (record.age === 'ONE_YEAR') row.juniors++;
  if (record.sex === 'MALE') row.males++;
  if (record.sex === 'FEMALE') row.females++;
  if (!row.lastDay || record.day > row.lastDay) row.lastDay = record.day;
};

const rowsByCode = computed(() => {
  const map = new Map<number | null, Row>();
  index.value?.list.forEach((m) => map.set(m.code, emptyRow(m.code, m.name)));
  for (const record of base.value) {
    const code = record.municipalityCode ?? null;
    let row = map.get(code);
    if (!row) {
      row = emptyRow(code, code === null ? 'Nenustatyta' : record.municipalityName || `${code}`);
      map.set(code, row);
    }
    aggregate(row, record);
  }
  return map;
});

const sortedRows = computed(() => {
  const rows = [...rowsByCode.value.values()].filter((r) => r.code !== null);
  const dir = sortDir.value === 'asc' ? 1 : -1;
  rows.sort((a, b) =>
    sortKey.value === 'count'
      ? dir * (a.count - b.count) || a.name.localeCompare(b.name, 'lt')
      : dir * a.name.localeCompare(b.name, 'lt'),
  );
  const unassigned = rowsByCode.value.get(null);
  if (unassigned?.count) rows.push(unassigned);
  return rows;
});

const zeroCount = computed(() => sortedRows.value.filter((r) => r.count === 0).length);
const visibleRows = computed(() =>
  showZero.value ? sortedRows.value : sortedRows.value.filter((r) => r.count > 0),
);

const totals = computed(() => {
  const total = emptyRow(null, '');
  base.value.forEach((record) => aggregate(total, record));
  return total;
});

function toggleSort(key: 'count' | 'name') {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc';
  } else {
    sortKey.value = key;
    sortDir.value = key === 'count' ? 'desc' : 'asc';
  }
}
const ariaSort = (key: 'count' | 'name') =>
  sortKey.value === key ? (sortDir.value === 'asc' ? 'ascending' : 'descending') : 'none';
const sortArrow = (key: 'count' | 'name') =>
  sortKey.value === key ? (sortDir.value === 'asc' ? '▲' : '▼') : '';

function selectMunicipality(code: number) {
  const next = state.sav.value === code ? null : code;
  state.sav.value = next;
  const info = next !== null ? index.value?.byCode[next] : null;
  if (info && mapLayers) {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    mapLayers.zoomToExtent(info.extent3857, { animate: !reduceMotion, maxZoom: 12 });
  }
}

const stickyClass = 'sticky left-0 z-10 text-left';
const sortButtonClass =
  'inline-flex items-center gap-1 min-h-[24px] rounded font-semibold hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2';
const cellButtonClass =
  'min-h-[24px] rounded text-left text-blue-800 underline decoration-dotted underline-offset-2 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2';
</script>
