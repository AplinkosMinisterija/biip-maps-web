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
  municipalitiesService,
  parseRouteParams,
  markerLayer,
  projection3857,
  projection,
  convertFeatureCollectionProjection,
  vectorPositron,
  vectorBright,
} from "@/utils";

const filtersStore = useFiltersStore();
const postMessage: any = inject("postMessage");
const mapLayers: any = inject("mapLayers");
const $route = useRoute();
const events: any = inject("events");
const mapDraw = computed(() => mapLayers.getDraw(markerLayer.id).enableContinuousDraw());

const query = parseRouteParams($route.query, ["municipalityCode", "type", "preview"]);

const municipalitiesServiceFilters = mapLayers.filters(municipalitiesService.id);

const icons = {
  aviary: { icon: "pin-aviary", colors: ["#667302", "#667302"] },
  zoo: { icon: "pin-zoo", colors: ["#5F3510", "#5F3510"] },
};

const iconType = query.type as keyof typeof icons;

if (query.municipalityCode) {
  municipalitiesServiceFilters
    .on("municipalities")
    .set("kodas", `${query.municipalityCode}`);

  await mapLayers.zoom(municipalitiesService.id, { addStroke: false });
}

events.on("geom", (data: any) => {
  mapDraw.value.setFeatures(data.geom || data, { dataProjection: projection });
});

mapLayers
  .addBaseLayer(vectorPositron.id)
  .addBaseLayer(vectorBright.id)
  .addBaseLayer(geoportalOrto.id)
  .add(municipalitiesService.id, { isHidden: false });

if (!query.preview) {
  mapDraw.value.start("Point").on(["change", "remove"], ({ features }: any) => {
    if (features) {
      features = convertFeatureCollectionProjection(features, projection3857, projection);
    }

    if (typeof features === "string") {
      const geom = JSON.parse(features);
      mapLayers.zoomToFeatureCollection(geom);
    }
    postMessage("userObjects", features);
  });
}

if (iconType && icons[iconType]) {
  const { icon, colors } = icons[iconType];
  mapDraw.value.setIcon(icon, { align: "top", size: 5 }).setColors(...colors);
}
</script>
