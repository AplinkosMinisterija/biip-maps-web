<template>
  <popper :show="show" @update:show="$emit('update:show', $event)">
    <slot name="action" />
    <template #content="{ close, isOpen }">
      <div class="bg-white px-4 py-2 rounded shadow-md min-w-max max-w-xl overflow-y-auto max-h-98">
        <slot :close="close" :is-open="isOpen" />
      </div>
    </template>
  </popper>
</template>

<script setup lang="ts">
const props = defineProps({
  title: { type: String, default: '' },
  size: { type: String, default: 'default' },
  position: { type: String, default: 'top-left' },
  show: { type: Boolean, default: undefined },
});
const emit = defineEmits(['update:show']);
</script>
