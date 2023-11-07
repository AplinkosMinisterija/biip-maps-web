<template>
  <div class="flex justify-between items-center mb-2">
    <span class="text-sm font-semibold">Filtrai</span>
    <UiButton type="link" @click="clearFilters"> Pradiniai filtrai </UiButton>
  </div>
  <span class="text-sm mr-2"> Atliktų tvarkymo darbų metai: </span>
  <input
    v-model="selectedYear"
    type="number"
    class="border rounded p-1 text-sm w-24"
    @change="applyDateFilter"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';

const { selectedYear: initialSelectedYear } = defineProps({
  selectedYear: {
    type: Number,
    default: 0,
  },
});
const emit = defineEmits(['update:selectedYear']);

const selectedYear = ref(initialSelectedYear);

const clearFilters = () => {
  selectedYear.value = initialSelectedYear;
  applyDateFilter();
};

const applyDateFilter = () => {
  emit('update:selectedYear', selectedYear.value);
};
</script>
