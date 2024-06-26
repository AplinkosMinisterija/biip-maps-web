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
        <ZuvinimasFilters
          v-if="filtersStore.isActive('filters')"
          @change.filters="onFiltersChange"
        />
        <Search
          v-else-if="filtersStore.isActive('search')"
          :value="filtersStore.search"
          :types="['uetk']"
          @select="filtersStore.hide()"
        />
      </template>
      <template #sidebar>
        <UiSidebarFeatures
          :features="selectedFeatures"
          :is-open="!!selectedFeatures?.length"
          :title="selectedFeatures?.[0]?.munipality?.name"
          type="zuvinimas"
          @close="selectFeatures"
        />
      </template>
    </UiMap>

    <FeaturesPopupHover :check-stats="true" @click="selectFeatures">
      <template #title="{ feature }">
        {{ feature?.get('name') }} ({{ feature?.get('municipality') }})
      </template>
      <template #content="{ data }">
        <div class="text-xs">Bendras kiekis: {{ data.count || 0 }} vnt.</div>
      </template>
    </FeaturesPopupHover>
  </div>
</template>
<script setup lang="ts">
import { inject, ref } from 'vue';
import {
  projection3857,
  uetkMergedCentroidServiceVT,
  vectorBright,
  vectorPositron,
} from '@/utils';
import { useStatsStore } from '@/stores/stats';
import { useFiltersStore } from '@/stores/filters';

const statsStore = useStatsStore();
const filtersStore = useFiltersStore();

const mapLayers: any = inject('mapLayers');

const selectedFeatures = ref([] as any);

function selectFeatures(feature: any) {
  if (!feature?.count) {
    selectedFeatures.value = [];
  } else {
    selectedFeatures.value = [feature];
  }
}

const statsKey = 'zuvinimas.uetk';
mapLayers
  .addBaseLayer(vectorBright.id)
  .addBaseLayer(vectorPositron.id)
  .add(uetkMergedCentroidServiceVT.id);

uetkMergedCentroidServiceVT.layer.getSource()?.on('tileloadend', ({ tile }: any) => {
  tile?.getFeatures()?.forEach((feature: any) => {
    feature.set('statsFn', () => ({
      ...statsStore.getStatsById(statsKey, feature.getId()),
      type: 'icon',
      icon: { name: 'pin-water', opts: { align: 'top' } },
      hideEmpty: true,
    }));
  });
});

await statsStore.preloadStats(statsKey);

async function onFiltersChange({ filters }: any) {
  await statsStore.setQuery(statsKey, filters);
  uetkMergedCentroidServiceVT.layer?.getSource()?.changed();
}
</script>
