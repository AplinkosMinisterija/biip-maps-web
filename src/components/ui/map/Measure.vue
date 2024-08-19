<template>
  <UiPopup>
    <template #action>
      <UiButtonIcon icon="measure" />
    </template>
    <template #default="{ close }">
      <div class="text-xs max-w-[10rem]">
        <UiPopupContentItem
          v-for="t in types"
          :key="t.value"
          :icon="t.icon"
          :label="t.title"
          class="cursor-point"
          @click="
            mapLayers.toggleMeasuring(t.value, getOpts(t.value), false);
            close();
          "
        />
      </div>
    </template>
  </UiPopup>
</template>

<script lang="ts" setup>
import { inject } from "vue";

function getOpts(type: string) {
  if (type === "Polygon") {
    return {
      area: true,
      continuousDraw: false,
    };
  }

  return {
    length: true,
    segments: true,
    continuousDraw: false,
  };
}
const mapLayers: any = inject("mapLayers");
const types = [
  { value: "LineString", title: "Atstumas", icon: "line" },
  { value: "Polygon", title: "Plotas", icon: "polygon" },
];
</script>
