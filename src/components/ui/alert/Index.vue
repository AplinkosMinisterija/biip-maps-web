<template>
  <div
    class="w-full p-3 rounded flex items-center font-semibold text-sm"
    :class="[types[type || 'default']]"
    @click="$emit('click')"
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

defineEmits(["click"]);

const types: any = {
  default: "bg-blue-50 text-blue-800",
  ghost: "bg-gray-100 text-gray-800",
  danger: "bg-red-50 text-red-900",
  warning: "bg-yellow-100 text-yellow-900",
  success: "bg-green-50 text-green-900",
};
</script>
