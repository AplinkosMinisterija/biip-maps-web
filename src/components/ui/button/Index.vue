<template>
  <button
    class="outline-none font-semibold flex items-center justify-between transition"
    :class="[
      disabled ? 'opacity-50 cursor-not-allowed' : 'opacity-100 cursor-pointer',
      sizes[size],
      types[type],
      iconRight ? 'flex-row-reverse' : '',
      iconTop ? 'flex-col' : '',
      active ? typesActive[type] : typesNotActive[type],
      roundedProp,
    ]"
    :disabled="disabled"
    @click="onClick"
  >
    <UiIcon v-if="loading || icon" :name="loading ? 'spinner' : icon" :size="iconSizes[size]" />
    <slot />
  </button>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps({
  disabled: Boolean,
  loading: Boolean,
  link: { type: String, default: '' },
  size: { type: String, default: '' },
  type: { type: String, default: '' },
  active: Boolean,
  icon: { type: String, default: '' },
  isCsv: Boolean,
  iconRight: Boolean,
  iconTop: Boolean,
});

const loading = computed(() => props.loading);
const disabled = computed(() => props.loading || props.disabled);
const sizes: any = {
  icon: 'p-2',
  'icon-sm': 'p-1',
  xs: 'text-xxs gap-1',
  sm: 'px-3 py-1 text-xxs gap-1',
  md: 'px-4 py-2 text-xs gap-2',
  lg: 'px-5 py-3',
  xl: 'px-7 py-5',
};

const iconSizes: any = {
  icon: 18,
  'icon-sm': 16,
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
};

const types: any = {
  default: 'hover:bg-blue-100 focus:bg-blue-100 text-blue-800',
  danger: 'hover:bg-red-100 focus:bg-red-100 text-red-800',
  success: 'hover:bg-green-100 focus:bg-green-100 text-green-900',
  green: 'hover:bg-green-800 focus:bg-green-800',
  ghost: 'hover:text-gray-800',
  link: 'hover:text-gray-800 border-b',
  white: 'text-gray-800 hover:text-gray-900 border-transparent',
  icon: 'text-gray-800 hover:text-gray-900 border-transparent',
};

const typesNotActive: any = {
  ghost: 'text-gray-500',
  link: 'text-gray-500 border-transparent',
  green: 'bg-green-700 text-white',
  danger: 'bg-red-50',
  success: 'bg-green-50',
  default: 'bg-blue-50',
  white: 'bg-white hover:bg-gray-100',
};

const typesActive: any = {
  ghost: 'bg-gray-100',
  link: 'text-blue-700 border-b border-blue-700',
  green: '',
  danger: '',
  success: '',
  default: 'bg-blue-100',
  white: 'bg-gray-200 hover:bg-gray-200',
};

const size = props.size || 'md';
const type = props.type || 'default';

const roundedProp = computed(() => {
  if (props.type === 'link' || !size) return '';
  return 'rounded';
});

const emit = defineEmits(['click']);
const onClick = () => {
  emit('click');
};
</script>
