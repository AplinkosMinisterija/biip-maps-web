<template>
  <div class="w-full">
    <div v-if="label">
      <span class="text-xs text-gray-400 font-semibold">{{ label }}</span>
    </div>
    <div class="relative h-full">
      <input
        v-model="value"
        class="w-full focus:outline-none px-2 py-1 text-sm focus:border-origin-500 rounded h-full"
        :class="{ 'pl-8': icon, 'border border-gray-200': !hideBorder }"
        :placeholder="placeholder"
        @focus="emit('focus')"
        @blur="emit('blur')"
      />
      <div @click="emit('clickIcon')">
        <UiIcon v-if="icon" :name="icon" class="absolute top-1/2 left-2 -translate-y-1/2" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  label: { type: String, default: '' },
  icon: { type: String, default: '' },
  hideBorder: { type: Boolean },
});

const emit = defineEmits(['update:modelValue', 'change', 'focus', 'blur', 'clickIcon']);
const value = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value);
    emit('change', value);
  },
});
</script>
