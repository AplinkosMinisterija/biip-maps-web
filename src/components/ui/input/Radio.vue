<template>
  <UiLabel class="cursor-pointer" size="sm">
    <input v-model="modelValue" type="radio" :value="value" />
    <div>
      <slot />
    </div>
  </UiLabel>
</template>

<script lang="ts" setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: { type: String, default: "" },
  value: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue"]);
const modelValue = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
</script>
