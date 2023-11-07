<template>
  <label
    class="flex my-1"
    :class="[
      types[type || 'default'],
      sizes[size || 'default'],
      alignColumn ? 'flex-col' : 'items-center',
    ]"
  >
    <slot />
  </label>
</template>

<script setup lang="ts">
defineProps({
  type: { type: String, default: "default" },
  size: { type: String, default: "default" },
  alignColumn: Boolean,
});

const types: any = {
  default: "",
  light: "text-gray-600",
};
const sizes: any = {
  default: "",
  sm: "text-sm gap-2",
  xs: "text-xs gap-1",
  xxs: "text-xxs",
};
</script>
