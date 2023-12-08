<template>
  <UiButton
    :icon="icon"
    type="white"
    :size="size"
    class="shadow-md flex items-center justify-center"
    @click="emit('click')"
  >
    <slot />
  </UiButton>
</template>

<script lang="ts" setup>
defineProps({
  icon: { type: String, default: '' },
  size: { type: String, default: 'icon' },
});
const emit = defineEmits(['click']);
</script>
