<template>
  <div>
    <UiMap :show-scale-line="true" :show-coordinates="true" :constrain-resolution="false"/>
  </div>
</template>
<script setup lang="ts">
import { inject } from 'vue';
import { useRoute } from 'vue-router';
import {
  geoportalTopo,
  geoportalOrto,
  geoportalTopoGray,
  huntingService,
  huntingTracksService,
  objectPropsToCamel,
  parseRouteParams,
} from '@/utils';

const mapLayers: any = inject('mapLayers');
const postMessage: any = inject('postMessage');
const $route = useRoute();

const query = parseRouteParams($route.query, ['mpv_id']);
const huntingServiceFilters = mapLayers.filters(huntingService.id);
const huntingTracksServiceFilters = mapLayers.filters(huntingTracksService.id);

if (query.mpv_id) {
  huntingServiceFilters.on('mpv_info_geom').set('mpv_id', query.mpv_id);
  huntingTracksServiceFilters.on('footprint_tracks').set('mpv_id', query.mpv_id);
}

await mapLayers
  .addBaseLayer(geoportalTopoGray.id)
  .addBaseLayer(geoportalTopo.id)
  .addBaseLayer(geoportalOrto.id)
  .add(huntingService.id)
  .add(huntingTracksService.id)
  .click(async ({ coordinate }: any) => {
    mapLayers.getFeatureInfo(
      huntingTracksService.id,
      coordinate,
      ({ geometries, properties }: any) => {
        mapLayers.highlightFeatures(geometries);
        postMessage('click', objectPropsToCamel(properties));
      },
    );
  })
  .zoomNew(huntingService.id, { addStroke: true });
</script>
