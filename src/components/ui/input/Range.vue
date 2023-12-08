<template>
  <UiLabel class="cursor-pointer" size="sm">
    <input
      v-model="modelValue"
      type="range"
      :min="Number(min || 0)"
      :max="Number(max || 10)"
      :step="Number(step || 1)"
      class="block mt-3 mb-1 appearance-none bg-blue-100 h-1 rounded-full cursor-pointer w-full outline-none"
    />
    <div>
      <slot />
    </div>
  </UiLabel>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  value: { type: Number, default: 0 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 10 },
  step: { type: Number, default: 1 },
});

const emit = defineEmits(['update:modelValue', 'change']);
const modelValue = computed({
  get: () => Number(props.modelValue || props.value || props.min),
  set: (value) => {
    value = Number(value);
    emit('update:modelValue', value);
    emit('change', value);
  },
});
</script>

<style>
input[type='range'],
input[type='range']:focus {
  -webkit-appearance: none;
}

input[type='range']::-webkit-slider-runnable-track,
input[type='range']::-moz-range-track {
  @apply bg-blue-100 h-1 rounded-full;
}

/* slider thumb */
input[type='range']::-webkit-slider-thumb,
input[type='range']:focus::-webkit-slider-thumb {
  @apply appearance-none -mt-0.5 bg-blue-800 h-3 w-3 rounded-full;
}
input[type='range']::-moz-range-thumb,
input[type='range']:focus::-moz-range-thumb {
  @apply appearance-none -mt-0.5 bg-blue-800 h-3 w-3 rounded-full;
}
</style>
