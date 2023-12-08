<template>
  <div class="flex flex-col gap-1">
    <div v-for="(data, index) in items" :key="index">
      <UiMapLegendItem :title="data.title" :icon="data.icon" :children="data.children" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  items: {
    type: Array<any>,
    default: [],
  },
});
</script>
