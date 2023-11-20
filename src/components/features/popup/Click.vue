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
  </UiPopupContent>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch } from "vue";
const mapLayers: any = inject("mapLayers");

const rows = ref([
  {
    title: "saugomų rūšių radavietės",
    titleOne: "saugomų rūšių radavietė",
    key: "srisPlaces",
  },
  {
    title: "saugomų rūšių radavietės (pavieniai stebėjimai)",
    titleOne: "saugomų rūšių radavietė (pavienis stebėjimas)",
    key: "srisInformationalForms",
  },
  {
    title: "invazinių rūšių radavietės",
    titleOne: "invazinių rūšių radavietė",
    key: "invaPlaces",
  },
  {
    title: "svetimžemių rūšių radavietės",
    titleOne: "svetimžemių rūšių radavietė",
    key: "invaIntroducedPlaces",
  },
] as any[]);

const overlayLayer = ref();
const hoverFeatureData = ref({} as any);

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

mapLayers.click(({ pixel }: any) => {
  if (!mapLayers.overlayLayer) return;

  const features = mapLayers.map.getFeaturesAtPixel(pixel);
  if (!features?.length) return togglePopup();

  const feature = features[0];
  const center = mapLayers.getCenter(feature);
  hoverFeatureData.value = feature.get("stats") || {};

  if (!center || !hoverFeatureData.value?.count) return togglePopup();

  togglePopup(center);
});
</script>
