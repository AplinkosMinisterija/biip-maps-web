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
        <SmalsuolisFilters v-if="filtersStore.isActive('filters')" :filters="smalsuolisFilters" />
      </template>
    </UiMap>

    <FeaturesPopupClickMulti :layers="[smalsuolisServiceVT.id]">
      <template #title="{ current }">
        <SmalsuolisPreviewBox :item="current" :filters="smalsuolisFilters" />
      </template>
      <template #content="{ current }">
        <div v-if="current?.body" class="text-xxs mt-2 text-gray-700">
          <VueMarkdown :source="current.body" />
        </div>
      </template>
    </FeaturesPopupClickMulti>
  </div>
</template>
<script setup lang="ts">
import { inject } from "vue";
import { projection3857, vectorBright, smalsuolisServiceVT } from "@/utils";
import { useFiltersStore } from "@/stores/filters";
import VueMarkdown from "vue-markdown-render";
const mapLayers: any = inject("mapLayers");

const smalsuolisFilters = mapLayers.filters(smalsuolisServiceVT.id);

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
