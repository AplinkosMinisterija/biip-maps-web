<template>
  <div class="flex flex-col gap-3 text-sm text-gray-900">
    <div v-if="showVisibleAreaToggle" class="flex flex-col gap-1">
      <label class="inline-flex items-center gap-2 cursor-pointer min-h-[24px]">
        <input
          v-model="visibleOnly"
          type="checkbox"
          class="h-4 w-4 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        />
        <span>Tik matomame žemėlapio plote</span>
      </label>
      <p v-if="visibleOnly" class="text-xs text-gray-600">
        Šiame žemėlapio plote: {{ formatInt(rows.length) }} iš {{ formatInt(filtered.length) }}
      </p>
    </div>

    <div v-if="isLoading" class="flex flex-col gap-2" aria-hidden="true">
      <div v-for="i in 5" :key="i" class="h-6 rounded bg-gray-100 animate-pulse" />
    </div>

    <p v-else-if="!rows.length" class="text-sm text-gray-700">
      Pasirinktu laikotarpiu sumedžiotų vilkų su žinoma vieta nėra.
    </p>

    <ul v-else-if="isMobile" class="flex flex-col gap-2" :aria-label="caption">
      <li v-for="row in pageRows" :key="row.id">
        <button
          type="button"
          class="w-full min-h-[44px] text-left rounded-lg border border-gray-200 bg-white px-3 py-2 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
          :aria-label="showOnMapLabel(row)"
          @click="showOnMap(row)"
        >
          <span class="flex flex-wrap items-center gap-x-2 font-semibold tabular-nums">
            {{ row.day }}
            <span v-if="showMunicipality" class="font-normal text-gray-700">
              · {{ row.municipalityName || 'Nenustatyta' }}
            </span>
            <span v-if="!row.inWolfWindow" :class="tagClass">ne medžioklės laikotarpiu</span>
          </span>
          <span class="block text-gray-800">
            {{ ageLabel(row.age) }} · {{ sexLabel(row.sex) }} · {{ methodLabel(row.method) }}
          </span>
          <span class="block text-xs text-gray-600">{{ sourceLabel(row.source) }}</span>
        </button>
      </li>
    </ul>

    <div v-else class="overflow-x-auto">
      <table class="w-full border-collapse text-left text-sm">
        <caption class="sr-only">
          {{
            caption
          }}
        </caption>
        <thead>
          <tr class="border-b border-gray-200 text-xs text-gray-600">
            <th scope="col" class="py-2 pr-2 font-semibold" :aria-sort="ariaSort('day')">
              <button type="button" :class="sortButtonClass" @click="toggleSort('day')">
                Data
                <span aria-hidden="true">{{ sortArrow('day') }}</span>
              </button>
            </th>
            <th
              v-if="showMunicipality"
              scope="col"
              class="py-2 pr-2 font-semibold"
              :aria-sort="ariaSort('sav')"
            >
              <button type="button" :class="sortButtonClass" @click="toggleSort('sav')">
                Savivaldybė
                <span aria-hidden="true">{{ sortArrow('sav') }}</span>
              </button>
            </th>
            <th scope="col" class="py-2 pr-2 font-semibold">Amžius</th>
            <th scope="col" class="py-2 pr-2 font-semibold">Lytis</th>
            <th scope="col" class="py-2 pr-2 font-semibold">Medžioklės būdas</th>
            <th scope="col" class="py-2 pr-2 font-semibold">Gaujos narys</th>
            <th scope="col" class="py-2 pr-2 font-semibold">Šaltinis</th>
            <th scope="col" class="py-2 font-semibold"><span class="sr-only">Veiksmai</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in pageRows" :key="row.id" class="border-b border-gray-100 align-top">
            <td class="py-2 pr-2 whitespace-nowrap tabular-nums">
              {{ row.day }}
              <span v-if="!row.inWolfWindow" :class="tagClass" class="ml-1">
                ne medžioklės laikotarpiu
              </span>
            </td>
            <td v-if="showMunicipality" class="py-2 pr-2">
              {{ row.municipalityName || 'Nenustatyta' }}
            </td>
            <td class="py-2 pr-2">{{ ageLabel(row.age) }}</td>
            <td class="py-2 pr-2">{{ sexLabel(row.sex) }}</td>
            <td class="py-2 pr-2">{{ methodLabel(row.method) }}</td>
            <td class="py-2 pr-2">{{ packLabel(row.packMember, row.packAmount) }}</td>
            <td class="py-2 pr-2">{{ sourceLabel(row.source) }}</td>
            <td class="py-2 whitespace-nowrap">
              <button
                type="button"
                class="min-h-[24px] rounded px-2 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
                :aria-label="showOnMapLabel(row)"
                @click="showOnMap(row)"
              >
                Rodyti žemėlapyje
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="rows.length" class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-xs text-gray-700 tabular-nums" aria-live="polite">
        Rodoma {{ formatInt(rangeFrom) }}–{{ formatInt(rangeTo) }} iš {{ formatInt(rows.length) }}
      </p>
      <div class="flex gap-2">
        <button
          type="button"
          :class="pagerButtonClass"
          :disabled="page === 0"
          @click="page = page - 1"
        >
          Ankstesnis
        </button>
        <button
          type="button"
          :class="pagerButtonClass"
          :disabled="page >= pageCount - 1"
          @click="page = page + 1"
        >
          Kitas
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { hasMunicipalities } from '@/utils/hunting/municipalities';
import type { WolfRecord } from '@/utils/hunting/types';

// Local copies of the §4.8 labels and §4.9 formats; the integrator may switch these
// to `@/utils/hunting/labels` / `dates` once T1 lands (same strings).
const AGE: Record<string, string> = {
  ADULT: 'Suaugęs',
  TWO_YEAR: 'Vyresnis nei 1 m.',
  ONE_YEAR: 'Jauniklis iki 1 m.',
};
const SEX: Record<string, string> = { MALE: 'Patinas', FEMALE: 'Patelė' };
const METHOD: Record<string, string> = {
  TYKOJAMOJI: 'Tykojamoji',
  VAROMOJI: 'Varomoji',
  SU_VELIAVELEMIS: 'Su vėliavėlėmis',
  OTHER: 'Kita',
};
const SOURCE: Record<string, string> = {
  biomon: 'BIOMON',
  biip: 'BIIP elektroninis medžioklės lapas',
};
const ageLabel = (v: string | null) => (v ? AGE[v] || v : 'Nenurodyta');
const sexLabel = (v: string | null) => (v ? SEX[v] || v : 'Nenurodyta');
const methodLabel = (v: string | null) => (v ? METHOD[v] || v : 'Nenurodytas');
const sourceLabel = (v: string) => SOURCE[v] || v;
const packLabel = (member: boolean | null, amount: number | null) => {
  if (member === true) return amount && amount > 0 ? `Taip, gaujoje ${amount}` : 'Taip';
  if (member === false) return 'Ne';
  return 'Nenurodyta';
};
const formatInt = (n: number) => new Intl.NumberFormat('lt-LT').format(n);

const PAGE_SIZE = 50;

// 'show-on-map' (record: WolfRecord): the parent may collapse the mobile sheet.
const emit = defineEmits(['show-on-map']);

const ctx = inject(WOLVES_CTX)!;
const { state, derived, data } = ctx;

const isMobile = computed(() => ctx.isMobile.value);
const filtered = computed(() => derived.filtered.value);
const isLoading = computed(
  () => !data.dataset.value && ['loading', 'slow'].includes(data.phase.value),
);
const showMunicipality = computed(() => hasMunicipalities(data.dataset.value?.records || []));
const showVisibleAreaToggle = computed(() => !!state.mapExtent3346.value);

const visibleOnly = ref(false);
const sortKey = ref<'day' | 'sav'>('day');
const sortDir = ref<'asc' | 'desc'>('desc');
const page = ref(0);

const periodLabel = computed(() => {
  const { from, to } = state.interval.value;
  const season = derived.intervalSeason.value;
  if (season !== null) return `${season}/${season + 1} sezonas`;
  if (state.preset.value === 'all') return 'visi sezonai';
  if (state.preset.value === 'last30') return `paskutinės 30 d. (${from} – ${to})`;
  return from === to ? from : `${from} – ${to}`;
});
const caption = computed(() => `Sumedžioti vilkai: ${periodLabel.value}`);

const rows = computed(() => {
  let list = filtered.value;
  const extent = state.mapExtent3346.value;
  if (visibleOnly.value && extent) {
    const [minX, minY, maxX, maxY] = extent;
    list = list.filter((r) => r.x >= minX && r.x <= maxX && r.y >= minY && r.y <= maxY);
  }

  // `filtered` arrives sorted by day desc, then id.
  if (sortKey.value === 'day') {
    return sortDir.value === 'desc' ? list : [...list].reverse();
  }
  const dir = sortDir.value === 'asc' ? 1 : -1;
  return [...list].sort(
    (a, b) =>
      dir * (a.municipalityName || '').localeCompare(b.municipalityName || '', 'lt') ||
      b.day.localeCompare(a.day),
  );
});

const pageCount = computed(() => Math.max(1, Math.ceil(rows.value.length / PAGE_SIZE)));
const pageRows = computed(() =>
  rows.value.slice(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE),
);
const rangeFrom = computed(() => (rows.value.length ? page.value * PAGE_SIZE + 1 : 0));
const rangeTo = computed(() => Math.min(rows.value.length, (page.value + 1) * PAGE_SIZE));

watch([filtered, visibleOnly, sortKey, sortDir], () => (page.value = 0));
watch(pageCount, (count) => {
  if (page.value > count - 1) page.value = count - 1;
});

function toggleSort(key: 'day' | 'sav') {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc';
  } else {
    sortKey.value = key;
    sortDir.value = key === 'day' ? 'desc' : 'asc';
  }
}
const ariaSort = (key: 'day' | 'sav') =>
  sortKey.value === key ? (sortDir.value === 'asc' ? 'ascending' : 'descending') : 'none';
const sortArrow = (key: 'day' | 'sav') =>
  sortKey.value === key ? (sortDir.value === 'asc' ? '▲' : '▼') : '';

const showOnMapLabel = (row: WolfRecord) =>
  `Rodyti žemėlapyje: ${row.day}, ${sexLabel(row.sex)}, ${ageLabel(row.age)}`;

function showOnMap(row: WolfRecord) {
  state.select([row.id], { zoom: true });
  emit('show-on-map', row);
}

const tagClass =
  'inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xxs font-semibold text-amber-900 whitespace-nowrap';
const sortButtonClass =
  'inline-flex items-center gap-1 min-h-[24px] rounded font-semibold hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2';
const pagerButtonClass =
  'min-h-[44px] md:min-h-[24px] rounded border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2';
</script>
