<template>
  <div>
    <UiModal ref="noResultsModal" title="Sklypas nerastas" size="xs" :show-close-btn="false">
      <p>
        Sklypas pagal Jūsų nuorodytą unikalų numerį {{ formattedParcelId }} nerastas. Pasitikrinkite
        unikalų numerį, ar tikrai teisingai jį suvedėte ir bandykite dar kartą.
      </p>
    </UiModal>
    <UiMap
      :show-search="activeMainSearch"
      :show-scale-line="true"
      :show-coordinates="true"
      @search="onSearch"
    >
      <template #filters>
        <UiBox v-if="activeParcelSearch">
          Sklypo paieška:
          <input
            type="text"
            :value="formattedParcelId"
            placeholder="4400-2510-9595"
            class="tracking-widest text-center px-1 rounded border-2 focus:outline-none"
            @input="handleParcelInput"
          />
        </UiBox>
        <UiButtonIcon icon="search" @click="toggleMainSearch()" v-if="activeParcelSearch" />
        <UiButtonIcon icon="pin-outline" @click="toggleParcelSearch()" v-if="activeMainSearch" />
        <UiButtonIcon icon="layers" @click="filtersStore.toggle('layers')" />
        <UiButtonIcon icon="legend" @click="filtersStore.toggle('legend')" />
        <UiMapMeasure />
      </template>

      <template v-if="filtersStore.active" #filtersContent>
        <UiMapLayerToggle v-if="filtersStore.isActive('layers')" :layers="toggleLayers" />

        <Search
          v-else-if="filtersStore.isActive('search') && activeMainSearch"
          :value="filtersStore.search"
          :add-stroke="true"
          :types="['uetk', 'geoportal']"
          :additional-geoportal-layers="[
            { type: 'ežeras', weight: 2 },
            { type: 'tvenkinys', weight: 2 },
            { type: 'upė', weight: 2 },
          ]"
        />

        <UiMapLegend
          v-if="filtersStore.isActive('legend')"
          :layer="sznsUetkService.id"
          title="Sutartiniai ženklai"
        />
      </template>
      <template #sidebar>
        <UiSidebarFeatures
          :is-open="!!selectedFeatures.length"
          :features="selectedFeatures"
          type="szns"
          @close="selectedFeatures = []"
        />
      </template>
    </UiMap>
  </div>
</template>
<script setup lang="ts">
import { inject, ref, computed } from 'vue';
import { useFiltersStore } from '@/stores/filters';
import {
  geoportalTopo,
  geoportalOrto,
  geoportalTopoGray,
  uetkService,
  sznsUetkService,
  sznsUetkServiceApproved,
  sznsUetkServicePreparing,
  sznsUetkParcelsService,
  administrativeBoundariesLabelsService,
  geoportalHybrid,
  geoportalGrpk,
  parseRouteParams,
  MapFilters,
  getGeometriesFromFeaturesArray,
  getPropertiesFromFeaturesArray,
} from '@/utils';
import { useRoute, useRouter } from 'vue-router';

const filtersStore = useFiltersStore();

const mapLayers: any = inject('mapLayers');
const selectedFeatures = ref([] as any[]);
const selectedGeometries = ref([] as any[]);
const $route = useRoute();
const router = useRouter();

const noResultsModal = ref();

const query = parseRouteParams($route.query, ['cadastralId', 'parcelId']);
const parcelId = ref('');

function onSearch(search: string) {
  filtersStore.search = search;

  if (!search) {
    mapLayers.cleanHighlighs();
  }
}

const activeMainSearch = ref(false);
function toggleMainSearch() {
  activeMainSearch.value = !activeMainSearch.value;
  activeParcelSearch.value = !activeParcelSearch.value;
}

const activeParcelSearch = ref(true);
function toggleParcelSearch() {
  activeParcelSearch.value = !activeParcelSearch.value;
  activeMainSearch.value = !activeMainSearch.value;
}

const toggleLayers = [
  sznsUetkService,
  sznsUetkParcelsService,
  uetkService,
  administrativeBoundariesLabelsService,
  geoportalGrpk,
];

mapLayers
  .addBaseLayer(geoportalTopoGray.id)
  .addBaseLayer(geoportalTopo.id)
  .addBaseLayer(geoportalOrto.id)
  .add(geoportalGrpk.id, { isHidden: true })
  .add(administrativeBoundariesLabelsService.id, { isHidden: true })
  .add(uetkService.id, { isHidden: true })

  .add(sznsUetkService.id)
  .add(sznsUetkServiceApproved.id)
  .add(sznsUetkServicePreparing.id)
  .add(sznsUetkParcelsService.id)
  .click(async ({ coordinate }: any) => {
    selectedFeatures.value = [];
    selectedGeometries.value = [];

    mapLayers.getFeatureInfo(uetkService.id, coordinate, ({ geometries, properties }: any) => {
      selectedGeometries.value = [...selectedGeometries.value, ...geometries];
      mapLayers.highlightFeatures(selectedGeometries.value);
      selectedFeatures.value = [...selectedFeatures.value, ...properties];
    });
    mapLayers.getFeatureInfo(sznsUetkService.id, coordinate, ({ geometries, properties }: any) => {
      selectedGeometries.value = [...selectedGeometries.value, ...geometries];
      mapLayers.highlightFeatures(selectedGeometries.value);
      selectedFeatures.value = [...selectedFeatures.value, ...properties];
    });
    mapLayers.getFeatureInfo(
      sznsUetkParcelsService.id,
      coordinate,
      ({ geometries, properties }: any) => {
        selectedGeometries.value = [...selectedGeometries.value, ...geometries];
        mapLayers.highlightFeatures(selectedGeometries.value);
        selectedFeatures.value = [...selectedFeatures.value, ...properties];
      },
    );
  })
  .enableLocationTracking();

mapLayers.waitForLoaded.then(() => {
  filtersStore.toggle('layers');
});

if (query.cadastralId) {
  const layers = mapLayers
    .getAllSublayers(uetkService.id)
    .filter(
      (item: string) =>
        !['upiu_pabaseiniai', 'upiu_baseinu_rajonai', 'upiu_baseinai'].includes(item),
    );

  const filters = new MapFilters();

  layers.forEach((item: string) => {
    filters.on(item).set('kadastro_id', `${query.cadastralId}`);
  });

  await mapLayers.zoom(uetkService.id, { addStroke: true, filters });
}

const filterByParcelId = async (parcelIdValue: string) => {
  const layers = mapLayers
    .getSublayers(sznsUetkParcelsService.id)
    .filter((item: string) => !['apskritys', 'savivaldybes', 'seniunijos'].includes(item));

  const filters = new MapFilters();

  layers.forEach((item: string) => {
    filters.on(item).set('unikalus_nr', `${parcelIdValue}`);
  });

  const filteredFeatures = await mapLayers.zoom(sznsUetkParcelsService.id, {
    addStroke: true,
    filters,
  });

  if (filteredFeatures && filteredFeatures.length) {
    const callbackData = {
      geometries: getGeometriesFromFeaturesArray(filteredFeatures.features || filteredFeatures),
      properties: getPropertiesFromFeaturesArray(filteredFeatures.features || filteredFeatures),
    };

    selectedGeometries.value = [...selectedGeometries.value, ...callbackData.geometries];
    mapLayers.highlightFeatures(selectedGeometries.value);
    selectedFeatures.value = [...selectedFeatures.value, ...callbackData.properties];
  } else {
    selectedFeatures.value = [];
    noResultsModal.value?.open();
  }
};

const searchParcel = () => {
  mapLayers.cleanHighlighs();
  selectedFeatures.value = [];

  const isValidFormat = /^\d{12}$/.test(parcelId.value);

  if (isValidFormat) {
    router.push({
      query: {
        ...$route.query,
        parcelId: parcelId.value,
      },
    });
    filterByParcelId(parcelId.value);
  } else if (parcelId.value === '') {
    const { parcelId: _, ...restQuery } = $route.query;
    router.push({
      query: restQuery,
    });
  }
};

if (query.parcelId) {
  parcelId.value = query.parcelId as string;
  filterByParcelId(parcelId.value);
}

const formattedParcelId = computed(() => {
  if (!parcelId.value) return '';
  const digits = parcelId.value.toString().replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}`;
});

const handleParcelInput = (event: any) => {
  parcelId.value = event.target.value.replace(/\D/g, '').slice(0, 12);
  searchParcel();
};
</script>

<style>
.ol-layer {
  cursor: help;
}
</style>
