<template>
  <div>
    <UiMap
      :show-scale-line="true"
      :projection="projection3857"
      :show-coordinates="true"
    />

    <FeaturesPopupHover :check-stats="true">
      <template #title="{ feature }">
        {{ feature?.get("name") }} ({{ feature?.get("municipality") }})
      </template>
      <template #content="{ data }">
        <div class="text-xs">Viso sužvejota: {{ data.count || 0 }} kg</div>
      </template>
    </FeaturesPopupHover>
  </div>
</template>
<script setup lang="ts">
import { inject } from "vue";
import { projection3857, geoportalTopo3857, uetkMergedCentroidServiceVT } from "@/utils";
import { useStatsStore } from "@/stores/stats";
const statsStore = useStatsStore();

const mapLayers: any = inject("mapLayers");

const statsKey = "zvejyba.uetk";
mapLayers.addBaseLayer(geoportalTopo3857.id).add(uetkMergedCentroidServiceVT.id);

uetkMergedCentroidServiceVT.layer.getSource()?.on("tileloadend", ({ tile }: any) => {
  tile?.getFeatures()?.forEach((feature: any) => {
    feature.set("statsFn", () => ({
      ...statsStore.getStatsById(statsKey, feature.getId()),
      type: "icon",
      icon: { name: "pin-water", opts: { align: "top" } },
      hideEmpty: true,
    }));
  });
});

await statsStore.preloadStats(statsKey);
</script>
