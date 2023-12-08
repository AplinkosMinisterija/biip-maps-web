<template>
  <div class="w-full">
    <div v-if="label" :class="[sizes[size || 'default']?.label]">
      <span class="text-gray-400 font-semibold">{{ label }}</span>
    </div>
    <select
      v-model="value"
      :class="[sizes[size || 'default']?.value]"
      class="p-1 bg-transparent outline-none text-gray-700 w-full max-w-full overflow-hidden"
    >
      <slot />
    </select>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  value: { type: String, default: '' },
  label: { type: String, default: '' },
  size: { type: String, default: 'default' },
});

const sizes: any = {
  default: { label: 'text-xs', value: 'text-sm' },
  xs: { label: 'text-xxs', value: 'text-xs' },
};

const emit = defineEmits(['update:modelValue', 'change']);
const value = computed({
  get: () => props.modelValue || props.value,
  set: (value) => {
    emit('update:modelValue', value);
    emit('change', value);
  },
});
</script>
