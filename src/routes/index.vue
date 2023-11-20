<template>
  <div>
    <UiMap :show-scale-line="true" :projection="projection3857" />
  </div>
</template>
<script setup lang="ts">
import { inject } from "vue";
import {
  municipalitiesServiceVT,
  geoportalTopo,
  geoportalTopoGray,
  projection3857,
} from "@/utils";

const mapLayers: any = inject("mapLayers");

mapLayers
  .addBaseLayer(geoportalTopoGray.id)
  .addBaseLayer(geoportalTopo.id)
  .add(municipalitiesServiceVT.id);
</script>
