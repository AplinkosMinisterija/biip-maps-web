<template>
  <div>
    <UiMap :show-scale-line="true" />

    <RusysFeaturesPopup />
  </div>
</template>
<script setup lang="ts">
import { inject } from "vue";
import {
  geoportalTopo,
  geoportalOrto,
  geoportalTopoGray,
  municipalitiesGridService,
} from "@/utils";
import { gyvunaiApiHost } from "@/config";

const mapLayers: any = inject("mapLayers");

municipalitiesGridService.stats.url = `${gyvunaiApiHost}/api/public/permits`;
municipalitiesGridService.stats.applyToFeatureFn = (data: any, feature: any) => {
  const result = data.rows.find((d: any) => d.municipality.id == feature.get("code"));
  if (!result) return;

  return {
    ...result,
    count: result.permitCount,
  };
};
mapLayers.loadStats(municipalitiesGridService.id);
mapLayers
  .addBaseLayer(geoportalTopoGray.id)
  .addBaseLayer(geoportalTopo.id)
  .addBaseLayer(geoportalOrto.id)
  .add(municipalitiesGridService.id);
</script>
