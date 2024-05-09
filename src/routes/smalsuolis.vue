<template>
  <div>
    <UiMap
      :show-scale-line="true"
      :projection="projection3857"
      :show-search="true"
      @search="filtersStore.search = $event"
    >
      <template #filters>
        <UiButtonIcon icon="filter" @click="filtersStore.toggle('filters')" />
      </template>
      <template v-if="filtersStore.active" #filtersContent>
        <SmalsuolisFilters
          v-if="filtersStore.isActive('filters')"
          :filters="smalsuolisFilters"
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
import { projection3857, vectorBright, smalsuolisServiceVT } from "@/utils";
import { useFiltersStore } from "@/stores/filters";
const mapLayers: any = inject("mapLayers");
const eventBus: any = inject("eventBus");

const smalsuolisFilters = mapLayers.filters(smalsuolisServiceVT.id);

smalsuolisFilters.on("query").on("change", () => {
  eventBus.emit("multiFeaturesPopupClose");
});

const filtersStore = useFiltersStore();

const events: any = inject("events");

mapLayers.addBaseLayer(vectorBright.id).add(smalsuolisServiceVT.id);

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
</script>
