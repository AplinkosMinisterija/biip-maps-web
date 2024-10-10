<template>
  <div>
    <UiMap
      :show-scale-line="true"
      :projection="projection3857"
      :show-coordinates="true"
      :add-coordinates-to-url="true"
    >
      <template #filters>
        <UiButtonIcon icon="layers" @click="filtersStore.toggle('layers')" />
        <UiMapMeasure />
      </template>
      <template v-if="filtersStore.active" #filtersContent>
        <UiMapLayerToggle v-if="filtersStore.isActive('layers')" :layers="toggleLayers" />
      </template>
    </UiMap>
  </div>
</template>
<script setup lang="ts">
import { inject } from "vue";
import { useFiltersStore } from "@/stores/filters";
import {
  countiesServiceVT,
  eldershipsServiceVT,
  municipalitiesServiceVT,
  parcelsServiceVT,
  projection3857,
  residentialAreasServiceVT,
  vectorBright,
  vectorPositron,
} from "@/utils";

const filtersStore = useFiltersStore();
const mapLayers: any = inject("mapLayers");

const toggleLayers = [
  parcelsServiceVT,
  residentialAreasServiceVT,
  eldershipsServiceVT,
  municipalitiesServiceVT,
  countiesServiceVT,
];

mapLayers
  .addBaseLayer(vectorBright.id)
  .addBaseLayer(vectorPositron.id)
  .add(countiesServiceVT.id, { isHidden: true })
  .add(municipalitiesServiceVT.id, { isHidden: true })
  .add(eldershipsServiceVT.id, { isHidden: true })
  .add(residentialAreasServiceVT.id, { isHidden: true })
  .add(parcelsServiceVT.id, { isHidden: true });
</script>
