<template>
  <div>
    <UiMap :show-scale-line="true" :show-search="true" @search="filtersStore.search = $event">
      <template v-if="filtersStore.active" #filtersContent>
        <Search
          v-if="filtersStore.isActive('search')"
          :value="filtersStore.search"
          :types="['geoportal']"
          @select="filtersStore.hide()"
        />
      </template>
    </UiMap>
  </div>
</template>
<script setup lang="ts">
import { inject, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useFiltersStore } from '@/stores/filters';
import Search from '@/components/search/Index.vue';
import {
  geoportalTopo,
  geoportalOrto,
  geoportalTopoGray,
  parseRouteParams,
  markerLayer,
  huntingService,
} from '@/utils';

const filtersStore = useFiltersStore();
const postMessage: any = inject('postMessage');
const mapLayers: any = inject('mapLayers');
const $route = useRoute();
const events: any = inject('events');
const mapDraw = computed(() => mapLayers.getDraw(markerLayer.id).enableContinuousDraw());

const query = parseRouteParams($route.query, ['preview', 'mpvId']);
const huntingServiceFilters = mapLayers.filters(huntingService.id);

events.on('geom', (data: any) => {
  mapDraw.value.setFeatures(data.geom || data);
});

mapLayers
  .addBaseLayer(geoportalTopoGray.id)
  .addBaseLayer(geoportalTopo.id)
  .addBaseLayer(geoportalOrto.id)
  .add(huntingService.id);

if (query.mpvId) {
  huntingServiceFilters.on('mpv_info_geom').set('mpv_id', query.mpvId);
  await mapLayers.zoomNew(huntingService.id, { addStroke: false });
}

if (!query.preview) {
  mapDraw.value.start('Point').on(['change', 'remove'], ({ features }: any) => {
    if (typeof features === 'string') {
      const geom = JSON.parse(features);
      mapLayers.zoomToFeatureCollection(geom);
    }
    postMessage('data', features);
  });
}
</script>
