<template>
  <div>
    <UiMap
      :show-scale-line="true"
      :show-coordinates="true"
      :show-search="true"
      :is-preview="isPreview"
      :attribution-options="{
        collapsible: !isPreview || !isScreenshot,
      }"
      @search="filtersStore.search = $event"
    >
      <template #filters>
        <UiButtonIcon icon="filter" @click="filtersStore.toggle('filters')" />
        <UiButtonIcon icon="layers" @click="filtersStore.toggle('layers')" />
        <UiMapMeasure />
        <UiBox v-if="config.user.isUser && !config.user.isExpert">
          <UiInputCheckbox v-model="config.srisShowAllPlaces" @change="toggleAmateurLayers">
            Rodyti visas radavietes
          </UiInputCheckbox>
        </UiBox>
        <UiBox
          v-if="
            (config.user.isAdmin || config.user.isExpert || !isVisibleSrisLayer) &&
            isVisibleRusysLayer
          "
        >
          <UiInputCheckbox @change="toggleGrid">Išjungti gardelę</UiInputCheckbox>
        </UiBox>
      </template>
      <template v-if="filtersStore.active" #filtersContent>
        <UiMapLayerToggle
          v-if="filtersStore.isActive('layers')"
          :layers="toggleLayers"
          @change="onChangeSublayers"
        />
        <RusysFilters v-else-if="filtersStore.isActive('filters')" />
        <Search
          v-else-if="filtersStore.isActive('search')"
          :search-point="true"
          :search-line="true"
          :search-polygon="true"
          :value="filtersStore.search"
          :types="['geoportal']"
          @select="selectSearch"
        />
      </template>

      <template #sidebar>
        <UiSidebarFeatures
          :features="selectedFeatures"
          title="Identifikuoti objektai"
          type="rusys"
        />
      </template>
    </UiMap>
    <UiModal ref="emptyModalRef" title="Nerasta">
      <p>Pagal pateiktą užklausą radaviečių šiuo metu nėra.</p>
    </UiModal>
    <FeaturesPopupClick />
  </div>
</template>
<script setup lang="ts">
import { useFiltersStore } from '@/stores/filters';
import {
  gamtotvarkaService,
  geoportalForests,
  geoportalGrpk,
  geoportalOrto,
  geoportalTopo,
  geoportalTopoGray,
  highlightLayerRusys,
  inspireParcelService,
  invaService,
  municipalitiesService,
  parseRouteParams,
  rusysGridService,
  rusysRequestService,
  rusysService,
  srisAccessService,
  srisPrivateService,
  srisService,
  stvkService,
  sznsPievosPelkes,
  uetkService,
  validateSrisAuth,
} from '@/utils';
import { computed, inject, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { rusysApiHost } from '@/config';
import { useConfigStore } from '@/stores/config';
import { getItemsByRequest } from '@/utils/requests/rusys';

const GRID_TO_SERVICE_LEVEL = 5;
const filtersStore = useFiltersStore();
const mapLayers: any = inject('mapLayers');
const events: any = inject('events');
const eventBus: any = inject('eventBus');
const postMessage: any = inject('postMessage');
const $route = useRoute();
const emptyModalRef = ref();
const config = useConfigStore();
const isPreview = ref(false);
const selectedFeatures = ref([] as any[]);
const mapDraw = computed(() => mapLayers.getDraw());

const query = parseRouteParams($route.query, [
  'place',
  'kingdom',
  'species',
  'type',
  'auth',
  'informationalForm',
  'preview',
  'amateur',
  'request',
  'screenshot',
  'hideGrid',
]);

const isVisibleSrisLayer = ref(true);
const isVisibleRusysLayer = ref(true);

srisService.layer.on('change:visible', () => {
  isVisibleSrisLayer.value = mapLayers.isVisible(srisService.id);
});
rusysService.layer.on('change:visible', () => {
  isVisibleRusysLayer.value = mapLayers.isVisible(rusysService.id);
});

if (query.type === 'sris') {
  mapLayers.toggleVisibility(invaService.id, false);
} else if (query.type === 'inva') {
  mapLayers.toggleVisibility(srisService.id, false);
}

config.setSrisToken(query.auth);
const user = await validateSrisAuth(query.auth);

if (!user && query.auth) {
  postMessage('auth', { valid: false });
  window.location.href = '/rusys';
}

config.setRusysUser(user || {});

if (user?.type !== 'ADMIN' && !user?.isExpert) {
  const sublayers: any[] = invaService.sublayers.filter((s) =>
    ['radavietes_svetimzemes', 'stebejimai_tyrineta_nerasta_svetimzemes'].includes(s.value),
  );

  sublayers.forEach((sublayer) => {
    if (sublayer?.name) {
      sublayer.isHidden = true;
    }
  });
}

isPreview.value = !!query.preview;
const isScreenshot = ref(!!query.screenshot);

const filtersPlacesGrid = computed(() =>
  mapLayers
    .filters(rusysGridService.id)
    .onAll(['radavietes', 'radavietes_invazines', 'radavietes_svetimzemes']),
);
const filtersPlacesSris = computed(() => mapLayers.filters(srisService.id).on('radavietes'));
const filtersPlacesInva = computed(() =>
  mapLayers
    .filters(invaService.id)
    .onAll([
      'radavietes_invazines',
      'radavietes_svetimzemes',
      'stebejimai_tyrineta_nerasta_svetimzemes',
      'stebejimai_tyrineta_nerasta_invazines',
    ]),
);
const filters = computed(() =>
  mapLayers
    .filters(rusysService.id)
    .onAll([
      'radavietes',
      'stebejimai_interpretuojami',
      'stebejimai_tyrineta_nerasta_invazines',
      'stebejimai_tyrineta_nerasta_svetimzemes',
      'radavietes_invazines',
      'radavietes_svetimzemes',
    ]),
);
const filtersSrisInformational = computed(() =>
  mapLayers.filters(srisService.id).on('stebejimai_interpretuojami'),
);
const toggleLayers = [
  rusysService,
  uetkService,
  stvkService,
  municipalitiesService,
  geoportalGrpk,
  geoportalForests,
  sznsPievosPelkes,
  gamtotvarkaService,
  inspireParcelService,
];

const filterById = (key: string, id: any) => {
  filtersPlacesInva.value.set(key, id);
  filtersPlacesSris.value.set(key, id);
  filtersPlacesGrid.value.set(key, id);
};

if (query.place) filterById('id', query.place);
if (query.kingdom) {
  filterById('kingdomId', query.kingdom);
  filtersSrisInformational.value.set('kingdomId', query.kingdom);
}
if (query.species) {
  filterById('speciesId', query.species);
  filtersSrisInformational.value.set('speciesId', query.species);
}
if (query.informationalForm) {
  filtersSrisInformational.value.set('id', query.informationalForm);
  filtersPlacesGrid.value.set('forms', query.informationalForm);
}
if (query.request) {
  // toggle all
  mapLayers.setSublayers(invaService.id, ['radavietes_invazines', 'radavietes_svetimzemes']);

  rusysRequestService.layer.set('url', `${rusysApiHost}/maps/requests/${query.request}/geom`);
  const itemsByRequest = await getItemsByRequest(query.request);

  const getIdInValue = (items: number[]) => {
    if (!items?.length) return [-1];
    return items;
  };

  filterById('id', { $in: getIdInValue(itemsByRequest.places) });
  filtersSrisInformational.value.set('id', { $in: getIdInValue(itemsByRequest.forms) });
  filtersPlacesGrid.value.set('forms', { $in: getIdInValue(itemsByRequest.forms) });
}
function toggleGrid(value: boolean) {
  const level = value ? Number.NEGATIVE_INFINITY : GRID_TO_SERVICE_LEVEL;

  mapLayers.applyZoomLevel([rusysGridService.id], [srisPrivateService.id, invaService.id], level);
}

const toggleAmateurLayers = (value: boolean) => {
  mapLayers.toggleVisibility(srisAccessService.id, !value);
  togglePrivateSrisService(!value);
  mapLayers.updateLayerQuery(srisService.id);
  mapLayers.updateLayerQuery(rusysGridService.id);
};

events.on('filter', ({ places, species, kingdoms, classes, phylums, zoom }: any) => {
  // todo: fix
  const setData = (key: string, items: any, filtersInstance: any = filters) => {
    const values = Array.isArray(items) ? items : [items];

    const orCondition = {
      $or: values.map((value) => ({ [key]: value })),
    };

    filtersInstance.value.set(key, orCondition);
  };
  filters.value.clear();

  if (places) setData('id', places, filtersPlacesSris);
  if (species) setData('speciesId', species);
  if (kingdoms) setData('kingdomId', kingdoms);
  if (classes) setData('classId', classes);
  if (phylums) setData('phylumId', phylums);
  if (zoom) mapLayers.zoom(rusysService.id);
});

function togglePrivateSrisService(show: boolean) {
  const level = show ? GRID_TO_SERVICE_LEVEL : Number.POSITIVE_INFINITY;

  mapLayers.applyZoomLevel([rusysGridService.id], [srisPrivateService.id, invaService.id], level);

  mapLayers.toggleVisibility(srisPrivateService.id, show);
}

const highlightLayerName = highlightLayerRusys.id;

mapLayers
  .addBaseLayer(geoportalTopoGray.id)
  .addBaseLayer(geoportalTopo.id)
  .addBaseLayer(geoportalOrto.id)
  .add(inspireParcelService.id, { isHidden: true })
  .add(stvkService.id, { isHidden: true })
  .add(geoportalForests.id, { isHidden: true })
  .add(geoportalGrpk.id, { isHidden: true })
  .add(uetkService.id, { isHidden: true })
  .add(municipalitiesService.id, { isHidden: true })
  .add(sznsPievosPelkes.id, { isHidden: true })
  .add(gamtotvarkaService.id, { isHidden: true })
  .add(rusysService.id)
  .enableLocationTracking()
  .click(async ({ coordinate }: any) => {
    selectedFeatures.value = [];
    eventBus.emit('uiSidebar', { open: false });
    mapLayers.highlightFeatures(null, { layer: highlightLayerName });
    mapLayers.getFeatureInfo(rusysService.id, coordinate, ({ properties, geometries }: any) => {
      selectedFeatures.value.push(...properties);
      mapLayers.highlightFeatures(geometries, {
        merge: true,
        layer: highlightLayerName,
      });
      eventBus.emit('uiSidebar', { open: !!selectedFeatures.value.length });
    });
  })
  .toggleVisibility(srisAccessService.id, !!query.amateur);

if (query.place) {
  mapLayers.setSublayers(srisService.id, 'radavietes');
  mapLayers.setSublayers(invaService.id, ['radavietes_invazines', 'radavietes_svetimzemes']);
} else if (query.informationalForm) {
  mapLayers.setSublayers(srisService.id, 'stebejimai_interpretuojami');
  mapLayers.toggleVisibility(invaService.id, false);
}

mapLayers
  .filters(rusysGridService.id)
  .on('all')
  .set('layers', mapLayers.getInnerVisibleLayers(rusysService.id));

mapLayers.updateLayerQuery(rusysService.id);

events.on('geom', (data: any) => {
  mapLayers.zoomToFeatureCollection(data, { addStroke: true });
});

watch(isVisibleSrisLayer, (value) => togglePrivateSrisService(!value || !!user), {
  immediate: true,
});

function onChangeSublayers(layer: any) {
  function getTopParent(layer: any): any {
    if (layer.parent) return getTopParent(layer.parent);
    return layer;
  }

  const topParent = getTopParent(layer);

  if (topParent?.id !== rusysService?.id) return;

  mapLayers
    .filters(rusysGridService.id)
    .on('all')
    .set('layers', mapLayers.getInnerVisibleLayers(rusysService.id));
}

if (query.place || query.informationalForm) {
  await mapLayers.zoom(rusysService.id);
}

if ((query.hideGrid || query.request) && user) {
  toggleGrid(true);
  // do not await this
  await mapLayers.zoom(rusysRequestService.id, { zoomEmptyFilters: true });
}

const selectSearch = (match: any) => {
  if (!match?.geom) return;

  filtersStore.clearSearch();
  mapLayers.zoomToFeatureCollection(match.geom);
  mapDraw.value.setFeatures(match.geom);
};
</script>
