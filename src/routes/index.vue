<template>
  <div>
    <UiMap
      :show-scale-line="true"
      :projection="projection3857"
      :show-coordinates="true"
    />
  </div>
</template>
<script setup lang="ts">
import { inject } from "vue";
import {
  municipalitiesServiceVT,
  projection3857,
  vectorBright,
  vectorPositron,
} from "@/utils";

const mapLayers: any = inject("mapLayers");

mapLayers
  .addBaseLayer(vectorBright.id)
  .addBaseLayer(vectorPositron.id)
  .add(municipalitiesServiceVT.id);
</script>
