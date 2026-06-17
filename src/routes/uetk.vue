<template>
  <div :class="screenshotLayout ? 'screenshot-mode flex flex-col h-screen w-screen' : ''">
    <div :class="screenshotLayout ? 'relative flex-1 min-h-0 overflow-hidden' : ''">
    <UiMap
      :show-scale-line="true"
      :show-coordinates="true"
      :show-search="activeMainSearch"
      :attribution-options="{
        collapsible: !isPreview || !isScreenshot,
      }"
      :is-preview="!!isPreview"
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
        <UiButtonIcon
          icon="search"
          @click="toggleMainSearch()"
          v-if="activeParcelSearch"
          title="Pagrindinė paieška"
        />
        <UiButtonIcon
          icon="pin-outline"
          @click="toggleParcelSearch()"
          v-if="activeMainSearch"
          title="Sklypų paieška"
        />
        <UiButtonIcon icon="layers" @click="filtersStore.toggle('layers')" />
        <UiButtonIcon icon="legend" @click="filtersStore.toggle('legend')" />
        <UiMapMeasure />
        <UiButtonIcon
          icon="image"
          @click="handleExportMap()"
          title="Atsisiųsti žemėlapio iškarpą"
        />
        <UiButtonIcon icon="download" @click="handleExportData()" title="Atsisiųsti duomenis" />
      </template>
      <template v-if="filtersStore.active && !screenshotLayout" #filtersContent>
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
        />
        <UiMapLegend
          v-if="filtersStore.isActive('legend')"
          :layer="uetkService.id"
          title="Sutartiniai ženklai"
        />
      </template>
      <template #sidebar>
        <UiSidebarFeatures
          :is-open="!!selectedFeatures.length"
          :features="selectedFeatures"
          type="uetk"
          @close="selectedFeatures = []"
        />
      </template>
    </UiMap>
    </div>
    <div
      v-if="screenshotLayout"
      class="bg-white border-t border-gray-200 p-3 max-h-[45%] overflow-y-auto"
    >
      <UiMapLegend
        :layer="uetkService.id"
        title="Sutartiniai ženklai"
        :visible-only="true"
        :use-current-scale="true"
        :inline="true"
      />
    </div>
    <UiModal
      ref="downloadDataModal"
      title="Duomenų atsisiuntimas"
      size="xs"
      :show-close-btn="false"
    >
      <div class="space-y-4">
        <div>
          <h3 class="font-medium text-gray-900 mb-2">Erdviniai duomenys</h3>
          <p class="text-gray-700">
            Atsisiųskite
            <a
              class="text-sky-700 hover:text-sky-900 transition-colors"
              target="_blank"
              href="https://opengis.lt/projects/aaa/uetk/uetk_gdb.zip"
            >
              GDB formatu
            </a>
            (zip archyvas)
          </p>
          <p class="text-sm text-gray-600 mt-2">
            <a
              class="text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 transition-colors"
              target="_blank"
              href="https://aaa.lrv.lt/public/canonical/1737623109/3063/UETK_Erdviniu_duomenu_aprasymas.pdf"
            >
              <UiIcon name="document" class="flex-shrink-0 cursor-pointer" :size="14" />
              Erdvinių duomenų aprašymas (PDF)
            </a>
          </p>
        </div>

        <div class="pt-3 border-t border-gray-200">
          <h3 class="font-medium text-gray-900 mb-2">Tekstiniai duomenys</h3>
          <p class="text-gray-700">
            Atsisiųskite
            <a
              class="text-sky-700 hover:text-sky-900 transition-colors"
              target="_blank"
              href="https://opengis.lt/projects/aaa/uetk/uetk_xls.zip"
            >
              XLS formatu
            </a>
            (zip archyvas)
          </p>
        </div>
      </div>
    </UiModal>
    <UiModal ref="noResultsModal" title="Sklypas nerastas" size="xs" :show-close-btn="false">
      <p>
        Sklypas pagal Jūsų nuorodytą unikalų numerį {{ formattedParcelId }} nerastas. Pasitikrinkite
        unikalų numerį, ar tikrai teisingai jį suvedėte ir bandykite dar kartą.
      </p>
    </UiModal>
  </div>
</template>
<script setup lang="ts">
import { useFiltersStore } from '@/stores/filters';
import { useMapExport } from '@/composables/useMapExport';
import {
  administrativeBoundariesLabelsService,
  gamtotvarkaStvkService,
  geoportalGrpk,
  geoportalHybrid,
  geoportalOrto,
  geoportalOrto1995,
  geoportalOrto2005,
  geoportalOrto2009,
  geoportalOrto2012,
  geoportalOrto2015,
  geoportalOrto2018,
  geoportalOrto2021,
  geoportalOrto2024,
  geoportalOrtoGroup,
  geoportalTopo,
  geoportalTopoGray,
  rcSzns,
  sznsUetkService,
  sznsUetkServiceApproved,
  sznsUetkServicePreparing,
  sznsUetkParcelsService,
  MapFilters,
  parseRouteParams,
  uetkService,
  getGeometriesFromFeaturesArray,
  getPropertiesFromFeaturesArray,
} from '@/utils';
import { inject, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const filtersStore = useFiltersStore();
const { exportMapToPNG } = useMapExport();

const mapLayers: any = inject('mapLayers');
const postMessage: any = inject('postMessage');
const events: any = inject('events');
const eventBus: any = inject('eventBus');

const selectedFeatures = ref([] as any[]);
const selectedGeometries = ref([] as any[]);
const $route = useRoute();
const router = useRouter();

const query = parseRouteParams($route.query, [
  'cadastralId',
  'parcelId',
  'preview',
  'screenshot',
  'hideSidebar',
]);
const isPreview = ref(!!query.preview);
const isScreenshot = ref(!!query.screenshot);
const screenshotLayout = computed(() => isPreview.value && isScreenshot.value);
const parcelId = ref('');

const noResultsModal = ref();
const downloadDataModal = ref();

function onSearch(search: string) {
  filtersStore.search = search;

  if (!search) {
    mapLayers.cleanHighlighs();
  }
}

const activeMainSearch = ref(true);
function toggleMainSearch() {
  activeMainSearch.value = !activeMainSearch.value;
  activeParcelSearch.value = !activeParcelSearch.value;
}

const activeParcelSearch = ref(false);
function toggleParcelSearch() {
  activeParcelSearch.value = !activeParcelSearch.value;
  activeMainSearch.value = !activeMainSearch.value;
}

const toggleLayers = [
  uetkService,
  sznsUetkParcelsService,
  sznsUetkService,
  rcSzns,
  gamtotvarkaStvkService,
  administrativeBoundariesLabelsService,
  geoportalOrtoGroup,
  geoportalHybrid,
  geoportalGrpk,
];

// In screenshot mode, switch the UETK layer's WMS LAYERS list to all
// 11 sublayers BEFORE the layer is added to the map. The previous
// .add() → setSublayers ordering produced two render passes (8 then
// 11 layers) and puppeteer captured both, doubling every basin label.
// setAllSublayers operates on the WMS source created at module load,
// so it works before .add(); the first render OL queues will already
// use the full set.
if (screenshotLayout.value) {
  mapLayers.setAllSublayers(uetkService.id);
}

mapLayers
  .addBaseLayer(geoportalTopoGray.id)
  .addBaseLayer(geoportalTopo.id)
  .addBaseLayer(geoportalOrto.id)
  .add(geoportalGrpk.id, { isHidden: true })
  .add(geoportalHybrid.id, { isHidden: true })
  .add(geoportalOrtoGroup.id, { isHidden: true })
  .add(geoportalOrto1995.id, { isHidden: true })
  .add(geoportalOrto2005.id, { isHidden: true })
  .add(geoportalOrto2009.id, { isHidden: true })
  .add(geoportalOrto2012.id, { isHidden: true })
  .add(geoportalOrto2015.id, { isHidden: true })
  .add(geoportalOrto2018.id, { isHidden: true })
  .add(geoportalOrto2021.id, { isHidden: true })
  .add(geoportalOrto2024.id, { isHidden: true })
  .add(administrativeBoundariesLabelsService.id, { isHidden: true })
  .add(gamtotvarkaStvkService.id, { isHidden: true })
  .add(rcSzns.id, { isHidden: true })
  .add(sznsUetkParcelsService.id, { isHidden: true })
  .add(sznsUetkService.id, { isHidden: true })
  .add(sznsUetkServiceApproved.id, { isHidden: true })
  .add(sznsUetkServicePreparing.id, { isHidden: true })
  .add(uetkService.id)
  .click(async ({ coordinate }: any) => {
    selectedFeatures.value = [];
    selectedGeometries.value = [];

    mapLayers.getFeatureInfo(uetkService.id, coordinate, ({ geometries, properties }: any) => {
      selectedGeometries.value = [...selectedGeometries.value, ...geometries];
      mapLayers.highlightFeatures(selectedGeometries.value);
      selectedFeatures.value = [...selectedFeatures.value, ...properties];

      postMessage('click', properties);
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
    mapLayers.getFeatureInfo(sznsUetkService.id, coordinate, ({ geometries, properties }: any) => {
      selectedGeometries.value = [...selectedGeometries.value, ...geometries];
      mapLayers.highlightFeatures(selectedGeometries.value);
      selectedFeatures.value = [...selectedFeatures.value, ...properties];
    });
  })
  .enableLocationTracking();

const filterByCadastralId = async (cadastralId: any, maxZoom?: number) => {
  const layers = mapLayers
    .getAllSublayers(uetkService.id)
    .filter(
      (item: string) =>
        !['upiu_pabaseiniai', 'upiu_baseinu_rajonai', 'upiu_baseinai'].includes(item),
    );
  const filters = new MapFilters();

  if (typeof cadastralId === 'number') {
    cadastralId = cadastralId.toString();
  }

  layers.forEach((item: string) => {
    filters.on(item).set('kadastro_id', cadastralId);
  });

  await mapLayers.zoom(uetkService.id, { addStroke: true, filters, maxZoom });
};

if (query.cadastralId) {
  // For extract-PDF screenshots we cap maxZoom on the fit-to-extent call
  // itself (rather than calling setZoom after the fact — that loses the
  // recentering, races with the screenshot's loadend wait, and is dead
  // anyway because _getZoomLevel returns 10 for EPSG:3346 so any post-fit
  // currentZoom>13 check never fires).
  //
  // maxZoom is an UPPER BOUND on view.fit, not a forced zoom. Big
  // features (Nemunas, Nevėžis, ...) still pick the smaller zoom they
  // need to fit their extent into the viewport — the cap doesn't bite.
  // Small features (a 200m pond, a 5km stream) used to bottom out at
  // the cap with the actual geometry showing as a single highlight
  // pixel; bumping the cap from 8 → 14 lets them zoom in to a readable
  // size while leaving the big-feature path untouched.
  await filterByCadastralId(
    query.cadastralId,
    screenshotLayout.value ? 17 : undefined,
  );

  // In screenshot mode, view.fit kicks off a second tile fetch at the new
  // extent. mapLayers.waitForLoaded.once('loadend') already resolved on
  // the initial render, so App.vue's canvasToImage would otherwise fire
  // while the post-fit tiles are still streaming in — and the canvas
  // ends up with leftover old tiles plus partial new tiles, doubling
  // every basin label. Hold the route's async setup open until the
  // post-fit loadend has fired so Suspense doesn't release until the
  // canvas is fully painted.
  if (screenshotLayout.value && mapLayers.map) {
    await new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(done, 10000); // safety net
      mapLayers.map.once('loadend', done);
    });
  }
}

events.on('filter', async ({ cadastralId }: any) => {
  await filterByCadastralId(cadastralId);
});

const handleExportMap = async () => {
  try {
    await exportMapToPNG(mapLayers.map, 'uetk_zemelapis');
    eventBus?.emit('uiToast', {
      type: 'success',
      title: 'Žemėlapio paveikslėlis sugeneruotas',
    });
  } catch (error) {
    eventBus?.emit('uiToast', {
      type: 'danger',
      title: 'Nepavyko išsaugoti žemėlapio paveikslėlio',
      description: 'Pabandykite perkrauti naršyklės langą ir bandyti dar kartą.',
    });
  }
};

const handleExportData = async () => {
  downloadDataModal.value?.open();
};

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
</script>

<style>
/* In screenshot mode the v-map directive hard-codes
   height:100vh; width:100vw on the OL container, which overrides our
   flex layout and pushes the legend off-screen. Force every wrapper
   between .flex-1 and the .ol-viewport to fill its parent so the OL
   map sizes to the available space above the legend. */
.screenshot-mode .relative.flex-1 > div,
.screenshot-mode .relative.flex-1 > div > div,
.screenshot-mode .ol-viewport,
.screenshot-mode [style*='100vh'] {
  height: 100% !important;
  width: 100% !important;
}

/* UiMap's base styles flip .ol-scale-line / .ol-attribution to
   position:initial so they don't get caught in the OL absolute
   layout. That's fine in the regular interactive view where they get
   portaled into corner mapControls containers, but in screenshot
   mode they end up at the top of the .ol-viewport. Re-anchor them
   to the bottom of the map area, just above the legend panel. */
.screenshot-mode .ol-viewport {
  position: relative !important;
}
.screenshot-mode .ol-scale-line {
  position: absolute !important;
  bottom: 4px !important;
  left: 8px !important;
  z-index: 5;
}
.screenshot-mode .ol-attribution {
  position: absolute !important;
  bottom: 4px !important;
  right: 8px !important;
  z-index: 5;
}

.ol-layer {
  cursor: help;
}
</style>
