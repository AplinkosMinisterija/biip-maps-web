<template>
  <div>
    <UiMap
      :show-scale-line="true"
      :show-coordinates="true"
      :show-search="isSearchEnabled"
      @search="filtersStore.search = $event"
    >
      <template #filters>
        <UiButtonIcon icon="layers" @click="filtersStore.toggle('layers')" />
        <UiButtonIcon icon="upload" @click="uploadRef?.modal?.open?.()" />
      </template>
      <template v-if="filtersStore.active" #filtersContent>
        <UiMapLayerToggle v-if="filtersStore.isActive('layers')" :layers="toggleLayers" />
        <Search
          v-else-if="filtersStore.isActive('search')"
          :value="filtersStore.search"
          :add-stroke="true"
          :types="['uetk', 'geoportal']"
          :additional-geoportal-layers="[
            { type: 'ežeras', weight: 2 },
            { type: 'tvenkinys', weight: 2 },
            { type: 'upė', weight: 2 },
          ]"
          @select="filtersStore.hide()"
        />
      </template>
      <template #sidebar>
        <UiSidebarFeatures
          :is-open="!!selectedFeatures.length"
          :features="selectedFeatures"
          type="alis"
          @close="selectedFeatures = []"
        />
      </template>
    </UiMap>

    <CoordsUpload ref="uploadRef" />
  </div>
</template>
<script setup lang="ts">
import { inject, ref, computed } from "vue";
import { useFiltersStore } from "@/stores/filters";
import { useRoute } from "vue-router";
import {
  geoportalTopo,
  geoportalOrto,
  geoportalTopoGray,
  uetkService,
  stvkService,
  municipalitiesService,
  geoportalOrto1995,
  geoportalOrto2005,
  geoportalOrto2009,
  geoportalOrto2012,
  geoportalOrto2015,
  geoportalOrto2018,
  geoportalHybrid,
  geoportalGrpk,
  parseRouteParams,
  geoportalForests,
  gamtotvarkaNatura2000,
} from "@/utils";

const filtersStore = useFiltersStore();
const mapLayers: any = inject("mapLayers");
const postMessage: any = inject("postMessage");
const selectedFeatures = ref([] as any[]);
const uploadRef = ref();

const toggleLayers = [
  uetkService,
  geoportalForests,
  gamtotvarkaNatura2000,
  stvkService,
  municipalitiesService,
  geoportalOrto1995,
  geoportalOrto2005,
  geoportalOrto2009,
  geoportalOrto2012,
  geoportalOrto2015,
  geoportalOrto2018,
  geoportalHybrid,
  geoportalGrpk,
];

const $route = useRoute();
const uetkLayers = ["upes", "ezerai_tvenkiniai"];

const query = parseRouteParams($route.query, ["cadastral_id", "show_search", "preview"]);
if (query.cadastral_id) {
  const uetkServiceFilters = mapLayers.filters(uetkService.id);

  // TODO: replace this
  uetkLayers.forEach((item) => {
    uetkServiceFilters.on(item).set("kadastro_id", `${query.cadastral_id}`);
  });
}

mapLayers.setSublayers(uetkService.id, uetkLayers);

const isSearchEnabled = !!query.show_search || !!query.preview;

mapLayers
  .addBaseLayer(geoportalTopoGray.id)
  .addBaseLayer(geoportalTopo.id)
  .addBaseLayer(geoportalOrto.id)
  .add(geoportalGrpk.id, { isHidden: true })
  .add(geoportalHybrid.id, { isHidden: true })
  .add(geoportalOrto2018.id, { isHidden: true })
  .add(geoportalOrto2015.id, { isHidden: true })
  .add(geoportalOrto2012.id, { isHidden: true })
  .add(geoportalOrto2009.id, { isHidden: true })
  .add(geoportalOrto2005.id, { isHidden: true })
  .add(geoportalOrto1995.id, { isHidden: true })
  .add(municipalitiesService.id, { isHidden: true })
  .add(stvkService.id, { isHidden: true })
  .add(geoportalForests.id, { isHidden: true })
  .add(gamtotvarkaNatura2000.id, { isHidden: true })
  .add(uetkService.id)
  .click(async ({ coordinate }: any) => {
    mapLayers.getFeatureInfo(
      uetkService.id,
      coordinate,
      ({ geometries, properties }: any) => {
        if (query.preview) {
          mapLayers.highlightFeatures(geometries);
          selectedFeatures.value = properties;
        }
        postMessage("click", properties);
      }
    );
  })
  .zoom(uetkService.id, { addStroke: true });
</script>
