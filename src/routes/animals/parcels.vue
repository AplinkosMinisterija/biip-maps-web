<template>
  <div>
    <UiMap :show-scale-line="true" :projection="projection3857">
      <template #sidebar>
        <UiSidebarFeatures
          :features="selectedFeatures"
          :is-open="!!selectedFeatures?.length"
          type="animals_parcels"
          @close="selectedFeatures = []"
        />
      </template>
    </UiMap>
    <ZoomInfo :max-zoom="14" />
  </div>
</template>
<script setup lang="ts">
import { inject, ref } from 'vue';

import {
  parcelsServiceVT,
  projection3857,
  vectorBright,
  vectorPositron,
  parseRouteParams,
} from '@/utils';
import { useStatsStore } from '@/stores/stats';
import { municipalitiesSearch, parcelsSearch, type Municipality } from '@/utils/boundaries';
import { useRoute } from 'vue-router';
const $route = useRoute();

const query = parseRouteParams($route.query, ['preview']);

const statsStore = useStatsStore();

const mapLayers: any = inject('mapLayers');

const selectedFeatures = ref([] as any);
const municipalities = ref([] as Municipality[]);

parcelsServiceVT.layer.getSource()?.on('tileloadend', ({ tile }: any) => {
  tile?.getFeatures()?.forEach((feature: any) => {
    const data = statsStore.getStatsById('animals.parcels', feature.get('cadastral_number'));

    if (feature.get('layer') === 'parcels_label') {
      feature.set('isHidden', true);
    } else {
      const showFeature = Object.keys(data.properties).length > 0;
      feature.set('isHidden', !showFeature);
    }
  });
});
await statsStore.preloadStats('animals.parcels');

await municipalitiesSearch({ requestBody: {}, size: 100 }).then((res) => {
  municipalities.value = res.items;
});

mapLayers
  .addBaseLayer(vectorPositron.id)
  .addBaseLayer(vectorBright.id)
  .add(parcelsServiceVT.id)
  .click(
    ({ features }: any) => {
      selectedFeatures.value = [];
      const ids = features?.filter((f: any) => !f.get('isHidden')).map((f: any) => f.getId());

      if (!ids?.length) return;

      parcelsSearch({ requestBody: { filters: [{ parcels: { unique_numbers: ids } }] } }).then(
        (res) => {
          selectedFeatures.value = res.items.map((item) => {
            const stats = statsStore.getStatsById('animals.parcels', item.cadastral_number);
            const permits = (stats?.properties?.permits || []).map((permit: any) => {
              return {
                ...permit,
                linkData: query.preview ? { id: permit.id } : '',
              };
            });
            return { ...item, permits };
          });
        },
      );
    },
    { layers: [parcelsServiceVT.id] },
  );
</script>
