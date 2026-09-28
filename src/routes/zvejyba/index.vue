<template>
  <div>
    <UiMap :show-scale-line="true" :projection="projection3857">
      <template #filters>
        <UiButtonIcon icon="filter" @click="filtersStore.toggle('filters')" />
      </template>
      <template v-if="filtersStore.active" #filtersContent>
        <ZvejybaFilters
          v-if="filtersStore.isActive('filters')"
          :no-data="noData"
          @change="onFiltersChange"
        />
      </template>
      <template #sidebar>
        <UiSidebarFeatures
          :features="selectedFeatures"
          :is-open="!!selectedFeatures?.length"
          :title="selectedFeatures?.[0]?.munipality?.name"
          type="zvejyba"
          @close="selectFeatures"
        />
      </template>
    </UiMap>

    <FeaturesPopupHover :check-stats="true" @click="selectFeatures">
      <template #title="{ feature }">
        {{ feature?.get('name') }} ({{ feature?.get('municipality') }})
      </template>
      <template #content="{ data }">
        <div class="text-xs">Bendras svoris: {{ data.count || 0 }} kg</div>
      </template>
    </FeaturesPopupHover>
  </div>
</template>
<script setup lang="ts">
import { inject, ref } from 'vue';
import { projection3857, uetkMergedCentroidServiceVT, vectorPositron, vectorBright } from '@/utils';
import { useStatsStore } from '@/stores/stats';
import { useFiltersStore } from '@/stores/filters';

const statsStore = useStatsStore();
const filtersStore = useFiltersStore();

const mapLayers: any = inject('mapLayers');

const selectedFeatures = ref([] as any);
const noData = ref(false);

function selectFeatures(feature: any) {
  if (!feature?.count) {
    selectedFeatures.value = [];
  } else {
    selectedFeatures.value = [feature];
  }
}

const statsKey = 'zvejyba.uetk';
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
  // With a fish filter the API keeps water bodies whose count is 0, so an empty
  // array is not the only "nothing to show" shape.
  noData.value = !statsStore.getStats(statsKey)?.some((stat: { count: number }) => stat.count > 0);
  refreshSelectedFeature();
  uetkMergedCentroidServiceVT.layer?.getSource()?.changed();
}

// The open card holds a copy of the stats taken on click; rebuild it from the
// store so it follows the filters instead of keeping stale numbers.
function refreshSelectedFeature() {
  const selected = selectedFeatures.value[0];
  if (!selected?.uetk?.id) return;

  const { count, properties } = statsStore.getStatsById(statsKey, selected.uetk.id);
  selectFeatures(count ? { ...properties, uetk: selected.uetk } : null);
}
</script>
