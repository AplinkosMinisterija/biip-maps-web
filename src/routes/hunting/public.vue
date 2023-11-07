<template>
  <div>
    <UiMap
      :show-scale-line="true"
      :show-coordinates="true"
      :show-search="true"
      :attribution-options="{
        collapsible: !isPreview,
      }"
      :is-preview="!!isPreview"
      @search="onSearch"
    >
      <template #filters>
        <UiButtonIcon icon="layers" @click="filtersStore.toggle('layers')" />
        <UiButtonIcon icon="legend" @click="filtersStore.toggle('legend')" />
      </template>
      <template v-if="filtersStore.active" #filtersContent>
        <UiMapLayerToggle
          v-if="filtersStore.isActive('layers')"
          :layers="toggleLayers"
        />
        <Search
          v-else-if="filtersStore.isActive('search')"
          :value="filtersStore.search"
          :add-stroke="true"
          :types="['geoportal']"
        />
        <UiMapLegend
          v-if="filtersStore.isActive('legend')"
          :layer="huntingPublicService.id"
        />
      </template>
      <template #sidebar>
        <UiSidebarFeatures :features="selectedFeatures" type="hunting" />
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
  huntingPublicService,
  stvkService,
  inspireParcelService,
  municipalitiesService,
  parseRouteParams,
} from '@/utils';
import { useRoute } from 'vue-router';

const filtersStore = useFiltersStore();
const mapLayers: any = inject('mapLayers');
const selectedFeatures = ref([] as any[]);
const $route = useRoute();
const eventBus: any = inject('eventBus');

const query = parseRouteParams($route.query, ['cadastralId', 'preview']);

const isPreview = ref(!!query.preview);

if (isPreview.value) {
  filtersStore.toggle('legend', true);
}

function onSearch(search: string) {
  filtersStore.search = search;

  if (!search) {
    mapLayers.cleanHighlighs();
  }
}

const toggleLayers = [
  huntingPublicService,
  municipalitiesService,
  inspireParcelService,
  stvkService,
];

mapLayers
  .addBaseLayer(geoportalTopoGray.id)
  .addBaseLayer(geoportalTopo.id)
  .addBaseLayer(geoportalOrto.id)
  .add(municipalitiesService.id, { isHidden: true })
  .add(stvkService.id, { isHidden: true })
  .add(inspireParcelService.id, { isHidden: true })
  .add(huntingPublicService.id)
  .click(async ({ coordinate }: any) => {
    selectedFeatures.value = [];
    eventBus.emit('uiSidebar', { open: false });
    mapLayers.getFeatureInfo(
      huntingPublicService.id,
      coordinate,
      ({ geometries, properties }: any) => {
        mapLayers.highlightFeatures(geometries);
        selectedFeatures.value.push(...properties);
        eventBus.emit('uiSidebar', { open: !!selectedFeatures.value.length });
      },
    );
  });
</script>
