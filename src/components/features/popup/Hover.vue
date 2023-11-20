<template>
  <UiPopupContent ref="overlayLayer" :show-arrow="true" :show-separator="false">
    <template #title>
      <slot name="title" :feature="visibleFeature">
        {{ hoverFeatureData.count }} identifikuoti objektai
      </slot>
    </template>
    <template v-if="$slots.content">
      <slot name="content" :feature="visibleFeature" :data="hoverFeatureData"></slot>
    </template>
  </UiPopupContent>
</template>

<script setup lang="ts">
import { inject, ref, watch } from "vue";
const mapLayers: any = inject("mapLayers");

const overlayLayer = ref();
const hoverFeatureData = ref({} as any);

watch(overlayLayer, (value) => {
  mapLayers.setOverlayElement(value.el);
  mapLayers.overlayLayer.setOffset([-18, 20]);
});

const togglePopup = (position?: any) => {
  mapLayers.overlayLayer.setPosition(position);
};

const visibleFeature = ref(null as any);

mapLayers.hover(({ pixel }: any) => {
  if (!mapLayers.overlayLayer) return;

  const features = mapLayers.map.getFeaturesAtPixel(pixel);
  if (!features?.length) return togglePopup();

  if (!features[0] || visibleFeature.value == features[0]) return;

  visibleFeature.value = features[0];
  hoverFeatureData.value = visibleFeature.value.get("stats") || {};

  const center = mapLayers.getCenter(visibleFeature.value);
  if (!hoverFeatureData.value?.count) return togglePopup();

  if (!center) return togglePopup();
  togglePopup(center);
});
</script>
