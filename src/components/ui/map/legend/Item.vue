<template>
  <div>
    <div class="flex items-center gap-2">
      <img v-if="icon" :src="`data:image/png;base64,${icon}`" />
      <div v-if="title">{{ title }}</div>
    </div>
    <div v-if="children?.length" class="pl-4 mt-1">
      <UiMapLegendItems :items="children" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  icon: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  },
  children: {
    type: Array<any>,
    default: []
  }
});
</script>
