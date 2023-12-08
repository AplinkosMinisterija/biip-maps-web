<template>
  <div v-if="type === 'table'" class="flex flex-col space-y-2 items-center animate-pulse py-2 mt-2">
    <div class="h-4 bg-gray-100 rounded w-full" />
    <div class="h-4 bg-gray-100 rounded w-full" />
    <div class="h-4 bg-gray-100 rounded w-full" />
  </div>
  <div v-else-if="type === 'spinner'">
    <UiIcon name="spinner" :size="40" />
  </div>
  <div v-else class="flex flex-col space-y-2 items-center animate-pulse py-2 mt-2">
    <div class="h-4 bg-gray-100 rounded w-full" />
    <div class="h-4 bg-gray-100 rounded w-full" />
    <div class="h-4 bg-gray-100 rounded w-full" />
  </div>
</template>

<script lang="ts" setup>
defineProps({
  type: { type: String, default: '' },
});
</script>
