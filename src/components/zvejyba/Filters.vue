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
import { getFishTypes } from "@/utils/requests/zvejyba";
import moment from "moment";
import { inject, ref } from "vue";
const mapLayers: any = inject("mapLayers");

const emit = defineEmits(["change"]);
const filters = mapLayers.filters("zvejyba").onAll();

const startingYearOfFishings = 2022;
const years = new Array(moment().get("year") - startingYearOfFishings + 1)
  .fill(0)
  .map((_, index) => startingYearOfFishings + index)
  .reverse();

const initialDate = filters.get("date")?.$gte
  ? moment(filters.get("date").$gte).format("YYYY")
  : "";
const selectedYear = ref(initialDate as any);
const selectedFish = ref(`${filters.get("fish") || ""}` as string);

const fishTypes = ref(await getFishTypes());

function applyFilter(value: any, key: string, setCb?: Function) {
  if (!value) {
    filters.remove(key);
    emit("change", { filters: filters.toJson() });
    return;
  }

  if (typeof setCb === "function") {
    filters.set(key, setCb(value));
  } else {
    filters.set(key, value);
  }

  emit("change", { filters: filters.toJson() });
}
function applyYearFilter() {
  applyFilter(selectedYear.value, "date", (value: string) => {
    const date = moment(value, "YYYY");
    return {
      $gte: date.clone().startOf("year").format(),
      $lt: date.clone().endOf("year").format(),
    };
  });
}
function applyFishFilter() {
  applyFilter(Number(selectedFish.value), "fish");
}

function clearFilters() {
  filters.clear();
  selectedYear.value = "";
  selectedFish.value = "";
  emit("change", { filters: filters.toJson() });
}
</script>
