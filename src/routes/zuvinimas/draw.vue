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
          :types="['uetk']"
          @select="selectSearch"
        />
      </template>
    </UiMap>
  </div>
</template>
<script setup lang="ts">
import { inject, computed } from "vue";
import { useRoute } from "vue-router";
import { useFiltersStore } from "@/stores/filters";
import center from "@turf/center";
import {
  geoportalOrto,
  projection3857,
  uetkService,
  parseRouteParams,
  markerLayer,
  convertFeatureCollectionProjection,
  vectorBright,
  vectorPositron,
  projection,
  convertUETKProperties,
} from "@/utils";

const filtersStore = useFiltersStore();
const postMessage: any = inject("postMessage");
const mapLayers: any = inject("mapLayers");
const $route = useRoute();
const events: any = inject("events");
const mapDraw = computed(() => mapLayers.getDraw(markerLayer.id).enableContinuousDraw());

const query = parseRouteParams($route.query, [
  "id",
  "createdBy",
  "tenantId",
  "userId",
  "stockingCustomer",
  "preview",
]);
const uetkLayers = ["upes", "ezerai_tvenkiniai"];

events.on("geom", (data: any) => {
  mapDraw.value.setFeatures(data.geom || data, { dataProjection: projection });
});

events.on("cadastralId", (data: any) => {
  // mapDraw.value.setFeatures(data.geom || data, { dataProjection: projection });
  console.log(data);
});

mapLayers.setSublayers(uetkService.id, uetkLayers);

const selectSearch = (match: any) => {
  filtersStore.clearSearch();

  if (!match?.geom) return;

  mapLayers.zoomToFeatureCollection(match.geom, { addStroke: true });
};

mapLayers
  .addBaseLayer(vectorBright.id)
  .addBaseLayer(vectorPositron.id)
  .addBaseLayer(geoportalOrto.id)
  .add(uetkService.id)
  .enableLocationTracking();

mapDraw.value.setIcon("pin-water", { align: "top", size: 4 });

if (!query.preview) {
  mapDraw.value
    .start("Point")
    .on(["change", "remove"], ({ features, featuresJSON }: any) => {
      if (features) {
        features = convertFeatureCollectionProjection(
          features,
          projection3857,
          projection
        );

        // Just to make sure
        const point = center(featuresJSON);
        mapLayers.getFeatureInfo(
          uetkService.id,
          point.geometry.coordinates,
          ({ properties }: any) => {
            postMessage("selected", {
              geom: features,
              properties: convertUETKProperties(properties),
            });
          }
        );
      }
      postMessage("userObjects", features);
    });
}
</script>
