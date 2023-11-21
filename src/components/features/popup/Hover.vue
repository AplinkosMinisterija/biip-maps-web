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

const emit = defineEmits(["click"]);

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

function getFromFeatures(features: any[]) {
  if (!mapLayers.overlayLayer) return {};

  if (!features?.length || !features[0]) return {};
  const feature = features[0];
  const statsFn = feature.get("statsFn") || {};

  return {
    feature,
    stats: statsFn ? statsFn() : {},
  };
}

mapLayers.hover(({ features }: any) => {
  const { feature, stats } = getFromFeatures(features);

  if (!feature) return togglePopup();

  if (visibleFeature.value == feature) return;

  visibleFeature.value = feature;
  hoverFeatureData.value = stats || {};
  if (!stats?.count) return togglePopup();

  const center = mapLayers.getCenter(feature);
  if (!center) return togglePopup();

  togglePopup(center);
});

mapLayers.click(({ features }: any) => {
  const { stats } = getFromFeatures(features);

  emit("click", stats?.properties || {});
});
</script>
