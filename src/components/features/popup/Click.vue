<template>
  <UiPopupContent
    ref="overlayLayer"
    :show-arrow="true"
    :show-close="true"
    :show-separator="filteredRows.length"
    :title="`${hoverFeatureData.count} identifikuoti objektai`"
    @close="togglePopup()"
  >
    <div v-if="filteredRows.length" class="text-xxs">
      <template v-for="r in filteredRows" :key="r.key">
        <div v-if="hoverFeatureData[r.key]" class="flex flex-row items-center gap-1">
          <span class="font-semibold">{{ hoverFeatureData[r.key] }}</span>
          <span>{{ hoverFeatureData[r.key] > 1 ? r.title : r.titleOne }}</span>
        </div>
      </template>
    </div>
    <div v-if="speciesLoading || species.length" class="text-xxs">
      <hr class="my-2" />
      <div class="font-semibold mb-1">
        {{ speciesLoading ? 'Rūšys' : `Rūšys (${species.length})` }}
      </div>
      <div v-if="speciesLoading" class="text-gray-500">Kraunamas rūšių sąrašas...</div>
      <ul v-else class="flex flex-col gap-0.5">
        <li v-for="item in species" :key="item.id">
          {{ item.name }}
          <span v-if="item.nameLatin" class="italic text-gray-500">{{ item.nameLatin }}</span>
        </li>
      </ul>
    </div>
  </UiPopupContent>
</template>

<script setup lang="ts">
import { rusysGridService } from '@/utils';
import { computed, inject, ref, watch } from 'vue';
const mapLayers: any = inject('mapLayers');

const rows = ref([
  {
    title: 'saugomų rūšių radavietės',
    titleOne: 'saugomų rūšių radavietė',
    key: 'srisPlaces',
  },
  {
    title: 'saugomų rūšių radavietės (pavieniai stebėjimai)',
    titleOne: 'saugomų rūšių radavietė (pavienis stebėjimas)',
    key: 'srisInformationalForms',
  },
  {
    title: 'invazinių rūšių radavietės',
    titleOne: 'invazinių rūšių radavietė',
    key: 'invaPlaces',
  },
  {
    title: 'svetimžemių rūšių radavietės',
    titleOne: 'svetimžemių rūšių radavietė',
    key: 'invaIntroducedPlaces',
  },
  {
    title: 'invazinių tyrinėta, bet nerasta vietos',
    titleOne: 'invazinių tyrinėta, bet nerasta vieta',
    key: 'invaNoQuantityForms',
  },
  {
    title: 'svetimžemių tyrinėta, bet nerasta vietos',
    titleOne: 'svetimžemių tyrinėta, bet nerasta vieta',
    key: 'invaIntroducedNoQuantityForms',
  },
] as any[]);

const overlayLayer = ref();
const hoverFeatureData = ref({} as any);
const species = ref([] as any[]);
const speciesLoading = ref(false);
let speciesRequest = 0;

const loadSpecies = async (featureId: number) => {
  const request = ++speciesRequest;
  species.value = [];
  speciesLoading.value = true;

  try {
    const data = await mapLayers.loadStatsSpecies(rusysGridService.id, featureId);
    if (request === speciesRequest) species.value = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(err);
  } finally {
    if (request === speciesRequest) speciesLoading.value = false;
  }
};

const filteredRows = computed(() => {
  const keys = Object.keys(hoverFeatureData.value);

  return rows.value.filter((r) => keys.includes(r.key));
});

watch(overlayLayer, (value) => {
  mapLayers.setOverlayElement(value.el);
  mapLayers.overlayLayer.setOffset([-18, 20]);
});

const togglePopup = (position?: any) => {
  mapLayers.overlayLayer.setPosition(position);
};

mapLayers.click(({ features }: any) => {
  if (!mapLayers.overlayLayer) return;

  if (!features?.length) return togglePopup();

  const feature = features[0];
  const center = mapLayers.getCenter(feature);
  hoverFeatureData.value = feature.get('stats') || {};

  if (!center || !hoverFeatureData.value?.count) return togglePopup();

  togglePopup(center);
  loadSpecies(feature.get('id'));
});
</script>
