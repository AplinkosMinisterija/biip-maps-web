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
        :parent="layer"
        :is-visible="isVisible"
        :set-visible="setVisible"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

const props = defineProps({
  layer: {
    type: Object,
    required: true,
  },
  isVisible: {
    type: Function,
    required: true,
  },
  setVisible: {
    type: Function,
    required: true,
  },
  parent: {
    type: Object,
    default: () => ({}),
  },
});

const layer = computed(() => props.layer);
const parent = computed(() => props.parent);

function getVisibility() {
  if (!parent.value || layer.value.layer) return props.isVisible(layer.value);
  return props.isVisible(parent.value, layer.value.value);
}

function toggleVisibility() {
  const value = !layerIsVisible.value;
  if (!parent.value || layer.value.layer) {
    props.setVisible(layer.value, value);
  } else {
    props.setVisible(parent.value, value, layer.value.value);
  }

  layerIsVisible.value = getVisibility();
}

const layerIsVisible = ref(getVisibility());
</script>
