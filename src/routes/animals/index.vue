<template>
  <div>
    <UiMap :show-scale-line="true" :projection="projection3857">
      <template #filters>
        <UiDropdown
          v-model="visibleLayer"
          class="px-1 rounded border border-gray-400 bg-white pointer-events-auto"
        >
          <UiDropdownItem v-for="l in allLayers" :key="l.key" :value="`${l.key}`">
            {{ l.title }}
          </UiDropdownItem>
        </UiDropdown>
      </template>
      <template #sidebar>
        <UiSidebarFeatures
          :features="selectedFeatures"
          :is-open="!!selectedFeatures?.length"
          :title="selectedFeatures?.[0]?.munipality?.name"
          type="animals"
          @close="selectFeatures"
        />
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
  vectorGRPKBright,
  vectorGRPKPositron,
} from '@/utils';
import { useStatsStore } from '@/stores/stats';

const statsStore = useStatsStore();

const mapLayers: any = inject('mapLayers');

const selectedFeatures = ref([] as any);

function selectFeatures(feature: any) {
  if (!feature?.count) {
    selectedFeatures.value = [];
  } else {
    selectedFeatures.value = [feature];
  }
}

const allLayers = [
  {
    key: 'animals.permits',
    title: 'Leidimai',
    countTranslate: 'Viso išduota leidimų',
  },
  {
    key: 'animals.species',
    title: 'NLLG individų skaičius',
    countTranslate: 'Viso laikomų laukinių gyvūnų',
  },
  {
    key: 'animals.fostered',
    title: 'Globojami gyvūnai',
    countTranslate: 'Viso globojamų laukinių gyvūnų',
  },
  {
    key: 'animals.aviaries',
    title: 'Aptvarai miško žemėje',
    countTranslate: 'Viso aptvarų',
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

mapLayers
  .addBaseLayer(vectorGRPKPositron.id)
  .addBaseLayer(vectorGRPKBright.id)
  .add(municipalitiesServiceVT.id);
</script>
