<template>
  <div>
    <UiMap
      :show-scale-line="!doHideToolbar"
      :show-coordinates="!doHideToolbar"
      :show-base-layers-switch="!doHideToolbar"
      :show-search="!isPreview"
      :show-results="filtersStore.isActive('search')"
      @search="filtersStore.search = $event"
    >
      <template v-if="!doHideToolbar" #filters>
        <template v-if="!isPreview">
          <UiButtonRow class="h-full" gap="lg">
            <UiButton
              v-if="!enableContinuousDraw"
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
        <UiButtonIcon icon="upload" @click="uploadRef?.modal?.open?.()" />
      </template>
      <template v-if="filtersStore.active || showBufferChangeBox" #filtersContent>
        <UiMapLayerToggle v-if="filtersStore.isActive('layers')" :layers="toggleLayers" />
        <Search
          v-else-if="filtersStore.isActive('search')"
          :value="filtersStore.search"
          :search-point="hasDrawType('point')"
          :search-line="hasDrawType('line')"
          :search-polygon="hasDrawType('polygon')"
          :types="['geoportal', 'boundaries.parcels']"
          @select="selectSearch"
        />
        <div v-else-if="showBufferChangeBox" class="flex flex-col gap-3">
          <UiInputSlider
            v-model="featureBufferSize"
            :min="bufferMin"
            :max="bufferMax"
            :step="bufferSizes[bufferSizeKey].step"
            :label="bufferSizeLabel"
            :value="featureBufferSize"
          />
        </div>
      </template>
    </UiMap>
    <CoordsUpload ref="uploadRef" />
  </div>
</template>
<script setup lang="ts">
import { useFiltersStore } from '@/stores/filters';
import type { Buffer } from '@/types';
import {
  convertFeatureCollectionProjection,
  geoportalForests,
  geoportalGrpk,
  geoportalOrto,
  geoportalOrto1995,
  geoportalOrto2005,
  geoportalOrto2009,
  geoportalOrto2012,
  geoportalOrto2015,
  geoportalOrto2018,
  geoportalTopo,
  geoportalTopoGray,
  inspireParcelService,
  municipalitiesService,
  parseRouteParams,
  projection,
  projection4326,
  searchGeoportal,
  stvkService,
  uetkService,
} from '@/utils';
import { getFeatureCollection } from 'geojsonjs';
import _ from 'lodash';
import { computed, inject, ref } from 'vue';
import { useRoute } from 'vue-router';
const $route = useRoute();
const events: any = inject('events');
const uploadRef = ref();
const mapLayers: any = inject('mapLayers');
const postMessage: any = inject('postMessage');

const query = parseRouteParams($route.query, [
  'multi',
  'buffer',
  'preview',
  'hideToolbar',
  'types',
  'autoZoom',
  'bufferMin',
  'bufferMax',
  'closeOnSearch',
  'showArea',
]);
const isPreview = !!query.preview;
const doHideToolbar = !!query.hideToolbar;
const showArea = !!query.showArea;

const activeDrawType = computed(() => mapDraw.value.activeType);
const selectedFeature = ref({} as any);
const showBufferChangeBox = computed(
  () => !!query.buffer && ['Point', 'LineString'].includes(selectedFeature.value?.geometry?.type),
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
  { icon: 'point', type: 'Point', name: 'Taškas', el: 'point' },
  { icon: 'line', type: 'LineString', name: 'Linija', el: 'line' },
  { icon: 'polygon', type: 'Polygon', name: 'Plotas', el: 'polygon' },
];

const drawTypes = computed(() => {
  let types = ['point', 'line', 'polygon'];
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

const enableContinuousDraw = drawTypes.value.length === 1 && !query.multi;

const filtersStore = useFiltersStore();

const bufferSizes: { [key: string]: Buffer } = {
  xs: { min: 1, max: 5, step: 1 },
  sm: { min: 10, max: 100, step: 10 },
  md: { min: 100, max: 1000, step: 100 },
  lg: { min: 500, max: 5000, step: 500 },
  xl: { min: 1000, max: 10000, step: 1000 },
};

const bufferSizeKey = query.buffer && bufferSizes[query.buffer] ? query.buffer : 'xs';
const bufferMin = query.bufferMin || bufferSizes[bufferSizeKey].min;
const bufferMax = query.bufferMax || bufferSizes[bufferSizeKey].max;

const bufferSizeLabel = computed(() => {
  const text = `Buferio dydis`;

  let size: number = featureBufferSize.value as number;

  if (size < 1000) return `${text} ${size} m.`;

  size = _.round(size / 1000, 2);

  return `${text} ${size} km.`;
});

const featureBufferSize = computed({
  set(value) {
    mapDraw.value.setProperties(selectedFeature.value?.feature, {
      bufferSize: Number(value),
    });
  },
  get(): number | undefined {
    if (!selectedFeature.value?.feature) return;
    const bufferSize = Number(
      mapDraw.value.getProperties(selectedFeature.value?.feature, 'bufferSize'),
    );
    return bufferSize || bufferMin;
  },
});

const selectSearch = (match: any) => {
  if (match?.cleanOnSelect || query.closeOnSearch) {
    filtersStore.clearSearch();
  }
  if (!match?.geom) return;

  mapDraw.value
    .setFeatures(match.geom, {
      append: !!query.multi,
      types: drawTypes.value.map((i) => i.type),
    })
    .edit();
};

const toggleDrawType = (type: string) => {
  if (activeDrawType.value === type) {
    return mapDraw.value.end();
  }

  const draw = mapDraw.value.start(type);
  if (showArea) draw.enableMeasurements({ area: true });
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
  .enableBufferSize(!!query.buffer, bufferMin)
  .enableContinuousDraw(enableContinuousDraw)
  .on(['change', 'remove'], ({ features, featuresJSON }: any) => {
    postMessage('data', features);
    if (!!query.autoZoom && !!featuresJSON?.features?.length) {
      mapLayers.zoomToFeatureCollection(featuresJSON);
    }
  })
  .on('select', ({ featureObj, feature }: any) => {
    selectedFeature.value = {
      ...feature,
      feature: featureObj,
    };
  });

if (enableContinuousDraw) {
  toggleDrawType(drawTypes.value[0].type);
}

events.on('geom', (data: any) => {
  let geom = data.geom || data;

  if (typeof geom === 'string') {
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

events.on('address', (data: any) => {
  const address = data.address || data;

  // now supports only street + building number + city (e.g. Gedimino pr. 12, Vilnius)
  // TODO: update this part to support every address (including municipality, etc)
  searchGeoportal(address, [{ type: 'adresas', weight: 2 }], {
    fields: ['VARDAS^5'],
  }).then((data: any) => {
    const firstHit = data?.rows?.[0];

    if (!firstHit?.x || !firstHit?.y) return;

    // convert WGS (coordinates) to LKS (freature collection)
    const featureCollection = convertFeatureCollectionProjection(
      getFeatureCollection({
        type: 'Point',
        coordinates: [firstHit.x, firstHit.y],
      }),
      projection4326,
      projection,
    );

    mapLayers.zoomToFeatureCollection(featureCollection);
    mapDraw.value.setFeatures(featureCollection);
  });
});
</script>
