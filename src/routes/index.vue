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
  geoportalTopo,
  geoportalTopoGray,
  projection3857,
} from "@/utils";
import { useStatsStore } from "@/stores/stats";
const statsStore = useStatsStore();

const mapLayers: any = inject("mapLayers");

mapLayers
  .addBaseLayer(geoportalTopoGray.id)
  .addBaseLayer(geoportalTopo.id)
  .add(municipalitiesServiceVT.id);

municipalitiesServiceVT.layer.setStyle((feature: any) => {
  const styles = statsStore.getStyles("permits", feature.get("code"));
  return styles.style;
});
</script>
