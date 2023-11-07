<template>
  <div class="flex justify-between items-center">
    <span class="text-sm font-semibold">Filtrai</span>
    <UiButton type="link" @click="filters.clear()"> Valyti filtrus </UiButton>
  </div>
  <UiButtonRow>
    <UiButton
      v-for="k in kingdoms"
      :key="k.id"
      :icon="k.icon"
      :icon-top="true"
      type="white"
      :active="filters.has('kingdomId', k.id)"
      @click="filters.toggleOrReplace('kingdomId', k.id)"
    >
      {{ k.name }}
    </UiButton>
  </UiButtonRow>
  <RusysFiltersSpecies :value="species" @change="setSpecies" />
</template>

<script setup lang="ts">
import { rusysService } from "@/utils";
import { computed, inject } from "vue";
const mapLayers: any = inject("mapLayers");

const rusysServiceFilters = mapLayers.filters(rusysService.id);
const filters = computed(() =>
  rusysServiceFilters.onAll([
    "radavietes",
    "stebejimai_interpretuojami",
    "radavietes_svetimzemes",
    "radavietes_invazines",
  ])
);

const kingdoms = [
  { id: 1, name: "Augalai", icon: "plants" },
  { id: 2, name: "Grybai", icon: "mushrooms" },
  { id: 3, name: "Gyvūnai", icon: "animals" },
];

const species = computed(() => filters.value.get("speciesId")?.$in || []);

function setSpecies(speciesIds: number[]) {
  if (!speciesIds.length) {
    filters.value.remove("speciesId");
  } else {
    filters.value.toggleOrReplace("speciesId", { $in: speciesIds });
  }
}
</script>
