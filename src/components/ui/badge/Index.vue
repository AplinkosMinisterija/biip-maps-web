<template>
  <div
    class="rounded-full text-xxxs px-2 font-semibold"
    :class="[types[type || 'default']]"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps({
  type: {
    type: String,
    default: "default",
  },
});
const types: any = {
  default: "bg-blue-50 text-blue-800",
  ghost: "bg-gray-100 text-gray-800",
  danger: "bg-red-50 text-red-900",
  success: "bg-green-50 text-green-900",
};
</script>
