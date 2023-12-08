<template>
  <div>
    <UiMap
      :show-scale-line="true"
      :show-coordinates="true"
      :show-search="true"
      :is-preview="!!isPreview"
      @search="filtersStore.search = $event"
    >
      <template #filters>
        <UiButtonIcon icon="layers" @click="filtersStore.toggle('layers')" />
        <UiButtonIcon icon="filter" @click="filtersStore.toggle('filters')" />
      </template>
      <template v-if="filtersStore.active" #filtersContent>
        <UiMapLayerToggle v-if="filtersStore.isActive('layers')" :layers="toggleLayers" />
        <GamtotvarkaFilters
          v-else-if="filtersStore.isActive('filters')"
          :selected-year="selectedYear"
          @update:selected-year="handleDateFilter"
        />
        <Search
          v-else-if="filtersStore.isActive('search')"
          :value="filtersStore.search"
          :add-stroke="true"
          :types="['geoportal']"
          @select="filtersStore.hide()"
        />
      </template>
      <template #sidebar>
        <UiSidebarFeatures :features="selectedFeatures" type="gamtotvarka" />
      </template>
    </UiMap>
  </div>
</template>
<script setup lang="ts">
import Search from '@/components/search/Index.vue';
import { inject, ref, computed } from 'vue';
import { useFiltersStore } from '@/stores/filters';
import GamtotvarkaFilters from '@/components/gamtotvarka/Filters.vue';
import {
  geoportalTopo,
  geoportalOrto,
  geoportalTopoGray,
  inspireParcelService,
  gamtotvarkaPlanai,
  municipalitiesService,
  geoportalGrpk,
  gamtotvarkaService,
  gamtotvarkaNatura2000,
  gamtotvarkaStvkService,
  geoportalForests,
  geoportalKvr,
  parseRouteParams,
  invaService,
} from '@/utils';
import { useRoute } from 'vue-router';
import moment from 'moment';

const eventBus: any = inject('eventBus');
const filtersStore = useFiltersStore();
const mapLayers: any = inject('mapLayers');
const selectedFeatures = ref([] as any[]);
const $route = useRoute();

const query = parseRouteParams($route.query, ['preview', 'gamtotvarkos_planas']);
const isPreview = ref(!!query.preview);

const toggleLayers = [
  gamtotvarkaService,
  gamtotvarkaNatura2000,
  gamtotvarkaStvkService,
  geoportalForests,
  geoportalKvr,
  inspireParcelService,
  municipalitiesService,
  geoportalGrpk,
  invaService,
];

const gamtotvarkaServiceFilters = mapLayers.filters(gamtotvarkaService.id);
const gamtotvarkaPlanaiFilters = mapLayers.filters(gamtotvarkaPlanai.id);

const filterByYear = (key: string, year: number) => {
  const dateFrom = String(year);
  const dateTo = String(year + 1);
  gamtotvarkaServiceFilters.on(['tvarkymo_darbai']).set(key, {
    $gte: dateFrom,
    $lte: dateTo,
  });
};

const selectedYear = ref(parseInt(moment().startOf('year').format('YYYY')));
filterByYear('data', selectedYear.value);

const handleDateFilter = (newDate: number) => {
  selectedYear.value = newDate;
  filterByYear('data', selectedYear.value);
};

mapLayers
  .addBaseLayer(geoportalTopoGray.id)
  .addBaseLayer(geoportalTopo.id)
  .addBaseLayer(geoportalOrto.id)
  .addBaseLayer(geoportalGrpk.id)
  .add(gamtotvarkaService.id)
  .add(gamtotvarkaNatura2000.id, { isHidden: true })
  .add(gamtotvarkaStvkService.id, { isHidden: true })
  .add(geoportalForests.id, { isHidden: true })
  .add(geoportalKvr.id, { isHidden: true })
  .add(municipalitiesService.id, { isHidden: true })
  .add(inspireParcelService.id, { isHidden: true })
  .add(invaService.id, { isHidden: true })
  .click(async ({ coordinate }: any) => {
    selectedFeatures.value = [];
    eventBus.emit('uiSidebar', { open: false });
    mapLayers.getFeatureInfo(
      gamtotvarkaService.id,
      coordinate,
      ({ geometries, properties }: any) => {
        mapLayers.highlightFeatures(geometries);
        selectedFeatures.value.push(...properties);
        eventBus.emit('uiSidebar', { open: !!selectedFeatures.value.length });
      },
    );
    mapLayers.getFeatureInfo(
      gamtotvarkaNatura2000.id,
      coordinate,
      ({ geometries, properties }: any) => {
        mapLayers.highlightFeatures(geometries);
        selectedFeatures.value.push(...properties);
        eventBus.emit('uiSidebar', { open: !!selectedFeatures.value.length });
      },
    );
    mapLayers.getFeatureInfo(
      gamtotvarkaStvkService.id,
      coordinate,
      ({ geometries, properties }: any) => {
        mapLayers.highlightFeatures(geometries);
        selectedFeatures.value.push(...properties);
        eventBus.emit('uiSidebar', { open: !!selectedFeatures.value.length });
      },
    );
  });

if (query.gamtotvarkos_planas) {
  gamtotvarkaPlanaiFilters
    .onAll(['gamtotvarkos_plotai_patvirtintas', 'gamtotvarkos_teritorijos_patvirtintas'])
    .set('tvark_ter_uuid', query.gamtotvarkos_planas);
  await mapLayers.toggleVisibility(gamtotvarkaPlanai.id, true).zoomNew(gamtotvarkaPlanai.id, {
    addStroke: false,
    filters: gamtotvarkaPlanaiFilters,
  });
}
</script>
