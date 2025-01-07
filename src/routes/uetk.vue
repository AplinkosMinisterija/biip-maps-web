<template>
  <div>
    <UiMap
      :show-scale-line="true"
      :show-coordinates="true"
      :show-search="true"
      :attribution-options="{
        collapsible: !isPreview || !isScreenshot,
      }"
      :is-preview="!!isPreview"
      @search="onSearch"
    >
      <template #filters>
        <UiButtonIcon icon="layers" @click="filtersStore.toggle('layers')" />
        <UiButtonIcon icon="legend" @click="filtersStore.toggle('legend')" />
        <UiMapMeasure />
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
          :layer="uetkService.id"
          title="Sutartiniai ženklai"
        />
      </template>
      <template #sidebar>
        <UiSidebarFeatures
          :is-open="!!selectedFeatures.length"
          :features="selectedFeatures"
          type="uetk"
          @close="selectedFeatures = []"
        />
      </template>
    </UiMap>
  </div>
</template>
<script setup lang="ts">
import { useFiltersStore } from '@/stores/filters';
import {
  administrativeBoundariesLabelsService,
  gamtotvarkaStvkService,
  geoportalGrpk,
  geoportalHybrid,
  geoportalOrto,
  geoportalOrto1995,
  geoportalOrto2005,
  geoportalOrto2009,
  geoportalOrto2012,
  geoportalOrto2015,
  geoportalOrto2018,
  geoportalTopo,
  geoportalTopoGray,
  inspireParcelService,
  MapFilters,
  parseRouteParams,
  uetkService,
} from '@/utils';
import { inject, ref } from 'vue';
import { useRoute } from 'vue-router';

const filtersStore = useFiltersStore();

const mapLayers: any = inject('mapLayers');
const postMessage: any = inject('postMessage');
const selectedFeatures = ref([] as any[]);
const $route = useRoute();

const query = parseRouteParams($route.query, ['cadastralId', 'preview', 'screenshot']);

const isPreview = ref(!!query.preview);
const isScreenshot = ref(!!query.screenshot);

if (isPreview.value && isScreenshot.value) {
  filtersStore.toggle('legend', true);
}

function onSearch(search: string) {
  filtersStore.search = search;

  if (!search) {
    mapLayers.cleanHighlighs();
  }
}

const toggleLayers = [
  uetkService,
  inspireParcelService,
  gamtotvarkaStvkService,
  administrativeBoundariesLabelsService,
  geoportalOrto1995,
  geoportalOrto2005,
  geoportalOrto2009,
  geoportalOrto2012,
  geoportalOrto2015,
  geoportalOrto2018,
  geoportalHybrid,
  geoportalGrpk,
];

mapLayers
  .addBaseLayer(geoportalTopoGray.id)
  .addBaseLayer(geoportalTopo.id)
  .addBaseLayer(geoportalOrto.id)
  .add(geoportalGrpk.id, { isHidden: true })
  .add(geoportalHybrid.id, { isHidden: true })
  .add(geoportalOrto2018.id, { isHidden: true })
  .add(geoportalOrto2015.id, { isHidden: true })
  .add(geoportalOrto2012.id, { isHidden: true })
  .add(geoportalOrto2009.id, { isHidden: true })
  .add(geoportalOrto2005.id, { isHidden: true })
  .add(geoportalOrto1995.id, { isHidden: true })
  .add(administrativeBoundariesLabelsService.id, { isHidden: true })
  .add(gamtotvarkaStvkService.id, { isHidden: true })
  .add(inspireParcelService.id, { isHidden: true })
  .add(uetkService.id)
  .click(async ({ coordinate }: any) => {
    mapLayers.getFeatureInfo(uetkService.id, coordinate, ({ geometries, properties }: any) => {
      mapLayers.highlightFeatures(geometries);
      selectedFeatures.value = properties;
      postMessage('click', properties);
    });
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
