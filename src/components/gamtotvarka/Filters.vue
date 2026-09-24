<template>
  <div class="flex justify-between items-center mb-2">
    <span class="text-sm font-semibold">Filtrai</span>
    <UiButton type="link" @click="clearFilters"> Panaikinti filtrą </UiButton>
  </div>

  <div class="flex items-center gap-2">
    <span class="text-sm"> Atliktų tvarkymo darbų metai: </span>
    <UiBadge v-if="selectedYearsList.length">{{ selectedYearsList.length }}</UiBadge>
  </div>
  <p class="text-xs text-gray-500 mb-2">Nepažymėjus metų, rodomi visų metų darbai.</p>
  <!-- Aktyvūs filtrai virš slankaus sąrašo – matyti be skrolinimo, nuimti po vieną (#72, 2 punktas) -->
  <ul
    v-if="selectedYearsList.length"
    ref="yearsChipList"
    class="flex flex-wrap gap-1 mb-2"
    aria-label="Pasirinkti metai"
  >
    <li v-for="year in selectedYearsList" :key="year">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-800 text-xs px-2 py-0.5 hover:bg-blue-100"
        :aria-label="`Pašalinti metus ${year}`"
        @click="removeYearChip(year)"
      >
        {{ year }}
        <UiIcon name="close" :size="12" />
      </button>
    </li>
  </ul>
  <div ref="yearsBox" class="max-h-64 overflow-y-auto border rounded p-2 flex flex-col gap-1">
    <label v-for="year in years" :key="year" class="flex items-center gap-2 text-sm cursor-pointer">
      <input
        type="checkbox"
        :checked="selectedYearsList.includes(year)"
        @change="toggleYear(year)"
      />
      {{ year }}
    </label>
  </div>

  <div class="flex items-center gap-2 mt-4">
    <span class="text-sm"> Gamtotvarkos priemonės: </span>
    <UiBadge v-if="selectedMeasuresList.length">{{ selectedMeasuresList.length }}</UiBadge>
  </div>
  <p class="text-xs text-gray-500 mb-2">Nepažymėjus priemonių, rodomos visos priemonės.</p>
  <input
    v-model="measureSearch"
    type="text"
    class="w-full border rounded px-2 py-1 text-sm mb-2"
    placeholder="Ieškoti priemonės..."
    aria-label="Ieškoti gamtotvarkos priemonės"
  />
  <!-- Aktyvūs filtrai virš slankaus sąrašo – matyti be skrolinimo, nuimti po vieną (#72, 2 punktas) -->
  <ul
    v-if="selectedMeasuresList.length && !measuresLoading"
    ref="measuresChipList"
    class="flex flex-wrap gap-1 mb-2"
    aria-label="Pasirinktos priemonės"
  >
    <li v-for="id in selectedMeasuresList" :key="id">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-800 text-xs px-2 py-0.5 hover:bg-blue-100 text-left"
        :aria-label="`Pašalinti priemonę ${measureName(id)}`"
        @click="removeMeasureChip(id)"
      >
        {{ measureName(id) }}
        <UiIcon name="close" :size="12" />
      </button>
    </li>
  </ul>
  <div ref="measuresBox" class="max-h-64 overflow-y-auto border rounded p-2 flex flex-col gap-1">
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
import { ref, computed, onMounted, nextTick, type PropType, type Ref } from 'vue';
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

// Žetono etiketė – priemonės vardas; kol sąrašas kraunasi, žetonų nerodom (žr. šabloną).
const measureName = (id: number) => measures.value.find((m) => m.id === id)?.name ?? `#${id}`;

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

// Žetonų sąrašai ir slankūs langeliai – reikia fokuso valdymui nuėmus žetoną (žr. žemiau).
const yearsChipList = ref<HTMLUListElement | null>(null);
const measuresChipList = ref<HTMLUListElement | null>(null);
const yearsBox = ref<HTMLDivElement | null>(null);
const measuresBox = ref<HTMLDivElement | null>(null);

// Nuėmus žetoną, jo mygtukas dingsta iš DOM – be šito fokusas nukristų į <body> ir
// klaviatūros/ekrano skaitytuvo vartotojas prarastų vietą sąraše. Todėl fokusą
// perkeliame į kitą likusį žetoną (arba ankstesnį, jei nuimtas buvo paskutinis), o
// kai žetonų nelieka – į to sąrašo pirmą žymimąjį langelį.
async function focusAfterChipRemoval(
  listRef: Ref<HTMLUListElement | null>,
  boxRef: Ref<HTMLDivElement | null>,
  removedIndex: number,
) {
  await nextTick();
  const buttons = listRef.value?.querySelectorAll('button');
  if (buttons && buttons.length) {
    const nextIndex = Math.min(removedIndex, buttons.length - 1);
    (buttons[nextIndex] as HTMLButtonElement | undefined)?.focus();
    return;
  }
  const checkbox = boxRef.value?.querySelector('input[type="checkbox"]');
  (checkbox as HTMLInputElement | null)?.focus();
}

const removeYearChip = (year: number) => {
  const removedIndex = selectedYearsList.value.indexOf(year);
  toggleYear(year);
  focusAfterChipRemoval(yearsChipList, yearsBox, removedIndex);
};

const removeMeasureChip = (id: number) => {
  const removedIndex = selectedMeasuresList.value.indexOf(id);
  toggleMeasure(id);
  focusAfterChipRemoval(measuresChipList, measuresBox, removedIndex);
};

const clearFilters = () => {
  selectedYearsList.value = [];
  selectedMeasuresList.value = [];
  measureSearch.value = '';
  emit('update:selectedYears', []);
  emit('update:selectedMeasures', []);
};
</script>
