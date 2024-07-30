<template>
  <div>
    <UiMap :show-scale-line="true" :show-coordinates="true" :show-search="true" @search="onSearch">
      <template #filters>
        <UiButtonIcon icon="layers" @click="filtersStore.toggle('layers')" />
        <UiButtonIcon icon="legend" @click="filtersStore.toggle('legend')" />
        <UiButtonIcon icon="measure" @click="mapLayers.toggleMeasuring()" />
      </template>
      <template v-if="filtersStore.active" #filtersContent>
        <UiMapLayerToggle v-if="filtersStore.isActive('layers')" :layers="toggleLayers" />
        <Search
          v-else-if="filtersStore.isActive('search')"
          :value="filtersStore.search"
          :add-stroke="true"
          :types="['uetk', 'geoportal']"
          :additional-geoportal-layers="[
            { type: 'ežeras', weight: 2 },
            { type: 'tvenkinys', weight: 2 },
            { type: 'upė', weight: 2 },
          ]"
        />
        <UiMapLegend
          v-if="filtersStore.isActive('legend')"
          :layer="sznsUetkService.id"
          title="Sutartiniai ženklai"
        />
      </template>
      <template #sidebar>
        <UiSidebarFeatures
          :is-open="!!selectedFeatures.length"
          :features="selectedFeatures"
          type="szns"
          @close="selectedFeatures = []"
        />
      </template>
    </UiMap>
  </div>
</template>
<script setup lang="ts">
import { inject, ref } from 'vue';
import { useFiltersStore } from '@/stores/filters';
import {
  geoportalTopo,
  geoportalOrto,
  geoportalTopoGray,
  uetkService,
  sznsUetkService,
  inspireParcelService,
  administrativeBoundariesLabelsService,
  geoportalHybrid,
  geoportalGrpk,
  parseRouteParams,
  MapFilters,
} from '@/utils';
import { useRoute } from 'vue-router';

const filtersStore = useFiltersStore();

const mapLayers: any = inject('mapLayers');
const selectedFeatures = ref([] as any[]);
const selectedGeometries = ref([] as any[]);
const $route = useRoute();

const query = parseRouteParams($route.query, ['cadastralId']);

function onSearch(search: string) {
  filtersStore.search = search;

  if (!search) {
    mapLayers.cleanHighlighs();
  }
}

const toggleLayers = [
  sznsUetkService,
  uetkService,
  inspireParcelService,
  administrativeBoundariesLabelsService,
  geoportalGrpk,
];

mapLayers
  .addBaseLayer(geoportalTopoGray.id)
  .addBaseLayer(geoportalTopo.id)
  .addBaseLayer(geoportalOrto.id)
  .add(geoportalGrpk.id, { isHidden: true })
  .add(administrativeBoundariesLabelsService.id, { isHidden: true })
  .add(inspireParcelService.id)
  .add(uetkService.id, { isHidden: true })
  .add(sznsUetkService.id)
  .click(async ({ coordinate }: any) => {
    selectedFeatures.value = [];
    selectedGeometries.value = [];

    mapLayers.getFeatureInfo(uetkService.id, coordinate, ({ geometries, properties }: any) => {
      selectedGeometries.value = [...selectedGeometries.value, ...geometries];
      mapLayers.highlightFeatures(selectedGeometries.value);
      selectedFeatures.value = [...selectedFeatures.value, ...properties];
    });
    mapLayers.getFeatureInfo(sznsUetkService.id, coordinate, ({ geometries, properties }: any) => {
      selectedGeometries.value = [...selectedGeometries.value, ...geometries];
      mapLayers.highlightFeatures(selectedGeometries.value);
      selectedFeatures.value = [...selectedFeatures.value, ...properties];
    });
  });

mapLayers.waitForLoaded.then(() => {
  filtersStore.toggle('layers');
  mapLayers.setOpacity(inspireParcelService.id, 0.8);
});

if (query.cadastralId) {
  const layers = mapLayers
    .getAllSublayers(uetkService.id)
    .filter(
      (item: string) =>
        !['upiu_pabaseiniai', 'upiu_baseinu_rajonai', 'upiu_baseinai'].includes(item),
    );
  const filters = new MapFilters();

  layers.forEach((item: string) => {
    filters.on(item).set('kadastro_id', `${query.cadastralId}`);
  });

  await mapLayers.zoom(uetkService.id, { addStroke: true, filters });
}
</script>

<style>
.ol-layer {
  cursor: help;
}
</style>
