<template>
  <div v-if="!layer.isHidden" class="my-1">
    <div
      class="flex gap-2 items-center text-sm transition justify-between hover:bg-gray-50 cursor-default"
    >
      <div class="flex gap-2 items-center">
        <UiIcon
          :name="layer?.sublayers?.length ? 'folder' : 'layers'"
          class="text-gray-400 flex-shrink-0"
        />
        <div class="text-xs text-gray-800">{{ layer?.title || layer.name }}</div>
      </div>
      <div class="flex gap-2 items-center">
        <UiMapLayerToggleOptions :layer="layer" />
        <UiInputToggle
          class="flex-shrink-0"
          size="sm"
          :value="layerIsVisible"
          @change="toggleVisibility"
        ></UiInputToggle>
      </div>
    </div>

    <div class="ml-2">
      <UiMapLayerToggleSublayers
        v-if="layer?.sublayers?.length && layerIsVisible"
        :layers="layer?.sublayers"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useLayersToggle } from "@/composables/useLayersToggle";
const layersToggle = useLayersToggle();

const props = defineProps({
  layer: {
    type: Object,
    required: true,
  },
});

const doTargetParent = computed(() => !!props.layer?.parent && !props.layer?.layer);
const targetLayer = computed(() =>
  doTargetParent.value ? props.layer?.parent : props.layer
);
const targetSublayer = computed(() => (doTargetParent.value ? props.layer?.value : ""));

function getVisibility() {
  return layersToggle.isVisible(targetLayer.value, targetSublayer.value);
}

function toggleVisibility() {
  layersToggle.toggleVisibility(targetLayer.value, targetSublayer.value);
  layerIsVisible.value = getVisibility();
}

const layerIsVisible = ref(getVisibility());
</script>
