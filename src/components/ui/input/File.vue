<template>
  <div class="w-full">
    <div v-if="label">
      <span class="text-xs text-gray-400 font-semibold">{{ label }}</span>
    </div>
    <input
      class="w-full focus:outline-none px-2 py-1 text-sm rounded resize-y"
      :class="{ 'border border-gray-200': !hideBorder }"
      type="file"
      :placeholder="placeholder"
      :accept="accept"
      @change="upload"
    />
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
  accept: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue", "change", "focus", "blur", "upload"]);
const value = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit("update:modelValue", value);
    emit("change", value);
  },
});

function upload(event: any) {
  const files = event?.target?.files;
  if (!files.length) return;
  emit("upload", files);
}
</script>
