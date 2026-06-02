<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-center gap-2">
      <span class="inline-flex h-5 w-5 shrink-0 items-center justify-center">
        <img
          v-if="icon"
          :src="`data:image/png;base64,${icon}`"
          class="max-h-full max-w-full object-contain"
        />
      </span>
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
