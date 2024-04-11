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
  .add(inspireParcelService.id, { isHidden: true })
  .add(uetkService.id, { isHidden: true })
  .add(sznsUetkService.id)
  .click(async ({ coordinate }: any) => {
    mapLayers.getFeatureInfo(uetkService.id, coordinate, ({ geometries, properties }: any) => {
      mapLayers.highlightFeatures(geometries);
      selectedFeatures.value = properties;
    });
    mapLayers.getFeatureInfo(sznsUetkService.id, coordinate, ({ geometries, properties }: any) => {
      mapLayers.highlightFeatures(geometries);
      selectedFeatures.value = properties;
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

  await mapLayers.zoomNew(sznsUetkService.id, { addStroke: true, filters });
}
</script>
