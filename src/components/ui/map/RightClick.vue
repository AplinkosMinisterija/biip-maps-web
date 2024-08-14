<template>
  <UiPopupContent ref="overlayLayer">
    <div class="text-xs">
      <UiPopupContentItem
        label="Kopijuoti koordinates (LKS)"
        icon="copy"
        @click="copyCoordinatesToClipboard(projection)"
      />
      <UiPopupContentItem
        label="Kopijuoti koordinates (WGS84)"
        icon="copy"
        @click="copyCoordinatesToClipboard(projection4326)"
      />
    </div>
  </UiPopupContent>
</template>

<script setup lang="ts">
import { inject, ref, watch } from "vue";
import { projection, convertFeatureCollectionProjection, projection4326 } from "@/utils";
import { useClipboard, onClickOutside } from "@vueuse/core";
import { getFeatureCollection } from "geojsonjs";

const mapLayers: any = inject("mapLayers");

const overlayLayer = ref();
const overlayLayerElement = ref();
const coordinates = ref([]);

const togglePopup = (position?: any) => {
  overlayLayerElement.value.setPosition(position);
};

watch(overlayLayer, (value) => {
  overlayLayerElement.value = mapLayers.appendOverlayElement(value.el);
});

mapLayers.click(
  ({ coordinate }: any) => {
    if (!coordinate) return togglePopup();

    togglePopup(coordinate);
    coordinates.value = coordinate;
  },
  { right: true }
);

onClickOutside(overlayLayer, () => {
  togglePopup();
});

const { copy } = useClipboard();

function copyCoordinatesToClipboard(projection: string) {
  const convertedGeojson = convertFeatureCollectionProjection(
    getFeatureCollection({
      type: "Point",
      coordinates: [...coordinates.value],
    }),
    mapLayers.getMapProjection(),
    projection
  );

  const convertedCoordinates = convertedGeojson?.features?.[0]?.geometry?.coordinates
    ?.reverse()
    ?.join(" ");

  copy(convertedCoordinates);
  togglePopup();
}
</script>
