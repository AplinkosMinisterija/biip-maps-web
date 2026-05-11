<template>
  <div :class="inline ? 'flex flex-row flex-wrap gap-x-3 gap-y-1 items-center' : ''">
    <div class="flex items-center gap-2">
      <img v-if="icon" :src="`data:image/png;base64,${icon}`" />
      <div v-if="title">{{ title }}</div>
    </div>
    <div
      v-if="children?.length"
      :class="inline ? 'ml-1' : 'pl-4 mt-1'"
    >
      <UiMapLegendItems :items="children" :inline="inline" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  icon: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    default: '',
  },
  children: {
    type: Array<any>,
    default: [],
  },
  inline: {
    type: Boolean,
    default: false,
  },
});
</script>
