<template>
  <popper>
    <slot name="action" />
    <template #content>
      <div
        class="bg-white px-4 py-2 rounded shadow-md min-w-max max-w-xl overflow-y-auto max-h-96"
      >
        <slot />
      </div>
    </template>
  </popper>
</template>

<script setup lang="ts">
import { ref } from "vue";

defineProps({
  title: { type: String, default: "" },
  size: { type: String, default: "" },
  position: {
    type: String,
    default: "top-left",
  },
});
const isOpen = ref(false);
const open = () => {
  isOpen.value = true;
};

const close = () => {
  isOpen.value = false;
};

const toggle = () => {
  isOpen.value = !isOpen.value;
};

defineExpose({ close, open, toggle });
</script>
