<template>
  <div>
    <UiMap
      :show-scale-line="true"
      :show-coordinates="true"
      :show-search="!isPreview"
      :show-results="filtersStore.isActive('search')"
      @search="filtersStore.search = $event"
    >
      <template #filters>
        <template v-if="!isPreview">
          <UiButtonRow class="h-full" gap="lg">
            <UiButton
              v-for="t in drawTypes"
              :key="t.type"
              :icon="t.icon"
              type="white"
              class="shadow"
              :active="activeDrawType === t.type"
              @click="toggleDrawType(t.type)"
            />
            <UiButton
              v-if="mapDraw.hasFeatures()"
              type="danger"
              class="shadow"
              icon="remove"
              @click="mapDraw.remove(selectedFeature?.feature)"
            />
          </UiButtonRow>
        </template>

        <UiButtonIcon icon="layers" @click="filtersStore.toggle('layers')" />
      </template>
      <template v-if="filtersStore.active || showBufferChangeBox" #filtersContent>
        <UiMapLayerToggle v-if="filtersStore.isActive('layers')" :layers="toggleLayers" />
        <Search
          v-else-if="filtersStore.isActive('search')"
          :value="filtersStore.search"
          :search-point="hasDrawType('point')"
          :search-line="hasDrawType('line')"
          :search-polygon="hasDrawType('polygon')"
          :types="['geoportal']"
          @select="selectSearch"
        />
        <div v-else-if="showBufferChangeBox" class="flex flex-col gap-3">
          <UiInputSlider
            v-model="featureBufferSize"
            :min="1"
            :max="5"
            :label="`Buferio dydis ${featureBufferSize} m.`"
          />
        </div>
      </template>
    </UiMap>
  </div>
</template>
<script setup lang="ts">
import { computed, inject, ref } from "vue";
import {
  geoportalTopo,
  geoportalOrto,
  geoportalTopoGray,
  parseRouteParams,
  uetkService,
  stvkService,
  municipalitiesService,
  geoportalGrpk,
  geoportalForests,
  geoportalOrto2018,
  geoportalOrto2015,
  geoportalOrto2012,
  geoportalOrto2009,
  geoportalOrto2005,
  geoportalOrto1995,
  inspireParcelService,
} from "@/utils";
import { useFiltersStore } from "@/stores/filters";
import { useRoute } from "vue-router";
const $route = useRoute();
const events: any = inject("events");

const mapLayers: any = inject("mapLayers");
const postMessage: any = inject("postMessage");

const query = parseRouteParams($route.query, ["multi", "buffer", "preview", "types"]);
const isPreview = !!query.preview;

const activeDrawType = computed(() => mapDraw.value.activeType);
const selectedFeature = ref({} as any);
const showBufferChangeBox = computed(
  () => query.buffer && ["Point", "LineString"].includes(selectedFeature.value?.type)
);

const toggleLayers = [
  uetkService,
  stvkService,
  municipalitiesService,
  geoportalGrpk,
  geoportalForests,
  geoportalOrto2018,
  geoportalOrto2015,
  geoportalOrto2012,
  geoportalOrto2009,
  geoportalOrto2005,
  geoportalOrto1995,
  inspireParcelService,
];

const mapDraw = computed(() => mapLayers.getDraw());
const defaultDrawElements = [
  { icon: "point", type: "Point", name: "Taškas", el: "point" },
  { icon: "line", type: "LineString", name: "Linija", el: "line" },
  { icon: "polygon", type: "Polygon", name: "Plotas", el: "polygon" },
];

const drawTypes = computed(() => {
  let types = ["point", "line", "polygon"];
  if (query.types) {
    if (Array.isArray(query.types)) {
      types = query.types;
    } else {
      types = [query.types];
    }
  }

  return defaultDrawElements.filter((type) => types.includes(type.el));
});

const hasDrawType = (type: string) => {
  return drawTypes.value.some((t) => t.el === type);
};

const filtersStore = useFiltersStore();

const featureBufferSize = computed({
  set(value) {
    mapDraw.value.setProperties(selectedFeature.value?.feature, {
      bufferSize: Number(value),
    });
  },
  get() {
    if (!selectedFeature.value?.feature) return;
    const bufferSize = Number(
      mapDraw.value.getProperties(selectedFeature.value?.feature, "bufferSize")
    );
    return bufferSize || 1;
  },
});

const selectSearch = (match: any) => {
  if (match?.cleanOnSelect) {
    filtersStore.clearSearch();
  }
  if (!match?.geom) return;

  mapDraw.value.setFeatures(match.geom, !!query.multi).edit();
};

const toggleDrawType = (type: string) => {
  if (activeDrawType.value === type) {
    return mapDraw.value.end();
  }
  mapDraw.value.start(type);
};

mapLayers
  .addBaseLayer(geoportalTopo.id)
  .addBaseLayer(geoportalTopoGray.id)
  .addBaseLayer(geoportalOrto.id)
  .add(uetkService.id, { isHidden: true })
  .add(stvkService.id, { isHidden: true })
  .add(municipalitiesService.id, { isHidden: true })
  .add(geoportalGrpk.id, { isHidden: true })
  .add(geoportalForests.id, { isHidden: true })
  .add(geoportalGrpk.id, { isHidden: true })
  .add(geoportalOrto2018.id, { isHidden: true })
  .add(geoportalOrto2015.id, { isHidden: true })
  .add(geoportalOrto2012.id, { isHidden: true })
  .add(geoportalOrto2009.id, { isHidden: true })
  .add(geoportalOrto2005.id, { isHidden: true })
  .add(geoportalOrto1995.id, { isHidden: true })
  .add(inspireParcelService.id, { isHidden: true })
  .enableLocationTracking();

mapDraw.value
  .setMulti(!!query.multi)
  .enableBufferSize(!!query.buffer)
  .enableContinuousDraw(drawTypes.value.length === 1 && !query.multi && !query.buffer)
  .on(["change", "remove"], ({ features }: any) => {
    postMessage("data", features);
  })
  .on("select", ({ featureObj, feature }: any) => {
    selectedFeature.value = {
      ...feature,
      feature: featureObj,
    };
  });

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
  mapDraw.value.setFeatures(geom);
  if (!isPreview) mapDraw.value.edit();
});
</script>
