<template>
  <div class="flex flex-col gap-1">
    <UiLabel v-if="label" class="cursor-pointer" size="xs" :align-column="true">
      <div>{{ label }}</div>
      <input
        v-model="modelValue"
        type="range"
        :min="min || 0"
        :step="step || 1"
        :max="max || 10"
        class="w-full"
      />
    </UiLabel>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  value: { type: String, default: "" },
  label: { type: String, default: "" },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 10 },
  step: { type: Number, default: 1 },
});

const emit = defineEmits(["update:modelValue", "change"]);
const modelValue = computed({
  get: () => props.modelValue || props.value,
  set: (value) => {
    emit("update:modelValue", value);
    emit("change", value);
  },
});
</script>
