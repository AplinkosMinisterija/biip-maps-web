<template>
  <popper>
    <slot name="action" />
    <template #content="{ close, isOpen }">
      <div
        class="bg-white px-4 py-2 rounded shadow-md min-w-max max-w-xl overflow-y-auto max-h-96"
      >
        <slot :close="close" :is-open="isOpen" />
      </div>
    </template>
  </popper>
</template>

<script setup lang="ts">
defineProps({
  title: { type: String, default: "" },
  size: { type: String, default: "default" },
  position: {
    type: String,
    default: "top-left",
  },
});
</script>
