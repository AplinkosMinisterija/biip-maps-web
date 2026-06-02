<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-center gap-2">
      <img v-if="icon" :src="`data:image/png;base64,${icon}`" />
      <div v-if="title">{{ title }}{{ children?.length ? ':' : '' }}</div>
    </div>
    <div v-if="children?.length" class="pl-4">
      <UiMapLegendItems :items="children" :inline="false" />
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
