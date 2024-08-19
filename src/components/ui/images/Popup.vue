<template>
  <div>
    <div
      v-if="isOpen"
      class="fixed w-screen h-screen top-0 left-0 z-50 flex items-center justify-center p-2 sm:py-12 sm:px-8"
    >
      <div
        class="fixed top-0 left-0 h-screen w-screen flex lg:items-center items-end justify-center z-30 bg-black bg-opacity-70"
        @click="close"
      />
      <div class="relative z-40 p-2 md:p-8 xl:p-16 max-h-screen h-full max-w-full">
        <div class="h-full w-full flex items-center justify-center select-none">
          <UiIcon
            name="chevron-left"
            class="text-white cursor-pointer shrink-0"
            :size="40"
            @click="setIndex(-1)"
          />
          <div class="m-2 md:m-8 h-full flex items-center">
            <img :src="images[currentImageIndex]" class="max-h-full max-w-full" />
          </div>
          <UiIcon
            name="chevron-right"
            class="text-white cursor-pointer shrink-0"
            :size="40"
            @click="setIndex(1)"
          />
        </div>
      </div>
      <div class="absolute right-0 top-0 z-50 text-white m-6">
        <UiIcon name="close" :size="30" class="cursor-pointer" @click="close" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

const props = defineProps({
  images: { type: Array<any>, default: () => [] },
});

const isOpen = ref(false);
const open = (index?: number) => {
  if (typeof index === 'number' ) {
    currentImageIndex.value = Number(index);
  }
  isOpen.value = true;
};

const close = () => {
  isOpen.value = false;
};

const currentImageIndex = ref(0);

function setIndex(add: number) {
  let result = currentImageIndex.value + add;

  if (result >= props?.images?.length && add > 0) {
    result = result % props.images.length;
  } else if (result < 0 && add < 0) {
    result = props.images.length + result;
  }

  currentImageIndex.value = result;
}

defineExpose({ close, open });
</script>
