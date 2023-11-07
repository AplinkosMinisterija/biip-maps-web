<template>
  <UiLabel class="relative cursor-pointer inline-flex items-center">
    <input v-model="modelValue" type="checkbox" class="sr-only peer" />
    <div
      class="rounded-full peer-checked:justify-end flex items-center px-0.5 transition-all flex-shrink-0"
      :class="[sizes[size], modelValue ? 'bg-blue-100' : 'bg-gray-200']"
    >
      <div
        class="rounded-full"
        :class="[iconSize[size], modelValue ? 'bg-blue-700' : 'bg-gray-400']"
      ></div>
    </div>

    <slot />
  </UiLabel>
  <!-- <label class="relative inline-flex items-center cursor-pointer"> </label> -->
</template>

<script lang="ts" setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: { type: Boolean },
  value: { type: Boolean },
  size: {
    type: String,
    default: "default",
  },
});

const emit = defineEmits(["update:modelValue", "change"]);
const modelValue = computed({
  get: () => props.modelValue || props.value,
  set: (value) => {
    emit("update:modelValue", value);
    emit("change", value);
  },
});

const sizes: any = {
  default: "w-11 h-6",
  sm: "w-8 h-4",
};
const iconSize: any = {
  default: "h-5 w-5",
  sm: "h-3 w-3",
};
</script>
