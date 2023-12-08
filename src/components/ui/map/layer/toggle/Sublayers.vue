<template>
  <div v-if="layers?.length">
    <UiMapLayerToggleItem
      v-for="layer in layers.slice().reverse() as any[]"
      :key="layer.value"
      class="pl-2"
      :layer="layer"
      :is-visible="isVisible"
      :set-visible="setVisible"
      :parent="parent"
    />
  </div>
</template>

<script setup lang="ts">
defineProps({
  layers: {
    type: Array,
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
</script>
