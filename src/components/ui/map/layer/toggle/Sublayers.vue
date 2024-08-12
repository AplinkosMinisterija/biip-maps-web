<template>
  <div v-if="layers?.length">
    <UiMapLayerToggleItem
      v-for="layer in layers.slice().reverse() as any[]"
      :key="layer.value"
      class="pl-2"
      :layer="layer"
    />
  </div>
</template>

<script setup lang="ts">
defineProps({
  layers: {
    type: Array,
    required: true,
  },
});
</script>
