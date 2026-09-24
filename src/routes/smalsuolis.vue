<template>
  <div>
    <UiMap
      :projection="projection3857"
      :show-attribution="false"
      :show-center-map="!isPreview"
      @search="filtersStore.search = $event"
    >
      <template v-if="!isPreview" #filters>
        <UiButtonIcon icon="filter" @click="filtersStore.toggle('filters')" />
      </template>
      <template v-if="filtersStore.active" #filtersContent>
        <SmalsuolisFilters
          v-if="filtersStore.isActive('filters')"
          :filters="smalsuolisQueryFilters"
        />
      </template>
    </UiMap>

    <FeaturesPopupClickMulti :layers="[smalsuolisServiceVT.id]">
      <template #content="{ current }">
        <SmalsuolisPreviewBox :item="current" :filters="smalsuolisFilters" />
      </template>
    </FeaturesPopupClickMulti>
  </div>
</template>
<script setup lang="ts">
import { inject } from "vue";
import {
  projection3857,
  vectorBright,
  smalsuolisServiceVT,
  parseRouteParams,
  projection,
} from "@/utils";
import { useFiltersStore } from "@/stores/filters";
import { useRoute } from "vue-router";
const mapLayers: any = inject("mapLayers");
const eventBus: any = inject("eventBus");
const $route = useRoute();

const query = parseRouteParams($route.query, ["preview"]);
const isPreview = !!query.preview;

const smalsuolisFilters = mapLayers.filters(smalsuolisServiceVT.id);

const smalsuolisQueryFilters = smalsuolisFilters.on("query");

smalsuolisQueryFilters.on("change", () => {
  eventBus.emit("multiFeaturesPopupClose");
});

const filtersStore = useFiltersStore();

const events: any = inject("events");

mapLayers
  .addBaseLayer(vectorBright.id)
  .add(smalsuolisServiceVT.id)
  .enableLocationTracking();

events.on("geom", (data: any) => {
  let geom = data.geom || data;

  if (typeof geom === "string") {
    try {
      geom = JSON.parse(geom);
    } catch (err) {
      console.error(err);
    }
  }

  mapLayers.getDraw().setFeatures(geom, { dataProjection: projection });
  mapLayers.zoomToFeatureCollection(geom);
});

let pendingFeature: { id: any; geom: any } | undefined;

// A zoom closes any open popup and landing on the feature is a zoom, so the
// popup waits for the map to settle on it — and for the map to exist at all,
// since the request can arrive before it is built.
const openPendingFeature = () => {
  if (!pendingFeature) return;

  const { id, geom } = pendingFeature;
  const coordinate = mapLayers.featureCollectionCenter(geom, { dataProjection: projection });
  if (!coordinate) return;

  pendingFeature = undefined;
  eventBus.emit("multiFeaturesPopupOpen", { features: [{ id }], coordinate });
};

mapLayers.on("zoom:change", () => openPendingFeature());

events.on("feature", (data: any) => {
  let feature = data.feature || data;

  if (typeof feature === "string") {
    try {
      feature = JSON.parse(feature);
    } catch (err) {
      console.error(err);
    }
  }

  const { id, geom } = feature || {};
  if (!id || !geom) return;

  pendingFeature = { id, geom };
  mapLayers.zoomToFeatureCollection(geom, { dataProjection: projection });

  // The view can already be where the feature is, in which case nothing zooms.
  setTimeout(openPendingFeature, 1000);
});

events.on("filters", (data: any) => {
  let filters = data.filters || data;

  if (typeof filters === "string") {
    try {
      filters = JSON.parse(filters);
    } catch (err) {
      console.error(err);
    }
  }
  smalsuolisQueryFilters.setJson(filters);
});
</script>
