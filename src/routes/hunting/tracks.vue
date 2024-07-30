<template>
  <div>
    <UiMap
      :show-scale-line="true"
      :projection="projection3857"
      :show-coordinates="true"
      :constrain-resolution="false"
    />
  </div>
</template>
<script setup lang="ts">
import { inject } from "vue";
import { useRoute } from "vue-router";
import {
  vectorPositron,
  vectorBright,
  geoportalOrto,
  projection3857,
  huntingService,
  huntingTracksService,
  objectPropsToCamel,
  parseRouteParams,
  huntingServiceVT,
} from "@/utils";

const mapLayers: any = inject("mapLayers");
const postMessage: any = inject("postMessage");
const $route = useRoute();

const query = parseRouteParams($route.query, ["mpv_id"]);
const huntingServiceFilters = mapLayers.filters(huntingService.id);
const huntingTracksServiceFilters = mapLayers.filters(huntingTracksService.id);

if (query.mpv_id) {
  huntingServiceFilters.on("mpv_info_geom").set("mpv_id", query.mpv_id);
  huntingTracksServiceFilters.on("footprint_tracks").set("mpv_id", query.mpv_id);
}

await mapLayers
  .addBaseLayer(vectorBright.id)
  .addBaseLayer(vectorPositron.id)
  .addBaseLayer(geoportalOrto.id)
  .add(huntingServiceVT.id)
  .add(huntingService.id, { isHidden: true })
  .add(huntingTracksService.id)
  .click(async ({ coordinate }: any) => {
    mapLayers.getFeatureInfo(
      huntingTracksService.id,
      coordinate,
      ({ geometries, properties }: any) => {
        mapLayers.highlightFeatures(geometries);
        postMessage("click", objectPropsToCamel(properties));
      }
    );
  })
  .zoom(huntingService.id, { addStroke: true });
</script>
