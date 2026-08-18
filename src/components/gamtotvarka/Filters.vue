<template>
  <div class="flex justify-between items-center mb-2">
    <span class="text-sm font-semibold">Filtrai</span>
    <UiButton type="link" @click="clearFilters"> Panaikinti filtrą </UiButton>
  </div>

  <span class="text-sm"> Atliktų tvarkymo darbų metai: </span>
  <p class="text-xs text-gray-500 mb-2">Nepažymėjus metų, rodomi visų metų darbai.</p>
  <div class="max-h-64 overflow-y-auto border rounded p-2 flex flex-col gap-1">
    <label v-for="year in years" :key="year" class="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" :checked="selectedYearsList.includes(year)" @change="toggleYear(year)" />
      {{ year }}
    </label>
  </div>

  <span class="text-sm block mt-4"> Gamtotvarkos priemonės: </span>
  <p class="text-xs text-gray-500 mb-2">Nepažymėjus priemonių, rodomos visos priemonės.</p>
  <input
    v-model="measureSearch"
    type="text"
    class="w-full border rounded px-2 py-1 text-sm mb-2"
    placeholder="Ieškoti priemonės..."
    aria-label="Ieškoti gamtotvarkos priemonės"
  />
  <div class="max-h-64 overflow-y-auto border rounded p-2 flex flex-col gap-1">
    <p v-if="measuresLoading" class="text-xs text-gray-500">Kraunamos priemonės...</p>
    <p v-else-if="measuresError" class="text-xs text-red-500">Nepavyko įkelti priemonių sąrašo.</p>
    <p v-else-if="!filteredMeasures.length" class="text-xs text-gray-500">Priemonių nerasta.</p>
    <label
      v-for="measure in filteredMeasures"
      :key="measure.id"
      class="flex items-center gap-2 text-sm cursor-pointer"
    >
      <input
        type="checkbox"
        :checked="selectedMeasuresList.includes(measure.id)"
        @change="toggleMeasure(measure.id)"
      />
      {{ measure.name }}
    </label>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type PropType } from 'vue';
import { useGamtotvarkaMeasures } from '@/composables/useGamtotvarkaMeasures';

const props = defineProps({
  selectedYears: {
    type: Array as PropType<number[]>,
    default: () => [],
  },
  selectedMeasures: {
    type: Array as PropType<number[]>,
    default: () => [],
  },
});
const emit = defineEmits(['update:selectedYears', 'update:selectedMeasures']);

const selectedYearsList = ref<number[]>([...props.selectedYears]);
const selectedMeasuresList = ref<number[]>([...props.selectedMeasures]);

const years = computed(() => {
  const max = new Date().getFullYear() + 1;
  const list: number[] = [];
  for (let y = max; y >= 2001; y--) list.push(y);
  return list;
});

const {
  measures,
  loading: measuresLoading,
  error: measuresError,
  load: loadMeasures,
} = useGamtotvarkaMeasures();
const measureSearch = ref('');

const filteredMeasures = computed(() => {
  const term = measureSearch.value.trim().toLowerCase();
  if (!term) return measures.value;
  return measures.value.filter((measure) => measure.name.toLowerCase().includes(term));
});

onMounted(loadMeasures);

const toggleYear = (year: number) => {
  if (selectedYearsList.value.includes(year)) {
    selectedYearsList.value = selectedYearsList.value.filter((y) => y !== year);
  } else {
    selectedYearsList.value = [...selectedYearsList.value, year].sort((a, b) => b - a);
  }
  emit('update:selectedYears', [...selectedYearsList.value]);
};

const toggleMeasure = (id: number) => {
  if (selectedMeasuresList.value.includes(id)) {
    selectedMeasuresList.value = selectedMeasuresList.value.filter((m) => m !== id);
  } else {
    selectedMeasuresList.value = [...selectedMeasuresList.value, id];
  }
  emit('update:selectedMeasures', [...selectedMeasuresList.value]);
};

const clearFilters = () => {
  selectedYearsList.value = [];
  selectedMeasuresList.value = [];
  measureSearch.value = '';
  emit('update:selectedYears', []);
  emit('update:selectedMeasures', []);
};
</script>
