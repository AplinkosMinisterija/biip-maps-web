<template>
  <div
    class="w-full px-3 py-2 border-l-4 rounded bg-white flex gap-3 shadow-lg"
    :class="[styles[props.type]?.box]"
  >
    <UiIcon
      :name="icons[props.type]"
      class="mt-1 flex-shrink-0"
      :class="[styles[props.type]?.color]"
    ></UiIcon>
    <div class="w-full flex flex-col gap-1">
      <div class="text-xs font-semibold">{{ title }}</div>
      <p v-if="description" class="text-xxs">{{ description }}</p>
    </div>
    <UiButton size="icon-sm" type="ghost" icon="close" class="self-start" @click="$emit('close')" />
  </div>
</template>
<script setup lang="ts">
const props = defineProps({
  type: {
    type: String,
    default: 'default',
  },
  title: {
    type: String,
    default: '',
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
});

defineEmits(['close']);
const styles: any = {
  success: {
    box: 'border-green-600',
    color: 'text-green-600',
  },
  warning: {
    box: 'border-yellow-500',
    color: 'text-yellow-500',
  },
  danger: {
    box: 'border-red-500',
    color: 'text-red-500',
  },
  default: {
    box: 'border-gray-400',
    color: 'text-gray-400',
  },
};

const icons: any = {
  success: 'check-circle',
  warning: 'warning',
  danger: 'error-circle',
  default: 'warning-circle',
};
</script>
