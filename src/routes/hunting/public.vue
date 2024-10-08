<template>
  <div>
    <UiMap
      :show-scale-line="true"
      :projection="projection3857"
      :show-search="true"
      @search="onSearch"
    >
      <template #filters>
        <UiButtonIcon icon="layers" @click="filtersStore.toggle('layers')" />
      </template>
      <template v-if="filtersStore.active" #filtersContent>
        <UiMapLayerToggle
          v-if="filtersStore.isActive('layers')"
          :layers="toggleLayers"
          @change="onToggleChange"
        />
        <Search
          v-else-if="filtersStore.isActive('search')"
          :value="filtersStore.search"
          :add-stroke="true"
          :types="['geoportal']"
        />
      </template>
      <template #sidebar>
        <UiSidebarFeatures :features="selectedFeatures" type="hunting" @close="selectFeatures" />
      </template>
    </UiMap>

    <FeaturesPopupHover :check-stats="true" @click="selectFeatures">
      <template #title="{ feature }">
        {{ feature?.get('name') }}
      </template>
      <template #content="{ data }">
        <div class="text-xs">{{ countTranslation }}: {{ data.count }}</div>
      </template>
    </FeaturesPopupHover>
  </div>
</template>
<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import {
  municipalitiesServiceVT,
  projection3857,
  huntingPublicService,
  stvkService,
  parcelsServiceVT,
  vectorPositron,
  vectorBright,
} from '@/utils';
import { useStatsStore } from '@/stores/stats';
import { useFiltersStore } from '@/stores/filters';

const statsStore = useStatsStore();
const filtersStore = useFiltersStore();
const mapLayers: any = inject('mapLayers');
const eventBus: any = inject('eventBus');

const selectedFeatures = ref([] as any);

function selectFeatures(feature: any) {
  if (!feature?.count) {
    selectedFeatures.value = [];
  } else {
    selectedFeatures.value = [feature];
  }

  eventBus.emit('uiSidebar', { open: !!selectedFeatures.value.length });
}

const allLayers = [
  {
    key: 'medziokle.limits',
    title: 'Limitai',
    countTranslate: 'Suteikta limitų',
  },
  {
    key: 'medziokle.loots',
    title: 'Laimikiai',
    countTranslate: 'Viso laimikių',
  },
];
const visibleLayer = ref(allLayers[0].key);

const countTranslation = computed(() => {
  return allLayers.find((l) => l.key === visibleLayer.value)?.countTranslate;
});

watch(visibleLayer, () => {
  municipalitiesServiceVT.layer?.getSource()?.changed();
});

municipalitiesServiceVT.layer.getSource()?.on('tileloadend', ({ tile }: any) => {
  tile?.getFeatures()?.forEach((feature: any) => {
    feature.set('statsFn', () => statsStore.getStatsById(visibleLayer.value, feature.getId()));
  });
});
await statsStore.preloadStats(allLayers.map((l) => l.key));

function onSearch(search: string) {
  filtersStore.search = search;

  if (!search) {
    mapLayers.cleanHighlighs();
  }
}

function onToggleChange() {
  if (!mapLayers.isVisible(huntingPublicService.id)) {
    municipalitiesServiceVT.layer.setVisible(false);
  } else if (mapLayers.isVisible(huntingPublicService.id) && !!visibleLayer.value) {
    municipalitiesServiceVT.layer.setVisible(true);
  }
}

const toggleLayers = [huntingPublicService, parcelsServiceVT, stvkService];

const setVisible = (layer: any, value: boolean) => {
  if (visibleLayer.value === layer.value && !value) {
    municipalitiesServiceVT.layer.setVisible(false);
    visibleLayer.value = '';
  } else if (value) {
    visibleLayer.value = layer.value;
    municipalitiesServiceVT.layer.setVisible(true);
  }
  return true;
};

const isVisible = (layer: any) => visibleLayer.value === layer.value;

allLayers
  .map(
    (layer) =>
      ({
        value: layer.key,
        name: layer.title,
        virtual: true,
        isVisible,
        setVisible,
      }) as any,
  )
  .forEach((layer) => huntingPublicService.sublayers.unshift(layer));

mapLayers
  .addBaseLayer(vectorPositron.id)
  .addBaseLayer(vectorBright.id)
  .add(municipalitiesServiceVT.id)
  .add(stvkService.id, { isHidden: true })
  .add(parcelsServiceVT.id, { isHidden: true })
  .add(huntingPublicService.id)
  .click(async ({ coordinate }: any) => {
    selectedFeatures.value = [];
    mapLayers.getFeatureInfo(
      huntingPublicService.id,
      coordinate,
      ({ properties }: any) => {
        selectedFeatures.value.push(...properties);
        eventBus.emit('uiSidebar', { open: !!selectedFeatures.value.length });
      },
    );
  });
</script>
