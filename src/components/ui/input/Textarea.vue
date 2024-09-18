<template>
  <div class="w-full">
    <div v-if="label">
      <span class="text-xs text-gray-400 font-semibold">{{ label }}</span>
    </div>
    <textarea
      v-model="value"
      class="w-full focus:outline-none px-2 py-1 text-sm rounded resize-y"
      :class="{ 'border border-gray-200': !hideBorder }"
      :placeholder="placeholder"
      :rows="rows"
      @focus="emit('focus')"
      @blur="emit('blur')"
    ></textarea>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "" },
  label: { type: String, default: "" },
  hideBorder: { type: Boolean },
  rows: { type: Number, default: 5 },
});

const emit = defineEmits(["update:modelValue", "change", "focus", "blur"]);
const value = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit("update:modelValue", value);
    emit("change", value);
  },
});
</script>
