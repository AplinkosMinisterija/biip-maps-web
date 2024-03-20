<template>
  <div
    ref="el"
    class="bg-white px-4 py-2 rounded shadow-md w-full overflow-y-auto max-h-96 max-w-xs lg:max-w-sm"
    :class="[(position && positions[position]) || '', showArrow ? 'display-arrow' : '']"
  >
    <div class="w-full">
      <div
        v-if="title || $slots.title || showClose"
        class="flex gap-3"
        :class="[title || $slots.title ? 'justify-between' : 'justify-end']"
      >
        <div v-if="title || $slots.title" class="text-sm font-semibold">
          <template v-if="title">{{ title }}</template>
          <template v-else-if="$slots.title"><slot name="title" /></template>
        </div>
        <UiIcon
          v-if="showClose"
          name="close"
          class="text-gray-600 cursor-pointer"
          @click="emit('close')"
        />
      </div>
      <hr v-if="title && $slots.default && showSeparator" class="my-2" />
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const el = ref();
defineProps({
  title: { type: String, default: '' },
  size: { type: String, default: '' },
  position: { type: String, default: '' },
  showArrow: {
    type: Boolean,
    default: false,
  },
  showClose: {
    type: Boolean,
    default: false,
  },
  showSeparator: {
    type: Boolean,
    default: true,
  },
});
const emit = defineEmits(['close']);

const positions = ref({
  'top-left': 'top-full left-0 mt-2',
  'top-right': 'top-full right-0 mt-2',
} as any);

const getElement = () => {};
defineExpose({ el, getElement });
</script>

<style>
.display-arrow:before {
  @apply rotate-180 border-transparent border-solid h-0 w-0 absolute -top-6 pointer-events-none border-t-[1rem] border-[0.75rem] left-1.5 border-t-white;
  content: ' ';
}
</style>
