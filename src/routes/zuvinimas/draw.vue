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
import {
  geoportalOrto,
  projection3857,
  zuvinimasService,
  uetkService,
  parseRouteParams,
  markerLayer,
  convertFeatureCollectionProjection,
  vectorBright,
  vectorPositron,
  projection,
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

const zuvinimasServiceFilters = mapLayers.filters(zuvinimasService.id);
const filters = computed(() => zuvinimasServiceFilters.on("fish_stockings"));

events.on("geom", (data: any) => {
  mapDraw.value.setFeatures(data.geom || data, { dataProjection: projection });
});

if (query.tenantId) {
  filters.value.set("$or", [
    { tenant_id: query.tenantId },
    { stocking_customer_id: query.tenantId },
  ]);
}

if (query.userId) {
  filters.value.set("created_by", query.userId).set("tenant_id", { $exists: false });
}

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
  mapDraw.value.start("Point").on(["change", "remove"], ({ features }: any) => {
    if (features) {
      features = convertFeatureCollectionProjection(features, projection3857, projection);
    }
    postMessage("userObjects", features);
  });
}
</script>
