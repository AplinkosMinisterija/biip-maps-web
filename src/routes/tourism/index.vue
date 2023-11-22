<template>
  <div>
    <UiMap
      :show-scale-line="true"
      :show-coordinates="true"
      :show-search="true"
      :is-preview="!!isPreview"
      @search="filtersStore.search = $event"
    >
      <template #filters>
        <UiButtonIcon icon="layers" @click="filtersStore.toggle('layers')" />
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
          @select="filtersStore.hide()"
        />
      </template>
      <template #sidebar>
        <UiSidebarFeatures :features="selectedFeatures" />
      </template>
    </UiMap>
  </div>
</template>
<script setup lang="ts">
import Search from '@/components/search/Index.vue';
import { inject, ref } from 'vue';
import { useFiltersStore } from '@/stores/filters';
import {
  geoportalTopo,
  geoportalOrto,
  geoportalTopoGray,
  municipalitiesService,
  geoportalGrpk,
  gamtotvarkaStvkService,
  geoportalKvr,
  tourismService,
  parseRouteParams,
} from '@/utils';
import { useRoute } from 'vue-router';

const eventBus: any = inject('eventBus');
const filtersStore = useFiltersStore();
const mapLayers: any = inject('mapLayers');
const selectedFeatures = ref([] as any[]);
const $route = useRoute();

const query = parseRouteParams($route.query, ['preview']);
const isPreview = ref(!!query.preview);

const toggleLayers = [
  tourismService,
  gamtotvarkaStvkService,
  geoportalKvr,
  municipalitiesService,
];

mapLayers
  .addBaseLayer(geoportalTopoGray.id)
  .addBaseLayer(geoportalTopo.id)
  .addBaseLayer(geoportalOrto.id)
  .addBaseLayer(geoportalGrpk.id)
  .add(tourismService.id, { isHidden: false })
  .add(gamtotvarkaStvkService.id, { isHidden: true })
  .add(geoportalKvr.id, { isHidden: true })
  .add(municipalitiesService.id, { isHidden: true })
  .click(async ({ coordinate }: any) => {
    selectedFeatures.value = [];
    eventBus.emit('uiSidebar', { open: false });
    mapLayers.getFeatureInfo(
      tourismService.id,
      coordinate,
      ({ geometries, properties }: any) => {
        mapLayers.highlightFeatures(geometries);
        selectedFeatures.value.push(...properties);
        eventBus.emit('uiSidebar', { open: !!selectedFeatures.value.length });
      },
    );
  });
</script>
