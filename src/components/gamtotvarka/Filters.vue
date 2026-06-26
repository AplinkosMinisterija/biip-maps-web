<template>
  <div class="flex justify-between items-center mb-2">
    <span class="text-sm font-semibold">Filtrai</span>
    <UiButton type="link" @click="clearFilters"> Panaikinti filtrą </UiButton>
  </div>
  <span class="text-sm"> Atliktų tvarkymo darbų metai: </span>
  <p class="text-xs text-gray-500 mb-2">Nepažymėjus metų, rodomi visų metų darbai.</p>
  <div class="max-h-64 overflow-y-auto border rounded p-2 flex flex-col gap-1">
    <label v-for="year in years" :key="year" class="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" :checked="selected.includes(year)" @change="toggleYear(year)" />
      {{ year }}
    </label>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps({
  selectedYears: {
    type: Array,
    default: () => [],
  },
});
const emit = defineEmits(['update:selectedYears']);

const selected = ref<number[]>([...(props.selectedYears as number[])]);

const years = computed(() => {
  const max = new Date().getFullYear() + 1;
  const list: number[] = [];
  for (let y = max; y >= 2001; y--) list.push(y);
  return list;
});

const apply = () => {
  emit('update:selectedYears', [...selected.value]);
};

const toggleYear = (year: number) => {
  if (selected.value.includes(year)) {
    selected.value = selected.value.filter((y) => y !== year);
  } else {
    selected.value = [...selected.value, year].sort((a, b) => b - a);
  }
  apply();
};

const clearFilters = () => {
  selected.value = [];
  apply();
};
</script>
