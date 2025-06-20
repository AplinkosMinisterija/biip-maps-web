<template>
  <div class="w-full text-gray-600 hover:text-gray-900 group cursor-pointer">
    <div class="-mx-2 px-2 hover:bg-gray-50 py-2">
      <div class="flex items-center gap-2">
        <UiIcon
          v-if="icon"
          :name="icon"
          :size="12"
          class="text-gray-400 group-hover:text-gray-500"
        />
        <span>{{ label }}</span>
      </div>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  icon: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: '',
    required: true,
  },
});
</script>
