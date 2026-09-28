<template>
  <div class="flex justify-between items-center">
    <span class="text-sm font-semibold">Filtrai</span>
    <UiButton type="link" @click="clearFilters()"> Valyti filtrus </UiButton>
  </div>
  <UiButtonRow>
    <UiDropdown v-model="selectedYear" label="Metai" @change="applyYearFilter">
      <UiDropdownItem value="">Visi duomenys</UiDropdownItem>
      <UiDropdownItem v-for="year in years" :key="year" :value="`${year}`">
        {{ year }}
      </UiDropdownItem>
    </UiDropdown>

    <UiDropdown v-model="selectedFish" label="Žuvis" @change="applyFishFilter">
      <UiDropdownItem value="">Visos žuvys</UiDropdownItem>
      <UiDropdownItem v-for="fish in fishTypes" :key="fish.id" :value="`${fish.id}`">
        {{ fish.label }}
      </UiDropdownItem>
    </UiDropdown>
  </UiButtonRow>
</template>

<script setup lang="ts">
import { getFishTypes } from '@/utils/requests/zvejyba';
import moment from 'moment';
import { inject, ref } from 'vue';
const mapLayers: any = inject('mapLayers');

const emit = defineEmits(['change']);
const filters = mapLayers.filters('zvejyba').onAll();

// Production data starts on 2026-05-01 (the database was empty until go-live),
// so earlier years would only ever show an empty map.
const startingYearOfFishings = 2026;
const years = new Array(moment().get('year') - startingYearOfFishings + 1)
  .fill(0)
  .map((_, index) => startingYearOfFishings + index)
  .reverse();

// Flat bracket keys: serializeQuery JSON-stringifies nested objects, which the
// zvejyba API rejects, while `date[from]=…&date[to]=…` is parsed back into the
// `{ from, to }` window it expects.
const DATE_FROM_KEY = 'date[from]';
const DATE_TO_KEY = 'date[to]';

const initialYear = filters.get(DATE_FROM_KEY)
  ? moment(filters.get(DATE_FROM_KEY)).format('YYYY')
  : '';
const selectedYear = ref<string>(initialYear);
const selectedFish = ref(`${filters.get('fish') || ''}` as string);

const fishTypes = ref(await getFishTypes());

function applyFilter(value: any, key: string) {
  if (!value) {
    filters.remove(key);
  } else {
    filters.set(key, value);
  }

  emit('change', { filters: filters.toJson() });
}

function applyYearFilter() {
  if (!selectedYear.value) {
    filters.remove(DATE_FROM_KEY);
    filters.remove(DATE_TO_KEY);
  } else {
    const year = moment(selectedYear.value, 'YYYY');
    filters.set(DATE_FROM_KEY, year.clone().startOf('year').format());
    filters.set(DATE_TO_KEY, year.clone().endOf('year').format());
  }

  emit('change', { filters: filters.toJson() });
}
function applyFishFilter() {
  applyFilter(Number(selectedFish.value), 'fish');
}

function clearFilters() {
  filters.clear();
  selectedYear.value = '';
  selectedFish.value = '';
  emit('change', { filters: filters.toJson() });
}
</script>
