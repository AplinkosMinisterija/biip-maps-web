<template>
  <div>
    <div @click="open">
      <slot name="action" />
    </div>
    <div
      v-if="isOpen"
      class="fixed w-screen h-screen top-0 left-0 z-50 flex items-center justify-center p-2 sm:py-12 sm:px-8"
    >
      <div
        class="fixed top-0 left-0 h-screen w-screen flex lg:items-center items-end justify-center z-50 bg-black bg-opacity-50"
        @click="close"
      />

      <div
        class="bg-white relative z-50 border border-gray-100 max-h-full flex flex-col"
        :class="[sizing[size || 'default']]"
      >
        <div class="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h3 class="font-semibold">{{ title }}</h3>
          </div>

          <UiButton icon="close" type="ghost" @click="close" />
        </div>
        <div v-if="$slots.default" class="w-full h-full p-6 overflow-y-auto">
          <slot />
        </div>
        <div class="p-6 flex items-center justify-end border-t border-gray-100 pt-6">
          <UiButtonRow>
            <UiButton v-if="showCloseBtn" type="ghost" @click="close"> Close </UiButton>
            <slot name="footer" />
          </UiButtonRow>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

defineProps({
  title: { type: String, default: "" },
  size: { type: String, default: "" },
  showCloseBtn: { type: Boolean, default: true },
});
const isOpen = ref(false);
const open = () => {
  isOpen.value = true;
};

const close = () => {
  isOpen.value = false;
};

defineExpose({ close, open });

const sizing: any = {
  default: "max-w-3xl rounded",
  sm: "w-full md:max-w-2xl w-full rounded",
  xs: "w-full max-w-md w-full rounded",
};
</script>
