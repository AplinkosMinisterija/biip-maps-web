<template>
  <div>
    <UiMap
      :projection="projection3857"
      :show-zoom="false"
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

  mapLayers.zoomToFeatureCollection(geom);
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
