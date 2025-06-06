<template>
  <div>
    <UiMap
      :show-scale-line="true"
      :projection="projection3857"
      :show-search="true"
      @search="filtersStore.search = $event"
    >
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
import { inject, computed } from "vue";
import { useRoute } from "vue-router";
import { useFiltersStore } from "@/stores/filters";
import Search from "@/components/search/Index.vue";
import {
  geoportalOrto,
  parseRouteParams,
  markerLayer,
  projection3857,
  projection,
  convertFeatureCollectionProjection,
  vectorPositron,
  vectorBright,
  huntingServiceVT,
} from "@/utils";
import { getMpvBbox } from "@/utils/requests/medziokle";

const filtersStore = useFiltersStore();
const postMessage: any = inject("postMessage");
const mapLayers: any = inject("mapLayers");
const $route = useRoute();
const events: any = inject("events");
const mapDraw = computed(() => mapLayers.getDraw(markerLayer.id).enableContinuousDraw());

const query = parseRouteParams($route.query, ["preview", "mpvId"]);

events.on("geom", (data: any) => {
  mapDraw.value.setFeatures(data.geom || data, { dataProjection: projection });
});

mapLayers
  .addBaseLayer(vectorPositron.id)
  .addBaseLayer(vectorBright.id)
  .addBaseLayer(geoportalOrto.id)
  .add(huntingServiceVT.id);

if (query.mpvId) {
  const geojson = await getMpvBbox({ query: JSON.stringify({ mpvId: query.mpvId }) });
  mapLayers.zoomToFeatureCollection(geojson, { dataProjection: projection });
}

if (!query.preview) {
  mapDraw.value.start("Point").on(["change", "remove"], ({ features }: any) => {
    if (features) {
      features = convertFeatureCollectionProjection(features, projection3857, projection);
    }

    if (typeof features === "string") {
      const geom = JSON.parse(features);
      mapLayers.zoomToFeatureCollection(geom);
    }
    postMessage("data", features);
  });
}
</script>
