<template>
  <div
    class="hover:bg-gray-100 p-2 -mx-3 cursor-pointer border-b last:border-b-0 border-gray-100 truncate"
  >
    <div class="flex flex-row items-center gap-2">
      <span class="text-sm">{{ name }}</span>
      <span
        class="text-xxs text-gray-500 whitespace-nowrap truncate"
        v-html="description"
      />
    </div>
    <div v-if="$slots.default" class="text-xxs text-gray-700 whitespace-nowrap truncate">
      <slot />
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps({
  name: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
});
</script>
