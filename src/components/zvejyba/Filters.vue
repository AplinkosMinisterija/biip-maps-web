<template>
  <div class="flex justify-between items-center">
    <span class="text-sm font-semibold">Filtrai</span>
    <UiButton type="link" @click="clearFilters()"> Valyti filtrus </UiButton>
  </div>
  <UiButtonRow>
    <UiDropdown v-model="selectedYear" label="Metai" @change="applyDateFilter">
      <UiDropdownItem value="">Visi duomenys</UiDropdownItem>
      <UiDropdownItem v-for="year in years" :key="year" :value="`${year}`">
        {{ year }}
      </UiDropdownItem>
    </UiDropdown>

    <UiDropdown
      v-model="selectedMonth"
      label="Mėnuo"
      :disabled="!selectedYear"
      @change="applyDateFilter"
    >
      <UiDropdownItem value="">Visi mėnesiai</UiDropdownItem>
      <UiDropdownItem v-for="month in months" :key="month.value" :value="month.value">
        {{ month.label }}
      </UiDropdownItem>
    </UiDropdown>

    <UiDropdown v-model="selectedFish" label="Žuvis" @change="applyFishFilter">
      <UiDropdownItem value="">Visos žuvys</UiDropdownItem>
      <UiDropdownItem v-for="fish in fishTypes" :key="fish.id" :value="`${fish.id}`">
        {{ fish.label }}
      </UiDropdownItem>
    </UiDropdown>
  </UiButtonRow>
  <p v-if="noData" class="text-xs text-gray-500 mt-2">Pagal pasirinktus filtrus sugavimų nėra.</p>
</template>

<script setup lang="ts">
import { getFishTypes } from '@/utils/requests/zvejyba';
import { MONTHS } from '@/utils/constants';
import moment from 'moment';
import { computed, inject, ref } from 'vue';
const mapLayers: any = inject('mapLayers');

defineProps({
  noData: { type: Boolean, default: false },
});
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

const initialFrom = filters.get(DATE_FROM_KEY);
const initialTo = filters.get(DATE_TO_KEY);
const initialYear = initialFrom ? moment(initialFrom).format('YYYY') : '';
const initialMonth =
  initialFrom && initialTo && moment(initialFrom).isSame(initialTo, 'month')
    ? moment(initialFrom).format('M')
    : '';
const selectedYear = ref<string>(initialYear);
const selectedMonth = ref<string>(initialMonth);
const selectedFish = ref(`${filters.get('fish') || ''}` as string);

// The current year only offers the months that have already started.
const months = computed(() => {
  const isCurrentYear = Number(selectedYear.value) === moment().year();
  return isCurrentYear ? MONTHS.slice(0, moment().month() + 1) : MONTHS;
});

const fishTypes = ref(await getFishTypes());

function applyFilter(value: any, key: string) {
  if (!value) {
    filters.remove(key);
  } else {
    filters.set(key, value);
  }

  emit('change', { filters: filters.toJson() });
}

function selectedPeriod() {
  if (!selectedYear.value) return null;

  if (selectedMonth.value) {
    const month = moment(`${selectedYear.value}-${selectedMonth.value}`, 'YYYY-M');
    return { from: month.clone().startOf('month'), to: month.clone().endOf('month') };
  }

  const year = moment(selectedYear.value, 'YYYY');
  return { from: year.clone().startOf('year'), to: year.clone().endOf('year') };
}

function applyDateFilter() {
  const monthIsOffered = months.value.some((month) => month.value === selectedMonth.value);
  if (!selectedYear.value || !monthIsOffered) {
    selectedMonth.value = '';
  }

  const period = selectedPeriod();
  if (period) {
    filters.set(DATE_FROM_KEY, period.from.format());
    filters.set(DATE_TO_KEY, period.to.format());
  } else {
    filters.remove(DATE_FROM_KEY);
    filters.remove(DATE_TO_KEY);
  }

  emit('change', { filters: filters.toJson() });
}
function applyFishFilter() {
  applyFilter(Number(selectedFish.value), 'fish');
}

function clearFilters() {
  filters.clear();
  selectedYear.value = '';
  selectedMonth.value = '';
  selectedFish.value = '';
  emit('change', { filters: filters.toJson() });
}
</script>
