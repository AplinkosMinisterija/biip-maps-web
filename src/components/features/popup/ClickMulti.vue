<template>
  <UiPopupContent
    ref="overlayLayer"
    :show-arrow="true"
    :show-close="true"
    @close="togglePopup()"
  >
    <template v-if="$slots.title" #title>
      <slot
        name="title"
        :current="selectedFeature"
        :all="featuresData"
        :index="featureIndex"
      >
      </slot>
    </template>

    <template v-if="$slots.content">
      <slot
        name="content"
        :current="selectedFeature"
        :all="featuresData"
        :index="featureIndex"
      ></slot>
    </template>

    <div
      v-if="featuresData.length > 1"
      class="flex items-center gap-2 text-gray-500 justify-end"
    >
      <div class="flex items-center">
        <UiIcon
          v-if="featureIndex > 0"
          name="chevron-left"
          class="cursor-pointer m-1"
          @click="featureIndex -= 1"
        />
        <span class="text-xxs">{{ featureIndex + 1 }} iš {{ featuresData.length }}</span>

        <UiIcon
          v-if="featureIndex < featuresData.length - 1"
          name="chevron-right"
          class="cursor-pointer m-1"
          @click="featureIndex += 1"
        />
      </div>
    </div>
  </UiPopupContent>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch } from "vue";
const eventBus: any = inject("eventBus");

const mapLayers: any = inject("mapLayers");
const props = defineProps({
  layers: {
    type: Array<string>,
    default: () => []
  },
});

const overlayLayer = ref();
const featureIndex = ref(1);
const featuresData = ref([] as any[]);
const pendingOpen = ref<{ features: any[]; coordinate: any } | undefined>();

const selectedFeature = computed(() => {
  return featuresData.value[featureIndex.value];
});

watch(overlayLayer, (value) => {
  mapLayers.setOverlayElement(value.el);
  mapLayers.overlayLayer.setOffset([-18, 20]);

  if (pendingOpen.value) {
    const open = pendingOpen.value;
    pendingOpen.value = undefined;
    openPopup(open);
  }
});

const togglePopup = (position?: any) => {
  mapLayers.overlayLayer.setPosition(position);
};

// The overlay element registers once the map is ready, which can be later than
// the request to open it.
const openPopup = ({ features, coordinate }: { features: any[]; coordinate: any }) => {
  if (!coordinate || !features?.length) return;

  if (!mapLayers.overlayLayer) {
    pendingOpen.value = { features, coordinate };
    return;
  }

  featureIndex.value = 0;
  featuresData.value = features;
  togglePopup(coordinate);
};


eventBus.on('multiFeaturesPopupClose', () => {
  togglePopup();
});

eventBus.on('multiFeaturesPopupOpen', (data: any) => openPopup(data));

mapLayers.pointerCursor(props.layers);

mapLayers.click(
  ({ features }: any) => {
    if (!mapLayers.overlayLayer) return;

    if (!features?.length) return togglePopup();

    featureIndex.value = 0;
    const center = mapLayers.getCenter(features[0]);
    if (!center) return togglePopup();

    featuresData.value = features?.map((f: any) => ({...f.getProperties(), id: f.getId()}));
    togglePopup(center);
  },
  { layers: props.layers }
);
</script>
