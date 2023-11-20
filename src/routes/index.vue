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
import { municipalitiesServiceVT, projection3857, geoportalTopo3857 } from "@/utils";

const mapLayers: any = inject("mapLayers");

mapLayers.addBaseLayer(geoportalTopo3857.id).add(municipalitiesServiceVT.id);
</script>
