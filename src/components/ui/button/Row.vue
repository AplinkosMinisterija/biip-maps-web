<template>
  <div
    class="flex gap-2 flex-wrap"
    :class="[gaps[gap || 'default']]"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps({
  gap: {type: String, default: 'default'},
});

const gaps: any = {
  default: "gap-2",
  lg: "gap-3",
};
</script>
