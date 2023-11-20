<template>
  <div>
    <UiMap :show-scale-line="true" :projection="projection3857">
      <template #filters>
        <UiDropdown
          v-model="visibleLayer"
          class="px-1 rounded border border-gray-400 bg-white pointer-events-auto"
        >
          <UiDropdownItem v-for="l in allLayers" :key="l.key" :value="`${l.key}`">
            {{ l.title }}
          </UiDropdownItem>
        </UiDropdown>
      </template>
    </UiMap>

    <RusysFeaturesPopup />
  </div>
</template>
<script setup lang="ts">
import { inject, ref, watch } from "vue";
import {
  geoportalTopo,
  geoportalOrto,
  geoportalTopoGray,
  municipalitiesServiceVT,
  projection3857,
} from "@/utils";
import { useStatsStore } from "@/stores/stats";
const statsStore = useStatsStore();

const mapLayers: any = inject("mapLayers");

const allLayers = [
  {
    key: "animals.permits",
    title: "Leidimai",
  },
  {
    key: "animals.species",
    title: "NLLG individų skaičius",
  },
  {
    key: "animals.fostered",
    title: "Globojami gyvūnai",
  },
  {
    key: "animals.aviaries",
    title: "Aptvarai miško žemėje",
  },
];
const visibleLayer = ref(allLayers[0].key);

watch(visibleLayer, () => {
  municipalitiesServiceVT.layer?.getSource()?.changed();
});

municipalitiesServiceVT.layer.setStyle((feature: any) => {
  const styles = statsStore.getStyles(visibleLayer.value, feature.get("code"));
  feature.set("stats", styles.stats);
  return styles.style;
});

await statsStore.preloadStats(allLayers.map((l) => l.key));

mapLayers
  .addBaseLayer(geoportalTopoGray.id)
  .addBaseLayer(geoportalTopo.id)
  .addBaseLayer(geoportalOrto.id)
  .add(municipalitiesServiceVT.id);
</script>
