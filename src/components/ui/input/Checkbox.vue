<template>
  <UiLabel class="cursor-pointer" size="sm">
    <input v-model="modelValue" type="checkbox" :value="value" />
    <div>
      <slot />
    </div>
  </UiLabel>
</template>

<script lang="ts" setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: { type: Boolean },
  value: { type: Boolean },
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
