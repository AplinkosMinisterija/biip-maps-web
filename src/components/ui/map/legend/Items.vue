<template>
  <div :class="inline ? 'flex flex-row flex-wrap gap-x-4 gap-y-1 items-center' : 'flex flex-col gap-1'">
    <div v-for="(data, index) in items" :key="index">
      <UiMapLegendItem
        :title="data.title"
        :icon="data.icon"
        :children="data.children"
        :inline="inline"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  items: {
    type: Array<any>,
    default: [],
  },
  inline: {
    type: Boolean,
    default: false,
  },
});
</script>
