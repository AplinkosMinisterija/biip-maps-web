<template>
  <div class="flex flex-col gap-1">
    <UiLabel v-if="label" class="cursor-pointer" size="xs" :align-column="true">
      <div>{{ label }}</div>
      <input
        v-model="internalValue"
        type="range"
        :min="min || 0"
        :step="1"
        :max="max || 10"
        @input="handleInput"
        class="w-full"
      />
    </UiLabel>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  value: { type: Number, default: 0 },
  label: { type: String, default: '' },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 10 },
  step: { type: Number, default: 1 },
});

const emit = defineEmits(['update:modelValue', 'change']);

const internalValue = ref(props.modelValue);

watch(
  () => props.modelValue,
  (newValue) => {
    internalValue.value = adjustToStep(newValue, props.step, props.min, props.max);
  },
);

function adjustToStep(value: number, step: number, min: number, max: number) {
  if (value !== max) {
    const val = Math.floor(value / step) * step;
    if (val < min) return min;
    return val || min;
  }
  return value;
}

function handleInput(event: any) {
  let value = Number(event.target.value);
  value = adjustToStep(value, props.step, props.min, props.max);
  if (props.value !== value) {
    emit('update:modelValue', value);
    emit('change', value);
  }
  internalValue.value = value;
}

internalValue.value = adjustToStep(props.modelValue, props.step, props.min, props.max);
</script>
